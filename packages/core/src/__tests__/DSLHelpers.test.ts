import { describe, it, expect } from 'vitest'
import { SeededRandom } from '../SeededRandom'
import { Ring, ring } from '../Ring'
import { spread } from '../EuclideanRhythm'
import { noteToMidi, midiToFreq, noteToFreq } from '../NoteToFreq'

describe('SeededRandom', () => {
  it('is deterministic with same seed', () => {
    const a = new SeededRandom(42)
    const b = new SeededRandom(42)

    const seqA = Array.from({ length: 10 }, () => a.next())
    const seqB = Array.from({ length: 10 }, () => b.next())

    expect(seqA).toEqual(seqB)
  })

  it('produces different sequences for different seeds', () => {
    const a = new SeededRandom(1)
    const b = new SeededRandom(2)

    expect(a.next()).not.toBe(b.next())
  })

  it('rrand stays in range', () => {
    const r = new SeededRandom(0)
    for (let i = 0; i < 100; i++) {
      const v = r.rrand(10, 20)
      expect(v).toBeGreaterThanOrEqual(10)
      expect(v).toBeLessThanOrEqual(20)
    }
  })

  it('choose returns elements from array', () => {
    const r = new SeededRandom(0)
    const arr = ['a', 'b', 'c']
    for (let i = 0; i < 20; i++) {
      expect(arr).toContain(r.choose(arr))
    }
  })

  it('dice returns integers in [1, sides]', () => {
    const r = new SeededRandom(0)
    for (let i = 0; i < 100; i++) {
      const v = r.dice(6)
      expect(v).toBeGreaterThanOrEqual(1)
      expect(v).toBeLessThanOrEqual(6)
      expect(Number.isInteger(v)).toBe(true)
    }
  })

  it('reset restores determinism', () => {
    const r = new SeededRandom(42)
    const v1 = r.next()
    r.reset(42)
    const v2 = r.next()
    expect(v1).toBe(v2)
  })
})

describe('Ring', () => {
  it('wraps positive indices', () => {
    const r = ring(1, 2, 3)
    expect(r.at(0)).toBe(1)
    expect(r.at(3)).toBe(1)
    expect(r.at(5)).toBe(3)
  })

  it('wraps negative indices', () => {
    const r = ring(1, 2, 3)
    expect(r.at(-1)).toBe(3)
    expect(r.at(-4)).toBe(3)
  })

  it('tick auto-increments', () => {
    const r = ring('a', 'b', 'c')
    expect(r.tick()).toBe('a')
    expect(r.tick()).toBe('b')
    expect(r.tick()).toBe('c')
    expect(r.tick()).toBe('a') // wraps
  })

  it('is iterable', () => {
    const r = ring(1, 2, 3)
    expect([...r]).toEqual([1, 2, 3])
  })
})

describe('spread (Euclidean rhythm)', () => {
  it('spread(3, 8) matches known Euclidean pattern', () => {
    const pattern = spread(3, 8).toArray()
    expect(pattern).toEqual([true, false, false, true, false, false, true, false])
  })

  it('spread(5, 8) matches known pattern', () => {
    const pattern = spread(5, 8).toArray()
    expect(pattern).toEqual([true, false, true, true, false, true, true, false])
  })

  it('spread(0, 4) is all false', () => {
    expect(spread(0, 4).toArray()).toEqual([false, false, false, false])
  })

  it('spread(4, 4) is all true', () => {
    expect(spread(4, 4).toArray()).toEqual([true, true, true, true])
  })

  it('spread with rotation shifts the pattern', () => {
    const base = spread(3, 8).toArray()
    const rotated = spread(3, 8, 1).toArray()
    expect(rotated).toEqual([...base.slice(1), base[0]])
  })

  it('returns a Ring', () => {
    const r = spread(3, 8)
    expect(r).toBeInstanceOf(Ring)
    // Ring wraps
    expect(r.at(8)).toBe(r.at(0))
  })
})

describe('NoteToFreq', () => {
  it('c4 → MIDI 60', () => {
    expect(noteToMidi('c4')).toBe(60)
  })

  it('a4 → MIDI 69', () => {
    expect(noteToMidi('a4')).toBe(69)
  })

  it('handles sharps', () => {
    expect(noteToMidi('cs4')).toBe(61)
    expect(noteToMidi('c#4')).toBe(61)
  })

  it('handles flats', () => {
    expect(noteToMidi('eb4')).toBe(63)
  })

  it('handles numeric strings', () => {
    expect(noteToMidi('60')).toBe(60)
  })

  it('handles numbers', () => {
    expect(noteToMidi(72)).toBe(72)
  })

  it('default octave is 4', () => {
    expect(noteToMidi('c')).toBe(60)
  })

  it('a4 → 440 Hz', () => {
    expect(midiToFreq(69)).toBeCloseTo(440, 1)
  })

  it('noteToFreq combines both', () => {
    expect(noteToFreq('a4')).toBeCloseTo(440, 1)
  })
})
