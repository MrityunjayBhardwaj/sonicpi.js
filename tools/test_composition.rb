use_bpm 120

#Set an initial parameter
set :kick_active, false
set :perc_active, false
set :noise_active, false
set :synthbass_active, false
set :subbase_active, false

#Set an initial parameter
#set :kick_active, true
#set :perc_active, true
#set :noise_active, true
#set :synthbass_active, true
#set :subbase_active, true




live_loop :met1 do
  sleep 1
end

#DRUMS
define :pattern do |pattern|
  return pattern.ring.tick == "x"
end

live_loop :kick, sync: :met1 do
  if get[:kick_active]
    sample :bd_808, amp: [2.5,2.3,2.1,1.9].tick, hpf: 24    if pattern "x-x-x-x-x-x-x-x-"
    sleep 1
  else
    sleep 0.5
  end
end
live_loop :perc, sync: :met1 do
  if get[:perc_active]
    sample :perc_bell, amp: 0.02, hpf: 60, pan: rrand(-0.5, 0.5), finish: 0.05 if pattern "x-------x-------"
    sleep 1
  else
    sleep 0.5
  end
end


#NOISE
live_loop :crackle do
  if get[:noise_active]
    sample :vinyl_hiss, amp: 0.3, hpf: 60
    sleep sample_duration(:vinyl_hiss)
  else
    sleep 0.5
  end
end




#SIDECHAIN
with_fx :slicer, phase: 2, wave: 0, invert_wave: 1, mix: 0.9 do


  use_synth :hollow
  with_fx :reverb, mix: 0.8, room: 0.5 do
    live_loop :synthbass, sync: :met1 do
      #stop
      at = 0.2
      s = 3.7
      r = 0.1
      sl = at+s+r
      n = :A2
      sc = :minor
      hpf = note n

      options = { attack: at, sustain: s, release: r, hpf: hpf }
      #am,fma,dm,em
      [:i, :vi, :iv, :v].each do |degree|
        with_fx :ixi_techno, cutoff_min: rrand(60,80), cutoff_max: rrand(100,120), mix: 0.9, phase: sl do
          if get[:synthbass_active]
            play (chord_degree degree, n, sc, 3), options.merge(amp: [1.3,1.5,1.7].choose)
            sleep sl
          else
            sleep 0.5
          end
        end
      end
    end
  end

  use_synth :bass_foundation
  with_fx :reverb, mix: 0.8, room: 0.8, damp: 1 do
    live_loop :subbass, sync: :met1 do
      #stop
      at = 0.1
      s = 0.3
      r = 0.6
      sl = at+s+r
      n = :A1
      sc = :minor
      lpf = note (n+12)

      options = { attack: at, sustain: s, release: r, lpf: lpf, amp: 0.5 }

      [:A1, :F1, :D1, :E1].each do |notes|
        if get[:subbase_active]
          play notes, options
          sleep 4
        else
          sleep 0.5
        end
      end
    end
  end


end



#COMPOSITION
live_loop :composition, sync: :met1 do


  set :noise_active, true
  sleep (16)
  set :subbase_active, true
  sleep (16)
  set :kick_active, true
  sleep (32)
  set :synthbass_active, true
  sleep (16)
  set :perc_active, true
  sleep (32)
  set :synthbass_active, false
  sleep (16)
  set :subbase_active, false
  sleep (16)
  set :noise_active, false
  sleep (4)
  set :kick_active, false
  set :perc_active, false
  stop
end
