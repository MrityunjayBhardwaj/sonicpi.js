# Sonic Pi Web — Start Here

Paste this into a new Claude Code session opened in **~/Documents/projects/sonicPiWeb/**.

---

## First: Initialize the project

```bash
git init
npm init -y
npm install -D typescript vitest @types/node
npx tsc --init
```

## Then: Read these files in order

1. Read `CLAUDE.md` — project overview and constraints
2. Read `ref/THESIS.md` — full build thesis (Part III: Architecture and Part IV: Implementation Outline are most important)
3. Read `ref/SESSION_PROMPT.md` — phase breakdown with time budget
4. Read `.anvi/hetvabhasa.md` — error patterns to avoid
5. Read `.anvi/vyapti.md` — invariants that must hold
6. Read `.anvi/krama.md` — lifecycle sequences

Then read Motif's engine code to understand the interface you're implementing:
7. Read `../struCode/packages/editor/src/engine/LiveCodingEngine.ts` — the interface to implement
8. Read `../struCode/packages/editor/src/engine/DemoEngine.ts` — reference minimal engine
9. Read `../struCode/packages/editor/src/engine/HapStream.ts` — event bus for visualization

## Execution plan

Use `/anvi:new-project` to initialize, then `/anvi:plan-phase` and `/anvi:execute-phase` for each phase.

**Priority order:** A → B → C → D → E → F → G → H (skip I, J for first pass)

**Phase A is the hard part.** The VirtualTimeScheduler is the core innovation. Spend extra time here — single-task tests, multi-task tests, determinism tests, all passing before moving on.

**Ship A-H first (~2.5-3 hours).** That gives you a complete SonicPiEngine with play/sleep/sample/live_loop, SuperSonic synthesis, hot-swap, queryable patterns for Stratum 1-2, and full Motif integration.

**After A-H:** Run full verification:
- `npx tsc --noEmit` — zero errors
- `npx vitest run` — all tests pass
- SonicPiEngine conformance suite passes

## Key references during implementation

| When you need... | Read... |
|---|---|
| Scheduler architecture | `ref/RESEARCH_JS_SCHEDULING.md` |
| How Sonic Pi does it internally | `ref/RESEARCH_SONIC_PI_INTERNALS.md` |
| SuperSonic API (OSC commands, SynthDefs) | `ref/RESEARCH_SUPERSONIC.md` |
| Math (temporal monad, free monad) | `ref/RESEARCH_MATH_FOUNDATIONS.md` |
| Error patterns to watch for | `.anvi/hetvabhasa.md` |
| Invariants that must hold | `.anvi/vyapti.md` |
| Lifecycle sequences | `.anvi/krama.md` |
| Motif LiveCodingEngine interface | `../struCode/packages/editor/src/engine/LiveCodingEngine.ts` |
| Motif DemoEngine (reference impl) | `../struCode/packages/editor/src/engine/DemoEngine.ts` |
| Motif HapStream (event bus) | `../struCode/packages/editor/src/engine/HapStream.ts` |

## Source structure to create

```
src/
  engine/
    VirtualTimeScheduler.ts    ← Phase A (THE hard part)
    DSLContext.ts               ← Phase B
    SuperSonicBridge.ts         ← Phase C
    Transpiler.ts               ← Phase D
    SeededRandom.ts             ← Phase B
    Ring.ts                     ← Phase B
    EuclideanRhythm.ts          ← Phase B
    NoteToFreq.ts               ← Phase B
    StratumDetector.ts          ← Phase G
    CaptureScheduler.ts         ← Phase G
    index.ts                    ← Phase H (SonicPiEngine class)
  __tests__/
    VirtualTimeScheduler.test.ts
    DSLContext.test.ts
    SonicPiEngine.conformance.test.ts
    StratumDetector.test.ts
    CaptureScheduler.test.ts
```

## Definition of done

This code works when wired into Motif's LiveCodingEditor:
```javascript
live_loop("drums", async () => {
  await sample("bd_haus")
  await sleep(0.5)
  await sample("sn_dub")
  await sleep(0.5)
})
// @viz scope
```

With authentic SuperCollider synthesis, hot-swap on re-evaluate, adaptive VizPicker, and inline viz zones.
