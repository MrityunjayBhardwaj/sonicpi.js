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
  notes = (ring :e2, :e2, :g2, :a2)
  play notes.tick, release: 0.3, cutoff: 60
  sleep 1
end
live_loop :lead do
  use_synth :pluck
  play (scale :e4, :minor_pentatonic).choose, release: 0.2
  sleep 0.25
end
