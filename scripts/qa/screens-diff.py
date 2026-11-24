"""Visual diff for scripts/qa/screens.mjs output (gate 12). QA only, not shipped.
Usage: python3 scripts/qa/screens-diff.py BASELINE_DIR NEW_DIR [DIFF_OUT_DIR]
For each PNG in both dirs: percent of pixels whose max channel delta exceeds 32 (live covers and
carousels change between runs, so this is a pointer for review, not a pass rule). Writes a
red-overlay diff image per changed screen and diff.md. Exit 0 always; PRs explain every change."""
import os
import sys

import numpy as np
from PIL import Image

base, new = sys.argv[1], sys.argv[2]
out = sys.argv[3] if len(sys.argv) > 3 else os.path.join(new, "diff")
os.makedirs(out, exist_ok=True)
THRESH = float(os.environ.get("DIFF_PCT", "2"))
names = sorted(n for n in os.listdir(new) if n.endswith(".png"))
rows, changed, missing = [], 0, []
for n in names:
    p = os.path.join(base, n)
    if not os.path.exists(p):
        missing.append(n)
        continue
    a = np.asarray(Image.open(p).convert("RGB"), dtype=np.int16)
    b = np.asarray(Image.open(os.path.join(new, n)).convert("RGB"), dtype=np.int16)
    h, w = min(a.shape[0], b.shape[0]), min(a.shape[1], b.shape[1])
    size_note = "" if a.shape == b.shape else f" size {a.shape[1]}x{a.shape[0]} -> {b.shape[1]}x{b.shape[0]}"
    mask = np.abs(a[:h, :w] - b[:h, :w]).max(axis=2) > 32
    pct = 100.0 * mask.mean()
    if pct >= THRESH or size_note:
        changed += 1
        over = b[:h, :w].astype(np.uint8).copy()
        over[mask] = (over[mask] * 0.3 + np.array([255, 0, 0]) * 0.7).astype(np.uint8)
        Image.fromarray(over).save(os.path.join(out, n))
    rows.append((pct, n, size_note))
rows.sort(reverse=True)
md = [f"# Visual diff: {base} -> {new}", "", f"Compared {len(rows)} screens; {changed} changed by {THRESH}% or more (or resized); {len(missing)} new.", "",
      "| screen | changed pixels | note |", "|---|---|---|"]
md += [f"| {n} | {pct:.2f}% | {note.strip()} |" for pct, n, note in rows if pct >= THRESH or note]
if missing:
    md += ["", "New screens (no baseline): " + ", ".join(missing)]
open(os.path.join(out, "diff.md"), "w").write("\n".join(md) + "\n")
print(f"screens compared {len(rows)}; changed {changed}; new {len(missing)}; report {out}/diff.md")
for pct, n, note in rows[:15]:
    if pct >= THRESH or note:
        print(f"  {pct:6.2f}%  {n}{note}")
