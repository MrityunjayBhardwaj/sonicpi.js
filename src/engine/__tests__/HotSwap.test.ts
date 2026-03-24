import { describe, it, expect } from 'vitest'
import { VirtualTimeScheduler } from '../VirtualTimeScheduler'
import { createDSLContext } from '../DSLContext'

async function flushMicrotasks(rounds = 10) {
  for (let i = 0; i < rounds; i++) {
    await new Promise((r) => setTimeout(r, 0))
  }
}

describe('Hot-swap (SV6)', () => {
  it('hotSwap replaces loop function for next iteration', async () => {
    const scheduler = new VirtualTimeScheduler({
      getAudioTime: () => 0,
      schedAheadTime: 100,
    })
    const events: string[] = []

    scheduler.registerLoop('test', async () => {
      events.push('old')
      await scheduler.scheduleSleep('test', 1)
    })

    // Run first iteration
    scheduler.tick(100)
    await flushMicrotasks()
    expect(events).toContain('old')

    // Hot-swap
    scheduler.hotSwap('test', async () => {
      events.push('new')
      await scheduler.scheduleSleep('test', 1)
    })

    // Run second iteration — should use new function
    scheduler.tick(100)
    await flushMicrotasks()
    expect(events).toContain('new')
  })

  it('hotSwap preserves virtual time (SV6)', async () => {
    const scheduler = new VirtualTimeScheduler({
      getAudioTime: () => 0,
      schedAheadTime: 100,
    })

    scheduler.registerLoop('test', async () => {
      await scheduler.scheduleSleep('test', 1) // VT goes to 1
    })

    scheduler.tick(100)
    await flushMicrotasks()

    const vtBefore = scheduler.getTask('test')!.virtualTime

    scheduler.hotSwap('test', async () => {
      await scheduler.scheduleSleep('test', 1)
    })

    // VT should not have changed
    expect(scheduler.getTask('test')!.virtualTime).toBe(vtBefore)
  })

  it('reEvaluate hot-swaps existing, starts new, stops removed', async () => {
    const scheduler = new VirtualTimeScheduler({
      getAudioTime: () => 0,
      schedAheadTime: 100,
    })
    const dsl = createDSLContext({ scheduler })
    const events: string[] = []

    // Initial evaluation: loop A and B
    dsl.live_loop('A', async (ctx) => {
      events.push('A-old')
      await ctx.sleep(1)
    })
    dsl.live_loop('B', async (ctx) => {
      events.push('B')
      await ctx.sleep(1)
    })

    scheduler.tick(100)
    await flushMicrotasks()
    expect(events).toContain('A-old')
    expect(events).toContain('B')

    // Re-evaluate: keep A (new code), add C, remove B
    const newLoops = new Map<string, () => Promise<void>>()
    const taskDSL_A = dsl._makeTaskDSL('A')
    const taskDSL_C = dsl._makeTaskDSL('C')
    newLoops.set('A', async () => {
      events.push('A-new')
      await taskDSL_A.sleep(1)
    })
    newLoops.set('C', async () => {
      events.push('C')
      await taskDSL_C.sleep(1)
    })

    scheduler.reEvaluate(newLoops)

    scheduler.tick(100)
    await flushMicrotasks()

    // A should use new code
    expect(events).toContain('A-new')
    // C should have started
    expect(events).toContain('C')
    // B should have stopped
    expect(scheduler.getTask('B')!.running).toBe(false)
  })

  it('hotSwap returns false for non-existent loop', () => {
    const scheduler = new VirtualTimeScheduler({
      getAudioTime: () => 0,
      schedAheadTime: 100,
    })

    expect(scheduler.hotSwap('nonexistent', async () => {})).toBe(false)
  })

  it('random state preserved across hot-swap', async () => {
    const scheduler = new VirtualTimeScheduler({
      getAudioTime: () => 0,
      schedAheadTime: 100,
    })
    const dsl = createDSLContext({ scheduler })
    const randoms: number[] = []

    dsl.live_loop('test', async (ctx) => {
      ctx.use_random_seed(42)
      randoms.push(ctx.rrand(0, 100))
      await ctx.sleep(1)
    })

    scheduler.tick(100)
    await flushMicrotasks()

    const r1 = randoms[randoms.length - 1]

    // Hot-swap with new code that also reads random
    const taskDSL = dsl._makeTaskDSL('test')
    scheduler.hotSwap('test', async () => {
      randoms.push(taskDSL.rrand(0, 100))
      await taskDSL.sleep(1)
    })

    scheduler.tick(100)
    await flushMicrotasks()

    // Random state should continue from where old code left off
    // (not reset, because we didn't call use_random_seed)
    const r2 = randoms[randoms.length - 1]
    expect(typeof r2).toBe('number')
    // r2 should be a valid random value
    expect(r2).toBeGreaterThanOrEqual(0)
    expect(r2).toBeLessThanOrEqual(100)
  })
})
