#!/usr/bin/env python3
"""Re-run tools/spectrogram-compare.py on existing community + e2e sidecars
to populate per-beat analysis (FX-style) without re-capturing audio.

The community + e2e sweep scripts didn't pass --bpm / --beats to the
comparator, so per_beat is null in their sidecars. This script:
  1. Reads each sidecar JSON.
  2. Parses bpm from the snippet code (regex `use_bpm N`, default 60).
  3. Computes beats = round(duration_sec × bpm / 60).
  4. Skips sidecars without both WAVs.
  5. Runs spectrogram-compare.py against the existing WAV pair with
     --bpm and --beats.
  6. Merges per_beat + (refreshed) spectrogram fields back into sidecar.

Idempotent — re-running on already-analysed sidecars is safe; the second
spectrogram-compare run is the expensive part but produces identical data.

Usage: python3 tools/reanalyse-perbeat.py [community|e2e|all]
"""
from __future__ import annotations

import json
import re
import subprocess
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
COMMUNITY = REPO / ".captures" / "community-sweep"
E2E = REPO / ".captures" / "e2e-sweep"
COMPARE = REPO / "tools" / "spectrogram-compare.py"

USE_BPM_RE = re.compile(r"^\s*use_bpm\s+(\d+(?:\.\d+)?)", re.MULTILINE)


def extract_bpm(code: str, default: float = 60.0) -> float:
    m = USE_BPM_RE.search(code or "")
    return float(m.group(1)) if m else default


def reanalyse(sidecar_path: Path) -> tuple[bool, str]:
    sidecar = json.loads(sidecar_path.read_text())
    desktop = sidecar.get("desktop") or {}
    web = sidecar.get("web") or {}
    desktop_wav = desktop.get("wavPath")
    web_wav = web.get("wavPath")
    if not desktop_wav or not web_wav:
        return False, "missing one or both WAVs (capture failed)"
    if not Path(desktop_wav).exists() or not Path(web_wav).exists():
        return False, "WAV file path doesn't exist on disk"
    code = sidecar.get("code", "")
    duration_ms = sidecar.get("duration", 30000)
    bpm = extract_bpm(code)
    beats = max(1, round((duration_ms / 1000.0) * bpm / 60.0))

    # Use a fresh out-prefix tied to the sidecar name so per-beat PNG lands
    # next to the original spectrogram PNG.
    name = sidecar_path.stem
    out_prefix = REPO / ".captures" / f"reanalyse_{name}"
    cmd = [
        "python3",
        str(COMPARE),
        desktop_wav,
        web_wav,
        str(out_prefix),
        "--bpm", str(bpm),
        "--beats", str(beats),
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        return False, f"comparator failed: {result.stderr.strip()[:200]}"

    out_json = out_prefix.with_suffix(out_prefix.suffix + ".json")
    if not out_json.exists():
        # spectrogram-compare writes <prefix>.json (not <prefix>+.json)
        out_json = Path(str(out_prefix) + ".json")
    if not out_json.exists():
        return False, "comparator produced no JSON output"

    new_data = json.loads(out_json.read_text())
    # Merge: keep existing fields that the new run doesn't touch, but
    # overwrite spectrogram block + add per_beat.
    spec = sidecar.get("spectrogram") or {}
    spec.update({
        "l2_mel_db": new_data.get("l2_mel_db", spec.get("l2_mel_db")),
        "mfcc_distance": new_data.get("mfcc_distance", spec.get("mfcc_distance")),
        "frames_compared": new_data.get("frames_compared", spec.get("frames_compared")),
        "spectrogram_png": new_data.get("spectrogram_png", spec.get("spectrogram_png")),
        "desktop_peak_freq_hz": new_data.get("desktop_peak_freq_hz", spec.get("desktop_peak_freq_hz")),
        "web_peak_freq_hz": new_data.get("web_peak_freq_hz", spec.get("web_peak_freq_hz")),
        "per_beat": new_data.get("per_beat"),
        "preconditions": new_data.get("preconditions"),
    })
    sidecar["spectrogram"] = spec
    sidecar_path.write_text(json.dumps(sidecar, indent=2))
    return True, f"bpm={bpm} beats={beats}"


def main() -> int:
    target = sys.argv[1] if len(sys.argv) > 1 else "all"
    pools: list[Path] = []
    if target in ("community", "all") and COMMUNITY.exists():
        pools.append(COMMUNITY)
    if target in ("e2e", "all") and E2E.exists():
        pools.append(E2E)
    if not pools:
        print(f"No sweep dirs found for target '{target}'", file=sys.stderr)
        return 2

    total = ok = skipped = 0
    for pool in pools:
        sidecars = sorted(pool.glob("*.json"))
        print(f"\n▶ Re-analysing {pool.name} ({len(sidecars)} sidecars)")
        for sc in sidecars:
            total += 1
            success, msg = reanalyse(sc)
            tag = "✓" if success else "·"
            print(f"  {tag} {sc.stem}: {msg}")
            if success:
                ok += 1
            else:
                skipped += 1

    print(f"\n=== {ok}/{total} sidecars updated · {skipped} skipped ===")
    return 0


if __name__ == "__main__":
    sys.exit(main())
