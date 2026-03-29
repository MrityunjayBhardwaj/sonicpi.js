# SonicPi.js Roadmap

> Live at [sonicpi.cc](https://sonicpi.cc) | npm: `@mjayb/sonicpijs` | [Docs](https://sonicpi.cc/docs)

---

## P0 — Ship Blockers

These must be fixed before community launch. They are correctness or safety issues.

### ~~Execution Budget (System-Wide)~~ DONE
### ~~Silent Parser Fallback~~ DONE
### ~~Per-Loop Scope Isolation~~ DONE
### ~~Verify DSL Compatibility~~ DONE (82% on real community code — motivates tree-sitter)

### ~~Tree-sitter Ruby Transpiler~~ DONE (#21, PR #35)
Partial fold over Sonic Pi subset of Ruby grammar (~60 semantic handlers).
100% transpile compatibility on community programs. Falls back to regex with warning.

---

## P1 — First Impressions

These affect how the app feels on first use. Fix before sharing widely.

### WASM Boot Experience
- [ ] Show loading progress during SuperSonic initialization
- [ ] Display estimated time remaining
- [ ] Pre-warm AudioContext on first user interaction

### Sample-Accurate Audio Scheduling
Currently `SuperSonicBridge.triggerSynth()` calls `sonic.send()` which fires immediately —
the `audioTime` parameter is computed but never used. Desktop Sonic Pi achieves zero-jitter
playback via timestamped OSC bundles that scsynth executes at exact sample boundaries.
SuperSonic supports this via `sonic.sendOSC(bytes)` with NTP timetags.

- [ ] Build OSC bundle encoder (binary format with NTP timetag header)
- [ ] Convert `audioTime` (AudioContext seconds) → NTP epoch time
- [ ] Replace `sonic.send()` with `sonic.sendOSC(bytes)` in `triggerSynth()`, `playSample()`, `applyFx()`
- [ ] Verify SuperSonic creates AudioContext with `latencyHint: 'interactive'`
- [ ] Expose `ctx.baseLatency + ctx.outputLatency` in console on init
- [ ] Evaluate reducing `schedAheadTime` from 100ms to 50ms
- [ ] Evaluate tightening tick interval from 25ms to 10ms
- [ ] Measure before/after jitter with spectrogram tool (target: ±0ms like desktop Sonic Pi)
- [ ] Document actual latency per platform in docs

### Tab Backgrounding
- [ ] Detect `visibilitychange` event
- [ ] Warn user when tab is backgrounded during playback
- [ ] Investigate `Web Locks API` or `Wake Lock API` for prevention

### Compile-Once Caching
- [ ] Cache compiled `new Function()` result per code string
- [ ] Reuse on hot-swap iterations instead of recompiling

---

## P2 — Community Credibility

These make the project look maintained and trustworthy to developers evaluating it.

### Testing & Coverage
- [ ] Add test coverage reporting (Vitest coverage + badge)
- [ ] Run tests against real Sonic Pi tutorial examples
- [ ] Add CI badge to README

### Dependency Management
- [ ] Add Renovate or Dependabot config for automated dependency updates
- [ ] Pin SuperSonic CDN version explicitly

### Documentation
- [ ] Add inline JSDoc to all public API exports
- [ ] Add architecture diagram to docs site
- [ ] Add "Known Limitations" page to docs

---

## P3 — Features

### Recording / Export
- [ ] Capture AudioContext output to WAV
- [ ] Download button in toolbar
- [ ] Duration selection (4/8/16/32 bars)

### Sample Preview
- [ ] List available samples from CDN
- [ ] Click to preview
- [ ] Search/filter

### Monorepo Split
- [ ] `@mjayb/sonicpijs` — pure engine
- [ ] `@mjayb/sonicpijs-sandbox` — sandbox + session logging
- [ ] `sonicpijs` CLI — app + editor

### Code Provenance (v2)
- [ ] Sign individual code snapshots
- [ ] Prove: student X wrote code Y at time Z
- [ ] Export signed submission for LMS integration

---

## P4 — Extensions

### MIDI I/O
- [ ] Web MIDI API output
- [ ] MIDI input as cue source
- [ ] Device selector in toolbar

### Ableton Link
- [ ] WebRTC DataChannel bridge
- [ ] Tempo/beat/phase sync
- [ ] Auto-discover on localhost

### Collaborative Editing
- [ ] CRDT sync (Yjs) for shared buffer
- [ ] WebRTC peer-to-peer
- [ ] Cursor presence

---

## Completed

<details>
<summary>Engine (Phases A-H) + Standalone App + DSL + Security</summary>

- VirtualTimeScheduler (scheduler-controlled Promise resolution)
- DSL Context (play, sleep, sample, live_loop, cue, sync, with_fx)
- SuperSonic Bridge (scsynth WASM, 127 SynthDefs, samples)
- JS Transpiler + Ruby Transpiler (recursive descent parser)
- sync/cue, hot-swap, capture mode, stratum detection
- SonicPiEngine (LiveCodingEngine implementation)
- Chord/Scale system (30+ chord types, 50+ scales)
- Friendly errors, session logging, Ed25519 signing
- Proxy-based sandbox (blocked globals)
- CodeMirror 6 editor, scope visualization, console
- 10 built-in examples, CLI launcher
- Content Security Policy documentation
- 489 tests passing (479 unit + Playwright E2E)

</details>

<details>
<summary>Audio Parameter Pipeline (PR #29, #35) — 2026-03-30</summary>

- Notes sent to SuperSonic — `step.note` included in synth params (#23)
- QueryInterpreter tick advancement via ProgramFactory (#22)
- Redundant `freq` removed — synthdefs convert MIDI internally (#24)
- Recursive FX duration calculation (#26)
- BPM propagation out of FX blocks (#34)
- Sample duration → null instead of misleading 1s (#27)
- ProgramFactory seed advances per iteration (#30)
- Note override protection — step.note wins over opts (#31)
- Diagnose tool: seconds not beats, top-level use_bpm/use_synth captured (#33)
- Diagnostic tools: capture.ts, diagnose-audio.ts, spectrogram.ts
- 622 tests passing (578 unit + 44 Playwright E2E)

</details>
