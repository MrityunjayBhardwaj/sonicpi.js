use_bpm 120
live_loop :fx_demo do
  with_fx :reverb, room: 0.8 do
    with_fx :distortion, distort: 0.5 do
      play 50, release: 0.5
      sleep 0.5
      play 55, release: 0.5
      sleep 0.5
    end
  end
end
live_loop :pad do
  use_synth :prophet
  play (chord :e3, :minor7), release: 4, cutoff: 80, amp: 0.3
  sleep 4
end
