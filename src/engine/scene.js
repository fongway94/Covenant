/* Covenant action-scene engine.
   A tiny canvas game loop shared by ten story-specific interactive scenes.
   No images, no dependencies: every sprite is drawn with vector shapes so the
   whole engine works offline and inside the single-file build. */

import { sfx } from "../core/audio.js";
import { tx } from "../core/i18n.js";
import { GAMES } from "./games.js";
import { stepsFor } from "../data/game-steps.js";

const TAU = Math.PI * 2;
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const rnd = (a, b) => a + Math.random() * (b - a);
export const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);

/* --------------------------------------------------- painterly backdrops */
/* Every action scene is layered over the chapter's generated artwork. The
   image is cached once, panned slowly for parallax, then graded with a
   vignette, warm light rays and weather so the vector sprites stay readable. */
const ART_CACHE = new Map();

export function loadArt(src) {
  if (!src || typeof Image === "undefined") return null;
  if (ART_CACHE.has(src)) return ART_CACHE.get(src);
  let img = null;
  try { img = new Image(); img.src = src; } catch { img = null; }
  ART_CACHE.set(src, img);
  return img;
}

export function drawBackdrop(c, ctx, src, opts = {}) {
  const { w, h, t } = c;
  const alpha = opts.alpha ?? 0.5;
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, opts.top || "#162a38");
  g.addColorStop(1, opts.bottom || "#0b141c");
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);

  const img = loadArt(src);
  if (img && img.complete && img.naturalWidth > 0) {
    const iw = img.naturalWidth, ih = img.naturalHeight;
    const scale = Math.max(w / iw, h / ih) * 1.08;
    const dw = iw * scale, dh = ih * scale;
    const dx = (w - dw) / 2 + Math.sin(t * 0.18) * 7;
    const dy = (h - dh) / 2 + Math.sin(t * 0.13) * 5;
    try { ctx.drawImage(img, dx, dy, dw, dh); } catch { /* not loaded yet */ }
  }

  // colour grade so bright artwork never drowns the sprites
  ctx.fillStyle = `rgba(8,16,23,${alpha})`;
  ctx.fillRect(0, 0, w, h);

  // warm volumetric rays from the upper-left
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  for (let i = 0; i < 3; i++) {
    const x = w * (0.16 + i * 0.28) + Math.sin(t * 0.4 + i) * 14;
    const rg = ctx.createLinearGradient(x, 0, x + 80, h * 0.8);
    rg.addColorStop(0, "rgba(247,221,165,.11)");
    rg.addColorStop(1, "rgba(247,221,165,0)");
    ctx.fillStyle = rg;
    ctx.beginPath(); ctx.moveTo(x - 26, 0); ctx.lineTo(x + 34, 0);
    ctx.lineTo(x + 128, h * 0.9); ctx.lineTo(x + 50, h * 0.9); ctx.fill();
  }
  ctx.restore();

  // vignette
  const vg = ctx.createRadialGradient(w / 2, h * 0.46, h * 0.16, w / 2, h * 0.5, h * 0.78);
  vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(3,8,12,.68)");
  ctx.fillStyle = vg; ctx.fillRect(0, 0, w, h);

  drawWeather(c, ctx, opts.weather);
}

export function drawWeather(c, ctx, kind) {
  if (!kind) return;
  const { w, h, t } = c;
  ctx.save();
  if (kind === "sand" || kind === "petals" || kind === "leaves" || kind === "rain") {
    const n = kind === "rain" ? 60 : 42;
    for (let i = 0; i < n; i++) {
      const seed = i * 13.37;
      let x, y, len, col;
      if (kind === "rain") {
        x = (seed * 7 + t * 40) % (w + 40) - 20;
        y = (seed * 23 + t * 560) % (h + 60) - 30;
        len = 13; col = "rgba(170,205,225,.28)";
      } else if (kind === "sand") {
        x = (seed * 11 + t * 170) % (w + 60) - 30;
        y = (seed * 17 + Math.sin(t + i) * 8) % h;
        len = 8; col = "rgba(231,197,140,.24)";
      } else {
        x = (seed * 9 + t * 34 + Math.sin(t + i) * 22) % (w + 40) - 20;
        y = (seed * 19 + t * 42) % (h + 40) - 20;
        len = 5; col = kind === "leaves" ? "rgba(146,181,120,.32)" : "rgba(247,221,165,.35)";
      }
      ctx.strokeStyle = col; ctx.lineWidth = kind === "petals" || kind === "leaves" ? 2 : 1.4;
      ctx.beginPath(); ctx.moveTo(x, y);
      ctx.lineTo(x + (kind === "rain" ? -5 : len), y + (kind === "petals" || kind === "leaves" ? 7 : len * 0.7));
      ctx.stroke();
    }
  } else if (kind === "bubbles") {
    for (let i = 0; i < 26; i++) {
      const x = (i * 71.3 + Math.sin(t + i) * 12) % w;
      const y = (h - ((t * (18 + i % 5 * 6) + i * 37) % (h + 40)));
      ctx.strokeStyle = "rgba(180,230,225,.28)"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(x, y, 1.5 + (i % 4), 0, TAU); ctx.stroke();
    }
  } else if (kind === "embers") {
    for (let i = 0; i < 22; i++) {
      const x = (i * 53.7 + Math.sin(t * 0.8 + i) * 20) % w;
      const y = h - ((t * (22 + i % 4 * 9) + i * 29) % h);
      ctx.fillStyle = `rgba(247,190,105,${0.15 + (i % 5) * 0.06})`;
      ctx.beginPath(); ctx.arc(x, y, 1 + (i % 3) * 0.6, 0, TAU); ctx.fill();
    }
  }
  ctx.restore();
}

/** A ground shadow shared by every sprite — instant depth. */
export function shadow(ctx, x, y, rx = 13, ry = 4, alpha = 0.34) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, rx);
  g.addColorStop(0, `rgba(3,8,12,${alpha})`);
  g.addColorStop(1, "rgba(3,8,12,0)");
  ctx.save(); ctx.translate(x, y); ctx.scale(1, ry / rx);
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, rx, 0, TAU); ctx.fill();
  ctx.restore();
}

/* ------------------------------------------------------------- drawing kit */

export function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function star(ctx, x, y, r, color, alpha = 1) {
  ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = (i * Math.PI) / 5 - Math.PI / 2;
    const rr = i % 2 ? r * 0.42 : r;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath(); ctx.fill(); ctx.restore();
}

/* ------------------------------------------------- painted actor sprites */
/* The action scenes were all vector-drawn so they could never fail to load.
   The David chapter now stages painted actors instead, but every call site
   stays optional: if an image is missing (or still decoding) `actor()` draws
   nothing and the caller falls back to the old vector figure. That keeps the
   offline build, jsdom checks and the first animation frame all safe. */
export const SPRITES = {
  daniel: "assets/art/sprites/daniel.webp",
  traveller: "assets/art/sprites/traveller.webp",
  fisherman: "assets/art/sprites/fisherman.webp",
  prodigal: "assets/art/sprites/prodigal.webp",
  esther: "assets/art/sprites/esther.webp",
  shepherd: "assets/art/sprites/shepherd.webp",
  ruth: "assets/art/sprites/ruth.webp",
  zacchaeus: "assets/art/sprites/zacchaeus.webp",
  lion: "assets/art/sprites/lion.webp",
  david: "assets/art/sprites/david.webp",
  davidThrow: "assets/art/sprites/david-throw.webp",
  goliath: "assets/art/sprites/goliath.webp",
  goliathGuard: "assets/art/sprites/goliath-guard.webp",
  goliathFall: "assets/art/sprites/goliath-stagger.webp"
};

/** Warm every sprite up front so the first swinging frame is not a stickman. */
export function preloadSprites() {
  for (const src of Object.values(SPRITES)) loadArt(src);
}

export function spriteReady(key) {
  const img = loadArt(SPRITES[key]);
  return !!(img && img.complete && img.naturalWidth > 0);
}

/** Draw a sprite with its FEET on (x, y).
    `height` is the on-screen figure height in px; width follows the artwork.
    o.flip   -1 mirrors (facing left), default 1
    o.rot    rad of lean, pivoting on the feet (negative leans back)
    o.squash >1 stretches up, <1 crouches, keeping the feet planted
    o.alpha  0..1
    o.pivotX horizontal anchor, 0.5 = centred on x */
export function actor(ctx, key, x, y, height, o = {}) {
  const img = loadArt(SPRITES[key]);
  if (!img || !img.complete || !img.naturalWidth) return false;
  const dw = height * (img.naturalWidth / img.naturalHeight);
  ctx.save();
  ctx.translate(x, y);
  if (o.rot) ctx.rotate(o.rot);
  ctx.scale(o.flip === -1 ? -1 : 1, 1);
  if (o.squash && o.squash !== 1) ctx.scale(1 / o.squash, o.squash);
  ctx.globalAlpha = o.alpha ?? 1;
  try { ctx.drawImage(img, -dw * (o.pivotX ?? 0.5), -height, dw, height); }
  catch { ctx.restore(); return false; }
  ctx.restore();
  return true;
}

/** A soft contact shadow that keeps a painted actor stitched to the ground. */
export function actorShadow(ctx, x, y, w, alpha = 0.34) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = "#05090c";
  ctx.beginPath(); ctx.ellipse(x, y, w, Math.max(3, w * 0.16), 0, 0, TAU); ctx.fill();
  ctx.restore();
}

/** A small pilgrim: robe, hood, staff, animated walking legs. */
export function pilgrim(ctx, x, y, s = 1, phase = 0, dir = 1, alpha = 1, glow = false) {
  ctx.save();
  ctx.translate(x, y); ctx.scale(dir * s, s); ctx.globalAlpha = alpha;
  if (glow) {
    const g = ctx.createRadialGradient(0, -18, 2, 0, -18, 34);
    g.addColorStop(0, "rgba(244,215,155,.35)"); g.addColorStop(1, "rgba(244,215,155,0)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, -18, 34, 0, TAU); ctx.fill();
  }
  const sw = Math.sin(phase * 9) * 3.2;
  shadow(ctx, 0, 3, 15, 4, 0.42);
  ctx.strokeStyle = "#2a2118"; ctx.lineWidth = 3; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(-3, -9); ctx.lineTo(-4 + sw, 2); ctx.moveTo(3, -9); ctx.lineTo(4 - sw, 2); ctx.stroke();
  // cape, fluttering behind
  ctx.fillStyle = "#20333d";
  ctx.beginPath(); ctx.moveTo(-6, -29); ctx.quadraticCurveTo(-13 - Math.sin(phase * 7) * 3, -18, -9, -6);
  ctx.lineTo(-3, -9); ctx.closePath(); ctx.fill();
  ctx.fillStyle = "#1b2a33";
  ctx.beginPath(); ctx.moveTo(-7, -9); ctx.lineTo(7, -9); ctx.lineTo(9, -28); ctx.lineTo(-9, -28); ctx.closePath(); ctx.fill();
  // rim light on the leading edge
  ctx.strokeStyle = "rgba(247,221,165,.42)"; ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.moveTo(8.5, -27); ctx.lineTo(7, -10); ctx.stroke();
  ctx.fillStyle = "#c9a45c";
  ctx.beginPath(); ctx.ellipse(0, -34, 7.2, 8.4, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = "#14202a";
  ctx.beginPath(); ctx.arc(0, -36, 8.2, Math.PI, TAU); ctx.lineTo(8.2, -32); ctx.lineTo(-8.2, -32); ctx.fill();
  ctx.fillStyle = "rgba(255,240,205,.55)";
  ctx.beginPath(); ctx.arc(3.2, -33, 1.3, 0, TAU); ctx.fill();
  ctx.strokeStyle = "#8d6b3f"; ctx.lineWidth = 2.4;
  ctx.beginPath(); ctx.moveTo(10, -4); ctx.lineTo(10, -42); ctx.stroke();
  ctx.fillStyle = "#f4d79b"; ctx.beginPath(); ctx.arc(10, -43, 2.6, 0, TAU); ctx.fill();
  ctx.restore();
}

/** A named NPC for the adventure hub: robe colour, headscarf, walking bob. */
export function npc(ctx, x, y, o = {}) {
  const s = o.s ?? 1, phase = o.phase ?? 0, robe = o.robe || "#3c6070";
  const head = o.head || "#c9a45c", cloth = o.cloth || "#14202a";
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  shadow(ctx, 0, 3, 16, 4.5, 0.4);
  const bob = Math.sin(phase * 2.2) * 1.6;
  ctx.translate(0, bob);
  ctx.fillStyle = robe;
  ctx.beginPath(); ctx.moveTo(-9, 0); ctx.lineTo(-7, -30); ctx.lineTo(7, -30); ctx.lineTo(9, 0); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "rgba(247,221,165,.3)"; ctx.lineWidth = 1.3;
  ctx.beginPath(); ctx.moveTo(-7, -29); ctx.lineTo(-8, -2); ctx.stroke();
  ctx.fillStyle = head;
  ctx.beginPath(); ctx.ellipse(0, -36, 7.4, 8.6, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = cloth;
  ctx.beginPath(); ctx.arc(0, -38, 8.6, Math.PI, TAU); ctx.lineTo(8.6, -34); ctx.lineTo(-8.6, -34); ctx.fill();
  ctx.fillStyle = "rgba(255,240,205,.6)";
  ctx.beginPath(); ctx.arc(3, -35, 1.4, 0, TAU); ctx.fill();
  if (o.glow) {
    const rg = ctx.createRadialGradient(0, -20, 2, 0, -20, 40);
    rg.addColorStop(0, o.glow); rg.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(0, -20, 40, 0, TAU); ctx.fill();
  }
  ctx.restore();
}

export function lion(ctx, x, y, s = 1, face = 1, alpha = 1, awake = true) {
  ctx.save(); ctx.translate(x, y); ctx.scale(face * s, s); ctx.globalAlpha = alpha;
  ctx.fillStyle = "#7a5a2c";
  ctx.beginPath(); ctx.ellipse(0, 0, 26, 14, 0, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.ellipse(19, -9, 12, 12, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = "#a97f3d";
  ctx.beginPath(); ctx.arc(19, -12, 15, 0, TAU); ctx.fill();
  ctx.fillStyle = "#3a2a17";
  ctx.beginPath(); ctx.arc(14, -14, 2.2, 0, TAU); ctx.arc(25, -14, 2.2, 0, TAU); ctx.fill();
  if (awake) {
    ctx.fillStyle = "#ffd76a";
    ctx.beginPath(); ctx.arc(14, -14, 1.5, 0, TAU); ctx.arc(25, -14, 1.5, 0, TAU); ctx.fill();
  }
  ctx.strokeStyle = "#6b4c22"; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(-22, 4); ctx.quadraticCurveTo(-34, -6, -30, -18); ctx.stroke();
  ctx.fillStyle = "#4a3418";
  for (let i = -18; i < 18; i += 9) { ctx.beginPath(); ctx.ellipse(i, 12, 4, 3, 0, 0, TAU); ctx.fill(); }
  ctx.restore();
}

export function pig(ctx, x, y, s = 1, phase = 0) {
  ctx.save(); ctx.translate(x, y + Math.sin(phase * 8) * 1.5); ctx.scale(s, s);
  const bob = Math.sin(phase * 8) * 0.6;
  // contact shadow keeps the animal on the road instead of floating over it
  ctx.fillStyle = "rgba(20,14,10,.35)";
  ctx.beginPath(); ctx.ellipse(0, 12, 18, 4, 0, 0, TAU); ctx.fill();
  // legs first, so the body overlaps their tops
  ctx.strokeStyle = "#5f3e3b"; ctx.lineWidth = 3.4; ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-8, 5); ctx.lineTo(-8, 11 + bob);
  ctx.moveTo(6, 5); ctx.lineTo(6, 11 - bob);
  ctx.moveTo(-2, 6); ctx.lineTo(-2, 11 + bob * 0.6);
  ctx.stroke();
  // body: a lit top and a shadowed belly read as volume, not as a pink disc
  const body = ctx.createLinearGradient(0, -12, 0, 12);
  body.addColorStop(0, "#c89186"); body.addColorStop(0.5, "#a9726b"); body.addColorStop(1, "#6d4a47");
  ctx.fillStyle = body;
  ctx.beginPath(); ctx.ellipse(0, 0, 17, 11, 0, 0, TAU); ctx.fill();
  // bristles along the spine
  ctx.strokeStyle = "rgba(60,38,34,.5)"; ctx.lineWidth = 1.2;
  for (let i = -3; i <= 3; i++) {
    ctx.beginPath(); ctx.moveTo(i * 4, -10); ctx.lineTo(i * 4 + 1.5, -14 - Math.abs(i)); ctx.stroke();
  }
  // curly tail
  ctx.strokeStyle = "#8a5c57"; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(-16, -3);
  ctx.bezierCurveTo(-23, -6, -22, 1, -17, 0); ctx.stroke();
  // head
  const head = ctx.createRadialGradient(10, -6, 1, 14, -2, 10);
  head.addColorStop(0, "#d2a094"); head.addColorStop(1, "#9d6a63");
  ctx.fillStyle = head;
  ctx.beginPath(); ctx.ellipse(14, -2, 8.5, 7.5, 0.18, 0, TAU); ctx.fill();
  // ears
  ctx.fillStyle = "#8d5f59";
  ctx.beginPath(); ctx.moveTo(9, -8); ctx.lineTo(11, -15); ctx.lineTo(16, -9); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(17, -8); ctx.lineTo(20, -14); ctx.lineTo(22, -7); ctx.closePath(); ctx.fill();
  // snout + nostrils
  ctx.fillStyle = "#b27b72";
  ctx.beginPath(); ctx.ellipse(20.5, 1, 4.2, 3.4, 0.15, 0, TAU); ctx.fill();
  ctx.fillStyle = "#5c3a37";
  ctx.beginPath(); ctx.arc(19.4, 0.6, 0.9, 0, TAU); ctx.arc(22, 1.2, 0.9, 0, TAU); ctx.fill();
  // eye
  ctx.fillStyle = "#1d1210";
  ctx.beginPath(); ctx.arc(14.5, -4.5, 1.4, 0, TAU); ctx.fill();
  ctx.fillStyle = "rgba(255,235,220,.6)";
  ctx.beginPath(); ctx.arc(15, -5, 0.5, 0, TAU); ctx.fill();
  ctx.restore();
}

export function coin(ctx, x, y, r, t) {
  ctx.save(); ctx.translate(x, y); ctx.scale(Math.max(0.25, Math.abs(Math.cos(t * 3))), 1);
  ctx.fillStyle = "#f0c46a"; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
  ctx.strokeStyle = "#8a642a"; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.fillStyle = "#8a642a"; ctx.font = `bold ${r * 1.2}px serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText("✦", 0, 0); ctx.restore();
}

export function giant(ctx, x, y, s = 1, t = 0) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.fillStyle = "#2b3540";
  ctx.beginPath(); ctx.moveTo(-18, 0); ctx.lineTo(-13, -48); ctx.lineTo(13, -48); ctx.lineTo(18, 0); ctx.fill();
  ctx.fillStyle = "#c8a06a"; ctx.beginPath(); ctx.arc(0, -60, 11, 0, TAU); ctx.fill();
  ctx.fillStyle = "#2b3540"; ctx.beginPath(); ctx.arc(0, -65, 12, Math.PI, TAU); ctx.fill();
  ctx.fillStyle = "#e9c47f";
  ctx.beginPath(); ctx.arc(0, -70, 4, 0, TAU); ctx.fill();
  ctx.strokeStyle = "#c8a06a"; ctx.lineWidth = 5; ctx.lineCap = "round";
  const a = Math.sin(t * 2) * 0.15;
  ctx.beginPath(); ctx.moveTo(-13, -44); ctx.lineTo(-27, -30 + a * 10); ctx.moveTo(13, -44); ctx.lineTo(28, -34 - a * 10); ctx.stroke();
  ctx.strokeStyle = "#8e949c"; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(28, -60); ctx.lineTo(30, 4); ctx.stroke();
  ctx.restore();
}

export function boat(ctx, x, y, s, roll, t, opts = {}) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(roll); ctx.scale(s, s);
  // deeper, banded hull so the crew's legs sit inside the boat, not on it
  ctx.fillStyle = "#3f2a1a";
  ctx.beginPath(); ctx.moveTo(-60, -10); ctx.lineTo(60, -10); ctx.lineTo(46, 34); ctx.lineTo(-46, 34); ctx.closePath(); ctx.fill();
  ctx.fillStyle = "#5a3d24";
  ctx.beginPath(); ctx.moveTo(-60, -10); ctx.lineTo(60, -10); ctx.lineTo(52, 6); ctx.lineTo(-52, 6); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "rgba(201,164,92,.7)"; ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.moveTo(-56, 0); ctx.lineTo(56, 0); ctx.moveTo(-50, 16); ctx.lineTo(50, 16); ctx.stroke();
  ctx.strokeStyle = "#c9a45c"; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(-60, -10); ctx.lineTo(60, -10); ctx.stroke();
  if (opts.sail !== false) {
    ctx.fillStyle = "#eee0c1";
    ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(0, -64); ctx.lineTo(38 + Math.sin(t * 4) * 3, -14); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "#8d6b3f"; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(0, -64); ctx.lineTo(0, 12); ctx.stroke();
  }
  ctx.fillStyle = "#1b2a33"; ctx.beginPath(); ctx.ellipse(-34, -14, 8, 6, 0, 0, TAU); ctx.fill();
  ctx.restore();
}

export function scepter(ctx, x, y, up, t) {
  ctx.save(); ctx.translate(x, y);
  ctx.rotate(up ? -0.12 : 1.15 + Math.sin(t * 2) * 0.03);
  ctx.strokeStyle = "#f0c46a"; ctx.lineWidth = 6; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -78); ctx.stroke();
  ctx.fillStyle = "#ffdd8a"; ctx.beginPath(); ctx.arc(0, -82, 7, 0, TAU); ctx.fill();
  ctx.restore();
}

/* ------------------------------------------------------------- scene loop */

/* ------------------------------------------------------------------ the clock
   Time is a score clock, never a wall, and never a countdown. Every scene keeps
   its own `state.left`, but when it passes zero nothing ends and nothing is
   shown: the picture stays live and playable, and only the payout shrinks with
   the delay. A slow player loses points, never the act. */
/** The player's text-size setting, for text drawn on a canvas. Every number
    that reaches ctx.font is multiplied by this, so a scene's instructions grow
    with the rest of the app instead of staying 13px forever. */
function uiScale() {
  try {
    const v = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--scale"));
    return Number.isFinite(v) && v > 0 ? Math.max(1, Math.min(1.5, v)) : 1;
  } catch { return 1; }
}

export function overInfo(c) {
  const s = c.state || {};
  if (typeof s.left !== "number" || typeof s.t !== "number") return { over: 0, keep: 1 };
  /* Reading the three steps, working out where the finger goes, or simply
     looking at the painting is not paid for. The clock inside a scene only
     starts once the player has actually got somewhere in it — every scene
     reports that as c.progress — and it is measured from there, so a careful
     hand is never charged for being careful. */
  const budget = Math.max(12, s.t + s.left);   // the act's own starting budget
  if (typeof s.startedAt !== "number") {
    if (!(c.progress > 0)) return { over: 0, keep: 1 };
    s.startedAt = s.t;
    s.budget = budget;
  }
  const over = Math.max(0, s.t - s.startedAt - (s.budget ?? budget));
  return { over, keep: clamp(1 - over / (budget * 0.9), 0.3, 1) };
}

export function startScene(canvas, key, onResult, seed = {}, hooks = {}) {
  const game = GAMES[key] || GAMES.sling;
  let ctx = null;
  try { ctx = canvas.getContext && canvas.getContext("2d"); } catch { /* jsdom */ }
  if (!ctx) {
    /* No canvas (jsdom / very old browser): stay skippable, never crash. */
    return { stop() {}, skip() { onResult({ score: 0, success: false, skipped: true }); } };
  }

  let alive = true, raf = null, last = 0, ended = false;
  let font = "system-ui, sans-serif";
  try { font = (typeof getComputedStyle === "function" && getComputedStyle(document.body).fontFamily) || font; } catch { /* noop */ }
  const pointer = { x: 0, y: 0, down: false, justDown: false, justUp: false, startX: 0, startY: 0, dx: 0, dy: 0 };
  const keys = new Set();
  const particles = [], floats = [], ripples = [], trail = [];

  const c = {
    w: 0, h: 0, t: 0, dt: 0.016, game, pointer, keys, particles, floats,
    ripples, trail, font, hudTop: 112, paused: false,
    hearts: 3, maxHearts: 3, score: 0, progress: 0, shake: 0, flash: 0,
    hint: "", label: "", state: {}, shared: { ...seed },
    combo: 0, comboAt: -10, hitStop: 0,
    /* Readout for the lifted touch marker: 0..1 while a hold is in progress,
       null when there is nothing to show. Cleared every frame. */
    touchHold: null, touchFade: 0, touchAt: { x: 0, y: 0 },
    /* Did a finger ever land on this scene? A clock that runs out is not a
       success for a player who never moved — see the result below. */
    touched: false,
    /* Set to false by a scene that already draws its own instrument above the
       finger (a pouring flask, a sling pouch) so the two do not collide. */
    touchUi: true,
    rnd, clamp, dist,
    spark(x, y, color = "#f4d79b", n = 12, speed = 130) {
      for (let i = 0; i < n; i++) {
        const a = rnd(0, TAU), sp = rnd(speed * 0.3, speed);
        particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 40, life: rnd(0.4, 0.9), max: 0.9, r: rnd(1.5, 4), color, glow: true });
      }
    },
    /** Expanding shockwave — a soft ring that reads as impact, not clutter. */
    ring(x, y, color = "rgba(247,221,165,.7)", size = 46) {
      ripples.push({ x, y, r: 4, max: size, life: 0.42, total: 0.42, color });
      if (ripples.length > 12) ripples.shift();
    },
    float(x, y, text, color = "#f4d79b") { floats.push({ x, y, text, color, life: 1.1 }); },
    bump(n = 8) {
      c.shake = Math.max(c.shake, n);
      c.flash = 0.25;
      c.hitStop = Math.min(0.075, c.hitStop + 0.035);
      c.combo = 0;
    },
    hit(name) { try { sfx(name); } catch { /* noop */ } },
    hurt(n = 1) {
      c.hearts = Math.max(0, c.hearts - n); c.bump(10); c.hit("miss");
      c.float(c.w / 2, c.h * 0.42, tx("-1 ♥", "-1 ♥"), "#e08b78");
      if (c.hearts <= 0) c.end(false, Math.round(c.score));
    },
    addScore(n) {
      c.score += n;
      c.combo = c.t - c.comboAt < 1.3 ? Math.min(9, c.combo + 1) : 1;
      c.comboAt = c.t;
      if (c.combo >= 3 && c.combo % 3 === 0) {
        c.float(c.w / 2, c.h * 0.34, `×${c.combo}`, "#f7dda5");
        c.ring(c.w / 2, c.h * 0.4, "rgba(247,221,165,.45)", 60);
      }
    },
    setHint(s) { c.hint = s; },
    end(success, score) {
      if (ended) return;
      ended = true; alive = false;
      /* Lateness is paid for in points, here, once — so no scene has to
         remember to do it and none can disagree about the rule. */
      const oi = overInfo(c);
      c.score = Math.max(0, Math.round((score ?? c.score) * oi.keep));
      if (raf && typeof cancelAnimationFrame === "function") cancelAnimationFrame(raf);
      detach();
      c.hit(success ? "complete" : "miss");
      /* `untouched` lets the story refuse to reward a scene that ended while
         the player's hands were off the phone. The story still moves on — it
         just does not pretend the act was performed. */
      onResult({ score: c.score, success: !!success, skipped: false, untouched: !c.touched, late: oi.over > 0 });
    }
  };

  function resize() {
    const dpr = Math.min(2, (typeof window !== "undefined" && window.devicePixelRatio) || 1);
    const r = canvas.getBoundingClientRect();
    c.w = Math.max(240, r.width || canvas.clientWidth || 360);
    c.h = Math.max(320, r.height || canvas.clientHeight || 520);
    canvas.width = Math.round(c.w * dpr);
    canvas.height = Math.round(c.h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function pos(e) {
    const r = canvas.getBoundingClientRect();
    const p = e.touches?.[0] || e.changedTouches?.[0] || e;
    return { x: p.clientX - r.left, y: p.clientY - r.top };
  }
  function down(e) {
    e.preventDefault?.();
    const p = pos(e); pointer.x = p.x; pointer.y = p.y;
    pointer.startX = p.x; pointer.startY = p.y; pointer.dx = 0; pointer.dy = 0;
    pointer.down = true; pointer.justDown = true; c.touched = true;
    // Universal tactile feedback — every scene gets the same juicy tap.
    c.ring(p.x, p.y, "rgba(247,221,165,.55)", 34);
    for (let i = 0; i < 5; i++) {
      const a = rnd(0, TAU), sp = rnd(24, 70);
      particles.push({ x: p.x, y: p.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        life: 0.32, max: 0.32, r: rnd(1, 2.2), color: "#f7dda5", glow: true });
    }
    trail.length = 0;
    trail.push({ x: p.x, y: p.y, life: 0.34, total: 0.34 });
    game.onDown?.(c, pointer);
  }
  /* These three handlers are bound to `window`, because a finger that leaves the
     canvas must keep steering the scene. That also means they see every touch in
     the app — including touches on the Pause and Skip buttons drawn over the
     canvas. Calling preventDefault on a touchend that did not belong to the
     canvas cancels the browser's synthetic click for that touch, and a <button>
     with no click event is a dead button. So default-preventing is scoped to
     gestures that actually started on the canvas. */
  function onCanvasTarget(t) {
    return !!t && (t === canvas || (typeof t.closest === "function" && t.closest("#action-canvas") === canvas));
  }

  function move(e) {
    if (!pointer.down && !pointer.x) return;
    if (pointer.down) e.preventDefault?.();
    const p = pos(e);
    pointer.x = p.x; pointer.y = p.y;
    pointer.dx = pointer.x - pointer.startX; pointer.dy = pointer.y - pointer.startY;
    if (pointer.down) {
      trail.push({ x: p.x, y: p.y, life: 0.34, total: 0.34 });
      if (trail.length > 26) trail.shift();
    }
    game.onMove?.(c, pointer);
  }
  function up(e) {
    // Only a gesture that ends on the canvas may swallow its own click.
    if (pointer.down || onCanvasTarget(e.target)) e.preventDefault?.();
    if (e.changedTouches?.[0]) { const p = pos(e); pointer.x = p.x; pointer.y = p.y; }
    pointer.down = false; pointer.justUp = true;
    game.onUp?.(c, pointer);
  }
  function keydown(e) {
    keys.add(e.key.toLowerCase()); c.touched = true;
    if ([" ", "arrowleft", "arrowright", "arrowup", "arrowdown"].includes(e.key.toLowerCase())) e.preventDefault?.();
    game.onKey?.(c, e.key.toLowerCase(), true);
  }
  function keyup(e) { keys.delete(e.key.toLowerCase()); game.onKey?.(c, e.key.toLowerCase(), false); }

  function attach() {
    canvas.addEventListener("pointerdown", down, { passive: false });
    window.addEventListener("pointermove", move, { passive: false });
    window.addEventListener("pointerup", up, { passive: false });
    canvas.addEventListener("touchstart", down, { passive: false });
    window.addEventListener("touchmove", move, { passive: false });
    window.addEventListener("touchend", up, { passive: false });
    window.addEventListener("keydown", keydown);
    window.addEventListener("keyup", keyup);
    window.addEventListener("resize", resize);
  }
  function detach() {
    canvas.removeEventListener("pointerdown", down);
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", up);
    canvas.removeEventListener("touchstart", down);
    window.removeEventListener("touchmove", move);
    window.removeEventListener("touchend", up);
    window.removeEventListener("keydown", keydown);
    window.removeEventListener("keyup", keyup);
    window.removeEventListener("resize", resize);
  }

  function updateFx(dt) {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i]; p.life -= dt;
      p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 220 * dt;
      if (p.life <= 0) particles.splice(i, 1);
    }
    for (let i = floats.length - 1; i >= 0; i--) {
      const f = floats[i]; f.life -= dt; f.y -= 28 * dt;
      if (f.life <= 0) floats.splice(i, 1);
    }
    for (let i = ripples.length - 1; i >= 0; i--) {
      const r = ripples[i]; r.life -= dt;
      r.r += (r.max - r.r) * Math.min(1, dt * 9);
      if (r.life <= 0) ripples.splice(i, 1);
    }
    for (let i = trail.length - 1; i >= 0; i--) {
      trail[i].life -= dt;
      if (trail[i].life <= 0) trail.splice(i, 1);
    }
    c.shake = Math.max(0, c.shake - dt * 34);
    c.flash = Math.max(0, c.flash - dt * 1.6);
    c.hitStop = Math.max(0, c.hitStop - dt);
    if (c.t - c.comboAt > 1.8) c.combo = 0;
  }

  /* ------------------------------------------------- lifted touch marker
     A thumb covers roughly a 40 px disc, which is bigger than the ring most
     games used to draw under it — so the feedback for "you are pressing this"
     was hidden by the very finger pressing it. Everything a scene reports
     through c.touchHold is now drawn *above* the contact point instead: a ring
     you can see past your own thumb, a stem back to the exact spot, and a small
     dot left on the spot itself. Scenes that draw their own progress ring stop
     doing so and set c.touchHold instead. */
  function drawTouch() {
    const on = pointer.down;
    if (on) { c.touchAt = { x: pointer.x, y: pointer.y }; c.touchFade = 1; }
    else c.touchFade = Math.max(0, c.touchFade - 0.08);
    if (c.touchFade <= 0.01) return;
    const lift = clamp(c.h * 0.085, 46, 76);
    const r = 25;
    const x = clamp(c.touchAt.x, r + 6, c.w - r - 6);
    const y = clamp(c.touchAt.y - lift, r + 8, c.h - r - 8);
    const a = c.touchFade;
    const hold = typeof c.touchHold === "number" ? clamp(c.touchHold, 0, 1) : null;
    ctx.save();
    // the exact point, so nothing is lost to the offset
    ctx.fillStyle = `rgba(255,240,206,${0.75 * a})`;
    ctx.beginPath(); ctx.arc(c.touchAt.x, c.touchAt.y, 3.2, 0, TAU); ctx.fill();
    ctx.strokeStyle = `rgba(10,10,12,${0.22 * a})`; ctx.lineWidth = 3.4;
    ctx.beginPath(); ctx.arc(c.touchAt.x, c.touchAt.y, 11, 0, TAU); ctx.stroke();
    ctx.strokeStyle = `rgba(255,240,204,${0.5 * a})`; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.arc(c.touchAt.x, c.touchAt.y, 11, 0, TAU); ctx.stroke();
    // the stem: it should look like a plumb line, not a UI connector
    const grad = ctx.createLinearGradient(c.touchAt.x, c.touchAt.y, x, y + r);
    grad.addColorStop(0, `rgba(247,221,165,${0.28 * a})`);
    grad.addColorStop(1, `rgba(247,221,165,${0.06 * a})`);
    ctx.strokeStyle = grad; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(c.touchAt.x, c.touchAt.y - 10); ctx.lineTo(x, y + r - 2); ctx.stroke();
    // the ring above the thumb — skipped when the scene has its own instrument there
    if (c.touchUi === false) {
      ctx.restore();
      return;
    }
    ctx.globalCompositeOperation = "lighter";
    const halo = ctx.createRadialGradient(x, y, r * 0.2, x, y, r * 1.9);
    halo.addColorStop(0, `rgba(255,222,170,${0.14 * a})`);
    halo.addColorStop(1, "rgba(255,222,170,0)");
    ctx.fillStyle = halo;
    ctx.beginPath(); ctx.arc(x, y, r * 1.9, 0, TAU); ctx.fill();
    ctx.globalCompositeOperation = "source-over";
    const rr = hold === null ? r * 0.76 : r;
    // a dark backing under the bright ring, so it holds against sunlit water
    ctx.strokeStyle = `rgba(8,8,10,${(hold === null ? 0.16 : 0.26) * a})`; ctx.lineWidth = hold === null ? 4.6 : 5.4;
    ctx.beginPath(); ctx.arc(x, y, rr, 0, TAU); ctx.stroke();
    ctx.strokeStyle = `rgba(255,240,204,${(hold === null ? 0.62 : 0.8) * a})`; ctx.lineWidth = hold === null ? 1.8 : 2.2;
    ctx.beginPath(); ctx.arc(x, y, rr, 0, TAU); ctx.stroke();
    // a pupil, so the ring reads as an eye looking at the spot
    ctx.fillStyle = `rgba(255,236,200,${(hold === null ? 0.5 : 0.8) * a})`;
    ctx.beginPath(); ctx.arc(x, y, 3.4, 0, TAU); ctx.fill();
    if (hold !== null) {
      // progress, clockwise from the top, thick enough to see past a thumb
      ctx.strokeStyle = `rgba(10,10,12,${0.3 * a})`; ctx.lineWidth = 6.4;
      ctx.beginPath(); ctx.arc(x, y, rr, -Math.PI / 2, -Math.PI / 2 + hold * TAU); ctx.stroke();
      ctx.strokeStyle = `rgba(255,226,160,${0.98 * a})`; ctx.lineWidth = 3.8;
      ctx.beginPath(); ctx.arc(x, y, rr, -Math.PI / 2, -Math.PI / 2 + hold * TAU); ctx.stroke();
      ctx.strokeStyle = `rgba(255,246,220,${0.5 * a})`; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.arc(x, y, rr - 5, -Math.PI / 2, -Math.PI / 2 + hold * TAU); ctx.stroke();
      if (hold > 0.99) {
        ctx.globalCompositeOperation = "lighter";
        const bloom = ctx.createRadialGradient(x, y, 0, x, y, r * 2.4);
        bloom.addColorStop(0, `rgba(255,232,186,${0.35 * a})`);
        bloom.addColorStop(1, "rgba(255,232,186,0)");
        ctx.fillStyle = bloom;
        ctx.beginPath(); ctx.arc(x, y, r * 2.4, 0, TAU); ctx.fill();
      }
    }
    ctx.restore();
  }

  function drawFx() {
    // A ribbon following the finger — makes dragging feel physical.
    if (trail.length > 1) {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.lineCap = "round"; ctx.lineJoin = "round";
      for (let i = 1; i < trail.length; i++) {
        const a = trail[i - 1], b = trail[i];
        ctx.globalAlpha = clamp(b.life / b.total, 0, 1) * 0.32;
        ctx.strokeStyle = "#f7dda5";
        ctx.lineWidth = 1.5 + (i / trail.length) * 3.5;
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      }
      ctx.restore();
    }
    // Impact rings.
    for (const r of ripples) {
      ctx.save();
      ctx.globalAlpha = clamp(r.life / r.total, 0, 1) * 0.8;
      ctx.strokeStyle = r.color; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(r.x, r.y, r.r, 0, TAU); ctx.stroke();
      ctx.restore();
    }
    // Additive sparks with a soft bloom.
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (const p of particles) {
      const alpha = clamp(p.life / p.max, 0, 1);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      if (p.glow) { ctx.shadowColor = p.color; ctx.shadowBlur = 9; }
      else ctx.shadowBlur = 0;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r * (0.7 + alpha * 0.6), 0, TAU); ctx.fill();
    }
    ctx.restore();
    ctx.textAlign = "center";
    for (const f of floats) {
      const k = clamp(f.life / 1.1, 0, 1);
      ctx.save();
      ctx.globalAlpha = k;
      ctx.font = `bold ${Math.round(15 + (1 - k) * 5)}px ${c.font}`;
      ctx.shadowColor = "rgba(0,0,0,.8)"; ctx.shadowBlur = 6;
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, f.x, f.y);
      ctx.restore();
    }
  }

  function hud() {
    const { w, h } = c;
    const U = uiScale();
    ctx.save();
    // progress rail
    const top = c.hudTop || 14;
    ctx.fillStyle = "rgba(255,255,255,.13)"; roundRect(ctx, 14, top, w - 28, 5, 3); ctx.fill();
    ctx.fillStyle = "#f0c46a"; roundRect(ctx, 14, top, Math.max(4, (w - 28) * clamp(c.progress, 0, 1)), 5, 3); ctx.fill();
    // hearts
    ctx.font = `${Math.round(15 * U)}px ${c.font}`; ctx.textAlign = "left"; ctx.textBaseline = "middle";
    for (let i = 0; i < c.maxHearts; i++) {
      ctx.fillStyle = i < c.hearts ? "#e08b78" : "rgba(255,255,255,.2)";
      ctx.fillText("♥", 16 + i * 19 * U, top + 22);
    }
    // score
    ctx.textAlign = "right"; ctx.fillStyle = "rgba(244,231,203,.85)"; ctx.font = `600 ${Math.round(12 * U)}px ${c.font}`;
    ctx.fillText(`${tx("SCORE", "得分")} ${c.score}`, w - 16, top + 22);
    /* No clock is ever shown. Being slow only shrinks the payout (overInfo),
       and the briefing card already says so in words — a ticking "OVER +Ns"
       read-out was the one thing that still felt like a time limit. */
    if (c.combo >= 2) {
      ctx.font = `700 ${Math.round(11 * U)}px ${c.font}`;
      ctx.fillStyle = "#e7b75b";
      ctx.fillText(`×${c.combo}`, 16 + 3 * 19 * U, top + 22);
    }
    // hint banner
    if (c.hint) {
      /* The instruction line is the single most-read text in a scene, so it is
         scaled with the reader's setting and its band grows with the font. */
      let fs = Math.round(14 * U);
      ctx.font = `600 ${fs}px ${c.font}`; ctx.textAlign = "center";
      let tw = ctx.measureText(c.hint).width;
      const maxW = w - 28;
      if (tw > maxW) {
        /* shrink only as a last resort, then keep it on one readable line */
        fs = Math.max(11, Math.round(fs * (maxW / tw)));
        ctx.font = `600 ${fs}px ${c.font}`;
        tw = ctx.measureText(c.hint).width;
      }
      const bh = Math.round(fs + 16);
      ctx.fillStyle = "rgba(11,20,28,.8)";
      roundRect(ctx, w / 2 - tw / 2 - 16, h - bh - 12, tw + 32, bh, bh / 2); ctx.fill();
      ctx.fillStyle = "#f6ecd4"; ctx.fillText(c.hint, w / 2, h - 12 - bh / 2 + fs * 0.36);
    }
    ctx.restore();
  }

  function frame(ts) {
    if (!alive) return;
    const dt = Math.min(0.05, last ? (ts - last) / 1000 : 0.016);
    last = ts;
    resizeIfNeeded();
    ctx.save();
    if (c.shake > 0) ctx.translate(rnd(-c.shake, c.shake), rnd(-c.shake, c.shake));
    /* PAUSE: the world holds still. We keep drawing the current frame (so the
       canvas never goes blank or stale-looking) but advance nothing: no timers,
       no physics, no act countdown. Resuming resets `last` so the first frame
       after a resume cannot jump. */
    if (!c.paused) {
      c.t += dt; c.dt = dt;
      c.touchHold = null; c.touchUi = true;
      // A few frames of hit-stop on impact makes hits land without changing any
      // game logic — physics still advances with the same dt afterwards.
      if (c.hitStop <= 0) {
        try { game.step(c, dt); } catch (err) { if (typeof console !== "undefined") console.warn("[scene] step:", err); }
      }
      updateFx(dt);
    }
    ctx.clearRect(-40, -40, c.w + 80, c.h + 80);
    try { game.draw(c, ctx); } catch (err) { if (typeof console !== "undefined") console.warn("[scene] draw:", err); }
    drawFx();
    drawTouch();
    hud();
    ctx.restore();
    if (c.flash > 0) { ctx.fillStyle = `rgba(255,240,200,${c.flash * 0.16})`; ctx.fillRect(0, 0, c.w, c.h); }
    pointer.justDown = false; pointer.justUp = false;
    if (alive && typeof requestAnimationFrame === "function") raf = requestAnimationFrame(frame);
  }

  let sizeKey = "";
  function resizeIfNeeded() {
    const k = `${canvas.clientWidth}x${canvas.clientHeight}`;
    if (k !== sizeKey) { sizeKey = k; resize(); }
  }

  resize();
  /* The briefing card above the canvas is absolutely positioned and grows with
     the reader's text size, so the scene's own HUD is told where it starts
     instead of assuming a fixed 112px. */
  try {
    const head = typeof document !== "undefined" && document.querySelector(".action-head");
    const hb = head && head.getBoundingClientRect();
    if (hb && hb.height > 0) c.hudTop = Math.round(hb.bottom + 16);
  } catch { /* keep the default */ }
  attach();
  // Every climax may stage painted actors; one warm-up covers all of them.
  try { preloadSprites(); } catch { /* art is always optional */ }
  game.init(c);
  /* The act wrapper already set the instruction for the act that is running;
     only a single-act scene needs the fallback. */
  if (!c.hint) c.hint = game.hint(c);
  c.onActGate = typeof hooks.onActGate === "function" ? hooks.onActGate : null;
  if (typeof requestAnimationFrame === "function") raf = requestAnimationFrame(frame);

  return {
    scene: c,   // read-only-ish handle for debugging and automated visual checks
    canvas,     // identity of the live canvas, so a re-render can be detected
    pause() { if (!alive) return; c.paused = true; pointer.down = false; if (game.onUp) { try { game.onUp(c, pointer); } catch { /* noop */ } } },
    /** Release the held act and start the one the player just read about. */
    beginAct() { if (!alive) return; try { c.beginAct?.(); } catch (err) { if (typeof console !== "undefined") console.warn("[scene] beginAct:", err); } },
    actWaiting() { return !!c.actWaiting; },
    actIndex() { return c.actIndex || 0; },
    actCount() { return c.actCount || 1; },
    resume() { if (!alive) return; c.paused = false; last = 0; },
    isPaused() { return c.paused; },
    alive() { return alive; },
    stop() { if (!alive) return; alive = false; ended = true; if (raf) cancelAnimationFrame(raf); detach(); },
    skip() { if (!alive) return; alive = false; ended = true; if (raf) cancelAnimationFrame(raf); detach(); onResult({ score: 0, success: false, skipped: true }); }
  };
}

/** What the scene asks of the player. `act` is 0-based; a staged scene answers
    for the act that is about to run, not for its climax. */
export function gameInfo(key, act = 0) {
  const g = GAMES[key] || GAMES.sling;
  const m = (typeof g.actBrief === "function" && g.actBrief(act)) || null;
  /* The card used to carry one sentence of instruction. The steps are the same
     instruction written out: what to do with the hand, what the scene shows
     when you are in the right place, and what finishes the act. */
  const st = stepsFor(key, act);
  const title = m?.title || [g.titleEn, g.titleZh];
  const prompt = m?.prompt || [g.promptEn, g.promptZh];
  const hint = m?.hint || [g.hintEn, g.hintZh];
  const how = m?.how || [g.howEn || g.hintEn, g.howZh || g.hintZh];
  return {
    title: tx(title[0], title[1]),
    prompt: tx(prompt[0], prompt[1]),
    hint: tx(hint[0], hint[1]),
    how: tx(how[0], how[1]),
    demo: m?.demo || g.demo || "tap",
    steps: st ? st.en.map((line, i) => tx(line, st.zh[i])) : null,
    titlePair: title, promptPair: prompt, hintPair: hint,
    act: act + 1,
    acts: g.actCount || 1
  };
}
