# Known Limitations

Current known limitations and browser-specific behaviors for Sonic Pi Web.

## Browser Requirements

- **Chrome/Edge/Firefox** required — Safari has limited Web Audio and no Web MIDI support
- **HTTPS required** for microphone access (`live_audio`) in production deployments
- **User gesture required** to start audio — click Run or any button first (browser autoplay policy)
- **Tab backgrounding** — browser may suspend the AudioContext when the tab is not visible; audio resumes automatically when the tab returns to focus

## Audio Engine

- Audio runs via **SuperSonic** (scsynth compiled to WebAssembly), loaded from CDN at runtime
- **Offline use is not supported** — requires CDN access for SuperSonic WASM, SynthDefs, and samples
- **14 output channels** (2 master + 6 stereo track buses)
- SynthDefs are **lazy-loaded** on first use — slight delay on first `use_synth :prophet` or similar
- Samples are **lazy-loaded** from CDN on first use — ~100-500ms download on first `sample :bd_haus`
- Audio latency varies by browser and OS (~5-20ms typical, reported in console on startup)

## DSL Differences from Desktop Sonic Pi

- **`osc` / `osc_send`**: Hook-based — the engine emits OSC messages, but the host app must provide a transport (e.g., WebSocket-to-UDP bridge). Without a handler, messages are logged with a warning
- **`use_timing_guarantees`**: Not implemented (test-only feature in desktop Sonic Pi)
- **`sound_out` FX**: Not available
- **MIDI**: Requires Web MIDI API (Chrome/Edge only) — not available in Firefox or Safari
- **Recording**: Captures to WAV via MediaRecorder — quality depends on browser implementation
- **Timing**: Virtual time scheduling provides beat-accurate sequencing, but audio output latency varies by browser/OS
- **Custom samples**: Upload support is experimental — built-in samples (197 from desktop Sonic Pi) are loaded from CDN by default

## Performance

- **Infinite loop detection**: Loops without `sleep` are stopped after 100,000 iterations to prevent browser tab freeze
- **Sample loading**: First use of a sample triggers CDN download (cached afterward)
- **Hot-swap**: Code changes via re-Run apply at the next loop iteration boundary (no audible gap)
- **Schedule-ahead buffer**: 300ms lookahead for sample-accurate timing (configurable in `config.ts`)

## Not Yet Implemented

- `use_timing_guarantees`
- `sound_out` FX
- Multi-channel audio output routing beyond 6 stereo track buses
- Built-in WebSocket-to-UDP bridge for `osc_send` (hook exists, transport not bundled)
