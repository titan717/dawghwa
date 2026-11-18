"""Derive every Dawghwa mascot asset from the supplied artwork.

Sources (supplied by the project owner in the mascot blueprint PDF, page 15):
  brand/mascot-source-onblack.jpg  1254x1254, the artwork on its black stage
  brand/mascot-source.png          the same artwork cut out (RGBA) for use on any background
The character is never redrawn or altered; variants are crops, scales and
backgrounds only. Run: python3 scripts/brand-assets.py
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
CUT = Image.open(ROOT / "brand/mascot-source.png").convert("RGBA")
STAGE = Image.open(ROOT / "brand/mascot-source-onblack.jpg").convert("RGBA")

BLACK = (4, 1, 8, 255)  # onboarding stage, matches the artwork's background
PURPLE = (150, 60, 255)

FULL = (114, 120, 1174, 1180)   # whole figure, square
HEAD = (150, 175, 1140, 1165)   # ears to paws, a little tighter than FULL
FACE = (380, 300, 950, 870)     # eyes, nose, mouth for 20-40px slots
WIDE = (60, 60, 1194, 1194)     # maskable: figure stays inside the 80% safe circle

mascot = ROOT / "src/assets/mascot"
mascot.mkdir(parents=True, exist_ok=True)

def save_webp(img, path, size):
    img.resize((size, size), Image.LANCZOS).save(path, "WEBP", quality=86, method=6)

save_webp(CUT.crop(FULL), mascot / "default.webp", 640)
save_webp(CUT.crop(FULL), mascot / "default-320.webp", 320)
save_webp(CUT.crop(HEAD), mascot / "head.webp", 256)
save_webp(CUT.crop(FACE), mascot / "face.webp", 128)

def glow(size):
    """Soft purple glow behind the figure, like the blueprint's onboarding stage."""
    layer = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    r = size * 0.36
    c = size / 2
    d.ellipse((c - r, c - r * 0.9, c + r, c + r * 1.1), fill=PURPLE + (90,))
    return layer.filter(ImageFilter.GaussianBlur(size * 0.09))

def icon(size, rounded, box, pad=0.0):
    base = Image.new("RGBA", (size, size), BLACK)
    base.alpha_composite(glow(size))
    inner = int(size * (1 - pad * 2))
    art = CUT.crop(box).resize((inner, inner), Image.LANCZOS)
    off = (size - inner) // 2
    base.alpha_composite(art, (off, off))
    if rounded:
        mask = Image.new("L", (size, size), 0)
        ImageDraw.Draw(mask).rounded_rectangle((0, 0, size - 1, size - 1), radius=int(size * rounded), fill=255)
        out = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        out.paste(base, (0, 0), mask)
        return out
    return base

icons = ROOT / "public/icons"
icon(512, 0.22, FULL, pad=0.05).save(icons / "icon-512.png")
icon(192, 0.22, FULL, pad=0.05).save(icons / "icon-192.png")
icon(180, 0.0, FULL, pad=0.05).save(icons / "apple-touch-icon.png")
icon(512, 0.0, WIDE, pad=0.06).save(icons / "maskable-512.png")
icon(192, 0.0, WIDE, pad=0.06).save(icons / "maskable-192.png")
icon(64, 0.25, FACE).save(icons / "favicon-64.png")
icon(432, 0.0, WIDE, pad=0.12).save(icons / "android-foreground-432.png")

# Open Graph card 1200x630: black stage, purple glow, mascot right.
og = Image.new("RGBA", (1200, 630), BLACK)
g = glow(900)
og.alpha_composite(g, (520, -135))
og.alpha_composite(CUT.crop(FULL).resize((600, 600), Image.LANCZOS), (560, 15))
og.convert("RGB").save(ROOT / "public/og-art.png")
print("brand assets written")

# Android launcher icons + splash (Capacitor project)
res = ROOT / "android/app/src/main/res"
if res.exists():
    dens = {"mdpi": 1, "hdpi": 1.5, "xhdpi": 2, "xxhdpi": 3, "xxxhdpi": 4}
    fg = Image.new("RGBA", (432, 432), (0, 0, 0, 0))
    fg.alpha_composite(CUT.crop(WIDE).resize((300, 300), Image.LANCZOS), (66, 66))
    for name, k in dens.items():
        d = res / f"mipmap-{name}"
        n = int(48 * k)
        icon(n, 0.0, FULL, pad=0.05).save(d / "ic_launcher.png")
        r = icon(n, 0.0, FULL, pad=0.05)
        m = Image.new("L", (n, n), 0)
        ImageDraw.Draw(m).ellipse((0, 0, n - 1, n - 1), fill=255)
        rr = Image.new("RGBA", (n, n), (0, 0, 0, 0)); rr.paste(r, (0, 0), m)
        rr.save(d / "ic_launcher_round.png")
        fg.resize((int(108 * k), int(108 * k)), Image.LANCZOS).save(d / "ic_launcher_foreground.png")
    for p in res.glob("drawable*/splash.png"):
        w, h = Image.open(p).size
        s = Image.new("RGBA", (w, h), BLACK)
        side = int(min(w, h) * 0.55)
        gl = glow(int(side * 1.5))
        s.alpha_composite(gl, ((w - gl.width) // 2, (h - gl.height) // 2))
        s.alpha_composite(CUT.crop(FULL).resize((side, side), Image.LANCZOS), ((w - side) // 2, (h - side) // 2))
        s.convert("RGB").save(p)
    print("android assets written")
