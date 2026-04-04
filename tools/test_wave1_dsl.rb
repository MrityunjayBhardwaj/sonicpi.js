# Wave 1 DSL Completeness Test — exercises every new function
# All calls inside live_loops (matching real Sonic Pi usage)

use_bpm 120

live_loop :info do
  # --- print ---
  print "=== Wave 1 DSL Test ==="
  print "Current BPM:", current_bpm

  # --- chord_names / scale_names ---
  print "Chord types:", chord_names.length
  print "Scale types:", scale_names.length

  # --- hz_to_midi / midi_to_hz ---
  print "hz_to_midi(440):", hz_to_midi(440)
  print "midi_to_hz(69):", midi_to_hz(69)

  # --- quantise / quantize ---
  print "quantise(10.3, 0.5):", quantise(10.3, 0.5)
  print "quantize(3.14, 0.01):", quantize(3.14, 0.01)

  # --- degree ---
  print "degree i C4 major:", degree(:i, :c4, :major)
  print "degree v C4 major:", degree(:v, :c4, :major)

  # --- chord_degree ---
  print "chord_degree i C4 major:", chord_degree(:i, :c4, :major)
  print "chord_degree v C4 minor:", chord_degree(:v, :c4, :minor)

  # --- octs ---
  print "octs(60, 3):", octs(60, 3)

  stop
end

live_loop :chords do
  # chord_degree for I-V-IV-I progression
  play chord_degree(:i, :c4, :major)
  wait 1
  play chord_degree(:v, :c4, :major)
  wait 1
  play chord_degree(:iv, :c4, :major)
  wait 1
  play chord_degree(:i, :c4, :major)
  wait 1
end

live_loop :bass do
  # degree for single bass notes
  play degree(:i, :c3, :major), amp: 0.8
  sleep 1
  play degree(:v, :c3, :major), amp: 0.8
  sleep 1
  play degree(:iv, :c3, :major), amp: 0.8
  sleep 1
  play degree(:i, :c3, :major), amp: 0.8
  sleep 1
end

live_loop :arp do
  # octs across 3 octaves
  play octs(60, 3).tick, amp: 0.4
  sleep 0.25
end

live_loop :quantised do
  # hz_to_midi + quantise together
  raw = hz_to_midi(440 + rrand(-100, 100))
  snapped = quantise(raw, 1)
  play snapped, amp: 0.3, release: 0.2
  wait 0.5
end
