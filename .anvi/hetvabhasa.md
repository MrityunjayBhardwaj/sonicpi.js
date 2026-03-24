# Error Patterns — Sonic Pi Web

## SP1: Promise Resolution Ordering
**Root cause:** Multiple tasks' Promises resolve in the same tick. The microtask queue processes them in an order the scheduler doesn't control.
**Detection signal:** Non-deterministic event ordering across runs.
**The trap:** Add setTimeout(0) between resolutions. Root fix: resolve in deterministic order (sort by virtualTime, then by taskId for ties).

## SP2: AudioContext User Gesture Requirement
**Root cause:** Browser autoplay policy requires user interaction before AudioContext.resume().
**Detection signal:** `init()` completes but no sound — AudioContext is in "suspended" state.
**The trap:** Call init() on page load. Root fix: init() must be called from a click/tap handler. The editor's handlePlay is triggered by user click.

## SP3: Virtual Time Drift from Floating Point
**Root cause:** Repeated float addition (0.5 + 0.5 + 0.5...) accumulates error.
**Detection signal:** After 1000 iterations, virtual time is 499.9999... instead of 500.
**The trap:** Use tolerance checks. Root fix: use rational arithmetic or multiply beats * index instead of accumulating.

## SP4: Hot-Swap Timing Gap
**Root cause:** On re-evaluate, old loop is killed and new loop starts from virtualTime=0, creating a timing discontinuity.
**Detection signal:** Audible glitch on code change — gap or overlap.
**The trap:** Restart loop from beginning. Root fix: hot-swap preserves the current virtualTime position — new function, same clock.

## SP5: SuperSonic SynthDef Not Loaded
**Root cause:** User calls `use_synth("prophet")` but SynthDef hasn't been loaded yet.
**Detection signal:** scsynth logs "SynthDef not found" but no JS error surfaces.
**The trap:** Pre-load all 127 SynthDefs (slow init). Root fix: lazy-load on first use with await, cache loaded set.

## SP6: Capture Mode Infinite Loop
**Root cause:** Fast-forward scheduler runs a live_loop that never calls sleep — infinite loop, browser hangs.
**Detection signal:** Tab freezes during queryArc.
**The trap:** Add timeout. Root fix: cap iterations per tick in capture mode. If a loop body has zero sleep, mark as non-capturable (Stratum 3).
