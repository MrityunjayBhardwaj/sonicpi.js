#!/usr/bin/env python3
"""
Quantify the click-on-Run artifact for #296.

The reproducer (tools/test-hot-swap-tail.ts) records a single pad note
that starts at Run #1 and is hit with Run #2 around t=2.5s of the recording.

Three metrics over the WAV:
1. Pre-click RMS (1s window before Run #2)
2. Post-click RMS (200ms after Run #2)
3. Click magnitude — max absolute sample within ±50ms of Run #2 normalized
   by pre-click RMS. A clean transition has click_magnitude near 1.0; a
   sharp cut spikes to 4-10x.

Usage: python3 tools/analyze-hot-swap-tail.py <wav> [run2_time_s=2.5]
"""
import sys, struct, wave, math

def load_wav(path):
    with wave.open(path, "rb") as w:
        sr = w.getframerate()
        nf = w.getnframes()
        ch = w.getnchannels()
        sw = w.getsampwidth()
        raw = w.readframes(nf)
    if sw == 2:
        fmt = f"<{nf*ch}h"
        ints = struct.unpack(fmt, raw)
        a = [s / 32768.0 for s in ints]
    elif sw == 4:
        fmt = f"<{nf*ch}f"
        a = list(struct.unpack(fmt, raw))
    else:
        raise SystemExit(f"unsupported sample width {sw}")
    if ch == 2:
        a = [(a[2*i] + a[2*i+1]) * 0.5 for i in range(nf)]
    return a, sr

def rms(samples):
    if not samples: return 0.0
    return math.sqrt(sum(s*s for s in samples) / len(samples))

def peak(samples):
    if not samples: return 0.0
    return max(abs(s) for s in samples)

def main():
    if len(sys.argv) < 2:
        print(__doc__, file=sys.stderr)
        sys.exit(2)
    wav_path = sys.argv[1]
    run2_t = float(sys.argv[2]) if len(sys.argv) > 2 else 2.5
    # the script's Rec starts a small fraction before Run #1, plus SETTLE_MS=1.5s priming
    # tail.ts: SETTLE_MS(1.5s) is BEFORE Rec, then Rec, then Run#1, then PRE_RUN_MS(2.5s)
    # So Run #2 happens ~2.5s into the recording, plus a small playwright click latency.
    # Allow override via cli.

    a, sr = load_wav(wav_path)
    dur = len(a) / sr
    print(f"loaded {wav_path}: {dur:.2f}s @ {sr}Hz mono, peak={peak(a):.3f}")
    print(f"Run #2 expected at t={run2_t:.2f}s")

    # Three windows
    pre_start = max(0, int((run2_t - 1.0) * sr))
    pre_end   = int(run2_t * sr)
    post_start = int(run2_t * sr)
    post_end   = int((run2_t + 0.2) * sr)
    click_start = max(0, int((run2_t - 0.05) * sr))
    click_end   = int((run2_t + 0.05) * sr)
    tail_start = int((run2_t + 0.5) * sr)
    tail_end   = min(len(a), int((run2_t + 1.5) * sr))

    pre_rms  = rms(a[pre_start:pre_end])
    post_rms = rms(a[post_start:post_end])
    tail_rms = rms(a[tail_start:tail_end])
    click_peak = peak(a[click_start:click_end])
    click_norm = click_peak / pre_rms if pre_rms > 1e-9 else 0.0

    # Find min RMS in a 50ms window centered on Run #2 — captures dip from cut
    min_rms = float('inf')
    win = int(0.020 * sr)  # 20ms windows
    for i in range(click_start, click_end - win, win // 4):
        r = rms(a[i:i+win])
        if r < min_rms:
            min_rms = r
    dip_ratio = (pre_rms - min_rms) / pre_rms if pre_rms > 1e-9 else 0.0

    print()
    print(f"  pre-click RMS  (t={(run2_t-1.0):.2f}-{run2_t:.2f}s):   {pre_rms:.4f}")
    print(f"  click window peak (±50ms around Run #2):    {click_peak:.4f} ({click_norm:.2f}× pre-RMS)")
    print(f"  20ms-window min RMS within click region:     {min_rms:.4f}")
    print(f"  RMS dip ratio (1 - min/pre):                  {dip_ratio*100:.1f}%")
    print(f"  post-click RMS (t={run2_t:.2f}-{(run2_t+0.2):.2f}s): {post_rms:.4f}")
    print(f"  tail RMS       (t={(run2_t+0.5):.2f}-{(run2_t+1.5):.2f}s): {tail_rms:.4f}")
    print()
    if dip_ratio > 0.5:
        print(f"VERDICT: AUDIBLE CUT — RMS drops {dip_ratio*100:.0f}% in the click region")
        print("        (the pad envelope was killed mid-decay)")
    elif click_norm > 3.0:
        print(f"VERDICT: AUDIBLE CLICK — transient peak {click_norm:.1f}× pre-RMS")
    else:
        print(f"VERDICT: CONTINUOUS — no significant dip or transient at the Run boundary")

if __name__ == "__main__":
    main()
