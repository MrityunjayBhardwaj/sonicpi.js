/**
 * Help database for the Sonic Pi DSL — used by autocomplete and Help Panel.
 *
 * Each entry has a signature, short description, parameter list, and example.
 * Coverage: the ~30 most-used Sonic Pi functions.
 */

export interface HelpParam {
  name: string
  type: string
  default?: string
  desc: string
}

export interface HelpEntry {
  signature: string
  description: string
  params: HelpParam[]
  example: string
}

export const HELP_DB: Record<string, HelpEntry> = {
  play: {
    signature: 'play note, opts',
    description: 'Play a note with the current synth.',
    params: [
      { name: 'note', type: 'number|symbol', desc: 'MIDI note or note name (:c4, :eb3)' },
      { name: 'amp', type: 'number', default: '1', desc: 'Volume (0-5)' },
      { name: 'release', type: 'number', default: '1', desc: 'Release time in beats' },
      { name: 'attack', type: 'number', default: '0', desc: 'Attack time in beats' },
      { name: 'sustain', type: 'number', default: '0', desc: 'Sustain time in beats' },
      { name: 'decay', type: 'number', default: '0', desc: 'Decay time in beats' },
      { name: 'pan', type: 'number', default: '0', desc: 'Stereo pan (-1 to 1)' },
      { name: 'cutoff', type: 'number', desc: 'Low-pass filter cutoff (MIDI note 0-131)' },
    ],
    example: 'play :c4, amp: 0.5, release: 2',
  },

  sleep: {
    signature: 'sleep beats',
    description: 'Wait for the given number of beats before continuing.',
    params: [
      { name: 'beats', type: 'number', desc: 'Duration in beats (at current BPM)' },
    ],
    example: 'sleep 0.5',
  },

  sample: {
    signature: 'sample name, opts',
    description: 'Play a built-in or custom sample.',
    params: [
      { name: 'name', type: 'symbol', desc: 'Sample name (:bd_haus, :sn_dub, etc.)' },
      { name: 'amp', type: 'number', default: '1', desc: 'Volume (0-5)' },
      { name: 'rate', type: 'number', default: '1', desc: 'Playback rate (negative = reverse)' },
      { name: 'pan', type: 'number', default: '0', desc: 'Stereo pan (-1 to 1)' },
      { name: 'attack', type: 'number', default: '0', desc: 'Fade-in time in beats' },
      { name: 'release', type: 'number', desc: 'Fade-out time in beats' },
      { name: 'start', type: 'number', default: '0', desc: 'Start position (0-1)' },
      { name: 'finish', type: 'number', default: '1', desc: 'End position (0-1)' },
      { name: 'rpitch', type: 'number', default: '0', desc: 'Relative pitch in semitones' },
    ],
    example: 'sample :bd_haus, amp: 2, rate: 0.8',
  },

  live_loop: {
    signature: 'live_loop name do ... end',
    description: 'Create a named loop that repeats forever and can be live-edited.',
    params: [
      { name: 'name', type: 'symbol', desc: 'Unique loop name (e.g. :drums)' },
    ],
    example: `live_loop :beat do
  sample :bd_haus
  sleep 0.5
end`,
  },

  with_fx: {
    signature: 'with_fx name, opts do ... end',
    description: 'Wrap code in an audio effect. Everything inside is routed through the FX.',
    params: [
      { name: 'name', type: 'symbol', desc: 'FX name (:reverb, :echo, :distortion, etc.)' },
      { name: 'mix', type: 'number', default: '1', desc: 'Wet/dry mix (0-1)' },
      { name: 'amp', type: 'number', default: '1', desc: 'Output volume' },
    ],
    example: `with_fx :reverb, room: 0.8 do
  play :c4
end`,
  },

  use_synth: {
    signature: 'use_synth name',
    description: 'Set the current synth for subsequent play calls.',
    params: [
      { name: 'name', type: 'symbol', desc: 'Synth name (:beep, :saw, :prophet, :tb303, etc.)' },
    ],
    example: 'use_synth :prophet',
  },

  use_bpm: {
    signature: 'use_bpm bpm',
    description: 'Set the tempo in beats per minute. Affects sleep durations.',
    params: [
      { name: 'bpm', type: 'number', desc: 'Beats per minute (e.g. 120)' },
    ],
    example: 'use_bpm 140',
  },

  ring: {
    signature: 'ring(values)',
    description: 'Create a ring buffer that wraps around when indexed past its length.',
    params: [
      { name: 'values', type: 'number...', desc: 'Comma-separated values' },
    ],
    example: 'ring(60, 62, 64, 67).tick',
  },

  knit: {
    signature: 'knit(value, count, ...)',
    description: 'Create a ring by repeating each value a given number of times.',
    params: [
      { name: 'value', type: 'any', desc: 'Value to repeat' },
      { name: 'count', type: 'number', desc: 'How many times to repeat it' },
    ],
    example: 'knit(:e3, 3, :c3, 1)',
  },

  spread: {
    signature: 'spread(hits, total)',
    description: 'Euclidean rhythm — distribute hits evenly across total steps.',
    params: [
      { name: 'hits', type: 'number', desc: 'Number of active beats' },
      { name: 'total', type: 'number', desc: 'Total number of steps' },
    ],
    example: 'spread(3, 8)  # => (true, false, false, true, false, false, true, false)',
  },

  choose: {
    signature: 'choose(list)',
    description: 'Pick a random element from a list or ring.',
    params: [
      { name: 'list', type: 'array', desc: 'Array or ring to choose from' },
    ],
    example: 'play choose(chord(:c4, :major))',
  },

  rrand: {
    signature: 'rrand(min, max)',
    description: 'Return a random float between min and max.',
    params: [
      { name: 'min', type: 'number', desc: 'Lower bound (inclusive)' },
      { name: 'max', type: 'number', desc: 'Upper bound (exclusive)' },
    ],
    example: 'play :c4, cutoff: rrand(60, 120)',
  },

  sync: {
    signature: 'sync name',
    description: 'Block until another thread sends a cue with the given name.',
    params: [
      { name: 'name', type: 'symbol', desc: 'Cue name to wait for' },
    ],
    example: 'sync :beat',
  },

  cue: {
    signature: 'cue name',
    description: 'Send a named cue that unblocks any threads waiting with sync.',
    params: [
      { name: 'name', type: 'symbol', desc: 'Cue name to send' },
    ],
    example: 'cue :beat',
  },

  control: {
    signature: 'control node, opts',
    description: 'Modify parameters of a running synth node.',
    params: [
      { name: 'node', type: 'SynthNode', desc: 'Node returned by play or synth' },
      { name: 'opts', type: 'hash', desc: 'Parameters to change (e.g. note:, cutoff:)' },
    ],
    example: `n = play :c4, sustain: 4
sleep 1
control n, note: :e4`,
  },

  define: {
    signature: 'define name do ... end',
    description: 'Define a reusable named function.',
    params: [
      { name: 'name', type: 'symbol', desc: 'Function name' },
    ],
    example: `define :bass do |n|
  use_synth :tb303
  play n, release: 0.2
end`,
  },

  in_thread: {
    signature: 'in_thread do ... end',
    description: 'Run code in a new concurrent thread sharing the same time.',
    params: [],
    example: `in_thread do
  loop do
    sample :bd_haus
    sleep 0.5
  end
end`,
  },

  at: {
    signature: 'at times do ... end',
    description: 'Schedule code to run at specific beat offsets from now.',
    params: [
      { name: 'times', type: 'array', desc: 'List of beat offsets' },
    ],
    example: `at [0, 0.5, 1, 1.5] do
  sample :hat_snap
end`,
  },

  density: {
    signature: 'density factor do ... end',
    description: 'Speed up time within the block by the given factor.',
    params: [
      { name: 'factor', type: 'number', desc: 'Time compression factor (2 = twice as fast)' },
    ],
    example: `density 2 do
  play :c4
  sleep 0.5
  play :e4
  sleep 0.5
end`,
  },

  time_warp: {
    signature: 'time_warp beats do ... end',
    description: 'Shift virtual time forward or backward by the given beats.',
    params: [
      { name: 'beats', type: 'number', desc: 'Beats to shift (negative = backward)' },
    ],
    example: `time_warp -0.1 do
  sample :bd_haus
end`,
  },

  puts: {
    signature: 'puts message',
    description: 'Print a message to the log panel.',
    params: [
      { name: 'message', type: 'any', desc: 'Value to print' },
    ],
    example: 'puts "Hello from Sonic Pi!"',
  },

  set: {
    signature: 'set name, value',
    description: 'Store a value in the global time-state that persists across loops.',
    params: [
      { name: 'name', type: 'symbol', desc: 'Key name' },
      { name: 'value', type: 'any', desc: 'Value to store' },
    ],
    example: 'set :my_val, 42',
  },

  get: {
    signature: 'get name',
    description: 'Retrieve a value from the global time-state.',
    params: [
      { name: 'name', type: 'symbol', desc: 'Key name' },
    ],
    example: 'val = get(:my_val)',
  },

  tick: {
    signature: 'tick()',
    description: 'Advance the thread-local counter by 1 and return the new value.',
    params: [],
    example: 'play ring(60, 64, 67).tick',
  },

  look: {
    signature: 'look()',
    description: 'Return the current thread-local counter value without advancing.',
    params: [],
    example: 'play ring(60, 64, 67)[look]',
  },

  use_random_seed: {
    signature: 'use_random_seed seed',
    description: 'Set the random seed so random values are reproducible.',
    params: [
      { name: 'seed', type: 'number', desc: 'Seed value (any integer)' },
    ],
    example: 'use_random_seed 42',
  },

  play_pattern_timed: {
    signature: 'play_pattern_timed notes, times, opts',
    description: 'Play a sequence of notes with timed sleeps between them.',
    params: [
      { name: 'notes', type: 'array', desc: 'List of MIDI notes' },
      { name: 'times', type: 'array', desc: 'List of sleep durations (cycles)' },
    ],
    example: 'play_pattern_timed [:c4, :e4, :g4], [0.25, 0.25, 0.5]',
  },

  play_chord: {
    signature: 'play_chord notes, opts',
    description: 'Play multiple notes simultaneously as a chord.',
    params: [
      { name: 'notes', type: 'array', desc: 'List of MIDI notes or a chord() call' },
      { name: 'amp', type: 'number', default: '1', desc: 'Volume' },
    ],
    example: 'play_chord chord(:c4, :major)',
  },

  chord: {
    signature: 'chord(root, quality)',
    description: 'Return a ring of MIDI notes for the given chord.',
    params: [
      { name: 'root', type: 'symbol', desc: 'Root note (:c4, :e3, etc.)' },
      { name: 'quality', type: 'symbol', desc: 'Chord type (:major, :minor, :dom7, etc.)' },
    ],
    example: 'play_chord chord(:e3, :minor)',
  },

  scale: {
    signature: 'scale(root, name, num_octaves:)',
    description: 'Return a ring of MIDI notes for the given scale.',
    params: [
      { name: 'root', type: 'symbol', desc: 'Root note (:c4, :e3, etc.)' },
      { name: 'name', type: 'symbol', desc: 'Scale type (:major, :minor, :pentatonic, etc.)' },
      { name: 'num_octaves', type: 'number', default: '1', desc: 'Number of octaves' },
    ],
    example: 'play scale(:c4, :minor_pentatonic).choose',
  },

  rrand_i: {
    signature: 'rrand_i(min, max)',
    description: 'Return a random integer between min and max (inclusive).',
    params: [
      { name: 'min', type: 'number', desc: 'Lower bound' },
      { name: 'max', type: 'number', desc: 'Upper bound' },
    ],
    example: 'play 60 + rrand_i(0, 12)',
  },

  dice: {
    signature: 'dice(sides)',
    description: 'Roll a dice with the given number of sides (1 to sides).',
    params: [
      { name: 'sides', type: 'number', default: '6', desc: 'Number of sides' },
    ],
    example: 'play 60 if dice(6) > 4',
  },

  one_in: {
    signature: 'one_in(n)',
    description: 'Return true with probability 1/n.',
    params: [
      { name: 'n', type: 'number', desc: 'Denominator (e.g. 3 = 33% chance)' },
    ],
    example: 'sample :hat_snap if one_in(3)',
  },

  note: {
    signature: 'note(name)',
    description: 'Convert a note name to a MIDI number.',
    params: [
      { name: 'name', type: 'symbol|number', desc: 'Note name or MIDI number' },
    ],
    example: 'puts note(:c4)  # => 60',
  },

  stop: {
    signature: 'stop',
    description: 'Stop the current thread (exits the live_loop).',
    params: [],
    example: `live_loop :once do
  play :c4
  stop
end`,
  },
}
