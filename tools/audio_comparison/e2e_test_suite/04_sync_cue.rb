use_bpm 130
live_loop :drums do
  sample :bd_haus
  sleep 0.5
  cue :tick
  sample :drum_snare_hard, amp: 0.8
  sleep 0.5
end
live_loop :bass do
  sync :tick
  use_synth :tb303
  play :e2, release: 0.3, cutoff: 70
  sleep 0.5
end
live_loop :hats do
  sample :drum_cymbal_closed, amp: 0.5, rate: 2
  sleep 0.25
end
