import { describe, it, expect } from 'vitest'
import { CaptureScheduler, detectStratum, Stratum } from '../CaptureScheduler'

describe('CaptureScheduler', () => {
  it('captures events from a simple loop', async () => {
    const capture = new CaptureScheduler()
    const events = await capture.runUntilCapture((dsl) => {
      dsl.live_loop('test', async (ctx) => {
        await ctx.play(60)
        await ctx.sleep(0.5)
        await ctx.play(64)
        await ctx.sleep(0.5)
      })
    }, 2) // capture 2 seconds

    // At 60bpm, 1 beat = 1s. sleep(0.5) = 0.5s
    // Events at t=0 (play 60), t=0.5 (play 64), t=1.0 (play 60), t=1.5 (play 64)
    const synthEvents = events.filter(e => e.type === 'synth')
    expect(synthEvents.length).toBeGreaterThanOrEqual(4)
    expect(synthEvents[0].params.note).toBe(60)
    expect(synthEvents[1].params.note).toBe(64)
  })

  it('captures sample events', async () => {
    const capture = new CaptureScheduler()
    const events = await capture.runUntilCapture((dsl) => {
      dsl.live_loop('drums', async (ctx) => {
        await ctx.sample('bd_haus')
        await ctx.sleep(0.5)
        await ctx.sample('sn_dub')
        await ctx.sleep(0.5)
      })
    }, 1)

    const sampleEvents = events.filter(e => e.type === 'sample')
    expect(sampleEvents.length).toBeGreaterThanOrEqual(2)
    expect(sampleEvents[0].params.name).toBe('bd_haus')
    expect(sampleEvents[1].params.name).toBe('sn_dub')
  })

  it('produces deterministic events (SV3)', async () => {
    const capture = new CaptureScheduler()

    const run = async () => capture.runUntilCapture((dsl) => {
      dsl.live_loop('test', async (ctx) => {
        await ctx.play(60)
        await ctx.sleep(0.25)
      })
    }, 1)

    const events1 = await run()
    const events2 = await run()

    expect(events1.map(e => `${e.type}:${e.time}`))
      .toEqual(events2.map(e => `${e.type}:${e.time}`))
  })

  it('respects maxIterations to prevent infinite loops (SP6)', async () => {
    const capture = new CaptureScheduler({ maxIterations: 50 })

    // This should not hang — maxIterations caps execution
    const events = await capture.runUntilCapture((dsl) => {
      dsl.live_loop('fast', async (ctx) => {
        await ctx.play(60)
        await ctx.sleep(0.01) // very short sleep
      })
    }, 1000) // long time range

    // Should have some events but not infinite
    expect(events.length).toBeGreaterThan(0)
    expect(events.length).toBeLessThan(10000)
  })

  it('captures events from multiple loops', async () => {
    const capture = new CaptureScheduler()
    const events = await capture.runUntilCapture((dsl) => {
      dsl.live_loop('drums', async (ctx) => {
        await ctx.sample('kick')
        await ctx.sleep(1)
      })
      dsl.live_loop('bass', async (ctx) => {
        await ctx.play(36)
        await ctx.sleep(1)
      })
    }, 1)

    const drums = events.filter(e => e.taskId === 'drums')
    const bass = events.filter(e => e.taskId === 'bass')
    expect(drums.length).toBeGreaterThanOrEqual(1)
    expect(bass.length).toBeGreaterThanOrEqual(1)
  })
})

describe('detectStratum', () => {
  it('S1: pure deterministic code', () => {
    const code = `
      live_loop("drums", async (ctx) => {
        await ctx.play(60)
        await ctx.sleep(0.5)
        await ctx.play(64)
        await ctx.sleep(0.5)
      })
    `
    expect(detectStratum(code)).toBe(Stratum.S1)
  })

  it('S2: seeded random', () => {
    const code = `
      live_loop("melody", async (ctx) => {
        ctx.use_random_seed(42)
        await ctx.play(ctx.choose([60, 64, 67]))
        await ctx.sleep(0.5)
      })
    `
    expect(detectStratum(code)).toBe(Stratum.S2)
  })

  it('S2: rrand usage', () => {
    const code = `
      live_loop("melody", async (ctx) => {
        await ctx.play(ctx.rrand(60, 72))
        await ctx.sleep(0.5)
      })
    `
    expect(detectStratum(code)).toBe(Stratum.S2)
  })

  it('S3: sync/cue', () => {
    const code = `
      live_loop("metro", async (ctx) => {
        ctx.cue("tick")
        await ctx.sleep(1)
      })
    `
    expect(detectStratum(code)).toBe(Stratum.S3)
  })

  it('S3: Math.random', () => {
    const code = `
      live_loop("noisy", async (ctx) => {
        await ctx.play(Math.random() * 12 + 60)
        await ctx.sleep(0.5)
      })
    `
    expect(detectStratum(code)).toBe(Stratum.S3)
  })

  it('S3: external state mutation', () => {
    const code = `
      let counter = 0
      live_loop("count", async (ctx) => {
        counter += 1
        await ctx.play(counter % 12 + 60)
        await ctx.sleep(0.25)
      })
    `
    expect(detectStratum(code)).toBe(Stratum.S3)
  })
})
