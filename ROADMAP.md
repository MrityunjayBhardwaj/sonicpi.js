# SonicPi.js Roadmap

> Live at [sonicpi.cc](https://sonicpi.cc) | npm: [`@mjayb/sonicpijs`](https://www.npmjs.com/package/@mjayb/sonicpijs)

---

## Released

| Version | Highlights |
|---------|------------|
| **v1.0.0** | Engine, standalone app, 35 synths, 34 samples, sandbox, CLI |
| **v1.1.0** | Full MIDI I/O, beat_stretch/pitch_stretch, Ring fixes |
| **v1.2.0** | stop_loop, multi-line continuation, ternary operator |
| **v1.3.0** | Tree-sitter sole transpiler, SoundLayer parity, 100% data parity (66 synths, 197 samples, 42 FX), param validation, scope rewrite (5 modes), runtime semantics, full UI overhaul |
| **v1.4.0** | Help panel (311 entries), resizable panels, cue log wired, error handling overhaul (20 patterns, block validation, line highlighting, hot-swap rollback), Report Bug button, CI workflow, TypeScript 6 |
| **v1.5.0-beta.0** | Engine audit: 33 bugs fixed across 9 commits. Tutorial/book/community parity: 56 real-world compositions verified in Chromium (MagPi Essentials chapters, 15 official Sonic Pi wizard/sorcerer/magician examples, 13 community forum compositions). New DSL: `use_sample_bpm`, `midi` shorthand, `use_osc`/`osc`, `with_fx reps:`, `with_synth_defaults`, `with_sample_defaults`, `use_density`, `use_debug` exposed. Sandbox fixes: `b`→`__b` rename, `get()` Proxy→function. Bridge fixes: `in_thread` inside `with_fx` inherits `outBus`, lazy-load race conditions, `freeBus` guard. |

---

## v1.5.0 — Beta Testing

**Status:** Ships as `1.5.0-beta.0`. Real-user testing via Sonic Pi community forum. Fix regressions for 1-2 weeks, then promote to stable.

### Known gaps to address before stable
- [ ] `.zip` and `.each_with_index` Array methods (#154)
- [ ] Audit SYNTH_NAMES against CDN synthdefs (#156)
- [ ] `synth :sound_in` / `:sound_in_stereo` — wire to `getUserMedia` (#152)
- [ ] `use_real_time` — MIDI input latency bypass (#149)
- [ ] MIDI input path format parity with Desktop SP (#151)
- [ ] Sync/get pattern matching (wildcards) (#150)
- [ ] Consolidate 3 bare-code wrapping systems (#125)
- [ ] Rename `RubyTranspiler.ts` to `transpile.ts` (#135)
- [ ] Rename `usedFallback` field (#138)

### Mobile / Touch
- [ ] Responsive toolbar — collapse buttons into hamburger menu on narrow screens
- [ ] Touch-friendly splitters — larger hit targets for panel resizing
- [ ] On-screen keyboard — tap to insert common DSL keywords (live_loop, play, sleep, sample)
- [ ] Swipe between buffers
- [ ] Test and fix layout on iOS Safari + Android Chrome

### Hot Reload Preferences
- [ ] Prefs changes apply immediately without re-run (volume, BPM, scope modes already do — extend to editor font size, line numbers, word wrap)
- [ ] Theme changes (scope colors, glow, trail) apply to running visualizer without restart

### Polish
- [ ] WASM boot progress indicator (loading bar during SuperSonic init)
- [ ] Test coverage reporting (Vitest coverage + badge)

---

## v1.6.0 — Post-Beta Feature Work

### External sample upload
- [ ] Drag-and-drop `.wav`/`.flac`/`.mp3` → WASM memory → callable as `sample :my_upload`
- [ ] Sample library panel with upload/delete
- [ ] Persist uploaded samples across sessions (IndexedDB)

### OSC receive
- [ ] WebSocket-to-UDP bridge (bundled option, not just hook)
- [ ] `sync "/osc/..."` path delivery via WebSocket

### Collaboration
- [ ] Ableton Link via WebRTC DataChannel
- [ ] Collaborative live coding (CRDT sync via Yjs + WebRTC)
- [ ] Code provenance — signed snapshots for LMS submission

### Architecture
- [ ] Monorepo split (`@mjayb/sonicpijs` engine, `@mjayb/sonicpijs-app` UI)
