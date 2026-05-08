# E2E Test Suite Results — 10 Complex Sonic Pi Compositions

**Date:** 2026-05-08 (re-sweep against fresh 48 kHz scsynth session, SR-consistent per SV29)
**Branch:** `feat/mixer-amp3` (off main with SP72 already merged via #280)
**Engine state:** SP72 fix in main + MIXER.AMP raised 1.2 → 3 (empirical compensation for the WASM scsynth output deficit characterised in `test_results/raw-lpf.html`).
**Tool:** `tools/e2e-sweep.sh` → `tools/compare-desktop-vs-web.ts` (raw-OSC desktop side via `tools/capture-desktop.ts`; web side via `tools/capture.ts --wrap-recording`)
**Duration:** 20s per fixture · BPM as set in fixture · Sample rate desktop 48k / web 48k (consistent — SP74 staleness avoided)

## Summary — 8 of 10 fixtures land within ±15% of desktop

| Stat | Median | Range |
|---|---|---|
| RMS ratio (web ÷ desktop) | **1.10×** | 0.15× — 3.22× |
| Peak ratio (web ÷ desktop) | **1.02×** | 0.43× — 3.32× |
| MFCC distance | 213 | 53 — 250 |
| L2 (mel-dB) | 21 | 9 — 25 |

8 of 10 fixtures land in the **0.89×–1.11× RMS** band — near parity with desktop. The two outliers belong to a separate non-constant-gain class (feedback-loop FX in WASM) that doesn't follow the constant filter-family deficit:

- **`02_fx_chain` — web 0.15× (much quieter)** — heavy serial FX chain. The chain's compounding attenuation hits hard.
- **`07_ambient` — web 3.22× (much louder)** — heavy reverb + prophet + echo. Down from 4.20× (memory `feedback_wasm_gain_staging.md`, 2026-05-04) → 2.96× pre-SP72 → 3.22× today. Time-domain feedback FX (reverb, echo, chorus) **amplify** in WASM rather than attenuate — opposite class from filter UGens.

## Per-fixture metrics

| # | Fixture | Desktop RMS | Web RMS | RMS ratio | Desktop peak | Web peak | Peak ratio | MFCC | L2 dB |
|---|---------|-------------|---------|-----------|--------------|----------|------------|------|-------|
| 1 | `01_minimal_techno`  | 0.169 | 0.186 | 1.10× | 0.781 | 0.827 | 1.06× | 209 | 20.7 |
| 2 | `02_fx_chain`        | 0.292 | 0.043 | **0.15×** | 0.742 | 0.320 | **0.43×** | 206 | 20.2 |
| 3 | `03_multi_layer`     | 0.142 | 0.158 | 1.11× | 0.819 | 0.875 | 1.07× | 205 | 22.3 |
| 4 | `04_sync_cue`        | 0.138 | 0.151 | 1.10× | 0.826 | 0.859 | 1.04× | 250 | 24.8 |
| 5 | `05_dj_dave_full`    | 0.224 | 0.200 | 0.89× | 1.000 | 1.000 | 1.00× | 216 | 23.0 |
| 6 | `06_euclidean`       | 0.210 | 0.228 | 1.08× | 1.000 | 1.000 | 1.00× | 193 | 21.0 |
| 7 | `07_ambient`         | 0.025 | 0.081 | **3.22×** | 0.190 | 0.631 | **3.32×** | 160 | 16.3 |
| 8 | `08_full_composition`| 0.165 | 0.182 | 1.10× | 0.907 | 0.923 | 1.02× |  54 |  8.9 |
| 9 | `09_dnb`             | 0.245 | 0.251 | 1.02× | 1.000 | 0.938 | 0.94× | 217 | 20.8 |
| 10| `10_house`           | 0.202 | 0.225 | 1.11× | 0.981 | 1.000 | 1.02× | 217 | 22.4 |

## What this changed since the previous (stale 44.1 kHz) run

The earlier morning run captured desktop side at 44.1 kHz scsynth; the user restarted Sonic Pi.app and scsynth re-locked at 48 kHz (per SP74 — scsynth has no `-S` flag, locks at boot to the audio device sample rate). Per SV29, cross-session A/B is invalid — those captures embedded in `raw-lpf.html` and the prior `RESULTS.md` are stale.

Today's run is the first SR-consistent A/B with both SP72 and AMP=3 in place:

| Metric | Prior (44.1 kHz, stale) | Current (48 kHz) | Δ |
|---|---|---|---|
| Median RMS× | 0.85× | 1.10× | +0.25 |
| Median peak× | 0.99× | 1.02× | +0.03 |
| `02_fx_chain` RMS× | 0.11× | 0.15× | +0.04 (still outlier) |
| `07_ambient` RMS× | 2.96× | 3.22× | +0.26 (still inverted) |

The shift in median RMS (+0.25) reflects the SR change and the SP72 fix landing in main (no `--wrap-recording` half-tempo confound on the web side).

## Sidecars

Each fixture's full comparator output lives at `.captures/e2e-sweep/<fixture>.json` (peak/RMS, MFCC, L2 mel-dB, spectrogram path, individual WAV paths). Spectrogram PNGs are at `.captures/compare_*_e2e-<fixture>_spectrogram.png`.

## Open questions

1. **Why does `02_fx_chain` collapse to 0.15×?** Heavy serial FX chain — likely one of the FX in the chain is over-attenuating in WASM. Worth a per-FX trace at the raw-OSC layer.
2. **Why does `07_ambient` invert (web louder)?** Reverb feedback gain renders higher in WASM than native. Worth filing a tight reproducer upstream at samaaron/supersonic.
3. **`04_sync_cue` MFCC 250** — highest in the set. Timing/ordering of cues across loops is the most complex behaviour to match; worth a per-loop ablation.
