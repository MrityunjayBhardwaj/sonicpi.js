# Sonic Pi Web

Browser-native reimplementation of [Sonic Pi](https://sonic-pi.net)'s temporal scheduling model in JavaScript.

Write live-coded music in the browser with the same `play`, `sleep`, `live_loop` semantics as Sonic Pi — zero install, works anywhere.

## The Core Innovation

`sleep()` returns a Promise that **only the VirtualTimeScheduler can resolve**. This gives JavaScript cooperative concurrency with virtual time — Sonic Pi's exact semantics without thread blocking.

```typescript
// Inside the scheduler:
scheduleSleep(taskId, beats): Promise<void> {
  return new Promise(resolve => {
    this.queue.push({ time: this.virtualTime + beats, resolve })
    this.virtualTime += beats
  })
}

// Only tick() resolves sleep promises — driven by setInterval(25ms)
tick(targetTime) {
  while (this.queue.peek()?.time <= targetTime) {
    this.queue.pop().resolve()  // resumes the async function
  }
}
```

Previous attempts tried to make `sleep` block the JS thread (impossible). Our insight: you don't need blocking, you need scheduler-controlled Promise resolution.

## Quick Start

```bash
npm install sonic-pi-web
```

```typescript
import { SonicPiEngine } from 'sonic-pi-web'

const engine = new SonicPiEngine()
await engine.init()

await engine.evaluate(`
  live_loop("drums", async ({sample, sleep}) => {
    await sample("bd_haus")
    await sleep(0.5)
    await sample("sn_dub")
    await sleep(0.5)
  })
`)

engine.play()
```

### Ruby Syntax (Auto-Transpiled)

You can also write Sonic Pi's Ruby-style syntax — it auto-transpiles:

```ruby
use_bpm 120

live_loop :drums do
  sample :bd_haus
  sleep 0.5
  sample :sn_dub
  sleep 0.5
end
```

## API Reference

### Engine

```typescript
const engine = new SonicPiEngine(options?)
await engine.init()                    // Initialize audio (requires user gesture)
await engine.evaluate(code)            // Evaluate Sonic Pi code
engine.play()                          // Start playback
engine.stop()                          // Stop all loops
engine.dispose()                       // Clean up resources
engine.setRuntimeErrorHandler(fn)      // Handle runtime errors
engine.components                      // Access audio/viz components
```

### DSL Functions (inside live_loop)

| Function | Description |
|----------|-------------|
| `play(note, opts?)` | Trigger a synth note (MIDI number or name like `"c4"`) |
| `sleep(beats)` | Wait for N beats (suspends the loop) |
| `sample(name, opts?)` | Play a sample (`"bd_haus"`, `"sn_dub"`, etc.) |
| `use_synth(name)` | Set synth for this loop (`"beep"`, `"saw"`, `"tb303"`, etc.) |
| `use_bpm(bpm)` | Set tempo for this loop |
| `cue(name)` | Broadcast a cue event |
| `sync(name)` | Wait for a cue (inherits cue's virtual time) |
| `control(node, opts)` | Modify a running synth node |
| `with_fx(name, opts?, fn)` | Wrap code in an audio effect |
| `ring(...values)` | Circular array (wraps around on index) |
| `spread(hits, total)` | Euclidean rhythm pattern |
| `chord(root, type)` | Generate chord notes |
| `scale(root, type)` | Generate scale notes |
| `tick(name?)` | Auto-incrementing counter (resets each loop iteration) |
| `look(name?)` | Read tick counter without incrementing |
| `rrand(min, max)` | Seeded random float in range |
| `choose(array)` | Pick random element from array |
| `dice(sides)` | Random integer 1..sides |
| `use_random_seed(n)` | Set deterministic random seed |

### Supported Synths

`beep`, `saw`, `prophet`, `tb303`, `supersaw`, `pluck`, `pretty_bell`, `piano`, `dsaw`, `dpulse`, `dtri`, `fm`, `mod_fm`, `mod_saw`, `mod_pulse`, `mod_tri`, `sine`, `square`, `tri`, `pulse`, `noise`, `pnoise`, `bnoise`, `gnoise`, `cnoise`, `chipbass`, `chiplead`, `chipnoise`, `dark_ambience`, `hollow`, `growl`, `zawa`, `blade`, `tech_saws`

All 127 Sonic Pi SynthDefs are available via SuperSonic.

### Supported FX

`reverb`, `echo`, `distortion`, `slicer`, `flanger`, `wobble`, `lpf`, `hpf`, `bpf`, `nhpf`, `nlpf`, and more — any FX SynthDef included in the SuperSonic package.

## Architecture

```
┌──────────────┐     ┌──────────────┐     ┌──────────────────┐
│ User Code    │────→│ Transpiler   │────→│ DSL Context      │
│ (Ruby or JS) │     │ (Ruby→JS +   │     │ (task-bound API) │
│              │     │  add awaits) │     │                  │
└──────────────┘     └──────────────┘     └────────┬─────────┘
                                                    │
                     ┌──────────────┐     ┌────────▼─────────┐
                     │ SuperSonic   │◄────│ VirtualTime      │
                     │ (scsynth     │     │ Scheduler        │
                     │  WASM)       │     │ (MinHeap +       │
                     │              │     │  Promise control) │
                     └──────────────┘     └──────────────────┘
```

**Key components:**

- **VirtualTimeScheduler** — The core innovation. Cooperative async scheduler with a MinHeap priority queue. Multiple `live_loop`s run concurrently via Promise suspension.
- **DSLContext** — Task-bound API functions. Each loop gets its own `play`, `sleep`, etc. — no shared mutable state.
- **SuperSonicBridge** — Wrapper around SuperSonic (scsynth compiled to WASM AudioWorklet). Handles synth/sample triggering, FX routing, and audio bus allocation.
- **Transpiler** — Two-stage: Ruby→JS transpilation (regex-based), then missing `await` insertion.
- **CaptureScheduler** — Fast-forward mode for pattern querying. Resolves all sleeps immediately, collects events.
- **FriendlyErrors** — Beginner-friendly error messages matching Sonic Pi's style.

## Examples

The package includes 10 built-in examples:

```typescript
import { examples, getExample } from 'sonic-pi-web'

// List all examples
examples.forEach(e => console.log(e.name, '-', e.description))

// Get a specific example
const beat = getExample('Basic Beat')
await engine.evaluate(beat.ruby)  // or beat.js
```

Available: Hello Beep, Basic Beat, Ambient Pad, Arpeggio, Euclidean Rhythm, Random Melody, Sync/Cue, Multi-Layer, FX Chain, Minimal Techno.

## Compatibility

This is **not** a full Sonic Pi reimplementation. It covers the core scheduling model and most common API functions. Known limitations:

- **Transpiler**: Regex-based, handles ~85% of real Sonic Pi code. Complex Ruby syntax (method chains, string interpolation, multi-line expressions) may not transpile correctly.
- **Audio**: Depends on SuperSonic (scsynth WASM). Some synths/FX may behave slightly differently than desktop Sonic Pi.
- **No MIDI/OSC**: Browser environment doesn't support Sonic Pi's MIDI out or OSC communication.
- **No `live_audio`**: Real-time audio input not implemented.
- **No `time_warp`**: Retroactive scheduling not implemented.
- **Timing**: Browser tab throttling can affect timing when the tab is in the background.

The JS-native API is first-class. Ruby syntax support is a convenience layer.

## Audio Engine

Audio synthesis uses [SuperSonic](https://github.com/nicholasgasior/supersonic-scsynth) — SuperCollider's `scsynth` compiled to WebAssembly as an AudioWorklet. It loads from CDN at runtime (GPL core is never bundled).

## Development

```bash
npm install
npm test              # Run tests (Vitest)
npm run typecheck     # TypeScript check
npm run dev           # Vite dev server
```

## License

MIT
