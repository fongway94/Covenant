#!/usr/bin/env python3
"""Cut a character out of a fake "transparency checkerboard" render.

Image models cannot emit real alpha, so they paint the standard grey/white
checker pattern instead. This script removes that pattern by flood-filling from
the borders through pixels that match the checker's own colour lattice, then
feathers the edge by one pixel so the sprite composites cleanly on our artwork.

Usage: python3 tools/cutout.py src.png dst.png|dst.webp [--height 560 | --width 900]
                               [--spread 26]  widen the neutral band for renders
                                             whose checker carries a colour cast

Requires Pillow.
"""
import sys
from collections import deque

from PIL import Image, ImageChops, ImageFilter


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


def local_flatness(im, tol=9):
    """True where a 3x3 neighbourhood is featureless (the fake checker)."""
    w, h = im.size
    chans = im.split()
    out = None
    for ch in chans:
        spread = ImageChops.subtract(ch.filter(ImageFilter.MaxFilter(3)),
                                     ch.filter(ImageFilter.MinFilter(3)))
        mask = spread.point(lambda v: 255 if v <= tol else 0)
        out = mask if out is None else ImageChops.multiply(out, mask)
    raw = out.load()
    flat = bytearray(w * h)
    for y in range(h):
        row = y * w
        for x in range(w):
            if raw[x, y]:
                flat[row + x] = 1
    return flat


def checker_pair(im, flat=None):
    """The two checker tones as actual colours (not just luminance).

    Only *featureless* border pixels are trusted: a render that stands the
    subject on a painted ledge puts stone or dirt against the left and right
    edges, and letting those into the sample made the key chase the ground.
    """
    w, h = im.size
    px = im.load()
    samples = []
    for x in range(0, w, max(1, w // 160)):
        for y in (1, 2, h - 3, h - 2):
            if flat is None or flat[y * w + x]:
                samples.append(px[x, y])
    for y in range(0, h, max(1, h // 160)):
        for x in (1, 2, w - 3, w - 2):
            if flat is None or flat[y * w + x]:
                samples.append(px[x, y])
    samples.sort(key=sum)
    if len(samples) < 8:
        return (200, 200, 200), (240, 240, 240)
    return samples[int(len(samples) * 0.12)], samples[int(len(samples) * 0.9)]


def cut(src, dst, target_h=None, target_w=None, mode="neutral", spread=14, footfade=0.0,
        plinth=False, seeds=(), ghost=0, deck=False, speckeat=False,
        cropbottom=0.0, toneeat=None):
    im = Image.open(src).convert("RGB")
    if cropbottom > 0:
        # A render that stands the subject in painted dirt, sand or gravel
        # welds that ground to the paws, and no key will remove it: the ground
        # is the subject's own colour range. Trimming the raw above it is the
        # only honest cut, because everything we need is above the horizon.
        keep = int(im.size[1] * (1 - cropbottom))
        im = im.crop((0, 0, im.size[0], keep))
    w, h = im.size
    px = im.load()
    tone_lo, tone_hi = checker_tones(im)
    # Texture is the one cue that survives any colour cast, so it is computed
    # first and then used both for tone sampling and for the key itself.
    flat = local_flatness(im)
    tone_a, tone_b = checker_pair(im, flat)
    floor = tone_lo - 26          # anything darker is shadow, not checker
    ceiling = tone_hi + 24        # a touch above the lightest square

    # The checker is painted with anti-aliased boundaries between squares, so an
    # exact colour match blocks the flood fill after one square. Match instead on
    # "neutral, and inside the checker's own luminance band", which covers both
    # tones and their AA edges, while warm linen, skin, leather and bronze all
    # stay far outside the test because they are saturated.
    # Some renders paint the checker with a coloured cast (one whale came back
    # cyan over deep water) and some cast a painted drop shadow. Colour alone
    # then either misses the background or eats the costume. The reliable
    # difference is texture: the fake checker is dead flat, while skin, cloth,
    # fur and stone all carry grain. So a pixel counts as background when it is
    # close to one of the border tones AND locally featureless.
    def near(c, t, tol=34):
        return abs(c[0] - t[0]) <= tol and abs(c[1] - t[1]) <= tol and abs(c[2] - t[2]) <= tol

    def is_bg(x, y):
        c = px[x, y]
        b = (c[0] + c[1] + c[2]) / 3
        if (max(c) - min(c)) <= spread and floor <= b <= ceiling:
            return True
        if not flat[y * w + x]:
            return False
        return near(c, tone_a) or near(c, tone_b)

    # Soft contact shadow: neutral but clearly darker than either checker tone.
    # Removed only when surrounded by background, so a shadow reads as shadow
    # instead of turning into a grey box when the sprite is composited.
    def is_shadow(x, y):
        c = px[x, y]
        b = (c[0] + c[1] + c[2]) / 3
        if (max(c) - min(c)) <= 12 and 48 <= b < floor:
            return True
        if not flat[y * w + x]:
            return False
        # a dimmed copy of either checker tone is a painted drop shadow
        return any(near(c, tuple(int(v * f) for v in t), 26) for t in (tone_a, tone_b) for f in (0.45, 0.6, 0.75))

    # Flood fill from every border pixel, through background-looking pixels only.
    bg = bytearray(w * h)
    q = deque()
    for x in range(w):
        for y in (0, h - 1):
            if is_bg(x, y) and not bg[y * w + x]:
                bg[y * w + x] = 1
                q.append((x, y))
    for y in range(h):
        for x in (0, w - 1):
            if is_bg(x, y) and not bg[y * w + x]:
                bg[y * w + x] = 1
                q.append((x, y))

    while q:
        x, y = q.popleft()
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = x + dx, y + dy
            if 0 <= nx < w and 0 <= ny < h:
                i = ny * w + nx
                if not bg[i] and is_bg(nx, ny):
                    bg[i] = 1
                    q.append((nx, ny))

    # Second pass: enclosed islands. Checker squares trapped between a strap,
    # a sling and a hand are not reachable from the border, so label every
    # remaining background-looking region and drop the ones fully inside.
    seen = bytearray(w * h)
    for y in range(h):
        for x in range(w):
            i = y * w + x
            if bg[i] or seen[i] or not (is_bg(x, y) or is_shadow(x, y)):
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
                        if not seen[j] and not bg[j] and (is_bg(nx, ny) or is_shadow(nx, ny)):
                            seen[j] = 1
                            dq.append((nx, ny))
            if touches_border or len(comp) >= (w * h) * 0.3:
                continue
            # Is this pocket a trapped bit of checker, or a pale patch of the
            # subject itself (light fur, a linen fold)? Checker is dead flat and
            # alternates tone; fur and cloth are grainy and single-toned.
            step = max(1, len(comp) // 300)
            sample = comp[::step]
            flat_frac = sum(1 for cx, cy in sample if flat[cy * w + cx]) / max(1, len(sample))
            near_a = sum(1 for cx, cy in sample if near(px[cx, cy], tone_a, 40)) / max(1, len(sample))
            near_b = sum(1 for cx, cy in sample if near(px[cx, cy], tone_b, 40)) / max(1, len(sample))
            tonal = near_a + near_b
            if flat_frac >= 0.55 and (min(near_a, near_b) >= 0.15 or tonal >= 0.7):
                for cx, cy in comp:
                    bg[cy * w + cx] = 1

    # Escape hatch for the one or two pockets a render can hide behind a limb,
    # a strap or a tree branch: flood fill from a seed the eye can point at.
    for sx, sy in seeds:
        if not (0 <= sx < w and 0 <= sy < h):
            continue
        i = sy * w + sx
        if bg[i]:
            continue
        base = px[sx, sy]
        stack = [(sx, sy)]
        bg[i] = 1
        n = 0
        while stack and n < (w * h) // 2:
            cx, cy = stack.pop()
            n += 1
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                nx, ny = cx + dx, cy + dy
                if 0 <= nx < w and 0 <= ny < h:
                    j = ny * w + nx
                    if bg[j]:
                        continue
                    c = px[nx, ny]
                    if max(abs(c[0] - base[0]), abs(c[1] - base[1]), abs(c[2] - base[2])) <= 30:
                        bg[j] = 1
                        stack.append((nx, ny))

    # Halo sweep: renders leave a mid-transparent film of checker colour over
    # the silhouette edge (it shows up as a ghost rectangle on dark scenes).
    if ghost:
        for y in range(h):
            row = y * w
            for x in range(w):
                if bg[row + x]:
                    continue
                c = px[x, y]
                if max(abs(c[i] - tone_a[i]) for i in range(3)) <= ghost or \
                   max(abs(c[i] - tone_b[i]) for i in range(3)) <= ghost:
                    bg[row + x] = 1

    # Global neutral sweep. A painted checker is dead neutral (its two tones sit
    # within a couple of levels of each other on every channel) and light. When
    # the subject itself is saturated — fur, cloth, stone — clearing *every*
    # such pixel, not just the ones a flood fill can reach, removes the ghost
    # lattice the model brushes over its own background in the gaps of a mane,
    # between legs, or in a thin film across the whole frame. `toneeat` is
    # (tolerance, brightness floor): both must be given by the caller because a
    # grey subject would lose its body if this ran unasked.
    if toneeat:
        tol, floor_b = toneeat
        for y in range(h):
            row = y * w
            for x in range(w):
                if bg[row + x]:
                    continue
                c = px[x, y]
                if max(c) - min(c) <= tol and (c[0] + c[1] + c[2]) / 3 >= floor_b:
                    bg[row + x] = 1
        del row

    alpha = Image.new("L", (w, h), 255)
    ap = alpha.load()
    for y in range(h):
        row = y * w
        for x in range(w):
            if bg[row + x]:
                ap[x, y] = 0

    # Feather the matte by a hair so edges are not jagged.
    alpha = alpha.filter(ImageFilter.GaussianBlur(0.8))

    # A painted plinth: some renders stand the subject on a ledge, plank deck
    # or slab that is welded to the feet. Rows at the very bottom that are
    # opaque almost all the way across are that plinth, not the subject, so cut
    # them away and let the last few pixels above fade into the scene floor.
    if plinth:
        ap = alpha.load()
        # Solidity has to be measured against the subject's own width, not the
        # canvas: a plinth under a figure occupies most of the figure's
        # footprint but only a third of the frame.
        bb = alpha.getbbox()
        x0, x1 = (bb[0], bb[2]) if bb else (0, w)
        width = max(1, x1 - x0)
        sample_cols = range(x0, x1, 2)
        cut_row = None
        for y in range(h - 1, int(h * 0.72), -1):
            solid = sum(1 for x in sample_cols if ap[x, y] > 110)
            if solid / max(1, len(range(x0, x1, 2))) >= 0.72:
                cut_row = y
            elif cut_row is not None:
                break
        if cut_row is not None:
            for y in range(cut_row, h):
                for x in range(w):
                    ap[x, y] = 0
            fade_h = max(6, int(h * 0.05))
            for y in range(max(0, cut_row - fade_h), cut_row):
                f = 1 - (y - (cut_row - fade_h)) / fade_h
                for x in range(w):
                    ap[x, y] = int(ap[x, y] * (f ** 0.8))

    # A painted deck or ledge that reaches the very bottom edge of the canvas
    # cannot be keyed by flood fill (it is connected to the border), and cannot
    # be cut by a solidity test either, because the planks are broken up. What
    # it *is*, always, is flat and connected across the whole bottom band. So:
    # measure the low-texture share of each bottom row and drop the deck.
    if deck:
        ap = alpha.load()
        floor_row = None
        for y in range(h - 1, int(h * 0.70), -1):
            shares = [1 for x in range(0, w, 2) if flat[y * w + x]]
            if len(shares) >= 0.55 * len(range(0, w, 2)):
                floor_row = y
            elif floor_row is not None:
                break
        if floor_row is not None and floor_row > h * 0.82:
            for y in range(floor_row, h):
                for x in range(w):
                    ap[x, y] = 0
            fade_h = max(8, int(h * 0.06))
            for y in range(max(0, floor_row - fade_h), floor_row):
                f = 1 - (y - (floor_row - fade_h)) / fade_h
                for x in range(w):
                    ap[x, y] = int(ap[x, y] * (f ** 0.7))

    # Dirty checker: the model drums, drags and splatters over its own fake
    # transparency, so the key cannot reach the pockets at all. Anything still
    # transparent that is *inside* the silhouette and is not the subject's own
    # colour is leftover backdrop, and is cleared by distance to the subject.
    if speckeat:
        ap = alpha.load()
        opaque = {}
        for y in range(h):
            row = y * w
            for x in range(w):
                if not bg[row + x]:
                    c = px[x, y]
                    opaque.setdefault(c, 0)
                    opaque[c] += 1
        common = sorted(opaque.items(), key=lambda kv: -kv[1])[:12]
        for y in range(h):
            row = y * w
            for x in range(w):
                if not bg[row + x] or y < h * 0.55:
                    continue
                # only pockets bracketed by the subject on both sides
                left = next((1 for xx in range(x - 1, max(-1, x - 60), -1) if bg[y * w + xx]), 0)
                right = next((1 for xx in range(x + 1, min(w, x + 60)) if bg[y * w + xx]), 0)
                if not (left or right):
                    continue
                c = px[x, y]
                b = (c[0] + c[1] + c[2]) / 3
                if max(c) - min(c) <= 26 and b > 150:
                    bg[row + x] = 1

    # Dirty checker, part two: the model brushes fur and rock *over* the
    # leftover squares, so they survive as ghost lattice patches in the lower
    # half. Those pixels are near-neutral and light — nothing in a lion, a coat
    # or a robe is — so sweep them out below the subject's midline.
    if speckeat:
        ap = alpha.load()
        for y in range(int(h * 0.55), h):
            for x in range(w):
                if not ap[x, y]:
                    continue
                c = px[x, y]
                b = (c[0] + c[1] + c[2]) / 3
                if max(c) - min(c) <= 30 and b >= 150:
                    ap[x, y] = 0

    # Some renders stand the subject on a painted ledge or plank deck that is
    # welded to the feet and cannot be keyed without clipping toes. A short
    # vertical fade at the very bottom melts that sliver into the scene floor,
    # where a contact shadow is drawn anyway.
    if footfade > 0:
        ap = alpha.load()
        bb0 = alpha.getbbox()
        if bb0:
            # fade relative to the subject's own feet, not the crop box
            h = bb0[3]
            ap = alpha.load()
        start = int(h * (1 - footfade))
        for y in range(start, h):
            f = 1 - (y - start) / max(1, (h - start))
            for x in range(w):
                ap[x, y] = int(ap[x, y] * (f ** 1.35))
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
    if target_w:
        ratio = target_w / out.size[0]
        out = out.resize((target_w, max(1, round(out.size[1] * ratio))), Image.LANCZOS)
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
    cropbottom, toneeat = 0.0, None
    if "--cropbottom" in sys.argv:
        cropbottom = float(sys.argv[sys.argv.index("--cropbottom") + 1])
        del sys.argv[sys.argv.index("--cropbottom"):sys.argv.index("--cropbottom") + 2]
    if "--toneeat" in sys.argv:
        _t, _b = sys.argv[sys.argv.index("--toneeat") + 1].split(",")
        toneeat = (int(_t), int(_b))
        del sys.argv[sys.argv.index("--toneeat"):sys.argv.index("--toneeat") + 2]
    target_h, target_w, mode, spread, footfade, plinth, seeds, ghost, deck, speckeat = (
        560, None, "neutral", 14, 0.0, False, [], 0, False, False)
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    for i, a in enumerate(sys.argv):
        if a == "--checker":
            mode = "checker"   # kept for compatibility; flatness is always on
    for i, a in enumerate(sys.argv):
        if a == "--height":
            target_h = int(sys.argv[i + 1])
        elif a == "--width":
            target_w = int(sys.argv[i + 1])
            target_h = None
        elif a == "--spread":
            spread = int(sys.argv[i + 1])
        elif a == "--footfade":
            footfade = float(sys.argv[i + 1])
        elif a == "--plinth":
            plinth = True
        elif a == "--speckeat":
            speckeat = True
        elif a == "--deck":
            deck = True
        elif a == "--ghost":
            ghost = int(sys.argv[i + 1])
        elif a == "--seed":
            x, y = sys.argv[i + 1].split(",")
            seeds = list(seeds) + [(int(x), int(y))]
    cut(args[0], args[1], target_h, target_w, mode=mode, spread=spread,
        footfade=footfade, plinth=plinth, seeds=seeds, ghost=ghost, deck=deck,
        speckeat=speckeat, cropbottom=cropbottom, toneeat=toneeat)
