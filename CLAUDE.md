## Project: Sonic Pi Web

Browser-native reimplementation of Sonic Pi's temporal scheduling model in JavaScript.
This has never been done before. You are building the first one.

### Required Reading (in order)
1. `artifacts/ref/THESIS.md` — Full build thesis (architecture, math, implementation outline)
2. `artifacts/ref/SESSION_PROMPT.md` — Implementation guide with phase breakdown and time budget
3. `artifacts/ref/RESEARCH_SONIC_PI_INTERNALS.md` — How desktop Sonic Pi works internally
4. `artifacts/ref/RESEARCH_JS_SCHEDULING.md` — JS async patterns for the scheduler
5. `artifacts/ref/RESEARCH_SUPERSONIC.md` — SuperSonic (scsynth WASM) API reference
6. `artifacts/ref/RESEARCH_MATH_FOUNDATIONS.md` — Formal math (temporal monad, free monad, stratified isomorphism)

### The Core Innovation
`sleep()` returns a Promise that ONLY the VirtualTimeScheduler can resolve.
This gives JavaScript cooperative concurrency with virtual time.
Previous attempts tried to make sleep block the JS thread (impossible).
Our insight: you don't need blocking, you need scheduler-controlled Promise resolution.

### Build Target
Implementation lives in `src/engine/` (this is a standalone package).
The engine implements `LiveCodingEngine` from the Motif editor package (`@motif/editor`).
The Motif monorepo is at `../struCode/` — reference `DemoEngine.ts` and `StrudelEngine.ts` there.

### Phase Order: A → B → C → D → E → F → G → H (skip I, J for v1)
Phase A (VirtualTimeScheduler) is the hard part. Get it rock-solid before moving on.

### Constraints
- SuperSonic GPL core: load via CDN, never bundle
- Atomic commits per phase
- Tests via Vitest
- This is a SEPARATE package — does not modify struCode

## Cognitive Framework
Load the Anvikshiki cognitive OS for this project.
- Base layer: @~/.claude/anvi/cognitive-os/base-layer.md
- Context rot: @~/.claude/anvi/cognitive-os/context-rot.md
- Translation: @~/.claude/anvi/cognitive-os/translation.md
- Lenses: @~/.claude/anvi/cognitive-os/modes/
- Project catalogues: @artifacts/.anvi/
