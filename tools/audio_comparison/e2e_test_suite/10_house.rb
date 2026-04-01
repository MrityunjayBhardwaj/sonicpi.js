use_bpm 124
live_loop :four_on_floor do
  sample :bd_haus, amp: 2
  sleep 1
end
live_loop :offbeat_hat do
  sleep 0.5
  sample :drum_cymbal_closed, amp: 0.6, rate: 2
  sleep 0.5
end
live_loop :clap do
  sleep 1
  sample :drum_snare_hard, amp: 0.5, rate: 2
  sleep 1
end
with_fx :reverb, mix: 0.5 do
  live_loop :chord_stab do
    use_synth :prophet
    play (chord :a3, :minor), release: 0.3, cutoff: 90, amp: 0.4
    sleep 2
    play (chord :f3, :major), release: 0.3, cutoff: 90, amp: 0.4
    sleep 2
  end
end
with_fx :echo, mix: 0.3, phase: 0.75 do
  live_loop :house_lead do
    use_synth :saw
    play (scale :a4, :minor_pentatonic).tick, release: 0.2, cutoff: 100, amp: 0.3
    sleep 0.5
  end
end
