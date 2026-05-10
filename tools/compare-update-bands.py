#!/usr/bin/env python3
"""Band-energy comparison for the Update-modifies-music regression.

Reads two WAVs (A: first run, B: after Update) and reports the per-band
RMS ratio B/A. If FX-wrapped loops are losing their FX wiring on hot-swap,
the 500-2000Hz band (snare body, synth body, FX-processed mids) collapses
to ~0.15x of A while the kick band (80-200Hz) stays near 1.0x.

Verdict:
  PASS   — all bands within ±25% (B/A in [0.75, 1.25])
  FAIL   — any band B/A outside ±25%, or 500-2000Hz band B/A < 0.5
"""
import sys
import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, sosfiltfilt

if len(sys.argv) != 3:
    print("usage: compare-update-bands.py A.wav B.wav", file=sys.stderr)
    sys.exit(2)

A_PATH, B_PATH = sys.argv[1], sys.argv[2]


def load(p):
    sr, x = wavfile.read(p)
    if x.ndim == 2:
        x = x.mean(axis=1)
    if x.dtype.kind in "iu":
        x = x.astype(np.float32) / np.iinfo(x.dtype).max
    return sr, x.astype(np.float32)


def band_rms(x, sr, lo, hi):
    sos = butter(4, [lo, hi], "band", fs=sr, output="sos")
    y = sosfiltfilt(sos, x)
    return float(np.sqrt(np.mean(y * y)))


sr_a, a = load(A_PATH)
sr_b, b = load(B_PATH)
print(f"A: sr={sr_a}, dur={len(a)/sr_a:.2f}s, rms={np.sqrt(np.mean(a*a)):.4f}, peak={np.max(np.abs(a)):.4f}")
print(f"B: sr={sr_b}, dur={len(b)/sr_b:.2f}s, rms={np.sqrt(np.mean(b*b)):.4f}, peak={np.max(np.abs(b)):.4f}")

if sr_a != sr_b:
    print(f"WARN: sample rate mismatch ({sr_a} vs {sr_b}) — comparison may be unreliable", file=sys.stderr)

bands = [
    ("sub      20-80Hz",   20,    80),
    ("kick     80-200Hz",  80,    200),    # control: NO FX
    ("low body 200-500Hz", 200,   500),    # bass body, partly FX
    ("mid      500-2000Hz", 500,  2000),   # snare body + synth body + FX wet
    ("high     2k-6k",      2000, 6000),
    ("air      6k-15k",     6000, 15000),
]

print(f"\n{'Band':<20} {'A RMS':>10} {'B RMS':>10} {'B/A':>8}  verdict")
verdict = "PASS"
for name, lo, hi in bands:
    rA = band_rms(a, sr_a, lo, hi)
    rB = band_rms(b, sr_b, lo, hi)
    ratio = rB / max(rA, 1e-9)
    status = "ok"
    if ratio < 0.75 or ratio > 1.33:
        status = "DRIFT"
        if verdict == "PASS":
            verdict = "FAIL"
    if name.startswith("mid") and ratio < 0.5:
        status = "FX-COLLAPSE"
        verdict = "FAIL"
    print(f"{name:<20} {rA:10.4f} {rB:10.4f} {ratio:>7.2f}x  {status}")

print(f"\nVERDICT: {verdict}")
print(
    "  Expected on bug:  kick band ≈ 1.0x, mid band ≈ 0.15x  (FX-COLLAPSE)\n"
    "  Expected on fix:  all bands within ±25% of each other (modulo natural"
    " loop-phase variation)"
)

sys.exit(0 if verdict == "PASS" else 1)
