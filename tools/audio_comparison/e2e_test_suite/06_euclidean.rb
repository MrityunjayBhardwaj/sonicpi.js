use_bpm 130
live_loop :kick do
  sample :bd_tek, amp: 1.5 if (spread 5, 16).tick
  sleep 0.25
end
live_loop :snare do
  sample :drum_snare_hard, amp: 0.6 if (spread 3, 8).tick
  sleep 0.25
end
live_loop :hat do
  sample :drum_cymbal_closed, amp: 0.4, rate: 2 if (spread 11, 16).tick
  sleep 0.125
end
live_loop :bass do
  use_synth :tb303
  play (ring :e2, :e2, :g2, :a2, :e2, :b1, :e2, :d2).tick, release: 0.2, cutoff: 80
  sleep 0.5
end
