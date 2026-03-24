# Sonic Pi Internals Research

## Virtual Time System

- **Virtual time (`vt`)**: Rational number per thread, starts at 0, advances ONLY on `sleep`/`sync`
- **Wall clock**: `Time.now`, used only for dispatch timing
- **Key**: "time doesn't pass during computation" — between sleeps, all `play` calls share same virtual timestamp

## How sleep works

```
sleep(beats) →
  delta_seconds = beats * (60.0 / bpm)
  new_vt = current_vt + delta_seconds
  update thread-local virtual time
  // NO real Kernel.sleep here — deferred to dispatch layer
```

Real sleeping happens in `__schedule_delayed_blocks_and_messages!`:
```
target_dispatch_time = vt + sched_ahead_time
sleep_duration = target_dispatch_time - Time.now
if sleep_duration > 0: Kernel.sleep(sleep_duration)
```

## Thread Model

- `live_loop :name do ... end` = `define :name_body` + `in_thread(name:) { loop { name_body(); cue :name } }`
- Hot-swap: `define` updates the function, thread keeps running, next iteration uses new body
- Thread-local state: virtual_time, beat, bpm, density, sched_ahead_time, random_seed, delayed_blocks, delayed_messages

## sync/cue

- `cue(:name, *args)` — broadcasts event with timestamp, validates args are immutable
- `sync(:name)` — parks thread, **inherits cue's virtual time** on wake (re-synchronization)

## Timing Guarantee

- Lemma 1: `actual_time >= virtual_time` always
- If computation is fast: dispatch thread sleeps the difference
- If computation is slow: no sleep, OSC bundle still carries correct timestamp
- If too slow: thread killed ("Timing Exception: thread got too far behind time")

## Audio Scheduling (3-layer pipeline)

1. **Decision layer** (Ruby): virtual time, deterministic, no jitter
2. **Dispatch layer** (`__schedule_delayed_blocks_and_messages!`): bridges virtual→wall clock
3. **Execution layer** (SuperCollider): sample-accurate from OSC timestamps

## Randomness

- 441,000 pre-generated random floats loaded at boot
- Per-thread index into this stream, seeded by `use_random_seed`
- Deterministic: same seed + same code = same sequence, every run, every machine

## Evaluate Lifecycle

1. GUI sends `/save-and-run-buffer` (code saved to internal Git repo)
2. Spider creates new job with fresh thread state (vt=0, beat=0)
3. `Kernel.eval(code)` within initialized context
4. `play`/`sample` queue delayed OSC messages
5. `sleep` advances virtual time, `__schedule_delayed_blocks_and_messages!` dispatches
6. Stop: all job threads killed, playing synths finish their release envelopes

## Sources
- runtime.rb (dev branch), sound.rb, core.rb
- Aaron & Orchard, "Temporal Semantics for a Live Coding Language" (FARM 2014)
