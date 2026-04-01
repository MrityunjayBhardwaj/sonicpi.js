# Case Study: Progressive Main Thread Stalling (20-Second Cliff)

**Date:** 2026-04-01
**Duration:** ~8 hours, 12 experiments
**Symptom:** UI freezes at 4fps after 20 seconds of 7-loop playback
**Root cause:** Console.rebuild() — 43,000 DOM ops/sec
**Misdiagnoses:** V8 Major GC, scsynth WASM contention, SharedArrayBuffer, allocation pressure

---

## The Symptom

Full DJ Dave code (7 live_loops, nested FX, 130 BPM) plays correctly for ~15 seconds.
At ~20 seconds, the log panel and scope visualizer freeze. Audio continues (OSC timetags
make it sample-accurate) but the UI drops to 4fps. Thread monitor shows 200ms+ event
loop lag and 20+ long tasks per 5-second window.

## The 12 Experiments

### Phase 1: Audio Pipeline Investigation (experiments 1-3)

These weren't targeting the performance bug — they were fixing audio correctness.
But they established the observation tools that later detected the performance cliff.

**Experiment 1: Raw OSC Isolation Test**
- Bypassed entire engine, sent OSC directly to SuperSonic
- Proved WASM 2x output level is in SuperSonic, not our code
- Tool created: `tools/raw-osc-test.ts`

**Experiment 2: Spectrogram A/B Analysis**
- Found clap+FX echo timing at 250ms instead of 115ms
- Led to FX BPM scaling fix (#66) and default injection (#67, #68)
- These fixes added the normalization pipeline that creates object spreads

**Experiment 3: Inner FX Stacking**
- OSC trace revealed 68 echo nodes in 21 seconds
- Fixed with reusableFx map (#70)
- **First observation of progressive degradation** — this test was the canary

### Phase 2: Scheduler Investigation (experiments 4-7)

Having noticed the degradation, we assumed it was a scheduling problem.

**Experiment 4: Timer Strategy (setTimeout vs setInterval)**
- Hypothesis: setInterval can't compensate for callback overruns
- Result: Made drift WORSE (+28ms/sec vs -16ms/sec)
- Lesson: The bottleneck isn't the timer — it's what runs between ticks
- PR #72 created and reverted

**Experiment 5: schedAheadTime Increase (0.1s → 0.3s)**
- Hypothesis: More scheduling runway reduces late events
- Result: Jitter improved (13.9ms → 8.5ms) but 20s cliff unchanged
- Lesson: Lead time helps with individual event timing but not with sustained load

**Experiment 6: Async Fast-Path**
- Hypothesis: await on cache hits creates unnecessary microtask yields
- Result: Eliminated 43 yields/sec, jitter -30% in early seconds
- Lesson: Real improvement but not the root cause of the cliff

**Experiment 7: Tick Instrumentation**
- Added timing stats to scheduler tick function
- Discovered: tick rate collapses from 40/sec to 4.8/sec after 20 seconds
- 81 overruns (>75ms gaps between ticks)
- This confirmed the cliff but not the cause

### Phase 3: Node Accumulation Investigation (experiments 8-10)

The tick collapse pointed to growing CPU load. We assumed scsynth nodes.

**Experiment 8: Aggressive Node Freeing**
- Scheduled /n_free after computed ADSR duration
- Result: Onset density stabilized (41→30 declining → 82→86 stable)
- BUT: 200ms long tasks still present. Audio timing improved, UI still froze.
- Key insight missed: the fix helped audio but not the UI → different root cause

**Experiment 9: OSC Bundle Routing for /n_free**
- Hypothesis: setTimeout + sonic.send() hits SharedArrayBuffer contention
- Replaced with timed OSC bundles via sendOSC()
- Result: No improvement in long tasks
- Later found: scsynth may not process /n_free in timetaged bundles

**Experiment 10: Console DOM Throttling**
- Added requestAnimationFrame batching to Console.log/logEvent
- Result: Normal path batched but overflow path (rebuild) bypassed it
- **This was the RIGHT fix applied to the WRONG code path**

### Phase 4: Root Cause Hunt (experiments 11-12)

Having exhausted "obvious" causes, we went deeper.

**Experiment 11: SuperSonic Metrics**
- Exposed getMetrics() from SuperSonic
- Result: 0 dropped messages, 0 late executions, 0% buffer usage
- **Proved definitively: scsynth WASM is NOT the bottleneck**
- This eliminated the entire "WASM contention" hypothesis

**Experiment 12: V8 GC Analysis**
- Mapped complete allocation inventory (260KB/sec)
- Built timeline matching V8's premature promotion cascade
- The theory was elegant and matched the 20-second onset perfectly
- Applied fix: pre-allocated ArrayBuffers, eliminated spreads, for...in
- Result: **No improvement.** The theory was wrong.

### The Actual Fix (found after experiment 12)

After allocation reduction showed zero improvement, we revisited the Console code
from experiment 10. The rAF batching was in `scheduleFlush()`, but the overflow path
(`entries.length > MAX_ENTRIES`) called `rebuild()` which:

1. `innerHTML = ''` — destroys all DOM nodes
2. Creates 500 new elements via `appendLine()`
3. Returns BEFORE `scheduleFlush()` — bypassing the batching entirely

At 86 entries/sec, the buffer fills in ~6 seconds. After that, EVERY entry
triggers 500 DOM element recreations — 43,000 DOM ops/sec.

Fix: `trimIfNeeded()` — O(1) removeChild + shift instead of O(n) rebuild.

Result: 4.7ms event loop, 120fps, 0 long tasks for 45 seconds.

## What Each Experiment Taught Us (Even the Wrong Ones)

| # | What we learned | Reusable? |
|---|----------------|-----------|
| 1 | Raw OSC isolation proves which layer owns a bug | Yes — tool exists |
| 2 | Spectrogram temporal analysis reveals param bugs invisible to level analysis | Yes — methodology |
| 3 | OSC trace reveals node stacking before WAV shows level issues | Yes — technique |
| 4 | Timer strategy doesn't help when microtask processing is the bottleneck | Yes — knowledge |
| 5 | schedAheadTime gives runway but doesn't fix sustained overload | Yes — tuning |
| 6 | async/await cache-hit optimization is real but incremental | Yes — code improvement |
| 7 | Tick instrumentation measures scheduler health directly | Yes — tool exists |
| 8 | Node freeing prevents CPU accumulation from scsynth | Yes — code improvement |
| 9 | Not all OSC commands work in timetaged bundles | Yes — knowledge (scsynth) |
| 10 | rAF batching only helps if ALL code paths use it | **Key lesson** |
| 11 | SuperSonic getMetrics() eliminates false hypotheses about WASM | Yes — tool exists |
| 12 | Allocation analysis is valuable but must be validated by measurement | Yes — methodology |

## The Meta-Lessons

### 1. Profile before theorizing
A single `performance.now()` wrapper around `Console.log()` would have found the
5-10ms per call immediately. Instead, 12 experiments investigated V8 GC internals,
SharedArrayBuffer contention, and WASM architecture.

### 2. When you add an optimization, check ALL paths
The rAF batching (experiment 10) was the RIGHT fix. It was applied correctly to the
normal code path. But the overflow path bypassed it. When optimizing a hot function,
grep for ALL callers — especially overflow, error, and edge-case paths.

### 3. Fixed-time onset = buffer overflow, not accumulation
The degradation always started at ~20 seconds regardless of code complexity, allocation
rate, or timer strategy. Accumulation-based problems (GC, node count) scale with rate.
Buffer-overflow problems trigger at a fixed count ÷ rate = fixed time. The constancy
of the onset was the biggest clue we kept missing.

### 4. Elegant theories that match the data can still be wrong
The V8 GC analysis (experiment 12) was thorough: allocation inventory, promotion
cascade, idle-time scheduling, exact timeline match. Every detail fit. But the fix
didn't help. The theory was internally consistent but wrong about the actual cause.
Consistency is not proof — only measurement is proof.

### 5. Elimination is valuable even when it leads to wrong conclusions
Experiments 4-9 each eliminated a hypothesis. By experiment 11, we knew:
- Not the timer (4)
- Not the scheduling lead time (5)
- Not async overhead (6)
- Not tick starvation from our code (7)
- Not scsynth node count (8)
- Not SharedArrayBuffer contention (9)
- Not scsynth WASM processing (11)

This elimination was real and permanent. The mistake was in what we investigated
AFTER elimination — we went to V8 GC theory instead of checking the DOM.

### 6. The answer was in code we had just edited
Experiment 10 touched Console.ts. We added rAF batching to the normal path.
We did not check `rebuild()`. The answer was sitting in the same file, in a
function called by the same methods we modified. Proximity blindness.

## Tools Created

- `tools/raw-osc-test.ts` — bypasses engine for isolation testing
- `tools/measure_thread_load.ts` — event loop lag, long tasks, FPS, SuperSonic metrics
- `SuperSonicBridge.getMetrics()` — exposes scsynth health data
- `ReferenceParity.test.ts` — 38 tests using desktop synthinfo.rb as oracle
- Pre-allocated OSC buffers, async fast-path, inner FX reuse, node freeing

## Catalogued As

- **SP17** (hetvabhasa): Wrong assumption encoded as truth
- **SP18** (hetvabhasa): Exotic diagnosis before simple observation
- **SV12** (vyapti): Updated to include FX + synth + sample BPM scaling
- **Dharana**: Reference verification gate + optimization bypass gate
- **CLAUDE.md**: Blind spots #6 (comments ≠ evidence), #7 (temporal analysis),
  #8 (check all code paths), #9 (measure before theorizing)
