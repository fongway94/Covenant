#!/usr/bin/env python3
"""Prepare AI-generated cinematic renders as phone-portrait game art.

The generator produces either 848x1264 (portrait) or 1408x768 (landscape).
Portrait renders pass through untouched except for a gentle cinematic grade;
landscape renders are centre-cropped to 2:3 and upscaled with Lanczos.
Both get a soft top/bottom vignette so overlay titles stay readable.

Usage: python3 tools/process-art.py _art_raw assets/art
Requires Pillow (pip install --break-system-packages Pillow).
"""
import os
import sys
from PIL import Image, ImageEnhance, ImageFilter

W, H = 848, 1264


def prepare(src):
    im = Image.open(src).convert("RGB")
    sw, sh = im.size
    target_ratio = W / H
    if abs(sw / sh - target_ratio) < 0.02:
        out = im.resize((W, H), Image.LANCZOS)
    elif sw / sh > target_ratio:
        cw = round(sh * target_ratio)
        x = (sw - cw) // 2
        out = im.crop((x, 0, x + cw, sh)).resize((W, H), Image.LANCZOS)
        out = ImageEnhance.Sharpness(out).enhance(1.18)
    else:
        ch = round(sw / target_ratio)
        y = (sh - ch) // 2
        out = im.crop((0, y, sw, y + ch)).resize((W, H), Image.LANCZOS)

    out = ImageEnhance.Color(out).enhance(1.04)
    out = ImageEnhance.Contrast(out).enhance(1.03)

    # Soft vignette: darker at the very top (chapter title) and bottom (HUD).
    px = out.load()
    for y in range(H):
        t = y / H
        if t < 0.20:
            f = 1 - 0.30 * (1 - t / 0.20)
        elif t > 0.86:
            f = 1 - 0.14 * ((t - 0.86) / 0.14)
        else:
            continue
        for x in range(W):
            r, g, b = px[x, y]
            px[x, y] = (int(r * f), int(g * f), int(b * f))
    return out


def process(src, dst):
    os.makedirs(os.path.dirname(dst) or ".", exist_ok=True)
    prepare(src).save(dst, "JPEG", quality=85, optimize=True, progressive=True)
    return os.path.getsize(dst) // 1024


if __name__ == "__main__":
    src_dir = sys.argv[1] if len(sys.argv) > 1 else "_art_raw"
    dst_dir = sys.argv[2] if len(sys.argv) > 2 else "assets/art"
    files = sorted(f for f in os.listdir(src_dir) if f.lower().endswith((".jpg", ".png")))
    for f in files:
        kb = process(os.path.join(src_dir, f), os.path.join(dst_dir, f.replace(".png", ".jpg")))
        print(f"  {f:20s} -> {kb:4d} KB")
    print(f"Prepared {len(files)} images -> {dst_dir}")
