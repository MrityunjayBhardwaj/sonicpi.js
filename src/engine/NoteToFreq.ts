const NOTE_NAMES: Record<string, number> = {
  c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11,
}

/**
 * Convert a note name like "c4", "fs3", "eb5" to a MIDI number.
 * Also accepts bare MIDI numbers as strings or numbers.
 */
export function noteToMidi(note: string | number): number {
  if (typeof note === 'number') return note

  const str = note.toLowerCase().trim()

  // Try parsing as plain number
  const num = Number(str)
  if (!isNaN(num)) return num

  const match = str.match(/^([a-g])(s|b|#)?(\d+)?$/)
  if (!match) return 60 // default to C4

  const [, letter, accidental, octaveStr] = match
  const base = NOTE_NAMES[letter]
  const octave = octaveStr !== undefined ? parseInt(octaveStr) : 4
  let midi = (octave + 1) * 12 + base

  if (accidental === 's' || accidental === '#') midi += 1
  if (accidental === 'b') midi -= 1

  return midi
}

/**
 * Convert MIDI number to frequency in Hz.
 * A4 (MIDI 69) = 440 Hz.
 */
export function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12)
}

/**
 * Convert note name or number directly to frequency.
 */
export function noteToFreq(note: string | number): number {
  return midiToFreq(noteToMidi(note))
}
