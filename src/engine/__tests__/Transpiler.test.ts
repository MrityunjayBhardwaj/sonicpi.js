import { describe, it, expect } from 'vitest'
import { addMissingAwaits, transpile, createExecutor } from '../Transpiler'

describe('addMissingAwaits', () => {
  it('adds await before play()', () => {
    expect(addMissingAwaits('play(60)')).toBe('await play(60)')
  })

  it('adds await before sleep()', () => {
    expect(addMissingAwaits('sleep(0.5)')).toBe('await sleep(0.5)')
  })

  it('adds await before sample()', () => {
    expect(addMissingAwaits('sample("bd_haus")')).toBe('await sample("bd_haus")')
  })

  it('does not double-await', () => {
    expect(addMissingAwaits('await play(60)')).toBe('await play(60)')
  })

  it('handles multiple calls', () => {
    const input = `play(60)\nsleep(0.5)\nplay(64)`
    const expected = `await play(60)\nawait sleep(0.5)\nawait play(64)`
    expect(addMissingAwaits(input)).toBe(expected)
  })

  it('does not affect method calls (e.g., foo.play())', () => {
    expect(addMissingAwaits('foo.play(60)')).toBe('foo.play(60)')
  })

  it('does not affect non-DSL functions', () => {
    expect(addMissingAwaits('console.log("hi")')).toBe('console.log("hi")')
  })

  it('handles mixed awaited and non-awaited', () => {
    const input = `await play(60)\nsleep(0.5)\nawait sample("bd_haus")`
    const expected = `await play(60)\nawait sleep(0.5)\nawait sample("bd_haus")`
    expect(addMissingAwaits(input)).toBe(expected)
  })
})

describe('transpile', () => {
  it('returns code as-is (no await injection)', () => {
    const result = transpile('play(60)\nsleep(0.5)')
    expect(result.code).toBe('play(60)\nsleep(0.5)')
  })
})

describe('createExecutor', () => {
  it('creates a callable async function', async () => {
    const called: string[] = []
    const mockPlay = async (n: number) => { called.push(`play:${n}`) }
    const mockSleep = async (b: number) => { called.push(`sleep:${b}`) }

    const code = 'await play(60)\nawait sleep(0.5)\nawait play(64)'
    const fn = createExecutor(code, ['play', 'sleep'])
    await fn(mockPlay, mockSleep)

    expect(called).toEqual(['play:60', 'sleep:0.5', 'play:64'])
  })

  it('has access to DSL functions by name', async () => {
    let synthName = ''
    const mockUseSynth = (name: string) => { synthName = name }

    const code = 'use_synth("prophet")'
    const fn = createExecutor(code, ['use_synth'])
    await fn(mockUseSynth)

    expect(synthName).toBe('prophet')
  })
})
