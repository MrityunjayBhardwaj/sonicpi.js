import { describe, it, expect } from 'vitest'
import { ProgramBuilder } from '../ProgramBuilder'
import { noteToMidi, midiToFreq } from '../NoteToFreq'

describe('ProgramBuilder', () => {
  it('play() adds a play step with correct note, opts, synth', () => {
    const b = new ProgramBuilder()
    b.play(60, { amp: 0.5 })
    const steps = b.build()

    expect(steps).toHaveLength(1)
    expect(steps[0].tag).toBe('play')
    const step = steps[0] as Extract<(typeof steps)[0], { tag: 'play' }>
    expect(step.note).toBe(60)
    expect(step.opts.amp).toBe(0.5)
    expect(step.opts.freq).toBe(midiToFreq(60))
    expect(step.synth).toBe('beep') // default synth
  })

  it('play() converts string notes to MIDI', () => {
    const b = new ProgramBuilder()
    b.play('c4')
    const steps = b.build()
    const step = steps[0] as Extract<(typeof steps)[0], { tag: 'play' }>
    expect(step.note).toBe(noteToMidi('c4'))
  })

  it('play() accepts per-note synth override via opts', () => {
    const b = new ProgramBuilder()
    b.play(60, { synth: 'prophet' } as Record<string, number>)
    const steps = b.build()
    const step = steps[0] as Extract<(typeof steps)[0], { tag: 'play' }>
    expect(step.synth).toBe('prophet')
    // synth should not appear in opts
    expect(step.opts).not.toHaveProperty('synth')
  })

  it('sleep() adds a sleep step', () => {
    const b = new ProgramBuilder()
    b.sleep(0.5)
    const steps = b.build()

    expect(steps).toHaveLength(1)
    expect(steps[0].tag).toBe('sleep')
    const step = steps[0] as Extract<(typeof steps)[0], { tag: 'sleep' }>
    expect(step.beats).toBe(0.5)
  })

  it('sample() adds a sample step', () => {
    const b = new ProgramBuilder()
    b.sample('bd_haus', { amp: 0.8 })
    const steps = b.build()

    expect(steps).toHaveLength(1)
    expect(steps[0].tag).toBe('sample')
    const step = steps[0] as Extract<(typeof steps)[0], { tag: 'sample' }>
    expect(step.name).toBe('bd_haus')
    expect(step.opts.amp).toBe(0.8)
  })

  it('use_synth() changes the synth for subsequent plays', () => {
    const b = new ProgramBuilder()
    b.play(60)
    b.use_synth('prophet')
    b.play(64)
    const steps = b.build()

    const play1 = steps[0] as Extract<(typeof steps)[0], { tag: 'play' }>
    const play2 = steps[2] as Extract<(typeof steps)[0], { tag: 'play' }>
    expect(play1.synth).toBe('beep')
    expect(play2.synth).toBe('prophet')
  })

  it('use_synth() also adds a useSynth step', () => {
    const b = new ProgramBuilder()
    b.use_synth('tb303')
    const steps = b.build()

    expect(steps).toHaveLength(1)
    expect(steps[0].tag).toBe('useSynth')
    const step = steps[0] as Extract<(typeof steps)[0], { tag: 'useSynth' }>
    expect(step.name).toBe('tb303')
  })

  it('use_bpm() adds a useBpm step', () => {
    const b = new ProgramBuilder()
    b.use_bpm(120)
    const steps = b.build()

    expect(steps).toHaveLength(1)
    expect(steps[0].tag).toBe('useBpm')
    const step = steps[0] as Extract<(typeof steps)[0], { tag: 'useBpm' }>
    expect(step.bpm).toBe(120)
  })

  it('rrand is deterministic with the same seed', () => {
    const b1 = new ProgramBuilder(42)
    const b2 = new ProgramBuilder(42)

    const vals1 = [b1.rrand(0, 100), b1.rrand(0, 100), b1.rrand(0, 100)]
    const vals2 = [b2.rrand(0, 100), b2.rrand(0, 100), b2.rrand(0, 100)]

    expect(vals1).toEqual(vals2)
  })

  it('choose is deterministic with the same seed', () => {
    const b1 = new ProgramBuilder(42)
    const b2 = new ProgramBuilder(42)

    const items = ['a', 'b', 'c', 'd']
    const vals1 = Array.from({ length: 5 }, () => b1.choose(items))
    const vals2 = Array.from({ length: 5 }, () => b2.choose(items))

    expect(vals1).toEqual(vals2)
    for (const v of vals1) {
      expect(items).toContain(v)
    }
  })

  it('dice is deterministic with the same seed', () => {
    const b1 = new ProgramBuilder(7)
    const b2 = new ProgramBuilder(7)

    const vals1 = Array.from({ length: 5 }, () => b1.dice(6))
    const vals2 = Array.from({ length: 5 }, () => b2.dice(6))

    expect(vals1).toEqual(vals2)
    for (const v of vals1) {
      expect(v).toBeGreaterThanOrEqual(1)
      expect(v).toBeLessThanOrEqual(6)
    }
  })

  it('different seeds produce different sequences', () => {
    const b1 = new ProgramBuilder(1)
    const b2 = new ProgramBuilder(999)

    const vals1 = Array.from({ length: 10 }, () => b1.rrand(0, 1000))
    const vals2 = Array.from({ length: 10 }, () => b2.rrand(0, 1000))

    expect(vals1).not.toEqual(vals2)
  })

  it('use_random_seed resets the RNG mid-build', () => {
    const b1 = new ProgramBuilder()
    b1.use_random_seed(42)
    const v1 = b1.rrand(0, 100)

    const b2 = new ProgramBuilder()
    b2.use_random_seed(42)
    const v2 = b2.rrand(0, 100)

    expect(v1).toBe(v2)
  })

  it('tick increments per call, look returns current value', () => {
    const b = new ProgramBuilder()

    expect(b.tick()).toBe(0)
    expect(b.tick()).toBe(1)
    expect(b.tick()).toBe(2)
    expect(b.look()).toBe(2) // last ticked value
  })

  it('tick/look support named counters', () => {
    const b = new ProgramBuilder()

    expect(b.tick('a')).toBe(0)
    expect(b.tick('b')).toBe(0)
    expect(b.tick('a')).toBe(1)
    expect(b.look('a')).toBe(1)
    expect(b.look('b')).toBe(0)
  })

  it('look returns 0 before any tick', () => {
    const b = new ProgramBuilder()
    expect(b.look()).toBe(0)
  })

  it('with_fx creates a nested program', () => {
    const b = new ProgramBuilder()
    b.with_fx('reverb', { room: 0.8 }, (inner) => {
      inner.play(60)
      inner.sleep(0.5)
      return inner
    })
    const steps = b.build()

    expect(steps).toHaveLength(1)
    expect(steps[0].tag).toBe('fx')
    const fxStep = steps[0] as Extract<(typeof steps)[0], { tag: 'fx' }>
    expect(fxStep.name).toBe('reverb')
    expect(fxStep.opts.room).toBe(0.8)
    expect(fxStep.body).toHaveLength(2)
    expect(fxStep.body[0].tag).toBe('play')
    expect(fxStep.body[1].tag).toBe('sleep')
  })

  it('with_fx works without opts', () => {
    const b = new ProgramBuilder()
    b.with_fx('reverb', (inner) => {
      inner.play(60)
      return inner
    })
    const steps = b.build()

    const fxStep = steps[0] as Extract<(typeof steps)[0], { tag: 'fx' }>
    expect(fxStep.name).toBe('reverb')
    expect(fxStep.body).toHaveLength(1)
  })

  it('puts() adds a print step', () => {
    const b = new ProgramBuilder()
    b.puts('hello', 'world')
    const steps = b.build()

    expect(steps).toHaveLength(1)
    expect(steps[0].tag).toBe('print')
    const step = steps[0] as Extract<(typeof steps)[0], { tag: 'print' }>
    expect(step.message).toBe('hello world')
  })

  it('puts() stringifies non-string arguments', () => {
    const b = new ProgramBuilder()
    b.puts('note:', 60)
    const steps = b.build()
    const step = steps[0] as Extract<(typeof steps)[0], { tag: 'print' }>
    expect(step.message).toBe('note: 60')
  })

  it('stop() adds a stop step', () => {
    const b = new ProgramBuilder()
    b.play(60)
    b.stop()
    b.play(64) // this still gets added to the array, but interpreters halt at stop
    const steps = b.build()

    expect(steps).toHaveLength(3)
    expect(steps[1].tag).toBe('stop')
  })

  it('build() returns a copy of steps', () => {
    const b = new ProgramBuilder()
    b.play(60)
    b.sleep(1)

    const steps1 = b.build()
    const steps2 = b.build()

    expect(steps1).toEqual(steps2)
    expect(steps1).not.toBe(steps2) // different array references
  })

  it('fluent chaining works', () => {
    const steps = new ProgramBuilder()
      .play(60)
      .sleep(0.5)
      .play(64)
      .sleep(0.5)
      .build()

    expect(steps).toHaveLength(4)
    expect(steps.map(s => s.tag)).toEqual(['play', 'sleep', 'play', 'sleep'])
  })
})
