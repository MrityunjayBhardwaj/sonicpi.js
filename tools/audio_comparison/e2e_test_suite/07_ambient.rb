use_bpm 60
with_fx :reverb, room: 0.9, mix: 0.7 do
  live_loop :pad do
    use_synth :prophet
    play (chord :e3, :minor7), release: 8, cutoff: 80, amp: 0.5
    sleep 8
  end
end
with_fx :echo, phase: 0.75, mix: 0.4 do
  live_loop :melody do
    use_synth :pluck
    play (scale :e4, :minor_pentatonic).choose, release: 2, amp: 0.3
    sleep (ring 0.5, 0.75, 1, 0.5).tick
  end
end
live_loop :texture do
  sample :ambi_choir, rate: 0.5, amp: 0.2
  sleep 8
end
