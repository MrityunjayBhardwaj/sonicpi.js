#!/usr/bin/env python3
"""Tier-1 pitch-track: per-note dominant-frequency → MIDI sequence + tempo.

The musical-correctness verdict for desktop↔web audio comparison. Energy/MFCC
aggregates are blind to a wrong melody (catalogue SP93) and confounded by the
known ~0.5× web gain-staging and reverb-tail length — so the note SEQUENCE and
inter-onset TEMPO are the verdict, not RMS/MFCC.

Usage:  python3 tools/pitchtrack.py <wav>            # human-readable
        python3 tools/pitchtrack.py --json <wav>     # machine (comparator)
"""
import sys, json, numpy as np, wave

NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']


def load(path):
    w = wave.open(path, 'rb')
    sr, n, ch = w.getframerate(), w.getnframes(), w.getnchannels()
    a = np.frombuffer(w.readframes(n), dtype=np.int16).astype(np.float64)
    if ch == 2:
        a = a.reshape(-1, 2).mean(axis=1)
    a /= (np.abs(a).max() or 1.0)          # normalise away the 0.5× gain delta
    return a, sr


def f2midi(f):
    return None if f <= 0 else int(round(69 + 12 * np.log2(f / 440.0)))


def name(m):
    return None if m is None else f"{NAMES[m % 12]}{m // 12 - 1}"


def track(path, note_dt=0.25):
    a, sr = load(path)
    hop = int(sr * 0.01)
    env = np.array([np.sqrt(np.mean(a[i:i + hop] ** 2))
                    for i in range(0, len(a) - hop, hop)])
    env /= (env.max() or 1.0)
    onsets = []
    for i in range(2, len(env) - 1):
        if env[i] > 0.12 and env[i] > env[i - 1] and env[i - 2] < 0.10:
            t = i * hop / sr
            if not onsets or t - onsets[-1] > note_dt * 0.6:
                onsets.append(t)
    notes = []
    for t in onsets:
        s = int(t * sr)
        seg = a[s:s + int(note_dt * 0.8 * sr)]
        if len(seg) < 512:
            continue
        win = seg * np.hanning(len(seg))
        sp = np.abs(np.fft.rfft(win))
        fr = np.fft.rfftfreq(len(win), 1 / sr)
        m = (fr > 80) & (fr < 2000)
        f0 = float(fr[m][np.argmax(sp[m])])
        notes.append({'t': round(t, 3), 'hz': round(f0, 1), 'midi': f2midi(f0)})
    iv = [round(notes[i + 1]['t'] - notes[i]['t'], 3)
          for i in range(len(notes) - 1)]
    return {
        'count': len(notes),
        'median_spacing_s': float(np.median(iv)) if iv else 0.0,
        'midi': [n['midi'] for n in notes],
        'names': [name(n['midi']) for n in notes],
        'notes': notes,
    }


if __name__ == '__main__':
    args = sys.argv[1:]
    as_json = '--json' in args
    path = [x for x in args if x != '--json'][0]
    r = track(path)
    if as_json:
        print(json.dumps(r))
    else:
        print(f"{r['count']} notes, median spacing {r['median_spacing_s']:.3f}s")
        print("MIDI:", r['midi'][:32])
        print("name:", r['names'][:16])
