# Sonic Pi Web — Implementation Session Prompt

Copy everything below this line into a new Claude Code session.

---

## Context

You are implementing **Sonic Pi Web** — a browser-native reimplementation of Sonic Pi's temporal scheduling model in JavaScript. This has never been done before. Read `SONIC_PI_WEB.md` for the complete build thesis.

## What exists

- **Motif/struCode monorepo** at the current directory
- **Phase 8 (Engine Protocol) is complete** — `LiveCodingEngine` interface, `EngineComponents`, `LiveCodingEditor`, `DemoEngine`, `VizDescriptor.requires[]` filtering all shipped
- **SONIC_PI_WEB.md** — the full architecture document (read this FIRST)
- **THESIS_COMPLETE.md** — the broader project thesis (Section 5.9 covers the imperative-declarative bridge theory)

## The core innovation

`sleep()` returns a Promise that **only the VirtualTimeScheduler can resolve**. This gives JavaScript cooperative concurrency with virtual time — Sonic Pi's exact semantics without thread blocking.

```typescript
sleep(beats: number): Promise<void> {
  return new Promise(resolve => {
    this.queue.push({ time: this.virtualTime + beats, resolve })
    this.virtualTime += beats
  })
}

tick(targetTime: number) {
  while (this.queue.peek()?.time <= targetTime) {
    this.queue.pop()!.resolve()  // resumes the async function
  }
}
```

## Dependencies

- **SuperSonic** (`supersonic-scsynth` on npm) — scsynth compiled to WASM AudioWorklet
- **supersonic-scsynth-synthdefs** — 127 precompiled Sonic Pi SynthDefs
- **supersonic-scsynth-samples** — 206 CC0 audio samples
- All available via CDN (unpkg), no build step needed for dev

## Build order (10 phases)

Execute in order. Each phase should produce working, tested code with an atomic commit.

### Phase A: VirtualTimeScheduler
**Location:** `packages/editor/src/engine/sonicpi/VirtualTimeScheduler.ts`

Build the orchestrator:
- `MinHeap<SleepEntry>` priority queue (entry = `{ time, taskId, resolve }`)
- `scheduleSleep(taskId, beats): Promise<void>` — creates Promise, scheduler holds resolve
- `tick()` — driven by `setInterval(25ms)`, resolves all entries up to `audioContext.currentTime + schedAheadTime`
- `registerLoop(name, asyncFn)` — adds a task
- `start()` / `stop()` — starts/stops the tick timer
- Multi-task: multiple live_loops run cooperatively
- Task state: `{ id, virtualTime, bpm, density, randomState, currentSynth, outBus }`

**Tests:** Single task sleep/wake timing. Two tasks interleaving. Determinism (same inputs = same output sequence). Virtual time only advances on sleep.

### Phase B: DSL Context
**Location:** `packages/editor/src/engine/sonicpi/DSLContext.ts`

User-facing API functions:
- `play(note, opts?)` — triggers synth at current virtual time
- `sleep(beats)` — delegates to scheduler.scheduleSleep
- `sample(name, opts?)` — triggers sample player
- `live_loop(name, asyncFn)` — registers loop with scheduler
- `use_synth(name)` — sets per-task synth
- `use_bpm(bpm)` — sets per-task tempo
- `rrand(min, max)`, `choose(arr)`, `dice(sides)` — seeded random
- `use_random_seed(seed)` — resets per-task random stream
- `ring(...values)` — circular array
- `spread(hits, total)` — Euclidean rhythm

**Also create:**
- `SeededRandom.ts` — deterministic PRNG (mulberry32 or similar)
- `Ring.ts` — circular array with `.tick()` method
- `EuclideanRhythm.ts` — Bjorklund algorithm
- `NoteToFreq.ts` — note name ("c4") to MIDI number and frequency

**Tests:** API shape. Seeded random determinism. Ring wrapping. Euclidean patterns match known values.

### Phase C: SuperSonic Integration
**Location:** `packages/editor/src/engine/sonicpi/SuperSonicBridge.ts`

Wrapper around SuperSonic:
- `init()` — create SuperSonic, load common SynthDefs
- `triggerSynth(name, audioTime, params)` — `/s_new` OSC
- `playSample(name, audioTime, bufNum)` — load sample + trigger player
- `applyFx(name, params, bus)` — create FX synth in FX group
- `getAnalyserNode()` — tap `sonic.node` (AudioWorkletNode)
- `dispose()` — free all nodes, destroy SuperSonic

**Key:** SuperSonic uses CDN URLs. No bundling needed. `sonic.node` is a standard AudioWorkletNode — connects directly to AnalyserNode for Motif visualization.

**Tests:** Init/dispose lifecycle (mock AudioContext). SynthDef loading. OSC message formation.

### Phase D: Transpiler
**Location:** `packages/editor/src/engine/sonicpi/Transpiler.ts`

Transform user code before execution:
- Add `await` before `play()`, `sleep()`, `sample()`, `sync()` calls if missing
- Wrap `live_loop` body in `async () => { ... }`
- Handle `with_fx` block scoping
- **Track source positions** for each `play()`/`sample()` call (character offsets in original code)
- Generate source map for error reporting (line numbers)

**IMPORTANT — Active Highlighting:** The Motif editor highlights source characters when their corresponding note plays. This works via `HapEvent.loc` — an array of `{ start, end }` character offsets. The transpiler MUST track where each `play()`/`sample()` call is in the source code so the DSL context can include `loc` when emitting HapEvents. Without this, highlighting won't work.

The flow:
```
Source: "await play(60)"  at char offset 45-59
  → Transpiler records: { callType: 'play', start: 45, end: 59 }
  → DSL play() receives source position as hidden arg
  → HapStream.emitEvent({ ..., loc: [{ start: 45, end: 59 }] })
  → useHighlighting creates Monaco decoration at chars 45-59
  → Characters glow when note plays
```

**Tests:** Input/output pairs. Source map accuracy. Nested with_fx. Source position tracking for play/sample calls.

### Phase E: sync/cue
Add to VirtualTimeScheduler:
- `fireCue(name, taskId, args)` — broadcast event with virtual timestamp
- `waitForSync(name, taskId): Promise<args>` — park task until cue fires
- On cue: waiting task **inherits cue's virtual time** (this is how Sonic Pi keeps threads in sync)

**Tests:** Two-loop sync scenario. Time inheritance. Multiple waiters.

### Phase F: Hot-swap
Add to VirtualTimeScheduler:
- `hotSwap(loopName, newFn)` — replace loop body for next iteration
- Preserve virtual time position
- Preserve random state (seeded)

On re-evaluate: stop old loops, register new ones. If a loop name persists across evaluations, hot-swap instead of restart.

**Tests:** Swap mid-loop. Timing continuity. Random state preservation.

### Phase G: Capture Mode (queryArc)
**Location:** `packages/editor/src/engine/sonicpi/CaptureScheduler.ts`

Fast-forward mode for pattern querying:
- `runUntilCapture(endTime): Promise<Event[]>` — resolve all sleeps immediately, collect events
- Cache per-cycle results (avoid re-execution)
- `StratumDetector.ts` — classify code as Stratum 1/2/3:
  - S1: no mutations, no random, no external I/O
  - S2: random present, seeded
  - S3: variable mutations across iterations, sync/cue, external I/O

**Tests:** Capture mode produces same events as real-time. Stratum classification.

### Phase H: SonicPiEngine (Motif integration)
**Location:** `packages/editor/src/engine/sonicpi/index.ts`

```typescript
class SonicPiEngine implements LiveCodingEngine {
  get components(): Partial<EngineComponents> {
    return {
      streaming: { hapStream },
      audio: { analyser, audioCtx },
      queryable: stratum <= 2 ? { scheduler, trackSchedulers } : undefined,
      inlineViz: { vizRequests }  // from # @viz comments
    }
  }
}
```

- Parse `# @viz scope` comments for inline viz
- Emit HapEvents to HapStream for highlighting — use `hapStream.emitEvent()` (not the legacy Strudel-specific `emit()`). Build HapEvent directly with `loc` from transpiler source positions.
- **Active highlighting MUST work:** when a note plays, the corresponding `play()`/`sample()` characters in the editor glow. This requires `loc` in every HapEvent.
- Export from `packages/editor/src/index.ts`

**Note on HapStream:** The current `HapStream.emit()` signature takes Strudel-specific args. You may need to add `emitEvent(event: HapEvent): void` to HapStream that accepts a pre-built HapEvent directly. This is a one-line addition to HapStream.ts — it just fans the event to handlers without the Strudel-specific enrichment logic.

**Tests:** Conformance suite (same as DemoEngine). VizPicker filtering by stratum. Active highlighting fires for play/sample calls (verify loc is populated).

### Phase I: Effects Chain (with_fx)
- FX group routing via SuperSonic audio buses
- Nested `with_fx` scoping (save/restore outBus per task)
- Parameter control on running FX nodes

**Tests:** FX chain audio routing. Nested scoping.

### Phase J: Polish
- Friendly error messages (matching Sonic Pi's style)
- Example gallery (5-10 classic Sonic Pi patterns)
- Performance profiling (target: 100 concurrent voices, <5ms tick)
- README

## Key files to read

1. `SONIC_PI_WEB.md` — **READ THIS FIRST** (full architecture, math, implementation details)
2. `packages/editor/src/engine/LiveCodingEngine.ts` — the interface to implement
3. `packages/editor/src/engine/DemoEngine.ts` — reference implementation (minimal engine)
4. `packages/editor/src/engine/StrudelEngine.ts` — reference implementation (full engine)
5. `packages/editor/src/engine/HapStream.ts` — event bus for visualization
6. `packages/editor/src/visualizers/types.ts` — VizRenderer, EngineComponents, PatternScheduler

## Important constraints

- **Do NOT modify existing engine code** (StrudelEngine, DemoEngine, LiveCodingEngine interface). Sonic Pi Web is a NEW engine implementation.
- **SuperSonic is GPL (core).** Keep it loaded via CDN `<script>` tag, not bundled. The JS wrapper (`supersonic-scsynth`) is MIT.
- **Use the existing test setup** (Vitest). Mock AudioContext in tests.
- **Atomic commits per phase.** Each phase should compile and pass tests before moving to the next.
- **The scheduler is the hard part.** Get Phase A rock-solid before moving on. Everything else builds on it.

## Time budget & execution strategy

**Total estimated time: 4-5 hours** (including debugging).

| Phase | Complexity | Estimate |
|---|---|---|
| A: VirtualTimeScheduler | Hard (core innovation) | 30-45 min |
| B: DSL Context + helpers | Medium (many small files) | 20-30 min |
| C: SuperSonic Bridge | Medium (API wrapping) | 15-20 min |
| D: Transpiler | Medium (AST/regex) | 15-20 min |
| E: sync/cue | Medium | 10-15 min |
| F: Hot-swap | Easy-Medium | 10-15 min |
| G: Capture Mode + Stratum | Hard (fast-forward scheduler) | 25-35 min |
| H: SonicPiEngine (Motif) | Medium (wiring) | 15-20 min |
| I: FX Chain | Medium | 15-20 min |
| J: Polish + examples | Easy | 10-15 min |

**Recommended strategy: Ship A-H first (~2.5-3 hours), defer I-J.**

Phases I (FX chain) and J (polish) are not needed for a working engine. Get A through H done first — that gives you a complete `SonicPiEngine` with play/sleep/sample/live_loop, SuperSonic synthesis, hot-swap, queryable patterns for Stratum 1-2, and full Motif integration. FX and polish can be added in a follow-up session.

**Likely blockers to watch for:**
- SuperSonic WASM initialization quirks in test environment (~20 min debugging)
- Promise resolution ordering edge cases in the scheduler (~30 min)
- Transpiler edge cases with nested async/arrow functions (~15 min)

**Phase A is the hard part.** Get single-task, multi-task, and determinism tests all passing before touching anything else. Everything else builds on the scheduler being correct.

## Definition of done

- `SonicPiEngine` implements `LiveCodingEngine`
- This code works in `LiveCodingEditor`:
  ```javascript
  live_loop("drums", async () => {
    await sample("bd_haus")
    await sleep(0.5)
    await sample("sn_dub")
    await sleep(0.5)
  })
  // @viz scope
  ```
- VizPicker shows scope/spectrum for all code, adds pianoroll for Stratum 1-2
- Inline viz zones appear after `live_loop` blocks with `# @viz` comments
- All 127 Sonic Pi SynthDefs playable via SuperSonic
- Hot-swap works (edit code, press play, loops update without restart)
- `npx tsc --noEmit` passes, `npx vitest run` passes
