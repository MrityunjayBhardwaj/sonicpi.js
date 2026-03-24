import { describe, it, expect } from 'vitest'
import { VirtualTimeScheduler, type SchedulerEvent } from '../VirtualTimeScheduler'
import { createDSLContext } from '../DSLContext'

async function flushMicrotasks(rounds = 10) {
  for (let i = 0; i < rounds; i++) {
    await new Promise((r) => setTimeout(r, 0))
  }
}

function createTestEnv() {
  const events: SchedulerEvent[] = []
  const scheduler = new VirtualTimeScheduler({
    getAudioTime: () => 0,
    schedAheadTime: 100,
  })
  scheduler.onEvent((e) => events.push(e))
  const dsl = createDSLContext({ scheduler })
  return { scheduler, events, dsl }
}

describe('DSLContext', () => {
  it('live_loop + play emits synth events', async () => {
    const { scheduler, events, dsl } = createTestEnv()

    dsl.live_loop('test', async (ctx) => {
      await ctx.play(60)
      await ctx.sleep(1)
    })

    scheduler.tick(100)
    await flushMicrotasks()

    expect(events.length).toBeGreaterThanOrEqual(1)
    expect(events[0].type).toBe('synth')
    expect(events[0].params.note).toBe(60)
    expect(events[0].taskId).toBe('test')
  })

  it('sample emits sample events', async () => {
    const { scheduler, events, dsl } = createTestEnv()

    dsl.live_loop('drums', async (ctx) => {
      await ctx.sample('bd_haus')
      await ctx.sleep(0.5)
    })

    scheduler.tick(100)
    await flushMicrotasks()

    expect(events[0].type).toBe('sample')
    expect(events[0].params.name).toBe('bd_haus')
  })

  it('use_synth changes the synth for play events', async () => {
    const { scheduler, events, dsl } = createTestEnv()

    dsl.live_loop('test', async (ctx) => {
      ctx.use_synth('prophet')
      await ctx.play(60)
      await ctx.sleep(999999)
    })

    scheduler.tick(100)
    await flushMicrotasks()

    expect(events[0].params.synth).toBe('prophet')
  })

  it('use_bpm affects sleep duration', async () => {
    const { scheduler, dsl } = createTestEnv()

    dsl.live_loop('fast', async (ctx) => {
      ctx.use_bpm(120)
      await ctx.sleep(1) // 1 beat at 120bpm = 0.5s
      await ctx.sleep(999999)
    })

    scheduler.tick(100)
    await flushMicrotasks()
    scheduler.tick(100)
    await flushMicrotasks()

    const task = scheduler.getTask('fast')!
    expect(task.virtualTime).toBeGreaterThan(0)
  })

  it('seeded random is deterministic per task', async () => {
    const values1: number[] = []
    const values2: number[] = []

    for (let run = 0; run < 2; run++) {
      const values = run === 0 ? values1 : values2
      const s = new VirtualTimeScheduler({
        getAudioTime: () => 0,
        schedAheadTime: 100,
      })
      const d = createDSLContext({ scheduler: s })

      d.live_loop('test', async (ctx) => {
        ctx.use_random_seed(42)
        values.push(ctx.rrand(0, 100))
        values.push(ctx.rrand(0, 100))
        await ctx.sleep(999999)
      })

      s.tick(100)
      await flushMicrotasks()
      s.dispose()
    }

    expect(values1).toEqual(values2)
  })

  it('choose returns elements from the given array', async () => {
    const { scheduler, dsl } = createTestEnv()
    const chosen: string[] = []

    dsl.live_loop('test', async (ctx) => {
      ctx.use_random_seed(0)
      for (let i = 0; i < 5; i++) {
        chosen.push(ctx.choose(['a', 'b', 'c']))
      }
      await ctx.sleep(999999)
    })

    scheduler.tick(100)
    await flushMicrotasks()

    expect(chosen.length).toBe(5)
    for (const v of chosen) {
      expect(['a', 'b', 'c']).toContain(v)
    }
  })

  it('_makeTaskDSL creates bound functions', () => {
    const { dsl, scheduler } = createTestEnv()
    // Register a task manually so getTask works
    scheduler.registerLoop('test', async () => {
      await scheduler.scheduleSleep('test', 999999)
    })

    const taskDSL = dsl._makeTaskDSL('test')
    expect(typeof taskDSL.play).toBe('function')
    expect(typeof taskDSL.sleep).toBe('function')
    expect(typeof taskDSL.sample).toBe('function')
  })
})
