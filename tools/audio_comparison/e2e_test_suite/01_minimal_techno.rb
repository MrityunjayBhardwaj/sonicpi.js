use_bpm 130
live_loop :kick do
  sample :bd_haus, amp: 1.5
  sleep 1
end
live_loop :hats do
  sample :hat_snap, amp: 0.4 if (spread 7, 16).tick
  sleep 0.25
end
live_loop :acid do
  use_synth :tb303
  notes = (ring :e2, :e2, :e3, :e2, :g2, :e2, :a2, :e2)
  play notes.tick, release: 0.2, cutoff: rrand(40, 120), res: 0.3
  sleep 0.25
end
