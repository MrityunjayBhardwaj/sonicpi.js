import { describe, it, expect } from 'vitest'
import { VirtualTimeScheduler } from '../VirtualTimeScheduler'
import { createDSLContext } from '../DSLContext'

async function flushMicrotasks(rounds = 10) {
  for (let i = 0; i < rounds; i++) {
    await new Promise((r) => setTimeout(r, 0))
  }
}

describe('sync/cue', () => {
  it('sync waits for cue and inherits virtual time (SV5)', async () => {
    const scheduler = new VirtualTimeScheduler({
      getAudioTime: () => 0,
      schedAheadTime: 100,
    })
    const dsl = createDSLContext({ scheduler })
    const events: string[] = []

    dsl.live_loop('metro', async (ctx) => {
      await ctx.sleep(1)
      ctx.cue('tick')
      events.push(`cue@${scheduler.getTask('metro')!.virtualTime}`)
      await ctx.sleep(999999)
    })

    dsl.live_loop('player', async (ctx) => {
      await ctx.sync('tick')
      events.push(`sync@${scheduler.getTask('player')!.virtualTime}`)
      await ctx.sleep(999999)
    })

    scheduler.tick(100)
    await flushMicrotasks()

    scheduler.tick(100)
    await flushMicrotasks()

    expect(events).toContain('cue@1')
    expect(events).toContain('sync@1')
  })

  it('multiple tasks can sync on the same cue', async () => {
    const scheduler = new VirtualTimeScheduler({
      getAudioTime: () => 0,
      schedAheadTime: 100,
    })
    const dsl = createDSLContext({ scheduler })
    const synced: string[] = []
    const vtAtSync: Record<string, number> = {}

    dsl.live_loop('source', async (ctx) => {
      await ctx.sleep(1)
      ctx.cue('go')
      await ctx.sleep(999999)
    })

    dsl.live_loop('waiter1', async (ctx) => {
      await ctx.sync('go')
      vtAtSync['waiter1'] = scheduler.getTask('waiter1')!.virtualTime
      synced.push('waiter1')
      await ctx.sleep(999999)
    })

    dsl.live_loop('waiter2', async (ctx) => {
      await ctx.sync('go')
      vtAtSync['waiter2'] = scheduler.getTask('waiter2')!.virtualTime
      synced.push('waiter2')
      await ctx.sleep(999999)
    })

    scheduler.tick(100)
    await flushMicrotasks()

    scheduler.tick(100)
    await flushMicrotasks()

    expect(synced).toContain('waiter1')
    expect(synced).toContain('waiter2')

    expect(vtAtSync['waiter1']).toBe(1)
    expect(vtAtSync['waiter2']).toBe(1)
  })

  it('sync resolves immediately if cue already fired', async () => {
    const scheduler = new VirtualTimeScheduler({
      getAudioTime: () => 0,
      schedAheadTime: 100,
    })

    scheduler.registerLoop('source', async () => {
      await scheduler.scheduleSleep('source', 999999)
    })
    scheduler.tick(100)
    await flushMicrotasks()

    scheduler.getTask('source')!.virtualTime = 2.5
    scheduler.fireCue('ready', 'source')

    let syncedTime = -1
    scheduler.registerLoop('late', async () => {
      const args = await scheduler.waitForSync('ready', 'late')
      syncedTime = scheduler.getTask('late')!.virtualTime
      await scheduler.scheduleSleep('late', 999999)
    })

    scheduler.tick(100)
    await flushMicrotasks()

    expect(syncedTime).toBe(2.5)
  })

  it('cue passes arguments to sync', async () => {
    const scheduler = new VirtualTimeScheduler({
      getAudioTime: () => 0,
      schedAheadTime: 100,
    })
    const dsl = createDSLContext({ scheduler })
    let receivedArgs: unknown[] = []

    dsl.live_loop('sender', async (ctx) => {
      await ctx.sleep(0.5)
      ctx.cue('data', 42, 'hello')
      await ctx.sleep(999999)
    })

    dsl.live_loop('receiver', async (ctx) => {
      receivedArgs = await ctx.sync('data')
      await ctx.sleep(999999)
    })

    scheduler.tick(100)
    await flushMicrotasks()
    scheduler.tick(100)
    await flushMicrotasks()

    expect(receivedArgs).toEqual([42, 'hello'])
  })
})
