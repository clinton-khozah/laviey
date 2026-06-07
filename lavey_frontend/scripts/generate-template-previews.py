"""Generate static template preview thumbnails for the post photo picker."""

from __future__ import annotations

import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
SAMPLE = ROOT / "public" / "images" / "post-template-sample.jpg"
OUT_DIR = ROOT / "public" / "images" / "templates"

THUMB_W, THUMB_H = 120, 150

TEMPLATES = [
    {"id": "none", "text": "", "bg": None},
    {
        "id": "single",
        "text": "✨ Single",
        "bg": ((255, 77, 109, 235), (236, 72, 153, 235)),
    },
    {
        "id": "open-relationship",
        "text": "💜 Open relationship",
        "bg": ((124, 58, 237, 235), (168, 85, 247, 235)),
    },
    {
        "id": "serious-relationship",
        "text": "💍 Serious relationship",
        "bg": ((190, 24, 93, 235), (225, 29, 72, 235)),
    },
    {
        "id": "just-friends",
        "text": "🤝 Just friends",
        "bg": ((16, 185, 129, 235), (52, 211, 153, 235)),
    },
]


def cover_crop(img: Image.Image, target_w: int, target_h: int) -> Image.Image:
    src_w, src_h = img.size
    scale = max(target_w / src_w, target_h / src_h)
    crop_w = target_w / scale
    crop_h = target_h / scale
    left = (src_w - crop_w) / 2
    top = (src_h - crop_h) / 2
    cropped = img.crop((left, top, left + crop_w, top + crop_h))
    return cropped.resize((target_w, target_h), Image.Resampling.LANCZOS)


def rounded_rect_mask(size: tuple[int, int], radius: float) -> Image.Image:
    w, h = size
    r = min(radius, w / 2, h / 2)
    mask = Image.new("L", size, 0)
    draw = ImageDraw.Draw(mask)
    draw.rounded_rectangle((0, 0, w - 1, h - 1), radius=r, fill=255)
    return mask


def draw_overlay(base: Image.Image, text: str, bg: tuple[tuple[int, ...], tuple[int, ...]]) -> None:
    w, h = base.size
    pad_x = int(w * 0.06)
    bar_h = max(44, int(h * 0.09))
    y = int(h - bar_h - h * 0.05)
    bar_w = w - pad_x * 2
    radius = bar_h * 0.35

    bar = Image.new("RGBA", (bar_w, bar_h), (0, 0, 0, 0))
    grad = Image.new("RGBA", (bar_w, bar_h))
    gdraw = ImageDraw.Draw(grad)
    c0, c1 = bg
    for x in range(bar_w):
        t = x / max(bar_w - 1, 1)
        color = tuple(int(c0[i] + (c1[i] - c0[i]) * t) for i in range(4))
        gdraw.line([(x, 0), (x, bar_h)], fill=color)

    mask = rounded_rect_mask((bar_w, bar_h), radius)
    bar.paste(grad, (0, 0), mask)

    shadow = Image.new("RGBA", base.size, (0, 0, 0, 0))
    shadow.paste((0, 0, 0, 90), (pad_x, y + 4), mask)
    base.alpha_composite(shadow)
    base.alpha_composite(bar, (pad_x, y))

    draw = ImageDraw.Draw(base)
    font_size = max(10, int(bar_h * 0.34))
    try:
        font = ImageFont.truetype("segoeui.ttf", font_size)
    except OSError:
        try:
            font = ImageFont.truetype("arial.ttf", font_size)
        except OSError:
            font = ImageFont.load_default()

    bbox = draw.textbbox((0, 0), text, font=font)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    tx = pad_x + (bar_w - tw) / 2 - bbox[0]
    ty = y + (bar_h - th) / 2 - bbox[1]
    draw.text((tx, ty), text, fill=(255, 255, 255, 255), font=font)


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    sample = Image.open(SAMPLE).convert("RGBA")

    for template in TEMPLATES:
        thumb = cover_crop(sample, THUMB_W, THUMB_H)
        if template["bg"] and template["text"]:
            draw_overlay(thumb, template["text"], template["bg"])
        out = OUT_DIR / f"{template['id']}.jpg"
        thumb.convert("RGB").save(out, "JPEG", quality=90, optimize=True)
        print(f"Wrote {out.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
