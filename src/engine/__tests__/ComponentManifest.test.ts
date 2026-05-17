import { describe, it, expect } from 'vitest'
import { collectComponentManifest } from '../ComponentManifest'
import type { Program } from '../Program'

describe('collectComponentManifest (#318.1 / #321)', () => {
  it('collects the synth name baked onto a play step', () => {
    const p: Program = [
      { tag: 'useSynth', name: 'prophet' },
      { tag: 'play', note: 60, opts: {}, synth: 'prophet' },
    ]
    const m = collectComponentManifest(p)
    expect([...m.synths]).toEqual(['prophet'])
    // useSynth itself is NOT collected — only what a play step actually uses.
    expect(m.synths.has('useSynth')).toBe(false)
  })

  it('collects sample names', () => {
    const p: Program = [
      { tag: 'sample', name: 'bd_haus', opts: {} },
      { tag: 'sample', name: 'user_kick', opts: {} },
    ]
    expect([...collectComponentManifest(p).samples].sort()).toEqual([
      'bd_haus',
      'user_kick',
    ])
  })

  it('collects an FX name AND recurses into its body', () => {
    const p: Program = [
      {
        tag: 'fx',
        name: 'reverb',
        opts: {},
        body: [
          { tag: 'play', note: 64, opts: {}, synth: 'tb303' },
          { tag: 'sample', name: 'ambi_choir', opts: {} },
        ],
      },
    ]
    const m = collectComponentManifest(p)
    expect([...m.fx]).toEqual(['reverb'])
    expect([...m.synths]).toEqual(['tb303'])
    expect([...m.samples]).toEqual(['ambi_choir'])
  })

  it('recurses into nested fx and thread bodies (in_thread / with_fx)', () => {
    const p: Program = [
      {
        tag: 'thread',
        body: [
          {
            tag: 'fx',
            name: 'echo',
            opts: {},
            body: [
              {
                tag: 'fx',
                name: 'distortion',
                opts: {},
                body: [{ tag: 'play', note: 48, opts: {}, synth: 'dsaw' }],
              },
            ],
          },
        ],
      },
    ]
    const m = collectComponentManifest(p)
    expect([...m.fx].sort()).toEqual(['distortion', 'echo'])
    expect([...m.synths]).toEqual(['dsaw'])
  })

  it('deduplicates repeated names (Set semantics)', () => {
    const p: Program = [
      { tag: 'play', note: 60, opts: {}, synth: 'beep' },
      { tag: 'sleep', beats: 1 },
      { tag: 'play', note: 67, opts: {}, synth: 'beep' },
      { tag: 'sample', name: 'bd_haus', opts: {} },
      { tag: 'sample', name: 'bd_haus', opts: {} },
    ]
    const m = collectComponentManifest(p)
    expect(m.synths.size).toBe(1)
    expect(m.samples.size).toBe(1)
  })

  it('ignores tags that reference no CDN-loadable component', () => {
    const p: Program = [
      { tag: 'sleep', beats: 1 },
      { tag: 'cue', name: 'tick' },
      { tag: 'control', nodeRef: 1, params: {} },
      { tag: 'liveAudio', name: 'sound_in', opts: {} },
      { tag: 'midiOut', kind: 'noteOn', args: [60, 100, 1] },
      { tag: 'recordingStart' },
    ]
    const m = collectComponentManifest(p)
    expect(m.synths.size + m.samples.size + m.fx.size).toBe(0)
  })

  it('a play step missing the optional synth field is skipped, not crashed', () => {
    const p: Program = [{ tag: 'play', note: 60, opts: {} }]
    expect(collectComponentManifest(p).synths.size).toBe(0)
  })

  it('an empty program yields an empty manifest', () => {
    const m = collectComponentManifest([])
    expect(m.samples.size + m.fx.size + m.synths.size).toBe(0)
  })

  it('resolves synth aliases so the preflight loads the real synthdef (SP89 / #337)', () => {
    // `:sine` has no `sonic-pi-sine.scsyndef` in the CDN package — it aliases
    // to `beep` (SoundLayer.resolveSynthName, applied at /s_new time in
    // AudioInterpreter). The manifest must agree or the preflight resolver
    // fetches a 404 (SP89 CORS-masquerade) + spuriously times out.
    const p: Program = [
      { tag: 'play', note: 57, opts: {}, synth: 'sine' },
      { tag: 'play', note: 60, opts: {}, synth: 'mod_beep' },
      { tag: 'play', note: 62, opts: {}, synth: 'prophet' },
    ]
    const m = collectComponentManifest(p)
    expect([...m.synths].sort()).toEqual(['beep', 'mod_sine', 'prophet'])
    expect(m.synths.has('sine')).toBe(false)
    expect(m.synths.has('mod_beep')).toBe(false)
  })

  it('accumulates into a caller-provided manifest (multi-loop aggregation)', () => {
    const acc = { samples: new Set<string>(), fx: new Set<string>(), synths: new Set<string>() }
    collectComponentManifest([{ tag: 'play', note: 60, opts: {}, synth: 'beep' }], acc)
    collectComponentManifest([{ tag: 'sample', name: 'bd_haus', opts: {} }], acc)
    expect([...acc.synths]).toEqual(['beep'])
    expect([...acc.samples]).toEqual(['bd_haus'])
  })
})
