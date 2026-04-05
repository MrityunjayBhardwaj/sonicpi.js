/**
 * App shell — SonicPi.js.
 * Matches Sonic Pi desktop layout with welcome experience.
 */

import { SonicPiEngine } from '../engine/SonicPiEngine'
import { friendlyError } from '../engine/FriendlyErrors'
import { Recorder } from '../engine/Recorder'
import { SessionLog } from '../engine/SessionLog'
import { examples as allExamples, type Example } from '../engine/examples'
import { Editor } from './Editor'
import { Scope } from './Scope'
import { Console } from './Console'
import { Toolbar, type MidiDeviceInfo } from './Toolbar'
import { MenuBar } from './MenuBar'
import { CueLog } from './CueLog'
import { SampleBrowser } from './SampleBrowser'
import { HelpPanel } from './HelpPanel'

// Sonic Pi's actual welcome buffer — the Blade Runner demo
const WELCOME_CODE = `# =====================================================
#   ____              _        ____  _  __        __   _
#  / ___|  ___  _ __ (_) ___  |  _ \\(_) \\ \\      / /__| |__
#  \\___ \\ / _ \\| '_ \\| |/ __| | |_) | |  \\ \\ /\\ / / _ \\ '_ \\
#   ___) | (_) | | | | | (__  |  __/| |   \\ V  V /  __/ |_) |
#  |____/ \\___/|_| |_|_|\\___| |_|   |_|    \\_/\\_/ \\___|_.__/
#
#  The Live Coding Music Synth — In Your Browser
# =====================================================
#
#  Press Run (Ctrl+Enter or Alt+R) to hear this piece.
#  Press Stop (Esc or Alt+S) to silence everything.
#  Edit the code while it plays — changes apply instantly!
#
#  github.com/MrityunjayBhardwaj/SonicPi.js
#
#  Standing on the shoulders of giants:
#    Sonic Pi & Sam Aaron  — sonic-pi.net
#    SuperCollider          — supercollider.github.io
#    SuperSonic             — scsynth compiled to WebAssembly
#    Web Audio API          — the browser audio standard
#    Algorave community     — algorave.com
#
# =====================================================
#  BLADE RUNNER — HOPE EDIT
#  Key: C minor with a hopeful resolution arc
#  Cm (shadow) -> Gm (tension) -> Eb (warmth) -> G (hope)
# =====================================================

use_bpm 52

with_fx :reverb, room: 0.92, mix: 0.72 do
  with_fx :echo, phase: 1.5, decay: 4, mix: 0.20 do

    # Pad chords — the harmonic foundation
    live_loop :blade_runner do
      use_synth :blade

      [:c3, :eb3, :g3].each do |n|
        play n, release: 6, attack: 2, amp: 0.5,
          cutoff: 70, vibrato_rate: 5, vibrato_depth: 0.10,
          vibrato_delay: 1.0
      end
      sleep 6

      [:g3, :bb3, :d4].each do |n|
        play n, release: 6, attack: 2, amp: 0.5,
          cutoff: 72, vibrato_rate: 5, vibrato_depth: 0.10,
          vibrato_delay: 1.0
      end
      sleep 6

      [:eb3, :g3, :bb3].each do |n|
        play n, release: 6, attack: 2, amp: 0.55,
          cutoff: 82, vibrato_rate: 5.5, vibrato_depth: 0.14,
          vibrato_delay: 0.8
      end
      sleep 6

      [:g3, :b3, :d4].each do |n|
        play n, release: 7, attack: 2, amp: 0.55,
          cutoff: 85, vibrato_rate: 6, vibrato_depth: 0.16,
          vibrato_delay: 0.6
      end
      sleep 6
    end

    # Rising melody — climbs one step per bar, never resolves
    live_loop :hope_melody, sync: :blade_runner do
      use_synth :blade

      play :c4, attack: 1.5, sustain: 2.0, release: 2.0, amp: 0.55,
        cutoff: 78, vibrato_rate: 5.5, vibrato_depth: 0.16,
        vibrato_delay: 0.7, vibrato_onset: 0.4
      sleep 3
      play :eb4, attack: 0.8, sustain: 1.5, release: 1.5, amp: 0.50,
        cutoff: 76, vibrato_rate: 5.2, vibrato_depth: 0.14,
        vibrato_delay: 0.6, vibrato_onset: 0.3
      sleep 3

      play :d4, attack: 1.5, sustain: 2.5, release: 2.0, amp: 0.52,
        cutoff: 80, vibrato_rate: 5.8, vibrato_depth: 0.17,
        vibrato_delay: 0.7, vibrato_onset: 0.4
      sleep 4
      play :f4, attack: 0.8, sustain: 1.0, release: 1.5, amp: 0.48,
        cutoff: 78, vibrato_rate: 5.5, vibrato_depth: 0.15,
        vibrato_delay: 0.5, vibrato_onset: 0.3
      sleep 2

      play :g4, attack: 2.0, sustain: 3.0, release: 2.5, amp: 0.60,
        cutoff: 88, vibrato_rate: 6.2, vibrato_depth: 0.22,
        vibrato_delay: 0.9, vibrato_onset: 0.5
      sleep 6

      play :d5, attack: 2.5, sustain: 3.5, release: 3.0, amp: 0.58,
        cutoff: 92, vibrato_rate: 6.8, vibrato_depth: 0.24,
        vibrato_delay: 1.0, vibrato_onset: 0.6
      sleep 6
    end

    # High shimmer — sparse, probabilistic sparkles
    live_loop :shimmer, sync: :blade_runner do
      use_synth :blade
      notes = [:c5, :eb5, :g5, :bb5, :d6, :g5, :eb5, :c5]
      notes.each do |n|
        if one_in(2)
          play n,
            attack: rrand(1.5, 3.0),
            sustain: rrand(1.0, 2.5),
            release: rrand(3.0, 5.0),
            amp: rrand(0.10, 0.22),
            cutoff: rrand(88, 100),
            vibrato_rate: rrand(7, 9),
            vibrato_depth: rrand(0.12, 0.28),
            vibrato_delay: 0.4,
            vibrato_onset: 0.3
        end
        sleep rrand_i(2, 5)
      end
    end

  end
end`

// Welcome log — credits and shortcuts
const WELCOME_LOG = [
  '',
  '     _____             _        ____  _  _      __     _',
  '    / ____|           (_)      |  _ \\(_)| |    / /    | |',
  '   | (___   ___  _ __  _  ___  | |_) |_ | |   / / ___ | |__',
  '    \\___ \\ / _ \\| \'_ \\| |/ __| |  __/| || |  / / / _ \\| \'_ \\',
  '    ____) | (_) | | | | | (__  | |   | ||_| / / |  __/| |_) |',
  '   |_____/ \\___/|_| |_|_|\\___| |_|   |_|(_)/_/   \\___||_.__/',
  '',
  '   The Live Coding Music Synth -- In Your Browser',
  '',
  '  -------------------------------------------------------',
  '  Standing on the shoulders of giants:',
  '',
  '    Sonic Pi & Sam Aaron    sonic-pi.net',
  '    SuperCollider            supercollider.github.io',
  '    Algorave community       algorave.com',
  '    Web Audio API + AudioWorklets',
  '    SuperSonic (scsynth -> WebAssembly)',
  '  -------------------------------------------------------',
  '',
  '  Shortcuts:',
  '    Ctrl+Enter / Alt+R    Run code',
  '    Escape / Alt+S        Stop all',
  '    Ctrl+/                Toggle comment',
  '    F11                   Fullscreen',
  '',
  '  Happy live coding!',
  '',
]

const BUFFER_COUNT = 10

export class App {
  private engine: SonicPiEngine | null = null
  private editor!: Editor
  private scope!: Scope
  private console!: Console
  private cueLog!: CueLog
  private toolbar!: Toolbar
  private menuBar!: MenuBar
  private playing = false
  private root: HTMLElement
  private panelVisibility: Record<string, boolean> = {
    log: true, cueLog: true, scope: true, buttons: true, tabs: true,
  }

  // Buffer management — 10 buffers like Sonic Pi
  private buffers: string[] = Array(BUFFER_COUNT).fill('')
  private activeBuffer = 0
  private eventStreamHandler: ((event: unknown) => void) | null = null
  private recorder: Recorder | null = null
  private isRecording = false
  private sessionLog = new SessionLog()
  private helpPanel!: HelpPanel
  private sampleBrowser: SampleBrowser | null = null
  private midiInitialized = false
  /** Set of selected MIDI input device IDs (tracked locally for UI state). */
  private selectedMidiInputs = new Set<string>()
  /** Set of selected MIDI output device IDs (tracked locally for UI state). */
  private selectedMidiOutputs = new Set<string>()

  constructor(root: HTMLElement) {
    this.root = root
    this.loadBuffers()
    try {
      const saved = localStorage.getItem('spw-panel-visibility')
      if (saved) this.panelVisibility = { ...this.panelVisibility, ...JSON.parse(saved) }
    } catch { /* ignore */ }
    this.buildLayout()
  }

  /** Load buffers from localStorage, falling back to welcome code. */
  private loadBuffers(): void {
    try {
      const saved = localStorage.getItem('spw-buffers')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length === BUFFER_COUNT) {
          // Only use saved buffers if at least one has content
          const hasContent = parsed.some((b: string) => b.trim().length > 0)
          if (hasContent) {
            this.buffers = parsed
            return
          }
        }
      }
    } catch { /* ignore */ }
    this.buffers[0] = WELCOME_CODE
  }

  /** Save buffers to localStorage. */
  private saveBuffers(): void {
    // Don't save if editor hasn't initialized (would overwrite with empty)
    if (!this.editor) return
    const val = this.editor.getValue()
    if (val.trim().length === 0 && this.buffers[this.activeBuffer].trim().length > 0) {
      // Editor returned empty but buffer had content — editor not ready yet, skip save
      return
    }
    this.buffers[this.activeBuffer] = val
    try {
      localStorage.setItem('spw-buffers', JSON.stringify(this.buffers))
    } catch { /* storage full or unavailable */ }
  }

  async init(): Promise<void> {
    await this.editor.init(this.buffers[0] || WELCOME_CODE)
    this.editor.onRun(() => this.handlePlay())
    this.editor.onStop(() => this.handleStop())
    this.editor.onZen(() => this.toggleZen())
    this.editor.onCursorWord((word) => this.helpPanel.updateWord(word))

    // Show buffer content indicators
    this.updateBufferIndicators()

    // Save buffers on page unload
    window.addEventListener('beforeunload', () => this.saveBuffers())

    // Tab backgrounding: warn and resume AudioContext when tab returns (#7)
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        if (this.playing) {
          this.console.logSystem('  [Warning] Tab hidden — audio may be suspended by the browser.')
        }
      } else {
        // Resume AudioContext if it was suspended by the browser
        const audio = this.engine?.components?.audio
        if (audio?.audioCtx?.state === 'suspended') {
          audio.audioCtx.resume().then(() => {
            this.console.logSystem('  Audio resumed.')
          }).catch(() => {})
        }
      }
    })

    // Show welcome log
    for (const line of WELCOME_LOG) {
      this.console.logSystem(line)
    }
  }

  private buildLayout(): void {
    this.root.innerHTML = ''
    this.root.style.cssText = `
      display: flex;
      flex-direction: column;
      height: 100vh;
      width: 100vw;
      background: #0d1117;
      color: #CDD3DE;
      font-family: 'Fira Code', 'SF Mono', 'Cascadia Code', 'JetBrains Mono', monospace;
      overflow: hidden;
    `

    // Toolbar
    const toolbarContainer = document.createElement('div')
    toolbarContainer.style.cssText = `
      background: #161B22;
      border-bottom: 1px solid rgba(255,255,255,0.06);
      flex-shrink: 0;
    `
    this.root.appendChild(toolbarContainer)
    this.toolbar = new Toolbar(toolbarContainer, {
      onPlay: () => this.handlePlay(),
      onStop: () => this.handleStop(),
      onRecord: () => this.handleRecord(),
      onExample: (ex) => this.loadExample(ex),
      onBufferSelect: (i) => this.switchBuffer(i),
      onVolumeChange: (v) => { if (this.engine) this.engine.setVolume(v) },
      getMidiDevices: () => this.getMidiDevices(),
      onMidiDeviceToggle: (id, type, selected) => this.toggleMidiDevice(id, type, selected),
      onOpenSampleBrowser: () => this.openSampleBrowser(),
      onFontSizeChange: (delta) => this.editor.changeFontSize(delta),
      onSave: () => this.handleSave(),
      onLoad: () => this.handleLoad(),
      onZen: () => this.toggleZen(),
    })

    // Main area
    const main = document.createElement('div')
    main.className = 'spw-main'
    main.style.cssText = `
      flex: 1; display: flex;
      overflow: hidden; min-height: 0;
    `
    this.root.appendChild(main)

    // Editor panel (left)
    const editorPanel = document.createElement('div')
    editorPanel.className = 'spw-editor-panel'
    editorPanel.style.cssText = `
      flex: 1; min-width: 0; overflow: hidden;
      display: flex; flex-direction: column;
    `
    main.appendChild(editorPanel)

    // Editor header
    const editorHeader = document.createElement('div')
    editorHeader.style.cssText = `
      padding: 0.3rem 0.6rem;
      font-size: 0.65rem;
      color: #555;
      text-transform: uppercase;
      letter-spacing: 1px;
      border-bottom: 1px solid rgba(255,255,255,0.04);
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-shrink: 0;
      background: #111921;
    `
    const edTitle = document.createElement('span')
    edTitle.textContent = 'Buffer 0'
    edTitle.id = 'spw-buffer-title'
    editorHeader.appendChild(edTitle)

    const edHint = document.createElement('span')
    edHint.textContent = 'Ctrl+Enter to run'
    edHint.style.cssText = 'margin-left: auto; color: #3a4550;'
    editorHeader.appendChild(edHint)
    editorPanel.appendChild(editorHeader)

    const editorWrap = document.createElement('div')
    editorWrap.style.cssText = 'flex: 1; min-height: 0; overflow: hidden;'
    editorPanel.appendChild(editorWrap)
    this.editor = new Editor(editorWrap)

    // Help panel (below editor, hidden by default)
    this.helpPanel = new HelpPanel(editorPanel)

    // Divider
    const divider = document.createElement('div')
    divider.style.cssText = `
      width: 1px; background: rgba(255,255,255,0.06);
      flex-shrink: 0;
    `
    main.appendChild(divider)

    // Right panel
    const rightPanel = document.createElement('div')
    rightPanel.className = 'spw-right'
    rightPanel.style.cssText = `
      width: 40%; min-width: 280px; max-width: 520px;
      display: flex; flex-direction: column;
      overflow: hidden; background: #0d1117;
    `
    main.appendChild(rightPanel)

    // Scope
    const scopeContainer = document.createElement('div')
    scopeContainer.className = 'spw-scope'
    scopeContainer.style.cssText = `
      height: 140px; min-height: 80px;
      border-bottom: 1px solid rgba(255,255,255,0.06);
      background: #0d1117;
      flex-shrink: 0;
    `
    rightPanel.appendChild(scopeContainer)
    this.scope = new Scope(scopeContainer)

    // Menu bar — topmost element, above toolbar.
    // Must be created after Scope so toggleMode/getActiveModes are available.
    this.menuBar = new MenuBar(this.root, {
      onToggleScope: (mode) => this.scope.toggleMode(mode),
      getActiveModes: () => this.scope.getActiveModes(),
      onTogglePanel: (panel, visible) => this.togglePanel(panel, visible),
      getPanelVisibility: () => this.panelVisibility,
      onLog: (msg) => this.console.logSystem(msg),
      onToggleHelp: () => this.helpPanel.toggle(),
      isHelpVisible: () => this.helpPanel.isVisible,
    })
    // Move menu bar to the very top (before toolbar)
    const menuEl = this.root.lastElementChild!
    this.root.insertBefore(menuEl, this.root.firstElementChild!)

    // Console
    const consoleContainer = document.createElement('div')
    consoleContainer.className = 'spw-console'
    consoleContainer.style.cssText = `
      flex: 1; min-height: 0; overflow: hidden;
    `
    rightPanel.appendChild(consoleContainer)
    this.console = new Console(consoleContainer)

    // Cue Log
    const cueLogContainer = document.createElement('div')
    cueLogContainer.className = 'spw-cuelog'
    cueLogContainer.style.cssText = `
      height: 120px; min-height: 60px;
      border-top: 1px solid rgba(255,255,255,0.06);
      flex-shrink: 0;
    `
    rightPanel.appendChild(cueLogContainer)
    this.cueLog = new CueLog(cueLogContainer)

    // Responsive
    const mq = window.matchMedia('(max-width: 700px)')
    const apply = (mobile: boolean) => {
      main.style.flexDirection = mobile ? 'column' : 'row'
      rightPanel.style.width = mobile ? '100%' : '40%'
      rightPanel.style.maxWidth = mobile ? 'none' : '520px'
      divider.style.width = mobile ? '0' : '1px'
      divider.style.height = mobile ? '1px' : '0'
      divider.style.background = 'rgba(255,255,255,0.06)'
      if (mobile) {
        editorPanel.style.height = '50%'
        editorPanel.style.flex = 'none'
      } else {
        editorPanel.style.height = ''
        editorPanel.style.flex = '1'
      }
    }
    apply(mq.matches)
    mq.addEventListener('change', (e) => apply(e.matches))

    // Apply saved panel visibility
    this.applyPanelVisibility()

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.handleStop()
      }
      if (e.key === 'F11') {
        e.preventDefault()
        this.toggleZen()
      }
      if (e.ctrlKey && e.shiftKey && e.key === 'S') {
        e.preventDefault()
        this.exportSession()
      }
    })
  }

  private updateBufferIndicators(): void {
    for (let i = 0; i < BUFFER_COUNT; i++) {
      this.toolbar.setBufferHasContent(i, this.buffers[i]?.trim().length > 0)
    }
  }

  private switchBuffer(index: number): void {
    this.buffers[this.activeBuffer] = this.editor.getValue()
    this.activeBuffer = index
    this.editor.setValue(this.buffers[index])
    this.saveBuffers()
    this.updateBufferIndicators()

    const title = document.getElementById('spw-buffer-title')
    if (title) title.textContent = `Buffer ${index}`
  }

  private async handlePlay(): Promise<void> {
    try {
      if (!this.engine) {
        this.toolbar.setLoading(true)
        const t0 = performance.now()
        this.console.logSystem('  Initialising audio engine...')

        let SuperSonicClass: unknown = undefined
        try {
          this.console.logSystem('  Loading SuperSonic WASM runtime...')
          // CDN dependency. dynamic import() does not support SRI.
          // See src/engine/cdn-manifest.ts for the full dependency manifest.
          // @ts-ignore — CDN URL
          const mod = await import(/* @vite-ignore */ 'https://unpkg.com/supersonic-scsynth@latest')
          SuperSonicClass = mod.SuperSonic ?? mod.default
          this.console.logSystem('  WASM runtime loaded.')
        } catch {
          this.console.logSystem('  SuperSonic CDN unavailable.')
          this.console.logSystem('  Running without audio (events will still log).')
        }

        this.engine = new SonicPiEngine({
          bridge: SuperSonicClass ? { SuperSonicClass: SuperSonicClass as never } : {},
        })

        this.engine.setRuntimeErrorHandler((err) => {
          const fe = friendlyError(err)
          this.console.logError(fe.title, fe.message)
        })

        this.engine.setPrintHandler((msg) => {
          this.console.log(msg, 'info')
        })

        this.console.logSystem('  Loading synthdefs + initialising scsynth...')
        await this.engine.init()
        await this.sessionLog.initSigning()
        // Expose engine for diagnostics (thread monitor, metrics)
        ;(globalThis as Record<string, unknown>).__spw_engine = this.engine

        // Log audio latency info (#6)
        const audioInfo = this.engine.components.audio
        if (audioInfo?.audioCtx) {
          const ctx = audioInfo.audioCtx as AudioContext & { baseLatency?: number; outputLatency?: number }
          const base = (ctx.baseLatency ?? 0) * 1000
          const output = (ctx.outputLatency ?? 0) * 1000
          this.console.logSystem(`  Audio latency: ${base.toFixed(1)}ms base + ${output.toFixed(1)}ms output = ${(base + output).toFixed(1)}ms`)
        }

        // Wire custom sample uploader to the engine and load samples from IndexedDB
        if (this.menuBar) {
          this.menuBar.sampleUploader.setEngine(this.engine)
        }
        const customCount = await this.engine.loadCustomSamplesFromDB()
        if (customCount > 0) {
          this.console.logSystem(`  Loaded ${customCount} custom sample${customCount > 1 ? 's' : ''} from storage.`)
        }

        const elapsed = ((performance.now() - t0) / 1000).toFixed(1)
        this.toolbar.setLoading(false)
        this.console.logSystem(`  Audio engine ready. (${elapsed}s)`)
        this.console.logSystem('  Session logging active. Ctrl+Shift+S to export.')
        this.console.logSystem('')
      }

      const code = this.editor.getValue()
      this.console.newRun()
      this.cueLog.newRun()
      this.editor.highlightErrorLine(null) // clear previous errors

      const result = await this.engine.evaluate(code)
      if (result.error) {
        const fe = friendlyError(result.error)
        this.console.logError(fe.title, fe.message)
        if (fe.line) this.editor.highlightErrorLine(fe.line)
        return
      }

      this.engine.play()
      this.playing = true
      this.toolbar.setPlaying(true)
      await this.sessionLog.logRun(code)

      // Connect scope
      const audio = this.engine.components.audio
      if (audio) {
        this.scope.connect(audio.analyser, audio.analyserL, audio.analyserR)
      }

      // Wire event stream for console logging
      const streaming = this.engine.components.streaming
      if (streaming && !this.eventStreamHandler) {
        this.eventStreamHandler = ((event: { s: string | null; midiNote: number | null; audioTime?: number }) => {
          const s = event.s ?? '?'
          const note = event.midiNote != null ? ` note:${event.midiNote}` : ''
          this.console.logEvent('synth', `${s}${note}`, event.audioTime)
        }) as (event: unknown) => void
        streaming.eventStream.on(this.eventStreamHandler as never)
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      const fe = friendlyError(error)
      this.console.logError(fe.title, fe.message)
    }
  }

  private handleStop(): void {
    if (!this.engine || !this.playing) return
    this.engine.stop()
    this.playing = false
    this.toolbar.setPlaying(false)
    this.scope.disconnect()
    this.sessionLog.logStop()
    this.console.logSystem('')
    this.console.logSystem('  Stopping all runs...')
    this.console.logSystem('')
  }

  private async handleRecord(): Promise<void> {
    if (this.isRecording) {
      // Stop recording and download
      if (this.recorder) {
        this.console.logSystem('  Saving recording...')
        try {
          await this.recorder.stopAndDownload()
          this.console.logSystem('  Recording saved!')
        } catch (err) {
          this.console.logError('Recording failed', String(err))
        }
      }
      this.isRecording = false
      this.toolbar.setRecording(false)
      return
    }

    // Start recording
    const audio = this.engine?.components.audio
    if (!audio) {
      this.console.logError('Cannot record', 'No audio engine available. Press Run first.')
      return
    }

    this.recorder = new Recorder(audio.audioCtx, audio.analyser)
    this.recorder.start()
    this.isRecording = true
    this.toolbar.setRecording(true)
    this.console.logSystem('  Recording... Press Rec again to save.')
  }

  private async loadExample(example: Example): Promise<void> {
    this.editor.setValue(example.ruby)
    this.buffers[this.activeBuffer] = example.ruby
    this.saveBuffers()
    this.sessionLog.logLoadExample(example.name, example.ruby)
    this.console.logSystem(`  Loaded: ${example.name} — ${example.description}`)
    if (this.playing) {
      this.engine!.stop()
      // Wait for pre-scheduled audio in the lookahead buffer to drain before
      // starting the new example — otherwise scsynth plays the tail of the old one.
      await new Promise(r => setTimeout(r, this.engine!.schedAhead * 1000 + 50))
      await this.handlePlay()
    }
  }

  private async handleSave(): Promise<void> {
    const code = this.editor.getValue()
    const name = `buffer_${this.activeBuffer}.rb`

    // Modern File System Access API
    if ('showSaveFilePicker' in window) {
      try {
        const handle = await (window as any).showSaveFilePicker({
          suggestedName: name,
          types: [{ description: 'Sonic Pi', accept: { 'text/x-ruby': ['.rb'] } }],
        })
        const writable = await handle.createWritable()
        await writable.write(code)
        await writable.close()
        this.console.logSystem('  File saved.')
        return
      } catch { /* user cancelled or API unavailable */ }
    }

    // Fallback: download link
    const blob = new Blob([code], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = name; a.click()
    URL.revokeObjectURL(url)
    this.console.logSystem('  File downloaded.')
  }

  private handleLoad(): void {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.rb,.txt,.spi'
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) return
      const text = await file.text()
      this.editor.setValue(text)
      this.saveBuffers()
      this.console.logSystem(`  Loaded: ${file.name}`)
    }
    input.click()
  }

  private toggleZen(): void {
    if (document.fullscreenElement) {
      document.exitFullscreen()
    } else {
      this.root.requestFullscreen().catch(() => {
        // Fullscreen not supported or denied
      })
    }
  }

  private async exportSession(): Promise<void> {
    if (this.sessionLog.length === 0) {
      this.console.logSystem('  No session to export.')
      return
    }
    await this.sessionLog.exportAndDownload()
    this.console.logSystem('  Session log exported.')
  }

  private togglePanel(panel: string, visible: boolean): void {
    this.panelVisibility[panel] = visible
    try { localStorage.setItem('spw-panel-visibility', JSON.stringify(this.panelVisibility)) } catch { /* ignore */ }
    this.applyPanelVisibility()
  }

  private applyPanelVisibility(): void {
    const scope = this.root.querySelector('.spw-scope') as HTMLElement
    const consoleEl = this.root.querySelector('.spw-console') as HTMLElement
    const cueLogEl = this.root.querySelector('.spw-cuelog') as HTMLElement

    if (scope) scope.style.display = this.panelVisibility.scope !== false ? '' : 'none'
    if (consoleEl) consoleEl.style.display = this.panelVisibility.log !== false ? '' : 'none'
    if (cueLogEl) cueLogEl.style.display = this.panelVisibility.cueLog !== false ? '' : 'none'
  }

  // ---------------------------------------------------------------------------
  // MIDI device management
  // ---------------------------------------------------------------------------

  private getMidiDevices(): MidiDeviceInfo[] {
    if (!this.engine) return []
    // Lazy-init MIDI on first dropdown open
    if (!this.midiInitialized) {
      this.engine.midiBridge.init().then((ok) => {
        this.midiInitialized = ok
      })
      return [] // will populate on next open
    }
    const devices = this.engine.midiBridge.getDevices()
    return devices.map(d => ({
      id: d.id,
      name: d.name,
      type: d.type,
      selected: d.type === 'input'
        ? this.selectedMidiInputs.has(d.id)
        : this.selectedMidiOutputs.has(d.id),
    }))
  }

  private toggleMidiDevice(deviceId: string, type: 'input' | 'output', selected: boolean): void {
    if (!this.engine) return
    const bridge = this.engine.midiBridge
    if (type === 'input') {
      if (selected) {
        bridge.selectInput(deviceId)
        this.selectedMidiInputs.add(deviceId)
      } else {
        bridge.deselectInput(deviceId)
        this.selectedMidiInputs.delete(deviceId)
      }
    } else {
      if (selected) {
        bridge.selectOutput(deviceId)
        this.selectedMidiOutputs.add(deviceId)
      } else {
        bridge.deselectOutput(deviceId)
        this.selectedMidiOutputs.delete(deviceId)
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Sample browser
  // ---------------------------------------------------------------------------

  private openSampleBrowser(): void {
    if (this.sampleBrowser?.isOpen) {
      this.sampleBrowser.close()
      return
    }
    this.sampleBrowser = new SampleBrowser({
      onPreviewSample: (name) => this.previewSample(name),
      onInsertText: (text) => {
        this.editor.insertAtCursor(text)
      },
    })
    this.sampleBrowser.open()
  }

  private async previewSample(name: string): Promise<void> {
    try {
      if (!this.engine) {
        this.console.logSystem('  Start the engine first to preview samples.')
        return
      }
      // Evaluate a one-shot sample play
      const code = `sample :${name}`
      const result = await this.engine.evaluate(code)
      if (result.error) {
        this.console.logError('Preview failed', result.error.message)
        return
      }
      this.engine.play()
      // If not already playing, mark as playing so stop works
      if (!this.playing) {
        this.playing = true
        this.toolbar.setPlaying(true)
      }
    } catch (err) {
      this.console.logError('Preview failed', String(err))
    }
  }

  dispose(): void {
    this.handleStop()
    this.sampleBrowser?.dispose()
    this.engine?.dispose()
    this.editor.dispose()
    this.helpPanel.dispose()
    this.scope.dispose()
    this.console.dispose()
    this.cueLog.dispose()
    this.toolbar.dispose()
    this.menuBar?.dispose()
  }
}
