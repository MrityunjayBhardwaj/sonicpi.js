import { VirtualTimeScheduler } from './VirtualTimeScheduler'
import { ProgramBuilder } from './ProgramBuilder'
import { runProgram, type AudioContext as AudioCtx } from './interpreters/AudioInterpreter'
import { queryLoopProgram, type QueryEvent } from './interpreters/QueryInterpreter'
import { SuperSonicBridge, type SuperSonicBridgeOptions } from './SuperSonicBridge'
import { transpile } from './Transpiler'
import { createSandboxedExecutor } from './Sandbox'
import { autoTranspile } from './RubyTranspiler'
import { friendlyError, formatFriendlyError, type FriendlyError } from './FriendlyErrors'
import { detectStratum, Stratum } from './Stratum'
import { SoundEventStream } from './SoundEventStream'
import { ring, knit, range, line } from './Ring'
import { spread } from './EuclideanRhythm'
import { noteToMidi, midiToFreq, noteToFreq } from './NoteToFreq'
import { chord, scale, chord_invert, note, note_range } from './ChordScale'
import type { Program } from './Program'

// ---------------------------------------------------------------------------
// Engine interfaces
// ---------------------------------------------------------------------------

export interface EngineComponents {
  /** Sound event stream for visualization and logging. */
  streaming: { eventStream: SoundEventStream }
  /** Audio context and analyser node for scope/recording. */
  audio: { analyser: AnalyserNode; audioCtx: AudioContext; trackAnalysers?: Map<string, AnalyserNode> }
  /** Capture query for deterministic (S1/S2) code introspection. */
  capture: { queryRange(begin: number, end: number): Promise<unknown[]> }
}

// ---------------------------------------------------------------------------
// SonicPiEngine
// ---------------------------------------------------------------------------

export class SonicPiEngine {
  private scheduler: VirtualTimeScheduler | null = null
  private bridge: SuperSonicBridge | null = null
  private eventStream = new SoundEventStream()
  private initialized = false
  private playing = false
  private runtimeErrorHandler: ((err: Error) => void) | null = null
  private printHandler: ((msg: string) => void) | null = null
  private currentCode = ''
  private currentStratum: Stratum = Stratum.S1
  private bridgeOptions: SuperSonicBridgeOptions
  private schedAheadTime: number
  /** Maps DSL nodeRef → SuperSonic nodeId for control messages */
  private nodeRefMap = new Map<number, number>()
  /** Stored builder functions for capture/query path */
  private loopBuilders = new Map<string, (b: ProgramBuilder) => void>()
  /** Per-loop seed counters for deterministic random */
  private loopSeeds = new Map<string, number>()

  constructor(options?: {
    bridge?: SuperSonicBridgeOptions
    schedAheadTime?: number
  }) {
    this.bridgeOptions = options?.bridge ?? {}
    this.schedAheadTime = options?.schedAheadTime ?? 0.1
  }

  async init(): Promise<void> {
    if (this.initialized) return

    this.bridge = new SuperSonicBridge(this.bridgeOptions)

    try {
      await this.bridge.init()
    } catch (err) {
      console.warn('[SonicPi] SuperSonic init failed, running without audio:', err)
      this.bridge = null
    }

    this.initialized = true
  }

  async evaluate(code: string): Promise<{ error?: Error }> {
    if (!this.initialized) {
      return { error: new Error('SonicPiEngine not initialized — call init() first') }
    }

    try {
      this.currentCode = code
      this.currentStratum = detectStratum(code)

      const isReEvaluate = this.scheduler !== null && this.playing

      // First run or after stop: create fresh scheduler
      if (!isReEvaluate) {
        if (this.scheduler) {
          this.scheduler.dispose()
        }

        const audioCtx = this.bridge?.audioContext
        this.scheduler = new VirtualTimeScheduler({
          getAudioTime: () => audioCtx?.currentTime ?? 0,
          schedAheadTime: this.schedAheadTime,
        })

        this.loopBuilders.clear()
        this.loopSeeds.clear()
      }

      // Transpile: Ruby DSL → JS builder chain
      const jsCode = autoTranspile(code)
      const { code: transpiledCode } = transpile(jsCode)

      // Top-level DSL state
      let defaultBpm = 60
      let defaultSynth = 'beep'
      const scheduler = this.scheduler!

      const topLevelUseBpm = (bpm: number) => { defaultBpm = bpm }
      const topLevelUseSynth = (name: string) => { defaultSynth = name }

      // Collection map for re-evaluate hot-swap path
      const pendingLoops = new Map<string, () => Promise<void>>()
      const pendingDefaults = new Map<string, { bpm: number; synth: string }>()

      // Top-level print handler
      const topLevelPuts = (...args: unknown[]) => {
        const msg = args.map(a => typeof a === 'string' ? a : JSON.stringify(a)).join(' ')
        if (this.printHandler) this.printHandler(msg)
        else console.log('[SonicPi]', msg)
      }

      // Top-level stop sentinel
      const topLevelStop = () => {
        // At top level, stop just halts evaluation
      }

      const wrappedLiveLoop = (name: string, builderFn: (b: ProgramBuilder) => void) => {
        const trackBus = this.bridge?.allocateTrackBus(name) ?? 0

        // Store builder function for capture path
        this.loopBuilders.set(name, builderFn)
        if (!this.loopSeeds.has(name)) {
          this.loopSeeds.set(name, 0)
        }

        // Create the async function that builds a Program each iteration
        // and runs it via AudioInterpreter
        const asyncFn = async () => {
          const seed = this.loopSeeds.get(name) ?? 0
          this.loopSeeds.set(name, seed + 1)

          const builder = new ProgramBuilder(seed)
          // Await in case builderFn is async (backward compat with old JS code)
          await Promise.resolve(builderFn(builder))
          const program = builder.build()

          await runProgram(program, {
            bridge: this.bridge,
            scheduler,
            taskId: name,
            eventStream: this.eventStream,
            schedAheadTime: this.schedAheadTime,
            printHandler: this.printHandler ?? undefined,
            nodeRefMap: this.nodeRefMap,
          })
        }

        if (isReEvaluate) {
          pendingLoops.set(name, asyncFn)
          pendingDefaults.set(name, { bpm: defaultBpm, synth: defaultSynth })
        } else {
          scheduler.registerLoop(name, asyncFn)
          const task = scheduler.getTask(name)
          if (task) {
            task.bpm = defaultBpm
            task.currentSynth = defaultSynth
            task.outBus = trackBus
          }
        }
      }

      // Build DSL parameter names and values for the executor
      const dslNames = [
        'live_loop', 'use_bpm', 'use_synth',
        'ring', 'knit', 'range', 'line', 'spread',
        'chord', 'scale', 'chord_invert', 'note', 'note_range',
        'noteToMidi', 'midiToFreq', 'noteToFreq',
        'puts', 'stop',
      ]
      const dslValues = [
        wrappedLiveLoop, topLevelUseBpm, topLevelUseSynth,
        ring, knit, range, line, spread,
        chord, scale, chord_invert, note, note_range,
        noteToMidi, midiToFreq, noteToFreq,
        topLevelPuts, topLevelStop,
      ]

      const executor = createSandboxedExecutor(transpiledCode, dslNames)
      await executor(...dslValues)

      if (isReEvaluate) {
        const oldLoops = scheduler.getRunningLoopNames()
        const removedLoops = oldLoops.filter(name => !pendingLoops.has(name))
        const hasNewLoops = [...pendingLoops.keys()].some(name => !oldLoops.includes(name))

        // Pause ticking so no old events fire during transition
        scheduler.pauseTick()

        // Free old audio — clean cut on every re-evaluate
        if (this.bridge) {
          this.bridge.freeAllNodes()
          this.nodeRefMap.clear()
        }

        // Commit: hot-swap same-named, stop removed, start new
        scheduler.reEvaluate(pendingLoops, { bpm: defaultBpm, synth: defaultSynth })

        // Apply per-loop defaults + track bus
        for (const [name, defaults] of pendingDefaults) {
          const task = scheduler.getTask(name)
          if (task) {
            task.bpm = defaults.bpm
            task.currentSynth = defaults.synth
            task.outBus = this.bridge?.allocateTrackBus(name) ?? 0
          }
        }

        // Resume ticking — new loops start clean
        scheduler.resumeTick()
      }

      return {}
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      return { error }
    }
  }

  play(): void {
    if (!this.scheduler) return
    if (this.playing) return

    this.playing = true
    this.scheduler.start()
  }

  stop(): void {
    if (!this.playing) return

    this.playing = false
    this.scheduler?.stop()

    // Free all scsynth nodes for clean silence
    if (this.bridge) {
      this.bridge.freeAllNodes()
    }
    this.nodeRefMap.clear()

    // Dispose scheduler so next evaluate() starts fresh
    this.scheduler?.dispose()
    this.scheduler = null
    this.loopBuilders.clear()
    this.loopSeeds.clear()
  }

  dispose(): void {
    if (this.playing) this.stop()
    this.scheduler?.dispose()
    this.scheduler = null
    this.eventStream.dispose()
    this.bridge?.dispose()
    this.bridge = null
    this.initialized = false
    this.currentStratum = Stratum.S3  // Reset to S3 so capture is unavailable
    this.loopBuilders.clear()
    this.loopSeeds.clear()
  }

  setRuntimeErrorHandler(handler: (err: Error) => void): void {
    this.runtimeErrorHandler = handler
  }

  /** Set handler for puts/print output from user code. */
  setPrintHandler(handler: (msg: string) => void): void {
    this.printHandler = handler
  }

  /** Get a friendly version of the last error (for display in a log pane). */
  static formatError(err: Error): FriendlyError {
    return friendlyError(err)
  }

  /** Format a friendly error as a display string. */
  static formatErrorString(err: Error): string {
    return formatFriendlyError(friendlyError(err))
  }

  get components(): Partial<EngineComponents> {
    const result: Partial<EngineComponents> = {
      streaming: { eventStream: this.eventStream },
    }

    // Audio (from SuperSonic) — master + per-track analysers
    const audioCtx = this.bridge?.audioContext
    const analyser = this.bridge?.analyser
    if (audioCtx && analyser) {
      const trackAnalysers = this.bridge?.getAllTrackAnalysers()
      result.audio = { analyser, audioCtx, trackAnalysers }
    }

    // Capture query (only for deterministic S1/S2 code)
    if (this.currentStratum <= Stratum.S2) {
      const loopBuilders = this.loopBuilders
      const scheduler = this.scheduler

      result.capture = {
        async queryRange(begin: number, end: number): Promise<unknown[]> {
          const events: QueryEvent[] = []
          for (const [name, builderFn] of loopBuilders) {
            const builder = new ProgramBuilder(0)
            builderFn(builder)
            const program = builder.build()
            const task = scheduler?.getTask(name)
            const bpm = task?.bpm ?? 60
            events.push(...queryLoopProgram(program, begin, end, bpm))
          }
          return events.sort((a, b) => a.time - b.time)
        },
      }
    }

    return result
  }
}
