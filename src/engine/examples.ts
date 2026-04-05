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

# Director — controls song structure
live_loop :director do
  set :section, 0  # intro: reverb lead solo
  sleep 32
  set :section, 1  # verse: lead + sub bass
  sleep 32
  set :section, 2  # build: drums enter
  sleep 16
  set :section, 3  # drop: full energy
  sleep 64
  set :section, 4  # breakdown: melody + pad
  sleep 32
  set :section, 5  # drop 2: full energy
  sleep 64
  set :section, 6  # outro: fade out
  sleep 32
  stop
end

# Haunting lead melody — Em G D C
live_loop :lead do
  s = get[:section]
  use_synth :saw
  vol = 0
  vol = 0.3 if s == 0
  vol = 0.5 if s == 1 or s == 4
  vol = 0.6 if s == 2
  vol = 0.7 if s == 3 or s == 5
  vol = 0.25 if s == 6
  with_fx :reverb, room: 0.8, mix: 0.6 do
    with_fx :echo, phase: 0.375, decay: 4, mix: 0.4 do
      notes = [:e4, :e4, :d4, :e4, :e4, :d4, :e4, :g4,
               :g4, :fs4, :e4, :d4, :d4, :e4, :d4, :b3]
      durs  = [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 1, 0.5,
               0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 1, 1]
      notes.length.times do |i|
        play notes[i], release: durs[i] * 0.8, amp: vol, cutoff: 90
        sleep durs[i]
      end
    end
  end
end

# Pulsing sub bass — enters at verse
live_loop :bass do
  s = get[:section]
  use_synth :sine
  vol = 0
  vol = 0.6 if s == 1 or s == 4
  vol = 0.7 if s == 2
  vol = 0.9 if s == 3 or s == 5
  vol = 0.3 if s == 6
  chords = [chord(:e2, :minor), chord(:g2, :major),
            chord(:d2, :major), chord(:c2, :major)]
  chords.each do |c|
    4.times do
      play c[0], release: 0.4, amp: vol
      sleep 1
    end
  end
end

# Kick — enters at build
live_loop :kick do
  s = get[:section]
  vol = 0
  vol = 1.0 if s == 2
  vol = 2.0 if s == 3 or s == 5
  vol = 0.8 if s == 6
  sample :bd_haus, amp: vol
  sleep 1
end

# Hi-hats — drop only
live_loop :hats do
  s = get[:section]
  vol = 0
  vol = 0.5 if s == 3 or s == 5
  sample :drum_cymbal_closed, amp: vol if spread(5, 8).tick
  sleep 0.25
end

# Pad — breakdown + outro
live_loop :pad do
  s = get[:section]
  use_synth :hollow
  vol = 0
  vol = 0.4 if s == 4
  vol = 0.3 if s == 6
  with_fx :reverb, room: 0.9 do
    play chord(:e3, :minor7), release: 8, amp: vol, cutoff: 80
  end
  sleep 8
end`,
    js: '',
  },

  {
    name: 'Years (Alesso)',
    difficulty: 'advanced',
    description: 'Progressive house anthem — big chord stabs and driving beat.',
    ruby: `\
use_bpm 128

# Director
live_loop :director do
  set :section, 0  # intro: pad + sparse perc
  sleep 32
  set :section, 1  # verse: chord stabs + light kick
  sleep 32
  set :section, 2  # build: filter sweep + snare roll
  sleep 16
  set :section, 3  # drop: full supersaw + kick + arp
  sleep 64
  set :section, 4  # breakdown: pluck melody solo
  sleep 32
  set :section, 5  # drop 2: bigger
  sleep 64
  set :section, 6  # outro: fade
  sleep 32
  stop
end

# Am - F - C - G chord stabs
live_loop :chords do
  s = get[:section]
  use_synth :supersaw
  vol = 0
  vol = 0.4 if s == 1
  vol = 0.5 if s == 2
  vol = 0.8 if s == 3
  vol = 0.9 if s == 5
  vol = 0.3 if s == 6
  co = 80
  co = 100 if s >= 3
  with_fx :reverb, room: 0.7 do
    play chord(:a3, :minor), release: 0.8, amp: vol, cutoff: co
    sleep 2
    play chord(:f3, :major), release: 0.8, amp: vol, cutoff: co
    sleep 2
    play chord(:c4, :major), release: 0.8, amp: vol, cutoff: co
    sleep 2
    play chord(:g3, :major), release: 0.8, amp: vol, cutoff: co
    sleep 2
  end
end

# Atmospheric pad — intro + breakdown
live_loop :pad do
  s = get[:section]
  use_synth :hollow
  vol = 0
  vol = 0.4 if s == 0
  vol = 0.3 if s == 4
  with_fx :reverb, room: 0.9, mix: 0.7 do
    play chord(:a2, :minor7), release: 8, amp: vol, cutoff: 75
  end
  sleep 8
end

# Kick — light in verse, full in drop
live_loop :kick do
  s = get[:section]
  vol = 0
  vol = 0.3 if s == 0
  vol = 1.2 if s == 1
  vol = 1.5 if s == 2
  vol = 2.5 if s == 3 or s == 5
  vol = 1.8 if s == 6
  sample :bd_haus, amp: vol
  sleep 0.5
end

# Off-beat clap
live_loop :clap do
  s = get[:section]
  vol = 0
  vol = 0.8 if s == 1
  vol = 1.2 if s == 3 or s == 5
  sleep 0.5
  sample :sn_dub, amp: vol
  sleep 0.5
end

# Snare roll — build section
live_loop :snare_roll do
  s = get[:section]
  if s == 2
    sample :sn_dub, amp: 0.6, rate: 1.5
    sleep 0.25
  else
    sleep 1
  end
end

# Arpeggiated lead — drops only
live_loop :arp do
  s = get[:section]
  use_synth :pluck
  vol = 0
  vol = 0.4 if s == 3
  vol = 0.5 if s == 5
  notes = scale(:a4, :minor_pentatonic)
  with_fx :echo, phase: 0.25, decay: 3, mix: 0.3 do
    play notes.choose, release: 0.2, amp: vol
    sleep 0.25
  end
end

# Pluck melody — breakdown
live_loop :pluck_melody do
  s = get[:section]
  use_synth :pluck
  vol = 0
  vol = 0.6 if s == 4
  notes = [:a4, :c5, :e5, :c5, :a4, :g4, :f4, :e4]
  notes.each do |n|
    play n, release: 0.5, amp: vol
    sleep 0.5
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

# Director
live_loop :director do
  set :section, 0  # build: rising sweep + snare buildup
  sleep 32
  set :section, 1  # drop: massive descending lead + festival kick
  sleep 64
  set :section, 2  # break: kick only
  sleep 16
  set :section, 3  # drop 2: lead returns with FX variation
  sleep 64
  set :section, 4  # outro: lead drops, kick fades
  sleep 16
  stop
end

# Big room lead — descending riff
live_loop :lead do
  s = get[:section]
  use_synth :supersaw
  vol = 0
  vol = 0.7 if s == 1
  vol = 0.8 if s == 3
  co = 110
  co = 120 if s == 3
  with_fx :distortion, distort: 0.3 do
    notes = [:e4, :d4, :c4, :b3, :e4, :d4, :c4, :a3]
    durs  = [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.75, 0.75]
    notes.length.times do |i|
      play notes[i], release: durs[i] * 0.6, amp: vol, cutoff: co
      sleep durs[i]
    end
  end
end

# Festival kick
live_loop :kick do
  s = get[:section]
  vol = 0
  vol = 0.8 if s == 0
  vol = 3.0 if s == 1 or s == 3
  vol = 2.0 if s == 2
  vol = 1.0 if s == 4
  sample :bd_tek, amp: vol
  sleep 0.5
end

# Snare build — build section only
live_loop :snare_build do
  s = get[:section]
  if s == 0
    t = tick
    rate = 1.0
    rate = 1.5 if t > 16
    rate = 2.0 if t > 24
    sample :sn_dub, amp: 0.5, rate: rate
    sleep 0.5
  else
    sleep 1
  end
end

# Snare on 2 and 4 — drops
live_loop :snare do
  s = get[:section]
  vol = 0
  vol = 1.5 if s == 1 or s == 3
  sleep 1
  sample :sn_dub, amp: vol
  sleep 1
end

# Hats — drops only
live_loop :hats do
  s = get[:section]
  vol = 0
  vol = rrand(0.3, 0.8) if s == 1 or s == 3
  sample :drum_cymbal_closed, amp: vol if spread(5, 8).tick
  sleep 0.25
end

# Rising noise sweep — build
live_loop :riser do
  s = get[:section]
  use_synth :cnoise
  vol = 0
  vol = 0.1 if s == 0
  play :c4, release: 4, amp: vol, cutoff: rrand(50, 90)
  sleep 4
end`,
    js: '',
  },

  {
    name: 'Porto (Worakls)',
    difficulty: 'advanced',
    description: 'Melodic techno — cinematic strings over driving beats.',
    ruby: `\
use_bpm 122

# Director
live_loop :director do
  set :section, 0  # intro: pad alone
  sleep 32
  set :section, 1  # verse: melody enters, no drums
  sleep 32
  set :section, 2  # build: kick fades in
  sleep 16
  set :section, 3  # main: full arrangement
  sleep 64
  set :section, 4  # breakdown: melody solo + reverb
  sleep 32
  set :section, 5  # main 2: full arrangement variation
  sleep 64
  set :section, 6  # outro: pad fade
  sleep 32
  stop
end

# Cinematic melody
live_loop :melody do
  s = get[:section]
  use_synth :hollow
  vol = 0
  vol = 0.4 if s == 1
  vol = 0.5 if s == 2 or s == 3 or s == 5
  vol = 0.6 if s == 4
  vol = 0.2 if s == 6
  mx = 0.5
  mx = 0.8 if s == 4
  with_fx :reverb, room: 0.9, mix: mx do
    notes = [:d4, :f4, :a4, :g4, :f4, :e4, :d4, :c4]
    notes.each do |n|
      play n, attack: 0.3, release: 1.5, amp: vol, cutoff: 85
      sleep 1
    end
  end
end

# Deep bass — main sections
live_loop :bass do
  s = get[:section]
  use_synth :tb303
  vol = 0
  vol = 0.6 if s == 3
  vol = 0.8 if s == 5
  vol = 0.3 if s == 2
  notes = ring(:d2, :d2, :f2, :d2)
  play notes.tick, release: 0.4, cutoff: 60, res: 0.2, amp: vol
  sleep 1
end

# Kick — fades in during build, full in main
live_loop :kick do
  s = get[:section]
  vol = 0
  vol = line(0.3, 1.5, steps: 16).tick if s == 2
  vol = 2.0 if s == 3 or s == 5
  sample :bd_haus, amp: vol
  sleep 0.5
end

# Hats — main sections only
live_loop :hats do
  s = get[:section]
  vol = 0
  vol = rrand(0.2, 0.5) if s == 3 or s == 5
  sample :drum_cymbal_closed, amp: vol if spread(7, 16).tick
  sleep 0.25
end

# Atmospheric pad — intro, main, outro
live_loop :pad do
  s = get[:section]
  use_synth :dark_ambience
  vol = 0
  vol = 0.4 if s == 0
  vol = 0.25 if s == 1 or s == 2
  vol = 0.3 if s == 3 or s == 5
  vol = 0.35 if s == 6
  play chord(:d3, :minor7), release: 8, amp: vol
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

# Director
live_loop :director do
  set :section, 0  # intro: chopped stabs only
  sleep 16
  set :section, 1  # groove: garage beat enters
  sleep 32
  set :section, 2  # full: bass + stabs + beat
  sleep 64
  set :section, 3  # break: stabs + sub only
  sleep 16
  set :section, 4  # full 2: everything, stab variations
  sleep 64
  set :section, 5  # outro: beat drops, stabs fade
  sleep 16
  stop
end

# Garage-style shuffled beat
live_loop :beat do
  s = get[:section]
  vol = 0
  vol = 1.0 if s == 1
  vol = 1.5 if s == 2 or s == 4
  sample :bd_haus, amp: vol * 1.3
  sleep 0.5
  sample :drum_cymbal_closed, amp: vol * 0.4
  sleep 0.25
  sample :drum_cymbal_closed, amp: vol * 0.2
  sleep 0.25
  sample :sn_dub, amp: vol * 0.8
  sleep 0.25
  sample :drum_cymbal_closed, amp: vol * 0.3
  sleep 0.25
  sample :bd_haus, amp: vol
  sleep 0.25
  sample :drum_cymbal_closed, amp: vol * 0.25
  sleep 0.25
end

# Chopped chord stabs
live_loop :stabs do
  s = get[:section]
  use_synth :blade
  vol = 0
  vol = 0.5 if s == 0
  vol = 0.4 if s == 1
  vol = 0.6 if s == 2 or s == 4
  vol = 0.5 if s == 3
  vol = 0.25 if s == 5
  with_fx :echo, phase: 0.375, decay: 2, mix: 0.3 do
    with_fx :reverb, room: 0.6 do
      play chord(:c4, :minor), release: 0.15, amp: vol, cutoff: 90 if one_in(2)
      sleep 0.25
      play chord(:eb4, :major), release: 0.15, amp: vol * 0.8, cutoff: 85 if one_in(3)
      sleep 0.25
    end
  end
end

# Sub bass — enters at full
live_loop :sub do
  s = get[:section]
  use_synth :sine
  vol = 0
  vol = 0.7 if s == 2 or s == 4
  vol = 0.5 if s == 3
  vol = 0.3 if s == 5
  notes = ring(:c2, :c2, :eb2, :bb1)
  play notes.tick, release: 0.6, amp: vol
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

# Director
live_loop :director do
  set :section, 0  # build: rising noise + sparse hits
  sleep 16
  set :section, 1  # drop: wobble + halftime drums + screech
  sleep 64
  set :section, 2  # break: silence then bass hit
  sleep 8
  set :section, 3  # drop 2: different wobble + faster screech
  sleep 64
  set :section, 4  # outro: drums only
  sleep 16
  stop
end

# Wobble bass
live_loop :wobble do
  s = get[:section]
  use_synth :tb303
  vol = 0
  vol = 0.7 if s == 1
  vol = 0.8 if s == 3
  lo = 60
  hi = 120
  lo = 80 if s == 3
  hi = 130 if s == 3
  with_fx :wobble, phase: 0.25, mix: 0.8 do
    with_fx :distortion, distort: 0.7 do
      notes = ring(:e1, :e1, :g1, :e1, :bb1, :e1, :a1, :e1)
      play notes.tick, release: 0.3, cutoff: rrand(lo, hi), res: 0.9, amp: vol
      sleep 0.25
    end
  end
end

# Single bass hit — break section
live_loop :bass_hit do
  s = get[:section]
  use_synth :tb303
  if s == 2
    sleep 1
    play :e1, release: 1.5, amp: 0.9, cutoff: 80
    sleep 3
  else
    sleep 1
  end
end

# Halftime beat
live_loop :drums do
  s = get[:section]
  vol = 0
  vol = 1.0 if s == 1 or s == 3 or s == 4
  sample :bd_tek, amp: vol * 3
  sleep 0.5
  sample :bd_tek, amp: vol * 1.5 if one_in(3)
  sleep 0.25
  sample :drum_cymbal_closed, amp: vol * 0.4
  sleep 0.25
  sample :sn_dub, amp: vol * 2
  sleep 0.5
  sample :drum_cymbal_closed, amp: vol * 0.5
  sleep 0.25
  sample :bd_tek, amp: vol * 1.2 if one_in(2)
  sleep 0.25
end

# Screechy lead — drops only
live_loop :screech do
  s = get[:section]
  use_synth :zawa
  vol = 0
  vol = 0.3 if s == 1
  vol = 0.4 if s == 3
  spd = 0.125
  spd = 0.0625 if s == 3
  play rrand_i(60, 84), release: 0.1, amp: vol, cutoff: rrand(80, 120) if one_in(3)
  sleep spd
end

# Rising noise — build
live_loop :riser do
  s = get[:section]
  use_synth :cnoise
  vol = 0
  vol = 0.08 if s == 0
  play :c4, release: 2, amp: vol, cutoff: rrand(50, 90)
  sleep 2
end

# Sparse build hits
live_loop :build_hits do
  s = get[:section]
  if s == 0
    sample :bd_tek, amp: 1.5
    sleep 2
    sample :sn_dub, amp: 0.8
    sleep 2
  else
    sleep 1
  end
end`,
    js: '',
  },

  {
    name: 'Strobe (deadmau5)',
    difficulty: 'advanced',
    description: 'Progressive house masterpiece — slow build, deep pads, hypnotic arps.',
    ruby: `\
use_bpm 128

# Director — long progressive build
live_loop :director do
  set :section, 0  # phase 1: pad alone, very quiet
  sleep 64
  set :section, 1  # phase 2: arp enters, no drums
  sleep 64
  set :section, 2  # phase 3: kick fades in, noise enters
  sleep 64
  set :section, 3  # phase 4: full energy
  sleep 128
  set :section, 4  # phase 5: strip to pad + arp
  sleep 64
  set :section, 5  # phase 6: full again, peak
  sleep 64
  set :section, 6  # end: fade everything
  sleep 32
  stop
end

# Deep evolving pad — always present
live_loop :pad do
  s = get[:section]
  use_synth :hollow
  vol = 0.2 if s == 0
  vol = 0.3 if s == 1
  vol = 0.35 if s == 2
  vol = 0.4 if s == 3 or s == 5
  vol = 0.35 if s == 4
  vol = 0.15 if s == 6
  co = 65
  co = 75 if s >= 1
  co = 85 if s >= 3
  co = 70 if s == 6
  with_fx :reverb, room: 0.95, mix: 0.8 do
    play chord(:a2, :minor7), attack: 4, release: 8, amp: vol, cutoff: co
    sleep 8
  end
end

# Hypnotic arpeggio — enters phase 2
live_loop :arp do
  s = get[:section]
  use_synth :saw
  vol = 0
  vol = 0.2 if s == 1
  vol = 0.25 if s == 2
  vol = 0.35 if s == 3
  vol = 0.4 if s == 5
  vol = 0.25 if s == 4
  vol = 0.1 if s == 6
  co = 80
  co = 100 if s >= 3
  co = 110 if s == 5
  with_fx :echo, phase: 0.375, decay: 6, mix: 0.5 do
    notes = scale(:a3, :minor_pentatonic, num_octaves: 2)
    play notes.tick, release: 0.2, amp: vol, cutoff: co
    sleep 0.25
  end
end

# Kick — fades in phase 3, full phase 4+
live_loop :kick do
  s = get[:section]
  vol = 0
  vol = line(0.2, 1.8, steps: 64).tick if s == 2
  vol = 2.0 if s == 3
  vol = 2.2 if s == 5
  vol = 0.8 if s == 6
  sample :bd_haus, amp: vol
  sleep 1
end

# Atmospheric noise — enters phase 3
live_loop :atmos do
  s = get[:section]
  use_synth :cnoise
  vol = 0
  vol = 0.04 if s == 2
  vol = 0.06 if s == 3 or s == 5
  vol = 0.03 if s == 6
  play :c4, release: 4, amp: vol, cutoff: rrand(60, 80)
  sleep 4
end

# Hi-hats — full energy sections only
live_loop :hats do
  s = get[:section]
  vol = 0
  vol = 0.3 if s == 3 or s == 5
  sample :drum_cymbal_closed, amp: vol if spread(3, 8).tick
  sleep 0.25
end`,
    js: '',
  },

  {
    name: 'Runaway (Kanye West)',
    difficulty: 'advanced',
    description: 'The famous single-note piano intro that builds into a maximalist anthem.',
    ruby: `\
use_bpm 82

# Director
live_loop :director do
  set :section, 0  # intro: solo E4 piano, sparse
  sleep 32
  set :section, 1  # verse: bass enters
  sleep 32
  set :section, 2  # pre-chorus: add hats, piano varies
  sleep 16
  set :section, 3  # chorus: full drums + bass + piano expands
  sleep 64
  set :section, 4  # break: solo piano, different rhythm
  sleep 32
  set :section, 5  # chorus 2: full, more intensity
  sleep 64
  set :section, 6  # outro: strip to piano, final note
  sleep 16
  stop
end

# The iconic piano
live_loop :piano do
  s = get[:section]
  use_synth :piano
  vol = 0.6
  vol = 0.5 if s == 1
  vol = 0.55 if s == 2
  vol = 0.7 if s == 3 or s == 5
  vol = 0.6 if s == 4
  vol = 0.4 if s == 6
  with_fx :reverb, room: 0.7, mix: 0.4 do
    if s == 3 or s == 5
      # expanded melody in chorus
      play :e4, release: 0.8, amp: vol
      sleep 0.5
      play :b4, release: 0.5, amp: vol * 0.7
      sleep 0.5
      play :e4, release: 0.8, amp: vol
      sleep 0.5
      play :e4, release: 0.4, amp: vol * 0.6
      sleep 0.5
      play :d5, release: 0.8, amp: vol * 0.8
      sleep 1
      play :b4, release: 0.4, amp: vol * 0.6
      sleep 0.5
      play :e4, release: 0.8, amp: vol
      sleep 0.5
      play :e4, release: 0.8, amp: vol
      sleep 1
    elsif s == 4
      # break — sparser rhythm
      play :e4, release: 1.2, amp: vol
      sleep 2
      play :e4, release: 0.4, amp: vol * 0.5
      sleep 0.5
      play :e4, release: 0.8, amp: vol
      sleep 1
      play :e4, release: 0.8, amp: vol
      sleep 1.5
    elsif s == 6
      # outro — slowing, final note
      play :e4, release: 1.5, amp: vol
      sleep 2
      play :e4, release: 0.8, amp: vol * 0.6
      sleep 1.5
      play :e4, release: 3, amp: vol
      sleep 1.5
    else
      # intro/verse pattern — the classic single note
      play :e4, release: 0.8, amp: vol
      sleep 1
      play :e4, release: 0.8, amp: vol
      sleep 1
      play :e4, release: 0.8, amp: vol
      sleep 0.5
      play :e4, release: 0.4, amp: vol * 0.7
      sleep 0.5
      play :e4, release: 0.8, amp: vol
      sleep 1
      play :e4, release: 0.4, amp: vol * 0.7
      sleep 0.5
      play :e4, release: 0.8, amp: vol
      sleep 0.5
    end
  end
end

# Bass — enters at verse
live_loop :bass do
  s = get[:section]
  use_synth :sine
  vol = 0
  vol = 0.5 if s == 1
  vol = 0.6 if s == 2
  vol = 0.8 if s == 3 or s == 5
  vol = 0.3 if s == 6
  notes = ring(:e2, :e2, :c2, :c2, :d2, :d2, :a1, :a1)
  play notes.tick, release: 0.8, amp: vol
  sleep 1
end

# Drums — pre-chorus onward
live_loop :drums do
  s = get[:section]
  k_vol = 0
  s_vol = 0
  k_vol = 1.0 if s == 2
  k_vol = 1.5 if s == 3
  k_vol = 1.8 if s == 5
  s_vol = 0.5 if s == 2
  s_vol = 0.8 if s == 3
  s_vol = 1.0 if s == 5
  sample :bd_haus, amp: k_vol
  sleep 1
  sample :sn_dub, amp: s_vol
  sleep 1
end

# Hi-hats — pre-chorus and chorus
live_loop :hats do
  s = get[:section]
  vol = 0
  vol = 0.3 if s == 2
  vol = 0.4 if s == 3 or s == 5
  sample :drum_cymbal_closed, amp: vol
  sleep 0.5
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
