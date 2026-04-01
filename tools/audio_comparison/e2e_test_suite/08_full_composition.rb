use_bpm 110
live_loop :drums do
  sample :bd_haus
  sleep 0.5
  sample :drum_snare_hard, amp: 0.6
  sleep 0.25
  sample :bd_haus
  sleep 0.25
end
live_loop :bass do
  use_synth :tb303
  play 36, release: 0.2, cutoff: 70
  sleep 0.5
  play 36, release: 0.2, cutoff: 80
  sleep 0.25
  play 38, release: 0.2, cutoff: 90
  sleep 0.25
end
live_loop :melody do
  use_synth :prophet
  use_random_seed 42
  play (ring 60, 64, 67, 72, 60, 62, 67, 69).tick, release: 0.3, amp: 0.5
  sleep 0.25
end
