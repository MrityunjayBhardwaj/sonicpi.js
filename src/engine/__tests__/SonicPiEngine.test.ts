import { describe, it, expect, vi, beforeEach } from 'vitest'
import { SonicPiEngine } from '../SonicPiEngine'
import type { HapEvent } from '../HapStream'

describe('SonicPiEngine', () => {
  beforeEach(() => {
    // Clean up global SuperSonic (not available in test)
    delete (globalThis as Record<string, unknown>).SuperSonic
  })

  it('implements the LiveCodingEngine interface', () => {
    const engine = new SonicPiEngine()
    expect(typeof engine.init).toBe('function')
    expect(typeof engine.evaluate).toBe('function')
    expect(typeof engine.play).toBe('function')
    expect(typeof engine.stop).toBe('function')
    expect(typeof engine.dispose).toBe('function')
    expect(typeof engine.setRuntimeErrorHandler).toBe('function')
    expect(engine.components).toBeDefined()
  })

  it('init succeeds even without SuperSonic', async () => {
    const engine = new SonicPiEngine()
    await engine.init()
    // Should not throw — audio just won't work
    expect(engine.components.streaming).toBeDefined()
    engine.dispose()
  })

  it('evaluate returns error if not initialized', async () => {
    const engine = new SonicPiEngine()
    const result = await engine.evaluate('play(60)')
    expect(result.error).toBeDefined()
    expect(result.error!.message).toContain('not initialized')
  })

  it('evaluate parses and runs code', async () => {
    const engine = new SonicPiEngine()
    await engine.init()

    const result = await engine.evaluate(`
      live_loop("test", async (ctx) => {
        await ctx.play(60)
        await ctx.sleep(1)
      })
    `)

    expect(result.error).toBeUndefined()
    engine.dispose()
  })

  it('evaluate returns error for invalid code', async () => {
    const engine = new SonicPiEngine()
    await engine.init()

    const result = await engine.evaluate('this is not valid javascript {{{')
    expect(result.error).toBeDefined()
    engine.dispose()
  })

  it('components.streaming provides hapStream', async () => {
    const engine = new SonicPiEngine()
    await engine.init()

    expect(engine.components.streaming).toBeDefined()
    expect(engine.components.streaming!.hapStream).toBeDefined()

    engine.dispose()
  })

  it('components.queryable available for S1 code after evaluate', async () => {
    const engine = new SonicPiEngine()
    await engine.init()

    await engine.evaluate(`
      live_loop("drums", async (ctx) => {
        await ctx.play(60)
        await ctx.sleep(0.5)
      })
    `)

    // S1 code → queryable should be present
    expect(engine.components.queryable).toBeDefined()

    engine.dispose()
  })

  it('components.queryable not available for S3 code', async () => {
    const engine = new SonicPiEngine()
    await engine.init()

    await engine.evaluate(`
      live_loop("noisy", async (ctx) => {
        await ctx.play(Math.random() * 12 + 60)
        await ctx.sleep(0.5)
      })
    `)

    // S3 code → no queryable
    expect(engine.components.queryable).toBeUndefined()

    engine.dispose()
  })

  it('does not provide inlineViz (adapter concern)', async () => {
    const engine = new SonicPiEngine()
    await engine.init()

    await engine.evaluate(`
live_loop("drums", async (ctx) => {
  await ctx.play(60)
  await ctx.sleep(0.5)
})
// @viz scope
    `)

    // Viz parsing is the adapter's responsibility, not the engine's
    expect(engine.components.inlineViz).toBeUndefined()

    engine.dispose()
  })

  it('play and stop control scheduling', async () => {
    const engine = new SonicPiEngine()
    await engine.init()

    await engine.evaluate(`
      live_loop("test", async (ctx) => {
        await ctx.play(60)
        await ctx.sleep(1)
      })
    `)

    engine.play()
    // Just verify no errors
    engine.stop()
    engine.dispose()
  })

  it('hapStream receives events during playback', async () => {
    const engine = new SonicPiEngine()
    await engine.init()

    const events: HapEvent[] = []
    engine.components.streaming!.hapStream.on((e) => events.push(e))

    await engine.evaluate(`
      live_loop("test", async (ctx) => {
        await ctx.play(60)
        await ctx.sleep(999999)
      })
    `)

    // Manually tick the scheduler since we have no real audio context
    const scheduler = (engine as unknown as { scheduler: { tick: (t: number) => void } }).scheduler
    scheduler.tick(100)
    await new Promise((r) => setTimeout(r, 50))

    expect(events.length).toBeGreaterThanOrEqual(1)

    engine.dispose()
  })

  it('setRuntimeErrorHandler captures errors', async () => {
    const engine = new SonicPiEngine()
    await engine.init()

    const errors: Error[] = []
    engine.setRuntimeErrorHandler((err) => errors.push(err))

    // This should just work without errors
    await engine.evaluate(`
      live_loop("test", async (ctx) => {
        await ctx.play(60)
        await ctx.sleep(999999)
      })
    `)

    engine.dispose()
  })

  it('dispose cleans up everything', async () => {
    const engine = new SonicPiEngine()
    await engine.init()

    await engine.evaluate(`
      live_loop("test", async (ctx) => {
        await ctx.play(60)
        await ctx.sleep(1)
      })
    `)

    engine.play()
    engine.dispose()

    // After dispose, components should be minimal
    expect(engine.components.queryable).toBeUndefined()
  })

  it('re-evaluate without playing creates fresh scheduler', async () => {
    const engine = new SonicPiEngine()
    await engine.init()

    await engine.evaluate(`
      live_loop("drums", async (ctx) => {
        await ctx.play(60)
        await ctx.sleep(1)
      })
    `)

    const result = await engine.evaluate(`
      live_loop("drums", async (ctx) => {
        await ctx.play(64)
        await ctx.sleep(0.5)
      })
    `)

    expect(result.error).toBeUndefined()
    engine.dispose()
  })

  it('hot-swaps same-named loops while playing', async () => {
    const engine = new SonicPiEngine()
    await engine.init()

    await engine.evaluate(`
      live_loop("drums", async (ctx) => {
        await ctx.play(60)
        await ctx.sleep(1)
      })
    `)

    engine.play()
    const scheduler = (engine as any).scheduler

    // Advance virtual time
    scheduler.tick(100)
    await new Promise(r => setTimeout(r, 50))

    const vtBefore = scheduler.getTask('drums')?.virtualTime
    expect(vtBefore).toBeGreaterThan(0)

    // Re-evaluate with same loop name while playing
    await engine.evaluate(`
      live_loop("drums", async (ctx) => {
        await ctx.play(64)
        await ctx.sleep(0.5)
      })
    `)

    // Scheduler instance preserved (not destroyed and recreated)
    expect((engine as any).scheduler).toBe(scheduler)

    // Virtual time preserved
    expect(scheduler.getTask('drums')?.virtualTime).toBe(vtBefore)

    engine.dispose()
  })

  it('stops removed loops on re-evaluate', async () => {
    const engine = new SonicPiEngine()
    await engine.init()

    await engine.evaluate(`
      live_loop("drums", async (ctx) => {
        await ctx.play(60)
        await ctx.sleep(1)
      })
      live_loop("bass", async (ctx) => {
        await ctx.play(36)
        await ctx.sleep(1)
      })
    `)

    engine.play()
    const scheduler = (engine as any).scheduler
    scheduler.tick(100)
    await new Promise(r => setTimeout(r, 50))

    expect(scheduler.getTask('drums')?.running).toBe(true)
    expect(scheduler.getTask('bass')?.running).toBe(true)

    // Re-evaluate with only drums (bass removed)
    await engine.evaluate(`
      live_loop("drums", async (ctx) => {
        await ctx.play(64)
        await ctx.sleep(0.5)
      })
    `)

    // Bass should be stopped
    expect(scheduler.getTask('bass')?.running).toBe(false)
    // Drums should still be running
    expect(scheduler.getTask('drums')?.running).toBe(true)

    engine.dispose()
  })

  it('stop then evaluate creates fresh scheduler', async () => {
    const engine = new SonicPiEngine()
    await engine.init()

    await engine.evaluate(`
      live_loop("drums", async (ctx) => {
        await ctx.play(60)
        await ctx.sleep(1)
      })
    `)

    engine.play()
    const scheduler1 = (engine as any).scheduler

    engine.stop()
    expect((engine as any).scheduler).toBeNull()

    await engine.evaluate(`
      live_loop("drums", async (ctx) => {
        await ctx.play(64)
        await ctx.sleep(0.5)
      })
    `)

    // New scheduler created (not the old one)
    expect((engine as any).scheduler).not.toBe(scheduler1)
    expect((engine as any).scheduler).not.toBeNull()

    engine.dispose()
  })
})
