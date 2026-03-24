# SuperSonic (scsynth WASM) Research

## What It Is
SuperCollider's `scsynth` audio engine compiled to WebAssembly, running as AudioWorklet.
By Sam Aaron (creator of Sonic Pi). MIT wrapper + GPL core.

## Packages (4 npm packages)
- `supersonic-scsynth` — MIT JS client API (v0.57.0)
- `supersonic-scsynth-core` — GPL WASM engine + AudioWorklet
- `supersonic-scsynth-synthdefs` — MIT, 127 Sonic Pi SynthDefs
- `supersonic-scsynth-samples` — CC0, 206 audio samples

## Minimal Setup (6 lines to sound)

```javascript
import { SuperSonic } from "https://unpkg.com/supersonic-scsynth@latest"

const sonic = new SuperSonic({
  baseURL: "https://unpkg.com/supersonic-scsynth@latest/dist/",
  synthdefBaseURL: "https://unpkg.com/supersonic-scsynth-synthdefs@latest/synthdefs/",
})
await sonic.init()  // MUST be from user gesture (click/tap)
await sonic.loadSynthDef("sonic-pi-beep")
sonic.send("/s_new", "sonic-pi-beep", -1, 0, 0, "note", 72)
```

## Key API

```javascript
// Create synth
sonic.send("/s_new", "sonic-pi-prophet", nodeId, 0, groupId, "note", 60, "release", 4)

// Set params on running synth
sonic.send("/n_set", nodeId, "cutoff", 100)

// Free synth
sonic.send("/n_free", nodeId)

// Groups (Sonic Pi structure: synths group + FX group)
sonic.send("/g_new", 100, 0, 0)  // synths at head
sonic.send("/g_new", 101, 1, 0)  // FX at tail

// Load SynthDefs
await sonic.loadSynthDef("sonic-pi-beep")
await sonic.loadSynthDefs(["sonic-pi-saw", "sonic-pi-prophet"])

// Load samples
await sonic.loadSample(0, "bd_haus.flac")

// Sync (wait for async ops)
await sonic.sync()

// Other
sonic.nextNodeId()      // unique node ID
sonic.suspend/resume()  // AudioContext control
sonic.recover()         // smart recovery after tab backgrounding
sonic.destroy()         // teardown
```

## AnalyserNode Tap (CRITICAL for Motif viz)

```javascript
const analyser = sonic.audioContext.createAnalyser()
sonic.node.connect(analyser)  // sonic.node is standard AudioWorkletNode
// sonic.node also connects to destination — sound still plays
```

`sonic.node` is a standard `AudioWorkletNode`. Connects to ANY Web Audio node.

## Available SynthDefs (127 total)

**Instruments:** beep, saw, pulse, square, tri, supersaw, prophet, tb303, hoover, zawa, dark_ambience, growl, hollow, blade, piano, pluck, dull_bell, pretty_bell, fm, mod_fm, rhodey, kalimba, organ_tonewheel, tech_saws, chipbass, chiplead, gabberkick, bass_foundation, noise, pnoise, bnoise, gnoise, cnoise, + more

**808 Drums:** sc808_bassdrum, sc808_snare, sc808_clap, sc808_closed_hihat, sc808_open_hihat, sc808_cowbell, sc808_cymbal, sc808_rimshot, sc808_tomhi/lo/mid, sc808_congahi/lo/mid, sc808_claves, sc808_maracas

**FX:** reverb, echo, ping_pong, gverb, lpf, hpf, bpf, distortion, bitcrusher, krush, compressor, flanger, tremolo, slicer, wobble, ring_mod, octaver, vowel, whammy, pitch_shift, pan, eq, normaliser, tanh, level, mono, autotuner, + more

## Audio Architecture

```
JS main thread --(OSC via postMessage/SAB)--> AudioWorklet --(World_Run())--> AudioWorkletNode output --> speakers
```

Two communication modes:
- **postMessage** (default): works everywhere, CDN-friendly, higher latency
- **SharedArrayBuffer**: requires COOP/COEP headers, lower latency, ring buffers

## Limitations
- No SynthDef compilation in browser (must precompile)
- No DiskIn/DiskOut (use loadSample)
- No MouseX/MouseY/KeyState UGens
- No Ableton Link UGens (no UDP from AudioWorklet)
- No BeatTrack/MFCC/Onsets analysis UGens
- GPL contamination: keep core loaded via CDN, not bundled

## Sources
- github.com/samaaron/supersonic
- npm: supersonic-scsynth
- sonic-pi.net/supersonic/demo.html
- SuperSonic docs: ARCHITECTURE.md, API.md, GUIDE.md, SCSYNTH_DIFFERENCES.md
