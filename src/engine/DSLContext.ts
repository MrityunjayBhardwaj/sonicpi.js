import { VirtualTimeScheduler, type SchedulerEvent } from './VirtualTimeScheduler'
import { SeededRandom } from './SeededRandom'
import { Ring, ring } from './Ring'
import { spread } from './EuclideanRhythm'
import { noteToMidi, midiToFreq, noteToFreq } from './NoteToFreq'

export { Ring, ring, spread, noteToMidi, midiToFreq, noteToFreq }

export interface DSLOptions {
  scheduler: VirtualTimeScheduler
}

/**
 * Task-bound DSL functions.
 * Each live_loop gets its own set of these, bound to the task's ID.
 * This eliminates shared mutable state across async interleaving.
 */
export interface TaskDSL {
  play(note: string | number, opts?: Record<string, number>): Promise<void>
  sleep(beats: number): Promise<void>
  sample(name: string, opts?: Record<string, number>): Promise<void>
  cue(name: string, ...args: unknown[]): void
  sync(name: string): Promise<unknown[]>
  use_synth(name: string): void
  use_bpm(bpm: number): void
  rrand(min: number, max: number): number
  rrand_i(min: number, max: number): number
  choose<T>(arr: T[]): T
  dice(sides: number): number
  use_random_seed(seed: number): void
  ring: typeof ring
  spread: typeof spread
  noteToMidi: typeof noteToMidi
  midiToFreq: typeof midiToFreq
  noteToFreq: typeof noteToFreq
}

export function createDSLContext(options: DSLOptions) {
  const { scheduler } = options
  const randoms = new Map<string, SeededRandom>()

  function getRandom(taskId: string): SeededRandom {
    let r = randoms.get(taskId)
    if (!r) {
      r = new SeededRandom(0)
      randoms.set(taskId, r)
    }
    return r
  }

  /**
   * Create a full set of DSL functions bound to a specific task.
   */
  function makeTaskDSL(taskId: string): TaskDSL {
    async function play(note: string | number, opts?: Record<string, number>): Promise<void> {
      const task = scheduler.getTask(taskId)!
      const midi = noteToMidi(note)
      const freq = midiToFreq(midi)
      scheduler.emitEvent({
        type: 'synth',
        taskId,
        virtualTime: task.virtualTime,
        audioTime: task.virtualTime,
        params: { synth: task.currentSynth, note: midi, freq, ...opts },
      })
    }

    async function sleep(beats: number): Promise<void> {
      await scheduler.scheduleSleep(taskId, beats)
    }

    async function sample(name: string, opts?: Record<string, number>): Promise<void> {
      const task = scheduler.getTask(taskId)!
      scheduler.emitEvent({
        type: 'sample',
        taskId,
        virtualTime: task.virtualTime,
        audioTime: task.virtualTime,
        params: { name, ...opts },
      })
    }

    function cue(name: string, ...args: unknown[]): void {
      scheduler.fireCue(name, taskId, args)
    }

    function sync(name: string): Promise<unknown[]> {
      return scheduler.waitForSync(name, taskId)
    }

    function use_synth(name: string): void {
      scheduler.getTask(taskId)!.currentSynth = name
    }

    function use_bpm(bpm: number): void {
      scheduler.getTask(taskId)!.bpm = bpm
    }

    return {
      play,
      sleep,
      sample,
      cue,
      sync,
      use_synth,
      use_bpm,
      rrand: (min: number, max: number) => getRandom(taskId).rrand(min, max),
      rrand_i: (min: number, max: number) => getRandom(taskId).rrand_i(min, max),
      choose: <T>(arr: T[]) => getRandom(taskId).choose(arr),
      dice: (sides: number) => getRandom(taskId).dice(sides),
      use_random_seed: (seed: number) => getRandom(taskId).reset(seed),
      ring,
      spread,
      noteToMidi,
      midiToFreq,
      noteToFreq,
    }
  }

  /**
   * Register a live_loop. The user's async function receives task-bound
   * DSL functions, eliminating shared state between concurrent tasks.
   */
  function live_loop(name: string, asyncFn: (ctx: TaskDSL) => Promise<void>): void {
    const taskDSL = makeTaskDSL(name)
    const wrappedFn = async () => {
      await asyncFn(taskDSL)
    }
    scheduler.registerLoop(name, wrappedFn)
  }

  return {
    live_loop,
    ring,
    spread,
    noteToMidi,
    midiToFreq,
    noteToFreq,
    _makeTaskDSL: makeTaskDSL,
    _getRandom: getRandom,
  }
}

export type DSLFunctions = ReturnType<typeof createDSLContext>
