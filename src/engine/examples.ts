/**
 * Example gallery — classic Sonic Pi patterns in both Ruby DSL and JS DSL.
 *
 * Each example has: name, description, Ruby code (for the transpiler),
 * and JS code (native DSL). Both should produce identical output.
 */

export type Difficulty = 'beginner' | 'intermediate' | 'advanced'

export interface Example {
  name: string
  description: string
  difficulty: Difficulty
  ruby: string
  js: string
}

export const examples: Example[] = [
  {
    name: 'Hello Beep',
    difficulty: 'beginner',
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
    difficulty: 'beginner',
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
    difficulty: 'beginner',
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
    difficulty: 'intermediate',
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
    difficulty: 'intermediate',
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
    difficulty: 'intermediate',
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
    difficulty: 'intermediate',
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
    difficulty: 'intermediate',
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
    difficulty: 'intermediate',
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
    difficulty: 'intermediate',
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
  // ========================================================================
  // Advanced — Song recreations (recognizable riffs/drops in Sonic Pi style)
  // ========================================================================

  {
    name: 'Faded (Alan Walker)',
    difficulty: 'advanced',
    description: 'The iconic "Faded" lead melody and pulsing bass — ethereal EDM.',
    ruby: `\
use_bpm 90

# The haunting lead melody
live_loop :lead do
  use_synth :saw
  with_fx :reverb, room: 0.8, mix: 0.6 do
    with_fx :echo, phase: 0.375, decay: 4, mix: 0.4 do
      # Faded main melody (Em - G - D - C)
      notes = [:e4, :e4, :d4, :e4, :e4, :d4, :e4, :g4,
               :g4, :fs4, :e4, :d4, :d4, :e4, :d4, :b3]
      durs  = [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 1, 0.5,
               0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 1, 1]
      notes.length.times do |i|
        play notes[i], release: durs[i] * 0.8, amp: 0.5, cutoff: 90
        sleep durs[i]
      end
    end
  end
end

# Pulsing sub bass
live_loop :bass do
  use_synth :sine
  chords = [chord(:e2, :minor), chord(:g2, :major),
            chord(:d2, :major), chord(:c2, :major)]
  chords.each do |c|
    4.times do
      play c[0], release: 0.4, amp: 0.8
      sleep 1
    end
  end
end

# Kick pattern
live_loop :kick do
  sample :bd_haus, amp: 2
  sleep 1
end`,
    js: '',
  },

  {
    name: 'Years (Alesso)',
    difficulty: 'advanced',
    description: 'Progressive house anthem — big chord stabs and driving beat.',
    ruby: `\
use_bpm 128

# Progressive house chord stabs
live_loop :chords do
  use_synth :supersaw
  with_fx :reverb, room: 0.7 do
    # Am - F - C - G progression
    play chord(:a3, :minor), release: 0.8, amp: 0.6, cutoff: 100
    sleep 2
    play chord(:f3, :major), release: 0.8, amp: 0.6, cutoff: 100
    sleep 2
    play chord(:c4, :major), release: 0.8, amp: 0.6, cutoff: 100
    sleep 2
    play chord(:g3, :major), release: 0.8, amp: 0.6, cutoff: 100
    sleep 2
  end
end

# Driving kick
live_loop :kick do
  sample :bd_haus, amp: 2.5
  sleep 0.5
end

# Off-beat clap
live_loop :clap do
  sleep 0.5
  sample :sn_dub, amp: 1
  sleep 0.5
end

# Arpeggiated lead
live_loop :arp do
  use_synth :pluck
  notes = scale(:a4, :minor_pentatonic)
  with_fx :echo, phase: 0.25, decay: 3, mix: 0.3 do
    play notes.choose, release: 0.2, amp: 0.4
    sleep 0.25
  end
end`,
    js: '',
  },

  {
    name: 'Spaceman Drop (Hardwell)',
    difficulty: 'advanced',
    description: 'Big room house drop — massive lead, pounding kick, festival energy.',
    ruby: `\
use_bpm 128

# Big room lead — the drop
live_loop :lead do
  use_synth :supersaw
  with_fx :distortion, distort: 0.3 do
    # Spaceman-style descending riff
    notes = [:e4, :d4, :c4, :b3, :e4, :d4, :c4, :a3]
    durs  = [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.75, 0.75]
    notes.length.times do |i|
      play notes[i], release: durs[i] * 0.6, amp: 0.7, cutoff: 110
      sleep durs[i]
    end
  end
end

# Festival kick
live_loop :kick do
  sample :bd_tek, amp: 3
  sleep 0.5
end

# Snare on 2 and 4
live_loop :snare do
  sleep 1
  sample :sn_dub, amp: 1.5
  sleep 1
end

# White noise riser
live_loop :hats do
  sample :drum_cymbal_closed, amp: rrand(0.3, 0.8), pan: rdist(0.3) if spread(5, 8).tick
  sleep 0.25
end`,
    js: '',
  },

  {
    name: 'Porto (Worakls)',
    difficulty: 'advanced',
    description: 'Melodic techno — cinematic strings over driving beats.',
    ruby: `\
use_bpm 122

# Cinematic melody
live_loop :melody do
  use_synth :hollow
  with_fx :reverb, room: 0.9, mix: 0.7 do
    notes = [:d4, :f4, :a4, :g4, :f4, :e4, :d4, :c4]
    notes.each do |n|
      play n, attack: 0.3, release: 1.5, amp: 0.5, cutoff: 85
      sleep 1
    end
  end
end

# Deep bass
live_loop :bass do
  use_synth :tb303
  notes = ring(:d2, :d2, :f2, :d2)
  play notes.tick, release: 0.4, cutoff: 60, res: 0.2, amp: 0.8
  sleep 1
end

# Driving kick
live_loop :kick do
  sample :bd_haus, amp: 2
  sleep 0.5
end

# Delicate hats
live_loop :hats do
  sample :drum_cymbal_closed, amp: rrand(0.2, 0.5) if spread(7, 16).tick
  sleep 0.25
end

# Atmospheric pad
live_loop :pad do
  use_synth :dark_ambience
  play chord(:d3, :minor7), release: 8, amp: 0.3
  sleep 8
end`,
    js: '',
  },

  {
    name: 'Latch (Fred again..)',
    difficulty: 'advanced',
    description: 'UK garage-inspired chopped vocals and shuffled beats.',
    ruby: `\
use_bpm 124

# Garage-style shuffled beat
live_loop :beat do
  sample :bd_haus, amp: 2
  sleep 0.5
  sample :drum_cymbal_closed, amp: 0.6
  sleep 0.25
  sample :drum_cymbal_closed, amp: 0.3
  sleep 0.25
  sample :sn_dub, amp: 1.2
  sleep 0.25
  sample :drum_cymbal_closed, amp: 0.5
  sleep 0.25
  sample :bd_haus, amp: 1.5
  sleep 0.25
  sample :drum_cymbal_closed, amp: 0.4
  sleep 0.25
end

# Chopped chord stabs
live_loop :stabs do
  use_synth :blade
  with_fx :echo, phase: 0.375, decay: 2, mix: 0.3 do
    with_fx :reverb, room: 0.6 do
      play chord(:c4, :minor), release: 0.15, amp: 0.6, cutoff: 90 if one_in(2)
      sleep 0.25
      play chord(:eb4, :major), release: 0.15, amp: 0.5, cutoff: 85 if one_in(3)
      sleep 0.25
    end
  end
end

# Sub bass
live_loop :sub do
  use_synth :sine
  notes = ring(:c2, :c2, :eb2, :bb1)
  play notes.tick, release: 0.6, amp: 0.9
  sleep 1
end`,
    js: '',
  },

  {
    name: 'Scary Monsters (Skrillex)',
    difficulty: 'advanced',
    description: 'Dubstep wobble bass and aggressive beats — filthy drops.',
    ruby: `\
use_bpm 140

# Wobble bass
live_loop :wobble do
  use_synth :tb303
  with_fx :wobble, phase: 0.25, mix: 0.8 do
    with_fx :distortion, distort: 0.7 do
      notes = ring(:e1, :e1, :g1, :e1, :bb1, :e1, :a1, :e1)
      play notes.tick, release: 0.3, cutoff: rrand(60, 120), res: 0.9, amp: 0.7
      sleep 0.25
    end
  end
end

# Halftime beat
live_loop :drums do
  sample :bd_tek, amp: 3
  sleep 0.5
  sample :bd_tek, amp: 2 if one_in(3)
  sleep 0.25
  sample :drum_cymbal_closed, amp: 0.4
  sleep 0.25
  sample :sn_dub, amp: 2
  sleep 0.5
  sample :drum_cymbal_closed, amp: 0.5
  sleep 0.25
  sample :bd_tek, amp: 1.5 if one_in(2)
  sleep 0.25
end

# Screechy lead
live_loop :screech do
  use_synth :zawa
  play rrand_i(60, 84), release: 0.1, amp: 0.3, cutoff: rrand(80, 120) if one_in(3)
  sleep 0.125
end`,
    js: '',
  },

  {
    name: 'Strobe (deadmau5)',
    difficulty: 'advanced',
    description: 'Progressive house masterpiece — slow build, deep pads, hypnotic arps.',
    ruby: `\
use_bpm 128

# Deep evolving pad
live_loop :pad do
  use_synth :hollow
  with_fx :reverb, room: 0.95, mix: 0.8 do
    play chord(:a2, :minor7), attack: 4, release: 8, amp: 0.4, cutoff: line(60, 90, steps: 32).tick
    sleep 8
  end
end

# Hypnotic arpeggio
live_loop :arp do
  use_synth :saw
  with_fx :echo, phase: 0.375, decay: 6, mix: 0.5 do
    notes = scale(:a3, :minor_pentatonic, num_octaves: 2)
    play notes.tick, release: 0.2, amp: 0.3, cutoff: line(70, 110, steps: 64).look
    sleep 0.25
  end
end

# Subtle kick (comes in slowly)
live_loop :kick do
  sample :bd_haus, amp: line(0, 2, steps: 64).tick
  sleep 1
end

# Atmospheric noise
live_loop :atmos do
  use_synth :cnoise
  play :c4, release: 4, amp: 0.05, cutoff: rrand(60, 80)
  sleep 4
end`,
    js: '',
  },

  {
    name: 'Runaway (Kanye West)',
    difficulty: 'advanced',
    description: 'The famous single-note piano intro that builds into a maximalist anthem.',
    ruby: `\
use_bpm 82

# The iconic single repeated note
live_loop :piano do
  use_synth :piano
  with_fx :reverb, room: 0.7, mix: 0.4 do
    # E above middle C — the note
    play :e4, release: 0.8, amp: 0.7
    sleep 1
    play :e4, release: 0.8, amp: 0.7
    sleep 1
    play :e4, release: 0.8, amp: 0.7
    sleep 0.5
    play :e4, release: 0.4, amp: 0.5
    sleep 0.5
    play :e4, release: 0.8, amp: 0.7
    sleep 1
    play :e4, release: 0.4, amp: 0.5
    sleep 0.5
    play :e4, release: 0.8, amp: 0.7
    sleep 0.5
    play :e4, release: 0.8, amp: 0.7
    sleep 1
  end
end

# Bass comes in
live_loop :bass do
  use_synth :sine
  notes = ring(:e2, :e2, :c2, :c2, :d2, :d2, :a1, :a1)
  play notes.tick, release: 0.8, amp: 0.6
  sleep 1
end

# Minimal drums
live_loop :drums do
  sleep 4 # drums enter after 4 bars
  sample :bd_haus, amp: 1.5
  sleep 1
  sample :sn_dub, amp: 0.8
  sleep 1
end`,
    js: '',
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

/** Get examples grouped by difficulty. */
export function getExamplesByDifficulty(): Record<Difficulty, Example[]> {
  return {
    beginner: examples.filter(e => e.difficulty === 'beginner'),
    intermediate: examples.filter(e => e.difficulty === 'intermediate'),
    advanced: examples.filter(e => e.difficulty === 'advanced'),
  }
}
