"""Before/after contact sheets for docs/ui-polish (dark and light rows, before and after columns).
Usage: python3 scripts/qa/contact-sheet.py BEFORE_DIR AFTER_DIR OUT_DIR name[,name...]"""
import os
import sys

from PIL import Image, ImageDraw, ImageFont

before, after, out, names = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4].split(",")
os.makedirs(out, exist_ok=True)
try:
    font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 22)
except OSError:
    font = ImageFont.load_default()
for name in names:
    for w in (390, 1440):
        cells = []
        for theme in ("dark", "light"):
            for d, label in ((before, "before"), (after, "after")):
                im = Image.open(f"{d}/{name}-{w}-{theme}.png").convert("RGB")
                im = im.crop((0, 0, im.width, min(im.height, 900 if w == 1440 else 844)))
                if w == 1440:
                    im = im.resize((im.width * 2 // 3, im.height * 2 // 3))
                cells.append((im, f"{label} · {theme}"))
        cw = max(c[0].width for c in cells)
        ch = max(c[0].height for c in cells)
        pad, top = 16, 40
        sheet = Image.new("RGB", (pad + (cw + pad) * 2, top + (ch + top) * 2), (30, 30, 34))
        draw = ImageDraw.Draw(sheet)
        for i, (im, label) in enumerate(cells):
            x = pad + (i % 2) * (cw + pad)
            y = top + (i // 2) * (ch + top)
            draw.text((x, y - 32), label, fill=(240, 240, 235), font=font)
            sheet.paste(im, (x, y))
        sheet.save(f"{out}/{name}-{w}.jpg", quality=78)
        print(f"{out}/{name}-{w}.jpg")
