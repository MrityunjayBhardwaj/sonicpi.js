# Lifecycle Patterns — Sonic Pi Web

## SK1: SonicPiEngine Full Lifecycle
1. `init()` — create SuperSonic, AudioContext, AnalyserNode, VirtualTimeScheduler — ASYNC
2. `evaluate(code)` — transpile, create DSL context, execute code (registers live_loops), parse @viz comments — ASYNC
3. `play()` — scheduler.start() begins tick() timer — SYNC
4. Scheduler tick() fires every 25ms — resolves sleep Promises up to audioTime + schedAheadTime — SYNC
5. Async functions resume at await points — trigger synths via SuperSonic OSC — SYNC per resolution
6. `stop()` — scheduler.stop(), free all synth nodes — SYNC
7. `dispose()` — stop + destroy SuperSonic + clear HapStream — SYNC

## SK2: VirtualTimeScheduler Tick Cycle
1. setInterval fires (~25ms) — ASYNC (macrotask)
2. Read audioContext.currentTime — SYNC
3. Compute targetTime = audioTime + schedAheadTime — SYNC
4. While queue.peek().time <= targetTime: pop and resolve — SYNC
5. Each resolve() triggers microtask: async function resumes — MICROTASK
6. Resumed function calls play() → queues OSC to SuperSonic — SYNC
7. Resumed function calls sleep() → new Promise pushed to queue — SYNC
8. Function suspends at next await — MICROTASK completes

**Common violation:** Resolving Promises outside tick() (breaks SV2).

## SK3: live_loop Registration and Execution
1. evaluate() executes code — SYNC within eval scope
2. `live_loop("name", fn)` registers task with scheduler — SYNC
3. scheduler.start() begins tick timer — SYNC
4. First tick: task's virtualTime=0 is <= targetTime → resolve initial sleep(0) — SYNC
5. fn() begins executing — ASYNC
6. fn() calls play(), sleep(), etc. — each await suspends
7. On loop body completion: scheduler re-registers for next iteration — SYNC
8. Hot-swap: replace fn reference, next iteration uses new fn — SYNC

**Common violation:** Starting fn() before scheduler.start() (no tick to resolve sleeps).

## SK4: SuperSonic Note Trigger
1. DSL play() called at virtual time T — SYNC
2. Compute audioTime = T + schedAheadTime — SYNC
3. Call sonic.send("/s_new", synthDef, nodeId, ...) — SYNC (queued internally)
4. SuperSonic's Prescheduler holds messages >500ms in future — ASYNC worker
5. Messages <=500ms go to AudioWorklet — postMessage or SAB
6. AudioWorklet's WASM BundleScheduler dispatches at sample-accurate time — AUDIO THREAD

**Common violation:** Calling sonic.send before init() completes (WASM not loaded).

## SK5: Capture Mode (Fast-Forward for queryArc)
1. Create fresh scheduler in capture mode — SYNC
2. Register loops from evaluate — SYNC
3. Run scheduler.runUntilCapture(endTime) — ASYNC
4. For each queue entry <= endTime: resolve immediately (no real-time wait) — SYNC
5. Each resolve triggers play() which captures event instead of triggering audio — SYNC
6. Continue until all tasks have virtualTime > endTime or max iterations hit — LOOP
7. Return collected events — SYNC

**Common violation:** Infinite loop if live_loop body has no sleep (SP6 error pattern).
