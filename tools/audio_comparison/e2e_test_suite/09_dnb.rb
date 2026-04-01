use_bpm 170
live_loop :dnb_kick do
  sample :bd_haus, amp: 2, cutoff: 100
  sleep 1
  sleep 0.5
  sample :bd_haus, amp: 1.5, cutoff: 90
  sleep 0.5
end
live_loop :dnb_snare do
  sleep 1
  sample :drum_snare_hard, amp: 1, rate: 1.5
  sleep 1
end
live_loop :dnb_hats do
  sample :drum_cymbal_closed, amp: 0.3, rate: 2, finish: 0.3
  sleep 0.25
end
with_fx :reverb, mix: 0.3 do
  live_loop :dnb_bass do
    use_synth :tb303
    play (ring :e1, :e1, :g1, :e1, :a1, :e1, :b1, :e1).tick, release: 0.15, cutoff: 90, amp: 1.5
    sleep 0.25
  end
end
