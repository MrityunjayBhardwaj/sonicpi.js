/**
 * Example gallery — classic Sonic Pi patterns in both Ruby DSL and JS DSL.
 *
 * Each example has: name, description, Ruby code (for the transpiler),
 * and JS code (native DSL). Both should produce identical output.
 */

export interface Example {
  name: string
  description: string
  ruby: string
  js: string
}

export const examples: Example[] = [
  {
    name: 'Hello Beep',
    description: 'The simplest possible Sonic Pi program — one note.',
    ruby: `\
play 60
sleep 1
play 64
sleep 1
play 67`,
    js: `\
live_loop("hello", async ({play, sleep}) => {
  await play(60)
  await sleep(1)
  await play(64)
  await sleep(1)
  await play(67)
  await sleep(1)
})`,
  },

  {
    name: 'Basic Beat',
    description: 'A four-on-the-floor drum pattern with kick and snare.',
    ruby: `\
live_loop :drums do
  sample :bd_haus
  sleep 0.5
  sample :sn_dub
  sleep 0.5
end`,
    js: `\
live_loop("drums", async ({sample, sleep}) => {
  await sample("bd_haus")
  await sleep(0.5)
  await sample("sn_dub")
  await sleep(0.5)
})`,
  },

  {
    name: 'Ambient Pad',
    description: 'Slow chord washes with reverb — ambient music in 6 lines.',
    ruby: `\
use_synth :prophet
live_loop :pad do
  play chord(:e3, :minor), release: 4, amp: 0.6
  sleep 4
end`,
    js: `\
live_loop("pad", async ({play, sleep, use_synth, chord}) => {
  use_synth("prophet")
  const notes = chord("e3", "minor")
  for (const n of notes) {
    await play(n, {release: 4, amp: 0.6})
  }
  await sleep(4)
})`,
  },

  {
    name: 'Arpeggio',
    description: 'A rising arpeggio using ring and tick — Sonic Pi\'s signature pattern.',
    ruby: `\
use_synth :tb303
live_loop :arp do
  play (ring 60, 64, 67, 72).tick, release: 0.2, cutoff: 80
  sleep 0.25
end`,
    js: `\
live_loop("arp", async ({play, sleep, use_synth, ring, tick}) => {
  use_synth("tb303")
  const notes = ring(60, 64, 67, 72)
  await play(notes[tick()], {release: 0.2, cutoff: 80})
  await sleep(0.25)
})`,
  },

  {
    name: 'Euclidean Rhythm',
    description: 'Euclidean rhythms — spread hits evenly across steps.',
    ruby: `\
live_loop :euclidean do
  pattern = spread(5, 8)
  8.times do |i|
    sample :bd_tek if pattern[i]
    sleep 0.25
  end
end`,
    js: `\
live_loop("euclidean", async ({sample, sleep, spread}) => {
  const pattern = spread(5, 8)
  for (let i = 0; i < 8; i++) {
    if (pattern[i]) await sample("bd_tek")
    await sleep(0.25)
  }
})`,
  },

  {
    name: 'Random Melody',
    description: 'Seeded random melody — deterministic but unpredictable.',
    ruby: `\
use_random_seed 42
live_loop :melody do
  use_synth :pluck
  play scale(:c4, :minor_pentatonic).choose, release: 0.3
  sleep 0.25
end`,
    js: `\
live_loop("melody", async ({play, sleep, use_synth, use_random_seed, scale, choose}) => {
  use_random_seed(42)
  use_synth("pluck")
  const notes = scale("c4", "minor_pentatonic")
  await play(choose(notes), {release: 0.3})
  await sleep(0.25)
})`,
  },

  {
    name: 'Sync/Cue',
    description: 'Two loops synchronized — the bass waits for the drums.',
    ruby: `\
live_loop :drums do
  sample :bd_haus
  sleep 0.5
  cue :tick
  sample :sn_dub
  sleep 0.5
end

live_loop :bass do
  sync :tick
  use_synth :tb303
  play :e2, release: 0.3, cutoff: 70
  sleep 0.5
end`,
    js: `\
live_loop("drums", async ({sample, sleep, cue}) => {
  await sample("bd_haus")
  await sleep(0.5)
  cue("tick")
  await sample("sn_dub")
  await sleep(0.5)
})

live_loop("bass", async ({play, sleep, sync, use_synth}) => {
  await sync("tick")
  use_synth("tb303")
  await play("e2", {release: 0.3, cutoff: 70})
  await sleep(0.5)
})`,
  },

  {
    name: 'Multi-Layer',
    description: 'Three simultaneous loops — drums, bass, and lead.',
    ruby: `\
use_bpm 120

live_loop :drums do
  sample :bd_haus
  sleep 0.5
  sample :hat_snap
  sleep 0.25
  sample :hat_snap
  sleep 0.25
end

live_loop :bass do
  use_synth :tb303
  notes = ring(:e2, :e2, :g2, :a2)
  play notes.tick, release: 0.3, cutoff: 60
  sleep 1
end

live_loop :lead do
  use_synth :pluck
  play scale(:e4, :minor_pentatonic).choose, release: 0.2
  sleep 0.25
end`,
    js: `\
live_loop("drums", async ({sample, sleep, use_bpm}) => {
  use_bpm(120)
  await sample("bd_haus")
  await sleep(0.5)
  await sample("hat_snap")
  await sleep(0.25)
  await sample("hat_snap")
  await sleep(0.25)
})

live_loop("bass", async ({play, sleep, use_synth, use_bpm, ring, tick}) => {
  use_bpm(120)
  use_synth("tb303")
  const notes = ring("e2", "e2", "g2", "a2")
  await play(notes[tick()], {release: 0.3, cutoff: 60})
  await sleep(1)
})

live_loop("lead", async ({play, sleep, use_synth, use_bpm, scale, choose}) => {
  use_bpm(120)
  use_synth("pluck")
  const notes = scale("e4", "minor_pentatonic")
  await play(choose(notes), {release: 0.2})
  await sleep(0.25)
})`,
  },

  {
    name: 'FX Chain',
    description: 'Nested effects — reverb wrapping distortion.',
    ruby: `\
live_loop :fx_demo do
  with_fx :reverb, room: 0.8 do
    with_fx :distortion, distort: 0.5 do
      play 50, release: 0.5
      sleep 0.5
      play 55, release: 0.5
      sleep 0.5
    end
  end
end`,
    js: `\
live_loop("fx_demo", async (ctx) => {
  await ctx.with_fx("reverb", {room: 0.8}, async (rv) => {
    await rv.with_fx("distortion", {distort: 0.5}, async (dist) => {
      await dist.play(50, {release: 0.5})
      await dist.sleep(0.5)
      await dist.play(55, {release: 0.5})
      await dist.sleep(0.5)
    })
  })
})`,
  },

  {
    name: 'Minimal Techno',
    description: 'A stripped-down techno loop with Euclidean hi-hats.',
    ruby: `\
use_bpm 130

live_loop :kick do
  sample :bd_haus, amp: 1.5
  sleep 1
end

live_loop :hats do
  pattern = spread(7, 16)
  16.times do |i|
    sample :hat_snap, amp: 0.4 if pattern[i]
    sleep 0.25
  end
end

live_loop :acid do
  use_synth :tb303
  notes = ring(:e2, :e2, :e3, :e2, :g2, :e2, :a2, :e2)
  play notes.tick, release: 0.2, cutoff: rrand(40, 120), res: 0.3
  sleep 0.25
end`,
    js: `\
live_loop("kick", async ({sample, sleep, use_bpm}) => {
  use_bpm(130)
  await sample("bd_haus", {amp: 1.5})
  await sleep(1)
})

live_loop("hats", async ({sample, sleep, use_bpm, spread}) => {
  use_bpm(130)
  const pattern = spread(7, 16)
  for (let i = 0; i < 16; i++) {
    if (pattern[i]) await sample("hat_snap", {amp: 0.4})
    await sleep(0.25)
  }
})

live_loop("acid", async ({play, sleep, use_synth, use_bpm, ring, tick, rrand}) => {
  use_bpm(130)
  use_synth("tb303")
  const notes = ring("e2", "e2", "e3", "e2", "g2", "e2", "a2", "e2")
  await play(notes[tick()], {release: 0.2, cutoff: rrand(40, 120), res: 0.3})
  await sleep(0.25)
})`,
  },
]

/** Get an example by name (case-insensitive). */
export function getExample(name: string): Example | undefined {
  return examples.find(e => e.name.toLowerCase() === name.toLowerCase())
}

/** Get all example names. */
export function getExampleNames(): string[] {
  return examples.map(e => e.name)
}
