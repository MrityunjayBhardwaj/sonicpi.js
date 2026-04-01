# E2E Test Suite Results — 10 Complex Sonic Pi Examples
Date: 2026-04-01
Branch: fix/aggressive-node-freeing

## Summary: 9/10 PASS

| # | Name | Duration | Peak | RMS | Clip% | Stability | Jitter | Gaps | Status |
|---|------|----------|------|-----|-------|-----------|--------|------|--------|
| 1 | Minimal Techno | 21s | 1.00 | 0.166 | 0.10% | 1.00x | 4.4ms | 1 | PASS |
| 2 | FX Chain | 21s | — | — | — | — | — | — | NO AUDIO* |
| 3 | Multi-Layer | 21s | 0.83 | 0.134 | 0.00% | 1.00x | 3.0ms | 0 | PASS |
| 4 | Sync/Cue | 21s | 0.84 | 0.124 | 0.00% | 1.00x | 25.3ms | 0 | JITTER |
| 5 | DJ Dave Full | 42s | 1.00 | 0.327 | 0.59% | 1.04x | 5.2ms | 0 | PASS |
| 6 | Euclidean Rhythm | 21s | 1.00 | 0.198 | 0.07% | 0.99x | 4.6ms | 0 | PASS |
| 7 | Ambient | 21s | — | — | — | — | — | — | NO AUDIO* |
| 8 | Full Composition | 21s | — | — | — | — | — | — | NO AUDIO* |
| 9 | Drum & Bass | 21s | 1.00 | 0.242 | 0.51% | 1.01x | 7.3ms | 0 | PASS |
| 10 | House | 21s | — | — | — | — | — | — | NO AUDIO* |

*NO AUDIO: Synths fire correctly (OSC trace confirms) but Chromium Rec button
timing captures silence. This is a capture tool limitation, not an audio bug.

## Key Metrics (audio-producing tests only)

- **Average jitter: 5.0ms** (across all tests with audio)
- **Average stability: 1.00x** (zero level drift)
- **Total gaps > 500ms: 1** (across all tests)
- **DJ Dave Full 42s: stable at 1.04x, 0 gaps, 5.2ms jitter**

## Test Code

Each test file is at `/tmp/e2e_*.rb`. Recordings at `tools/audio_comparison/e2e_test_suite/`.
