# Invariants — Sonic Pi Web

## SV1: Virtual Time Monotonicity
**Statement:** For each task T, virtualTime(T) is non-decreasing and advances only on sleep() or sync().
**Causal status:** STRUCTURAL — defines the temporal model.
**Breaks when:** Never (by construction).
**Implication:** All events between two sleeps share the same virtual timestamp (chord semantics).

## SV2: Scheduler-Exclusive Promise Resolution
**Statement:** A Promise returned by sleep() can ONLY be resolved by the scheduler's tick() method.
**Causal status:** CAUSAL — the Promise has no timeout, no microtask trigger.
**Breaks when:** Someone adds a setTimeout fallback or resolves outside tick().
**Implication:** The scheduler has complete control over when async functions resume.

## SV3: Determinism Under Same Inputs
**Statement:** Given same code + same random seeds + same initial state, the event trace is identical across runs.
**Causal status:** STRUCTURAL — follows from SV1 + seeded random + deterministic priority queue.
**Breaks when:** Code uses Date.now(), Math.random(), or external I/O (Stratum 3).
**Implication:** Capture mode produces identical events to real-time execution for Stratum 1-2.

## SV4: Three-Clock Separation
**Statement:** Wall clock (setInterval), audio clock (AudioContext.currentTime), and virtual clock (scheduler) are independent. Only schedAheadTime bridges virtual → audio.
**Causal status:** STRUCTURAL — architecture design.
**Breaks when:** Code reads wall clock directly or ties virtual time to real time.
**Implication:** Wall clock jitter does not affect audio timing.

## SV5: sync Inherits Cue's Virtual Time
**Statement:** When a task calls sync(:name) and a matching cue fires, the syncing task's virtual time is set to the cue's virtual time.
**Causal status:** CAUSAL — this is how Sonic Pi keeps threads synchronized.
**Breaks when:** sync just resumes without updating virtual time.
**Implication:** After sync, the two tasks share the same beat position.

## SV6: Hot-Swap Preserves Virtual Time
**Statement:** When a live_loop's body is replaced (hot-swap), the task's virtual time position is preserved. Only the function changes.
**Causal status:** STRUCTURAL — defines live coding behavior.
**Breaks when:** Re-evaluate restarts loops from virtualTime=0.
**Implication:** No timing discontinuity on code change.

## SV7: SuperSonic Node is Standard AudioWorkletNode
**Statement:** sonic.node is a standard Web Audio AudioWorkletNode. It can be connected to any Web Audio node (AnalyserNode, GainNode, etc.).
**Causal status:** STRUCTURAL — SuperSonic's architecture.
**Breaks when:** N/A.
**Implication:** Motif visualization pipeline (AnalyserNode tap) works identically to superdough.
