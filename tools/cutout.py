#!/usr/bin/env python3
"""Cut a character out of a fake "transparency checkerboard" render.

Image models cannot emit real alpha, so they paint the standard grey/white
checker pattern instead. This script removes that pattern by flood-filling from
the borders through pixels that match the checker's own colour lattice, then
feathers the edge by one pixel so the sprite composites cleanly on our artwork.

Usage: python3 tools/cutout.py src.png dst.png|dst.webp [--height 560]
Requires Pillow.
"""
import sys
from collections import deque

from PIL import Image, ImageFilter


def checker_tones(im):
    """Learn the checkerboard's two tones from the border ring.

    Renders do not agree on how bright the fake checker is: one sheet came back
    with tones around 130/197, another near 200/255. Sampling the border and
    taking robust percentiles keeps one threshold rule working for all of them.
    """
    w, h = im.size
    px = im.load()
    lums = []
    step = max(1, w // 200)
    for x in range(0, w, step):
        for y in (1, 2, h - 3, h - 2):
            c = px[x, y]
            if max(c) - min(c) <= 20:
                lums.append((c[0] + c[1] + c[2]) / 3)
    for y in range(0, h, max(1, h // 200)):
        for x in (1, 2, w - 3, w - 2):
            c = px[x, y]
            if max(c) - min(c) <= 20:
                lums.append((c[0] + c[1] + c[2]) / 3)
    lums.sort()
    if not lums:
        return 176.0, 232.0
    lo = lums[int(len(lums) * 0.08)]
    hi = lums[int(len(lums) * 0.92)]
    return lo, max(hi, lo + 18)


def cut(src, dst, target_h=None, tol=16):
    im = Image.open(src).convert("RGB")
    w, h = im.size
    px = im.load()
    tone_lo, tone_hi = checker_tones(im)
    floor = tone_lo - 26          # anything darker is shadow, not checker
    ceiling = tone_hi + 24        # a touch above the lightest square

    # The checker is painted with anti-aliased boundaries between squares, so an
    # exact colour match blocks the flood fill after one square. Match instead on
    # "neutral, and inside the checker's own luminance band", which covers both
    # tones and their AA edges, while warm linen, skin, leather and bronze all
    # stay far outside the test because they are saturated.
    def is_bg(c):
        b = (c[0] + c[1] + c[2]) / 3
        return (max(c) - min(c)) <= 14 and floor <= b <= ceiling

    # Soft contact shadow: neutral but clearly darker than either checker tone.
    # Removed only when surrounded by background, so a shadow reads as shadow
    # instead of turning into a grey box when the sprite is composited.
    def is_shadow(c):
        b = (c[0] + c[1] + c[2]) / 3
        return (max(c) - min(c)) <= 12 and 48 <= b < floor

    # Flood fill from every border pixel, through background-looking pixels only.
    bg = bytearray(w * h)
    q = deque()
    for x in range(w):
        for y in (0, h - 1):
            if is_bg(px[x, y]) and not bg[y * w + x]:
                bg[y * w + x] = 1
                q.append((x, y))
    for y in range(h):
        for x in (0, w - 1):
            if is_bg(px[x, y]) and not bg[y * w + x]:
                bg[y * w + x] = 1
                q.append((x, y))

    while q:
        x, y = q.popleft()
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = x + dx, y + dy
            if 0 <= nx < w and 0 <= ny < h:
                i = ny * w + nx
                if not bg[i] and is_bg(px[nx, ny]):
                    bg[i] = 1
                    q.append((nx, ny))

    # Second pass: enclosed islands. Checker squares trapped between a strap,
    # a sling and a hand are not reachable from the border, so label every
    # remaining background-looking region and drop the ones fully inside.
    seen = bytearray(w * h)
    for y in range(h):
        for x in range(w):
            i = y * w + x
            if bg[i] or seen[i] or not (is_bg(px[x, y]) or is_shadow(px[x, y])):
                continue
            comp = []
            dq = deque([(x, y)])
            seen[i] = 1
            touches_border = False
            while dq:
                cx, cy = dq.popleft()
                comp.append((cx, cy))
                if cx <= 1 or cy <= 1 or cx >= w - 2 or cy >= h - 2:
                    touches_border = True
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    nx, ny = cx + dx, cy + dy
                    if 0 <= nx < w and 0 <= ny < h:
                        j = ny * w + nx
                        if not seen[j] and not bg[j] and (is_bg(px[nx, ny]) or is_shadow(px[nx, ny])):
                            seen[j] = 1
                            dq.append((nx, ny))
            if not touches_border and len(comp) < (w * h) * 0.03:
                for cx, cy in comp:
                    bg[cy * w + cx] = 1

    alpha = Image.new("L", (w, h), 255)
    ap = alpha.load()
    for y in range(h):
        row = y * w
        for x in range(w):
            if bg[row + x]:
                ap[x, y] = 0

    # Feather the matte by a hair so edges are not jagged.
    alpha = alpha.filter(ImageFilter.GaussianBlur(0.8))
    out = im.convert("RGBA")
    out.putalpha(alpha)

    bbox = alpha.getbbox()
    if bbox:
        pad = 6
        out = out.crop((max(0, bbox[0] - pad), max(0, bbox[1] - pad),
                        min(w, bbox[2] + pad), min(h, bbox[3] + pad)))
    if target_h:
        ratio = target_h / out.size[1]
        out = out.resize((max(1, round(out.size[0] * ratio)), target_h), Image.LANCZOS)
    # WebP keeps the alpha edge at a fifth of the PNG's weight, which matters
    # because the single-file build inlines every sprite as base64.
    if dst.lower().endswith(".webp"):
        out.save(dst, "WEBP", quality=88, method=6)
    else:
        out.save(dst, "PNG", optimize=True)

    total = out.size[0] * out.size[1]
    transparent = sum(out.getchannel("A").histogram()[:8])
    print(f"  {dst}: {out.size[0]}x{out.size[1]}, {transparent / total * 100:.1f}% transparent")
    return out


if __name__ == "__main__":
    target_h = 560
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    for i, a in enumerate(sys.argv):
        if a == "--height":
            target_h = int(sys.argv[i + 1])
    cut(args[0], args[1], target_h)
