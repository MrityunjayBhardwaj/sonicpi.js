# JS Async Scheduling Patterns Research

## Core Pattern: Scheduler-Controlled Promise Resolution

```javascript
class VirtualTimeScheduler {
  sleep(beats) {
    return new Promise(resolve => {
      this.queue.push({ time: this.currentTime + beats, resolve })
      this.queue.sort((a, b) => a.time - b.time)
    })
  }

  tick(targetTime) {
    while (this.queue.length && this.queue[0].time <= targetTime) {
      const entry = this.queue.shift()
      this.currentTime = entry.time
      entry.resolve(this.currentTime)
    }
  }
}
```

Key: Promise never resolves on its own. Only scheduler's `tick()` calls `resolve()`.

## Tone.js Transport Architecture (3 layers)

1. **Clock** — binds to context tick event, fires callbacks via `TickSource.forEachTickBetween()`
2. **Transport** — converts TransportTime to ticks, manages `_timeline` and `_repeatedEvents`
3. **Events** — `Tone.Loop`, `Tone.Part`, `Tone.Sequence` built on Transport scheduling

Can Tone.Transport be the orchestrator? Yes for audio timing, but needs Promise-resolution layer on top for `await sleep()`.

## Web Audio "Tale of Two Clocks" (Chris Wilson)

```javascript
const scheduleAheadTime = 0.1  // 100ms lookahead
const timerInterval = 25        // 25ms tick

setInterval(() => {
  while (nextNoteTime < audioContext.currentTime + scheduleAheadTime) {
    scheduleNote(current16thNote, nextNoteTime)
    nextNote()
  }
}, timerInterval)
```

Guarantee: if `scheduleAheadTime > max_jitter(setInterval)`, no audio events missed.

Use `setInterval` NOT `requestAnimationFrame` — rAF throttles to ~1fps in background tabs.

## Generators vs Async/Await

| | Generators | Async/Await |
|---|---|---|
| Scheduler control | Full — runner calls `.next()` | Indirect — hold Promise resolve |
| Hot-swap | Replace generator ref | Must let iteration complete |
| User syntax | Requires `yield` keyword | Natural `await` |

Recommendation: async/await for user-facing code (natural syntax), generators internally if needed.

## Existing Virtual Time Schedulers

- **RxJS VirtualTimeScheduler** — frame-based flush, `advanceTo(frame)`. Designed for testing, not audio.
- **SIM.JS** — DES library with priority queue. Good architecture reference.
- **SimScript** — TypeScript DES using async/await natively.
- **No perfect off-the-shelf solution** for music virtual-time + audio clock integration.

## Hot-Swap Approaches

- **A: Function reference swap** — simple, loses closure state
- **B: Generator restart** — clean, loses accumulated state
- **C: Pattern swap (Strudel)** — atomic, stateless queryArc. Best for declarative.
- **D: Eval-per-iteration** — maximum flexibility, high overhead. Sonic Pi uses this.

Recommendation: Function swap (A) for live_loops with explicit state objects that survive swaps.

## Performance

- Promise resolution: <1ms for 100 concurrent voices at 50ms tick interval
- GC pressure: negligible at 800 Promises/second (100 voices * 8 notes/sec)
- Concurrent async functions: JS handles tens of thousands suspended (just objects in memory)
- Real bottleneck: Web Audio API calls and audio node creation, not scheduling

## Sources
- Chris Wilson, "A Tale of Two Clocks" (web.dev)
- Strudel cyclist.mjs (Codeberg)
- Tone.js Transport/Clock source
- V8 blog: fast-async
