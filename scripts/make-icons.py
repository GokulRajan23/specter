#!/usr/bin/env python3
"""Render the Spectre app icon to PNG at the sizes iOS and the manifest need.

The mark is pure geometry, so it is drawn directly rather than rasterised from
public/icon.svg — that keeps edges clean at 29px, where a rasteriser blurs them.
public/icon.svg remains the source of truth for the shape; keep the two in step.

Usage:  python3 scripts/make-icons.py
"""

from pathlib import Path
from PIL import Image, ImageDraw

BG = (0x0a, 0x0a, 0x0c)
INK = (0xf5, 0xf5, 0xf5)
BLUE = (0x00, 0x95, 0xf6)

# (x, y, w, h, opacity) on a 120x120 grid — mirrors public/icon.svg
BARS = [
    (26, 30, 68, 6, 1.00),
    (30, 45, 60, 6, 0.92),
    (35, 60, 50, 6, 0.84),
    (41, 75, 38, 6, 0.76),
]
DOT = (60, 97, 5)  # cx, cy, r

# apple-touch-icon is what iOS actually uses; the rest feed the web manifest.
OUTPUTS = {
    "apple-touch-icon.png": 180,
    "icon-192.png": 192,
    "icon-512.png": 512,
    "favicon-32.png": 32,
}

SS = 4  # supersample factor, then downsample — PIL's rounded_rectangle aliases badly


def blend(fg, opacity):
    """Flatten fg over the solid background. Avoids an alpha layer per bar."""
    return tuple(round(BG[i] + (fg[i] - BG[i]) * opacity) for i in range(3))


def render(size):
    px = size * SS
    s = px / 120
    img = Image.new("RGB", (px, px), BG)
    d = ImageDraw.Draw(img)

    for x, y, w, h, op in BARS:
        d.rounded_rectangle(
            [x * s, y * s, (x + w) * s, (y + h) * s],
            radius=(h / 2) * s,
            fill=blend(INK, op),
        )

    cx, cy, r = DOT
    d.ellipse([(cx - r) * s, (cy - r) * s, (cx + r) * s, (cy + r) * s], fill=BLUE)

    return img.resize((size, size), Image.LANCZOS)


def main():
    out = Path(__file__).resolve().parent.parent / "public"
    out.mkdir(exist_ok=True)
    for name, size in OUTPUTS.items():
        render(size).save(out / name, "PNG", optimize=True)
        print(f"{name:24} {size}x{size}")


if __name__ == "__main__":
    main()
