#!/usr/bin/env python3
"""Generate Covenant's PWA / store icons with zero third-party dependencies.

Draws a gold cross above an open book on an indigo field, supersampled for
smooth edges, then writes RGBA PNGs with the standard library only.
"""
import math
import os
import struct
import zlib

OUT = os.path.join(os.path.dirname(__file__), "..", "assets", "icons")
SS = 2  # supersampling factor

INK = (11, 20, 28)
INK_LIGHT = (23, 43, 56)
GOLD = (231, 183, 91)
GOLD_LIGHT = (248, 224, 172)
TEAL = (79, 184, 168)
PAPER = (244, 231, 203)


def blend(buf, i, color, alpha=1.0):
    if alpha <= 0:
        return
    if alpha >= 1:
        buf[i], buf[i + 1], buf[i + 2], buf[i + 3] = *color, 255
        return
    a = buf[i + 3] / 255.0
    na = alpha + a * (1 - alpha)
    for c in range(3):
        buf[i + c] = int((color[c] * alpha + buf[i + c] * a * (1 - alpha)) / na)
    buf[i + 3] = int(na * 255)


def in_poly(x, y, pts):
    inside = False
    j = len(pts) - 1
    for i in range(len(pts)):
        xi, yi = pts[i]
        xj, yj = pts[j]
        if (yi > y) != (yj > y) and x < (xj - xi) * (y - yi) / (yj - yi) + xi:
            inside = not inside
        j = i
    return inside


class Canvas:
    def __init__(self, size):
        self.n = size
        self.buf = bytearray(size * size * 4)

    def rect(self, x0, y0, x1, y1, color, radius=0, alpha=1.0):
        x0, y0, x1, y1 = [v * self.n for v in (x0, y0, x1, y1)]
        r = radius * self.n
        for y in range(max(0, int(y0)), min(self.n, int(y1) + 1)):
            for x in range(max(0, int(x0)), min(self.n, int(x1) + 1)):
                ok = True
                if r > 0:
                    cx = min(max(x, x0 + r), x1 - r)
                    cy = min(max(y, y0 + r), y1 - r)
                    ok = (x - cx) ** 2 + (y - cy) ** 2 <= r * r
                if ok:
                    blend(self.buf, (y * self.n + x) * 4, color, alpha)

    def circle(self, cx, cy, r, color, inner=0.0, alpha=1.0):
        cx, cy, r, inner = [v * self.n for v in (cx, cy, r, inner)]
        for y in range(max(0, int(cy - r - 1)), min(self.n, int(cy + r + 2))):
            for x in range(max(0, int(cx - r - 1)), min(self.n, int(cx + r + 2))):
                d = math.hypot(x - cx, y - cy)
                if inner <= d <= r:
                    blend(self.buf, (y * self.n + x) * 4, color, alpha)

    def poly(self, pts, color, alpha=1.0):
        p = [(x * self.n, y * self.n) for x, y in pts]
        for y in range(max(0, int(min(v[1] for v in p))), min(self.n, int(max(v[1] for v in p)) + 1)):
            for x in range(max(0, int(min(v[0] for v in p))), min(self.n, int(max(v[0] for v in p)) + 1)):
                if in_poly(x + 0.5, y + 0.5, p):
                    blend(self.buf, (y * self.n + x) * 4, color, alpha)

    def downsample(self, target):
        out = bytearray(target * target * 4)
        f = SS
        area = f * f
        for y in range(target):
            for x in range(target):
                r = g = b = a = 0
                for dy in range(f):
                    base = ((y * f + dy) * self.n + x * f) * 4
                    for dx in range(f):
                        i = base + dx * 4
                        pa = self.buf[i + 3] / 255.0
                        r += self.buf[i] * pa
                        g += self.buf[i + 1] * pa
                        b += self.buf[i + 2] * pa
                        a += pa
                o = (y * target + x) * 4
                if a > 0:
                    out[o:o + 4] = bytes((int(r / a), int(g / a), int(b / a), int(255 * a / area)))
        return out


def draw(c, maskable=False):
    # Background: full bleed for maskable, rounded square otherwise.
    if maskable:
        c.rect(0, 0, 1, 1, INK_LIGHT)
    else:
        c.rect(0, 0, 1, 1, (6, 12, 17))
        c.rect(0.02, 0.02, 0.98, 0.98, INK_LIGHT, radius=0.22)
    # Soft halo behind the emblem.
    for i in range(14, 0, -1):
        c.circle(0.5, 0.47, 0.19 + i * 0.014, GOLD, alpha=0.006)
    c.circle(0.5, 0.47, 0.335, GOLD, inner=0.325, alpha=0.85)
    c.circle(0.5, 0.47, 0.305, GOLD, inner=0.302, alpha=0.35)

    # Cross.
    c.rect(0.472, 0.175, 0.528, 0.485, GOLD_LIGHT, radius=0.012)
    c.rect(0.385, 0.255, 0.615, 0.311, GOLD_LIGHT, radius=0.012)

    # Open book: two pages meeting at the spine.
    c.poly([(0.20, 0.505), (0.50, 0.565), (0.50, 0.775), (0.20, 0.705)], PAPER)
    c.poly([(0.80, 0.505), (0.50, 0.565), (0.50, 0.775), (0.80, 0.705)], PAPER)
    c.poly([(0.20, 0.705), (0.50, 0.775), (0.50, 0.795), (0.20, 0.725)], GOLD)
    c.poly([(0.80, 0.705), (0.50, 0.775), (0.50, 0.795), (0.80, 0.725)], GOLD)
    for k in (0.60, 0.645, 0.69):
        c.poly([(0.24, k), (0.455, k + 0.048), (0.455, k + 0.055), (0.24, k + 0.007)], TEAL, alpha=0.75)
        c.poly([(0.545, k + 0.048), (0.76, k), (0.76, k + 0.007), (0.545, k + 0.055)], TEAL, alpha=0.75)
    # Spine.
    c.rect(0.492, 0.56, 0.508, 0.79, GOLD)


def write_png(path, size, pixels):
    raw = b"".join(b"\x00" + pixels[y * size * 4:(y + 1) * size * 4] for y in range(size))
    def chunk(tag, data):
        return (struct.pack(">I", len(data)) + tag + data
                + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF))
    png = (b"\x89PNG\r\n\x1a\n"
           + chunk(b"IHDR", struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0))
           + chunk(b"IDAT", zlib.compress(raw, 9))
           + chunk(b"IEND", b""))
    with open(path, "wb") as f:
        f.write(png)
    print(f"  {os.path.basename(path)}  {size}x{size}  {len(png) // 1024} KB")


def make(size, name, maskable=False):
    c = Canvas(size * SS)
    draw(c, maskable=maskable)
    write_png(os.path.join(OUT, name), size, c.downsample(size))


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    print("Generating Covenant icons...")
    make(192, "icon-192.png")
    make(512, "icon-512.png")
    make(512, "icon-512-maskable.png", maskable=True)
    make(180, "apple-touch-icon.png")
    print("Done.")
