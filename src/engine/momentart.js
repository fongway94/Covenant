/* ============================================================================
   Story-moment art — the painted layer under the five tactile interactions.

   Until v0.8.9 a story moment was a widget: a conic-gradient ring for "hold",
   a beige bar and a cursor for "balance", a dashed SVG line for "trace".
   Twenty moments across ten chapters, all the same borrowed UI, all of it
   sitting on top of the chapter's photograph like a sticker.

   A moment is now a close crop of that same photograph — the real plate, not a
   gradient standing in for it — with the camera creeping in and the act itself
   drawn just in front of the lens: dust thrown across the ground while a giant
   shouts, the shoulder-pole that will not stay level, spray coming off a rope,
   a wick that will not stop guttering. Whatever is drawn is drawn as a dark
   object with one warm edge, because that is what a thing standing in front of
   a lit photograph looks like.

   Two rules from the v0.8.6 sweep still hold: never draw what the painting
   already has, and never invent anatomy you cannot see. So the cast is the
   plate's cast; this module only draws weather, ground, and the thing in the
   player's hands.

   Pure canvas 2D, explicit timestamps, no new assets — jsdom still skips it.
   ============================================================================ */

import { loadArt } from "./scene.js";

const TAU = Math.PI * 2;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const hash = (n) => { const x = Math.sin(n * 91.7 + 13.3) * 43758.5453; return x - Math.floor(x); };

/* Every chapter plate is painted at this size. The crop maths needs it, and it
   cannot be measured from CSS without waiting on the decode. */
const PW = 848, PH = 1264;

/* ------------------------------------------------------------------ helpers */

function soft(ctx, x, y, rx, ry, rgb, a) {
  if (a <= 0) return;
  const g = ctx.createRadialGradient(x, y, 0, x, y, Math.max(rx, ry));
  g.addColorStop(0, `rgba(${rgb},${a})`);
  g.addColorStop(0.55, `rgba(${rgb},${a * 0.4})`);
  g.addColorStop(1, `rgba(${rgb},0)`);
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, TAU); ctx.fill();
}

/* A dark body with one lit edge — the whole silhouette vocabulary. */
function body(ctx, path, dark = "rgba(13,16,19,.93)", rim = "rgba(255,203,146,.4)", lw = 1.2) {
  ctx.beginPath(); path();
  ctx.fillStyle = dark; ctx.fill();
  if (rim) { ctx.strokeStyle = rim; ctx.lineWidth = lw; ctx.stroke(); }
}

function stone(ctx, x, y, r, seed) {
  body(ctx, () => {
    ctx.moveTo(x - r, y + r * 0.5);
    ctx.quadraticCurveTo(x - r * 1.05, y - r * 0.45, x - r * 0.15, y - r * 0.62);
    ctx.quadraticCurveTo(x + r * 0.85, y - r * 0.7, x + r, y + r * 0.28);
    ctx.quadraticCurveTo(x + r * 0.5, y + r * 0.72, x - r, y + r * 0.5);
  }, "rgba(16,19,22,.9)", "rgba(255,208,155,.22)", 1);
  soft(ctx, x + r * 0.15, y - r * 0.35, r * 0.9, r * 0.6, "255,210,160", 0.05 + hash(seed) * 0.04);
}

/* A clay jar: shoulder, belly, foot. Used by the water jars and the lamp's oil. */
function jar(ctx, x, y, s, tilt = 0, fill = "#1a1e22") {
  ctx.save();
  ctx.translate(x, y); ctx.rotate(tilt); ctx.scale(s, s);
  body(ctx, () => {
    ctx.moveTo(-6, -16);
    ctx.quadraticCurveTo(-17, -6, -14, 8);
    ctx.quadraticCurveTo(-11, 19, 0, 19);
    ctx.quadraticCurveTo(11, 19, 14, 8);
    ctx.quadraticCurveTo(17, -6, 6, -16);
    ctx.closePath();
  }, fill, "rgba(255,206,150,.42)", 1.1);
  // the lip, and the leaf of light down the left side
  ctx.strokeStyle = "rgba(255,214,164,.5)"; ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.moveTo(-6, -16); ctx.lineTo(6, -16); ctx.stroke();
  ctx.strokeStyle = "rgba(255,216,170,.16)"; ctx.lineWidth = 2.2;
  ctx.beginPath(); ctx.moveTo(-9, -9); ctx.quadraticCurveTo(-12, 4, -8, 13); ctx.stroke();
  ctx.restore();
}

/* A woven basket, close enough to see the weave: a warm body lit from the
   upper right, a dark mouth, stakes running down, bands wrapping round, and a
   contact shadow so it sits in the photograph instead of on top of it. */
function basket(ctx, x, y, s, kind, tilt) {
  ctx.save();
  ctx.translate(x, y); ctx.rotate(tilt); ctx.scale(s, s);
  /* the shade it throws on whatever it stands over */
  const sh = ctx.createRadialGradient(0, 16, 1, 0, 16, 24);
  sh.addColorStop(0, "rgba(8,7,5,.6)");
  sh.addColorStop(1, "rgba(8,7,5,0)");
  ctx.fillStyle = sh;
  ctx.beginPath(); ctx.ellipse(0, 15, 21, 6.5, 0, 0, TAU); ctx.fill();
  /* body */
  const lit = ctx.createLinearGradient(-14, -9, 12, 16);
  lit.addColorStop(0, "rgba(104,68,32,.99)");
  lit.addColorStop(0.42, "rgba(188,136,74,.99)");
  lit.addColorStop(1, "rgba(66,42,20,.99)");
  body(ctx, () => {
    ctx.moveTo(-15, -8);
    ctx.quadraticCurveTo(-14, 6, -9.5, 13);
    ctx.quadraticCurveTo(0, 17, 9.5, 13);
    ctx.quadraticCurveTo(14, 6, 15, -8);
    ctx.closePath();
  }, lit, null);
  /* the mouth, dark inside */
  const mouth = ctx.createLinearGradient(0, -11, 0, -5);
  mouth.addColorStop(0, "rgba(26,17,9,.98)");
  mouth.addColorStop(1, "rgba(8,6,4,.98)");
  ctx.fillStyle = mouth;
  ctx.beginPath(); ctx.ellipse(0, -8, 15, 3.4, 0, 0, TAU); ctx.fill();
  /* weave: stakes then bands */
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(-15, -8);
  ctx.quadraticCurveTo(-14, 6, -9.5, 13);
  ctx.quadraticCurveTo(0, 17, 9.5, 13);
  ctx.quadraticCurveTo(14, 6, 15, -8);
  ctx.closePath(); ctx.clip();
  ctx.strokeStyle = "rgba(238,196,140,.15)"; ctx.lineWidth = 0.8;
  for (let i = -6; i <= 6; i++) {
    ctx.beginPath();
    ctx.moveTo(i * 2.4, -9);
    ctx.quadraticCurveTo(i * 2.7, 6, i * 2.1, 15);
    ctx.stroke();
  }
  ctx.strokeStyle = "rgba(255,206,150,.1)"; ctx.lineWidth = 1;
  for (let i = 0; i < 4; i++) {
    const yy = -6 + i * 5;
    ctx.beginPath();
    ctx.moveTo(-15, yy); ctx.quadraticCurveTo(0, yy + 3.6, 15, yy); ctx.stroke();
  }
  /* the lit right wall of the basket */
  const wall = ctx.createLinearGradient(2, 0, 15, 0);
  wall.addColorStop(0, "rgba(255,214,160,0)");
  wall.addColorStop(1, "rgba(255,214,160,.16)");
  ctx.fillStyle = wall; ctx.fillRect(0, -8, 16, 26);
  ctx.restore();
  /* the rim, and the one edge the light catches — not an outline */
  ctx.strokeStyle = "rgba(250,206,150,.5)"; ctx.lineWidth = 1.3;
  ctx.beginPath(); ctx.ellipse(0, -8, 15, 3.4, 0, 0, TAU); ctx.stroke();
  ctx.strokeStyle = "rgba(255,224,176,.42)"; ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.moveTo(13.6, -7);
  ctx.quadraticCurveTo(13, 5, 8.6, 12.4);
  ctx.stroke();
  ctx.strokeStyle = "rgba(10,8,6,.45)"; ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(-13.6, -7);
  ctx.quadraticCurveTo(-13, 5, -8.6, 12.4);
  ctx.stroke();
  if (kind === "bread") {
    for (let i = 0; i < 3; i++) {
      const bx = -8 + i * 8, by = -11 - (i === 1 ? 2.6 : 0);
      const rot = -0.28 + i * 0.28;
      const g = ctx.createLinearGradient(bx - 5, by - 4, bx + 5, by + 4);
      g.addColorStop(0, "rgba(196,146,86,.99)");
      g.addColorStop(0.55, "rgba(146,100,56,.99)");
      g.addColorStop(1, "rgba(84,54,28,.99)");
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.ellipse(bx, by, 6.2, 3.8, rot, 0, TAU); ctx.fill();
      ctx.strokeStyle = "rgba(255,226,178,.3)"; ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.ellipse(bx - 0.6, by - 0.8, 5.4, 3, rot, 0, TAU); ctx.stroke();
      ctx.strokeStyle = "rgba(84,52,26,.7)"; ctx.lineWidth = 0.7;
      for (let k = -1; k <= 1; k++) {
        ctx.beginPath();
        ctx.moveTo(bx + k * 2.4 - 1.2, by - 2.4);
        ctx.lineTo(bx + k * 2.4 + 0.6, by + 1.6);
        ctx.stroke();
      }
    }
  } else if (kind === "cheese") {
    ctx.fillStyle = "rgba(58,44,30,.9)";
    ctx.beginPath(); ctx.moveTo(-11, -8); ctx.lineTo(12, -9); ctx.lineTo(10, -3); ctx.lineTo(-10, -2); ctx.closePath(); ctx.fill();
    const g = ctx.createLinearGradient(-8, -10, 8, -2);
    g.addColorStop(0, "rgba(214,196,152,.96)");
    g.addColorStop(1, "rgba(158,134,94,.97)");
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(-6.4, -9); ctx.lineTo(7.2, -10); ctx.lineTo(6, -5.2); ctx.lineTo(-5.6, -4.2); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "rgba(150,122,74,.9)";
    ctx.beginPath(); ctx.moveTo(-7, -3.4); ctx.lineTo(7.4, -4.6); ctx.lineTo(7, -2.6); ctx.lineTo(-6.6, -1.4); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "rgba(255,248,220,.6)"; ctx.lineWidth = 0.7;
    ctx.beginPath(); ctx.moveTo(-7.4, -8.6); ctx.lineTo(8.2, -10); ctx.stroke();
  } else if (kind === "jars") {
    jar(ctx, -6.5, -3, 0.42, -0.12, "rgba(96,74,50,.99)");
    jar(ctx, 6.5, -3.5, 0.42, 0.1, "rgba(96,74,50,.99)");
  } else if (kind === "sheaf") {
    for (let i = 0; i < 7; i++) {
      ctx.strokeStyle = "rgba(232,200,134,.9)"; ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.moveTo(-4 + i * 1.2, -6);
      ctx.quadraticCurveTo(-6 + i * 2.2, -14, -9 + i * 2.6 + Math.sin(i) * 6, -22 - hash(i) * 5);
      ctx.stroke();
    }
  }
  ctx.restore();
}

function flameTongue(ctx, x, y, s, t, seed, hue = 0) {
  const flick = Math.sin(t * 7.3 + seed) * 0.5 + Math.sin(t * 11.1 + seed * 2) * 0.3;
  ctx.save();
  ctx.translate(x, y); ctx.scale(s, s);
  ctx.globalCompositeOperation = "lighter";
  soft(ctx, 0, -6, 9, 14, hue ? "120,190,255" : "255,164,72", 0.5);
  const g = ctx.createLinearGradient(0, -2, 0, -20);
  g.addColorStop(0, hue ? "rgba(180,232,255,.95)" : "rgba(255,246,214,.98)");
  g.addColorStop(0.45, hue ? "rgba(110,196,255,.85)" : "rgba(255,190,86,.9)");
  g.addColorStop(1, "rgba(255,132,40,0)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-3.4, 0);
  ctx.quadraticCurveTo(-4.6 + flick, -9, -0.6 + flick * 1.6, -17 - flick * 3);
  ctx.quadraticCurveTo(2.4 - flick, -9, 3.4, 0);
  ctx.closePath(); ctx.fill();
  ctx.restore();
}

/* ------------------------------------------------------------------ plates */

const plateReady = new WeakSet();
function plateImage(file) {
  if (!file) return null;
  const img = loadArt(file);
  if (!img) return null;
  if (plateReady.has(img)) return img;
  if (img.complete && img.naturalWidth > 0) { plateReady.add(img); return img; }
  return null;
}

/* Where the camera stands: a crop of the plate, in plate fractions, with the
   act's own point at its centre. Returned as CSS so the photograph is painted
   by the compositor (sharp, decoded once) and the canvas above it only has to
   carry weather. */
/* How close the camera stands in each chapter's painting. A plate that already
   shot the hero small (elah, storm) is pushed in harder than one shot close. */
const SPAN = {
  elah: 0.34, "elah-field": 0.44, window: 0.5, lions: 0.4, tend: 0.44,
  jericho: 0.4, storm: 0.44, prodigal: 0.46, title: 0.4, esther: 0.4,
  hall: 0.5, bush: 0.42, flame: 0.44, ruth: 0.4, belly: 0.5, cry: 0.44,
  branches: 0.44, zacchaeus: 0.38
};

/** The part of the painting the camera actually sees, in plate fractions. */
function plateWindow(spec, w, h) {
  const span = clamp(spec?.span ?? SPAN[spec?.plate] ?? 0.42, 0.18, 1);
  const cx = spec?.fx ?? 0.5, cy = spec?.fy ?? 0.62;
  const cw = span;
  const ch = (span * PW * (h / Math.max(1, w))) / PH;
  const x0 = clamp(cx - cw / 2, 0, Math.max(0, 1 - cw));
  const y0 = clamp(cy - ch / 2, 0, Math.max(0, 1 - ch));
  return { x0, y0, cw, ch };
}

/* A point given in PLATE fractions, expressed in stage fractions. Wounds have
   to sit on the arm the painting already has, so the data names them on the
   painting and the camera decides where they land. */
export function platePoint(spec, w, h, fx, fy) {
  const win = plateWindow(spec, w, h);
  return { fx: clamp((fx - win.x0) / win.cw, 0, 1), fy: clamp((fy - win.y0) / win.ch, 0, 1) };
}

export function momentPlateStyle(spec, w, h) {
  const win = plateWindow(spec, w, h);
  const cw = win.cw * PW;
  let x0 = win.x0 * PW;
  let y0 = win.y0 * PH;
  const cropW = cw, cropH = win.ch * PH;
  const k = w / cropW;
  return {
    backgroundSize: `${(PW * k).toFixed(1)}px ${(PH * k).toFixed(1)}px`,
    backgroundPosition: `${(-x0 * k).toFixed(1)}px ${(-y0 * k).toFixed(1)}px`,
    transformOrigin: `${((spec?.fx ?? 0.5) * PW - x0) * k}px ${((spec?.fy ?? 0.62) * PH - y0) * k}px`
  };
}

/* The canvas layer: no plate (that is CSS), just the light of the frame and a
   little air, kept thin so the photograph stays a photograph. */
function atmosphere(ctx, w, h, t) {
  ctx.save();
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, "rgba(10,14,18,.34)");
  g.addColorStop(0.5, "rgba(8,11,13,.16)");
  g.addColorStop(1, "rgba(6,8,9,.42)");
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  const vig = ctx.createRadialGradient(w * 0.5, h * 0.6, Math.min(w, h) * 0.28, w * 0.5, h * 0.5, Math.max(w, h) * 0.82);
  vig.addColorStop(0, "rgba(3,5,7,0)");
  vig.addColorStop(0.72, "rgba(3,5,7,.22)");
  vig.addColorStop(1, "rgba(3,5,7,.66)");
  ctx.fillStyle = vig; ctx.fillRect(0, 0, w, h);
  // dust in the air, never still
  for (let i = 0; i < 34; i++) {
    const x = ((hash(i * 3.3) + t * (0.012 + hash(i) * 0.03)) % 1) * w;
    const y = ((hash(i * 8.1) + t * 0.006) % 1) * h;
    const r = 0.5 + hash(i * 5.7) * 1.6;
    ctx.fillStyle = `rgba(255,226,182,${0.03 + hash(i * 2.1) * 0.07})`;
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
  }
  ctx.restore();
}

/* ============================================================ the five acts */

/* ---------------------------------------------------------------- hold */
/* One physical thing to do with the body: keep still until the world does. */
const HOLD = {
  /* elah — the giant is shouting and the ground will not hold still. The
     painting already has the valley, the tents and the dust; what is added is
     the tremor, the grit coming off the ground, and what is left when you
     stop shaking. */
  ground(ctx, w, h, k, t) {
    const U = h / 100, cx = w / 2, cy = h * 0.74;
    const wind = 1 - k * 0.8;
    for (let i = 0; i < 56; i++) {
      const sp = 0.5 + hash(i * 3.1) * 1.8;
      const x = ((hash(i * 7.7) + t * 0.22 * sp * wind) % 1) * (w + 80) - 40;
      const y = cy - h * 0.3 + hash(i * 5.3) * h * 0.56;
      const r = U * (0.35 + hash(i * 9.1) * 1.5);
      ctx.fillStyle = `rgba(236,220,188,${(0.05 + hash(i) * 0.15) * wind})`;
      ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    }
    // the shout: pressure rings breaking outward, quieter as you hold
    for (let i = 0; i < 3; i++) {
      const ph = (t * 0.42 + i * 0.33) % 1;
      ctx.strokeStyle = `rgba(244,230,202,${(1 - ph) * 0.16 * (1 - k * 0.85)})`;
      ctx.lineWidth = U * 0.8;
      ctx.beginPath(); ctx.ellipse(cx, cy + h * 0.16, w * (0.14 + ph * 0.5), h * (0.03 + ph * 0.09), 0, 0, TAU); ctx.stroke();
    }
    // the ground itself, settling: grit lifting and lying back down
    for (let i = 0; i < 22; i++) {
      const ph = (t * 0.7 + hash(i * 2.7)) % 1;
      const x = cx + (hash(i * 4.4) - 0.5) * w * 0.9;
      const lift = Math.sin(ph * Math.PI) * h * (0.02 + (1 - k) * 0.05);
      ctx.fillStyle = `rgba(228,208,172,${Math.sin(ph * Math.PI) * (0.1 + (1 - k) * 0.2)})`;
      ctx.beginPath(); ctx.arc(x, cy + h * 0.18 - lift, U * (0.5 + hash(i) * 1.2), 0, TAU); ctx.fill();
    }
    // what holding leaves behind: a ring of settled grit, and a steady light
    const ringR = w * (0.16 + k * 0.1);
    ctx.strokeStyle = `rgba(255,224,176,${0.05 + k * 0.3})`;
    ctx.lineWidth = U * (0.6 + k * 0.7);
    ctx.beginPath(); ctx.ellipse(cx, cy + h * 0.2, ringR, h * (0.045 + k * 0.012), 0, 0, TAU); ctx.stroke();
    ctx.save(); ctx.globalCompositeOperation = "lighter";
    soft(ctx, cx, cy + h * 0.16, w * 0.24, h * 0.1, "255,210,156", 0.04 + k * 0.14);
    ctx.restore();
  },

  /* lions — a window toward Jerusalem, kept open. The light is the readout:
     the lattice shadow on the floor sharpens and widens as the shutters stay
     open, and the room's dust stops moving. */
  shutter(ctx, w, h, k, t) {
    const U = h / 100, cx = w * 0.5;
    const open = 0.35 + k * 0.65;
    // a whisper of a shaft, not a shape: light in the air only
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, `rgba(255,226,172,${0.06 + k * 0.07})`);
    g.addColorStop(0.55, `rgba(255,216,150,${0.03 + k * 0.04})`);
    g.addColorStop(1, "rgba(255,206,140,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(cx - w * 0.12 * open, 0);
    ctx.lineTo(cx + w * 0.1 * open, 0);
    ctx.lineTo(cx + w * (0.34 + open * 0.18), h);
    ctx.lineTo(cx - w * (0.3 + open * 0.18), h);
    ctx.closePath(); ctx.fill();
    // the lattice, thrown down on the floor where it can actually be seen
    const fy0 = h * 0.74, fy1 = h * 0.98;
    ctx.globalCompositeOperation = "lighter";
    for (let i = -2; i <= 2; i++) {
      const x0 = cx + i * w * 0.055 * open;
      const x1 = cx + i * w * 0.11 * open;
      ctx.strokeStyle = `rgba(255,228,176,${0.1 + k * 0.16})`;
      ctx.lineWidth = U * (1.4 + k * 0.6);
      ctx.beginPath(); ctx.moveTo(x0, fy0); ctx.lineTo(x1, fy1); ctx.stroke();
    }
    for (let i = 0; i < 3; i++) {
      const y = fy0 + (i / 3) * (fy1 - fy0);
      const spread = w * (0.1 + open * 0.12) * (0.5 + i * 0.3);
      ctx.strokeStyle = `rgba(255,228,176,${0.07 + k * 0.1})`;
      ctx.lineWidth = U * (1.1 + k * 0.4);
      ctx.beginPath(); ctx.moveTo(cx - spread, y); ctx.lineTo(cx + spread, y + U * 2); ctx.stroke();
    }
    soft(ctx, cx, h * 0.9, w * (0.18 + k * 0.1), h * 0.1, "255,220,164", 0.05 + k * 0.12);
    ctx.restore();
    // dust settling: it slows as the hold goes on
    for (let i = 0; i < 30; i++) {
      const ph = (t * (0.12 - k * 0.08) + hash(i * 6.1)) % 1;
      const x = cx + (hash(i * 2.3) - 0.5) * w * (0.3 + open * 0.16);
      const y = h * 0.06 + ph * h * 0.8;
      ctx.fillStyle = `rgba(255,240,208,${(1 - ph) * (0.14 + k * 0.1)})`;
      ctx.beginPath(); ctx.arc(x, y, U * (0.3 + hash(i) * 0.6), 0, TAU); ctx.fill();
    }
  },

  /* storm — a rope under load, wet, shaking water off; the grip is what it
     is about, so the rope has to look like a rope and not like a slider. */
  rope(ctx, w, h, k, t) {
    const U = h / 100;
    const sag = h * (0.1 + (1 - k) * 0.06);
    const cy = h * 0.33;
    const pts = [];
    for (let i = 0; i <= 16; i++) {
      const f = i / 16;
      const shake = (1 - k) * Math.sin(t * 9 + f * 6) * U * 0.5;
      pts.push([
        -w * 0.06 + f * w * 1.12,
        cy + Math.sin(f * Math.PI) * sag + f * h * 0.16 + shake
      ]);
    }
    const line = (offset, width, color) => {
      ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineCap = "round";
      ctx.beginPath();
      pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y + offset) : ctx.moveTo(x, y + offset)));
      ctx.stroke();
    };
    // the rope: dark hemp, three strands, twisted
    line(0, U * 4.6, "rgba(18,16,14,.95)");
    line(-U * 0.9, U * 0.8, "rgba(196,178,148,.28)");
    line(U * 1.4, U * 0.5, "rgba(10,10,10,.5)");
    // the twist, ticked along the line
    for (let i = 1; i < pts.length; i++) {
      const [x, y] = pts[i], [px, py] = pts[i - 1];
      const a2 = Math.atan2(y - py, x - px);
      ctx.strokeStyle = "rgba(232,212,178,.13)"; ctx.lineWidth = U * 0.7;
      ctx.beginPath();
      ctx.moveTo(x - Math.cos(a2 + 0.7) * U * 2, y - Math.sin(a2 + 0.7) * U * 2);
      ctx.lineTo(x + Math.cos(a2 + 0.7) * U * 2, y + Math.sin(a2 + 0.7) * U * 2);
      ctx.stroke();
    }
    // the serving where it is gripped — a binding, wound round
    const gx = w * 0.42, gy = cy + Math.sin(0.42 * Math.PI) * sag;
    ctx.strokeStyle = "rgba(150,124,88,.5)"; ctx.lineWidth = U * 0.9;
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(gx - U * 5 + i * U * 2.4, gy - U * 3.4);
      ctx.lineTo(gx - U * 4 + i * U * 2.4, gy + U * 3.4);
      ctx.stroke();
    }
    soft(ctx, gx, gy, U * 12, U * 8, "255,214,164", 0.06);
    // water coming off the line, thinning as the grip holds
    for (let i = 0; i < 34; i++) {
      const ph = (t * (0.6 + hash(i) * 1.1) + hash(i * 3.3)) % 1;
      const f = hash(i * 7.1);
      const bx = -w * 0.06 + f * w * 1.12;
      const by = cy + Math.sin(f * Math.PI) * sag + ph * h * 0.3;
      ctx.fillStyle = `rgba(214,232,238,${(1 - ph) * (0.22 - k * 0.12)})`;
      ctx.beginPath(); ctx.arc(bx, by, U * (0.3 + hash(i) * 0.6), 0, TAU); ctx.fill();
    }
    // spray kicked up under the line
    for (let i = 0; i < 20; i++) {
      const ph = (t * (0.5 + hash(i) * 0.9) + hash(i * 4.4)) % 1;
      ctx.fillStyle = `rgba(206,226,232,${(1 - ph) * (0.18 - k * 0.1)})`;
      ctx.beginPath(); ctx.arc(hash(i * 2.7) * w, cy + sag * 0.4 + ph * h * 0.4, U * (0.4 + hash(i) * 0.9), 0, TAU); ctx.fill();
    }
  },

  /* esther — three days of nothing. The hold is shown as the light in the
     room: a single flame at the edge of the frame stops guttering and the
     whole scene steadies around it. */
  lamp(ctx, w, h, k, t) {
    const U = h / 100, cx = w * 0.5;
    const wob = (1 - k) * Math.sin(t * 9.1) * U * 1.4;
    // the glow on the whole room, breathing less as the fast goes on
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    soft(ctx, cx, h * 0.9, w * (0.34 + k * 0.1), h * (0.3 + k * 0.1), "255,186,104", 0.1 + k * 0.14);
    ctx.restore();
    // the lamp itself: a saucer cut by the bottom edge, so nothing floats
    ctx.save();
    ctx.translate(cx + wob * 0.4, h * 0.94);
    ctx.scale(2.1, 2.1);
    body(ctx, () => {
      ctx.moveTo(-16, -6);
      ctx.quadraticCurveTo(-14, 0, -8, 2);
      ctx.quadraticCurveTo(0, 4, 8, 2);
      ctx.quadraticCurveTo(14, 0, 16, -6);
      ctx.closePath();
    }, "rgba(22,18,15,.97)", "rgba(255,206,150,.45)", 1.2);
    ctx.strokeStyle = "rgba(255,208,152,.3)"; ctx.lineWidth = 0.9;
    ctx.beginPath(); ctx.moveTo(14, -4); ctx.quadraticCurveTo(22, -8, 19, -16); ctx.stroke();
    ctx.strokeStyle = "rgba(40,32,24,.95)"; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(-2, -6); ctx.quadraticCurveTo(-4, -10, -7, -13); ctx.stroke();
    ctx.restore();
    // the flame, just above the rim
    ctx.save();
    ctx.translate(cx + wob, h * 0.9);
    ctx.scale(1 + k * 0.2, 1 + k * 0.25);
    flameTongue(ctx, 0, 0, h / 150, t, 2.1);
    ctx.restore();
    // dust settling in the still room
    for (let i = 0; i < 14; i++) {
      const ph = (t * (0.1 - k * 0.04) + hash(i * 5.1)) % 1;
      ctx.fillStyle = `rgba(255,236,198,${(1 - ph) * (0.12 + k * 0.1)})`;
      ctx.beginPath();
      ctx.arc(cx + (hash(i * 2.3) - 0.5) * w * 0.5, h * 0.15 + ph * h * 0.7, U * (0.3 + hash(i) * 0.5), 0, TAU);
      ctx.fill();
    }
  },

  /* bush — the fire is already burning in the painting and the branch is
     already unburnt. What a hold adds is attention: the flame steadies, the
     heat haze thins, and the sparks go up slowly enough to watch. */
  bush(ctx, w, h, k, t) {
    const U = h / 100, cx = w * 0.5, cy = h * 0.62;
    ctx.save(); ctx.globalCompositeOperation = "lighter";
    // the glow the fire throws, breathing with the hold
    const beat = 0.5 + 0.5 * Math.sin(t * 1.3);
    soft(ctx, cx, cy, w * (0.34 + k * 0.06), h * (0.34 + k * 0.04), "255,168,74", 0.08 + k * 0.1 + beat * 0.02);
    soft(ctx, cx, cy + h * 0.06, w * 0.22, h * 0.16, "255,206,120", 0.1 + k * 0.12);
    // heat haze: thin bands that stop shivering when you hold still
    for (let i = 0; i < 5; i++) {
      const y = cy - h * 0.22 + i * h * 0.09;
      const amp = (1 - k * 0.7) * h * 0.006;
      ctx.strokeStyle = `rgba(255,222,170,${0.03 + (1 - k) * 0.03})`;
      ctx.lineWidth = h * 0.008;
      ctx.beginPath();
      for (let x = 0; x <= w; x += 12) {
        const yy = y + Math.sin(x * 0.05 + t * 3 + i) * amp;
        x ? ctx.lineTo(x, yy) : ctx.moveTo(x, yy);
      }
      ctx.stroke();
    }
    ctx.restore();
    // sparks going up, slower and fewer as you watch
    for (let i = 0; i < 22; i++) {
      const ph = (t * (0.16 + hash(i * 3.3) * 0.18) + hash(i * 4.4)) % 1;
      const x = cx + (hash(i * 9.9) - 0.5) * w * 0.34 + Math.sin(t * 0.8 + i) * U * 3;
      ctx.fillStyle = `rgba(255,196,110,${(1 - ph) * (0.5 + k * 0.2)})`;
      ctx.beginPath(); ctx.arc(x, cy + h * 0.04 - ph * h * 0.66, U * (0.3 + hash(i) * 0.6), 0, TAU); ctx.fill();
    }
  },

  /* jonah — the dark inside the fish. The painting is already the belly; what
     the hold adds is the one shaft of surface light and the prayer going up
     through it. */
  dark(ctx, w, h, k, t) {
    const U = h / 100, cx = w * 0.5;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const beam = ctx.createLinearGradient(cx, 0, cx, h);
    beam.addColorStop(0, `rgba(168,226,240,${0.24 + k * 0.22})`);
    beam.addColorStop(0.6, `rgba(130,196,216,${0.05 + k * 0.06})`);
    beam.addColorStop(1, "rgba(110,180,206,0)");
    ctx.fillStyle = beam;
    ctx.beginPath();
    ctx.moveTo(cx - w * 0.05, 0); ctx.lineTo(cx + w * 0.07, 0);
    ctx.lineTo(cx + w * (0.13 + k * 0.16), h); ctx.lineTo(cx - w * (0.13 + k * 0.16), h);
    ctx.closePath(); ctx.fill();
    // caustics on the underside of the surface
    for (let i = 0; i < 6; i++) {
      const x = cx + Math.sin(t * 0.55 + i * 1.3) * w * 0.22;
      ctx.strokeStyle = `rgba(178,232,244,${0.1 + k * 0.05})`;
      ctx.lineWidth = U * 1.4;
      ctx.beginPath();
      ctx.moveTo(x, 0); ctx.quadraticCurveTo(x + U * 12, h * 0.14, x - U * 6, h * 0.26);
      ctx.stroke();
    }
    ctx.restore();
    // bubbles rising toward the light
    for (let i = 0; i < 30; i++) {
      const ph = (t * (0.14 + hash(i) * 0.18) + hash(i * 6.6)) % 1;
      const x = cx + (hash(i * 3.1) - 0.5) * w * 0.66 + Math.sin(t * 1.3 + i) * U * 3;
      const y = h * 1.02 - ph * h * 0.9;
      ctx.strokeStyle = `rgba(200,240,248,${(1 - ph) * (0.24 + k * 0.1)})`;
      ctx.lineWidth = U * 0.4;
      ctx.beginPath(); ctx.arc(x, y, U * (0.5 + hash(i) * 1.3), 0, TAU); ctx.stroke();
      ctx.fillStyle = `rgba(230,250,255,${(1 - ph) * 0.08})`;
      ctx.beginPath(); ctx.arc(x - U * 0.3, y - U * 0.3, U * 0.4, 0, TAU); ctx.fill();
    }
    // the edges of the frame going dark, as if the walls were close
    const vg = ctx.createRadialGradient(cx, h * 0.45, h * 0.2, cx, h * 0.5, h * 0.85);
    vg.addColorStop(0, "rgba(2,6,10,0)");
    vg.addColorStop(1, "rgba(2,6,10,.6)");
    ctx.fillStyle = vg; ctx.fillRect(0, 0, w, h);
  }
};

/* ------------------------------------------------------------- balance */
/* The ridge tips underfoot. The painting swings by this angle and the load in
   your hands has to swing against it, so the horizon is the world moving and
   never the camera — which is what a player reads as "the ground is crooked",
   not as a bug. */
export function balanceAngle(S) {
  const t = S?.t || 0;
  return ((S?.zero ?? 0.5) - 0.5) * 0.44 + Math.sin(t * 0.9) * 0.012;
}

/* A shoulder-pole with the load slung off both ends: cords that hang plumb, a
   brass level clamped at the yoke, and a bubble that leaves its notch the
   moment the load is off level. The plate is the ridge; this is only what the
   player is carrying. */
const rrect = (ctx, x, y, w, h, r) => {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
};

function carryBeam(ctx, w, h, rel, t, kind, touched) {
  const U = h / 100, cx = w * 0.5, cy = h * 0.30;
  /* Nine degrees is as far as a shoulder-pole visibly tips; past that the
     picture stops being a pole and becomes a diagonal line. The bubble in the
     brass housing carries the fine reading. */
  const ang = clamp(rel, -0.6, 0.6) * 0.30;
  const half = w * 0.40;
  const sway = Math.sin(t * 1.5) * U * 0.5;
  const level = Math.abs(rel) < 0.11;

  /* the pole: dark under-edge, wood, one lit top edge, cord bindings */
  ctx.save();
  ctx.translate(cx, cy + sway); ctx.rotate(ang);
  const sag = U * 1.4;
  ctx.lineJoin = "round";
  /* a pole, not a plank: it is thick at the shoulder and whittles away to the
     ends where the cords are tied */
  const pole = (dx = 0, dy = 0) => {
    ctx.beginPath();
    ctx.moveTo(-half, -U * 1.9 + dy);
    ctx.quadraticCurveTo(0, sag - U * 1.9 + dy, half, -U * 1.9 + dy);
    ctx.quadraticCurveTo(half + U * 1.1, -U * 1.0 + dy, half, -U * 0.5 + dy);
    ctx.quadraticCurveTo(0, sag + U * 2.5 + dy, -half, -U * 0.5 + dy);
    ctx.quadraticCurveTo(-half - U * 1.1, -U * 1.0 + dy, -half, -U * 1.9 + dy);
    ctx.closePath();
  };
  ctx.fillStyle = "rgba(12,9,7,.55)";
  ctx.save(); ctx.translate(0, U * 0.9); pole(); ctx.fill(); ctx.restore();
  const wood = ctx.createLinearGradient(0, -U * 2.4, 0, U * 2.6);
  wood.addColorStop(0, "rgba(186,142,90,.99)");
  wood.addColorStop(0.42, "rgba(126,92,53,.99)");
  wood.addColorStop(1, "rgba(54,38,22,.99)");
  ctx.fillStyle = wood; pole(); ctx.fill();
  ctx.strokeStyle = "rgba(18,13,9,.5)"; ctx.lineWidth = U * 0.6; pole(); ctx.stroke();
  ctx.strokeStyle = "rgba(252,224,178,.5)"; ctx.lineWidth = U * 0.7;
  ctx.beginPath(); ctx.moveTo(-half * 0.97, -U * 1.8); ctx.quadraticCurveTo(0, sag - U * 1.7, half * 0.97, -U * 1.8); ctx.stroke();
  /* grain */
  ctx.strokeStyle = "rgba(40,28,16,.22)"; ctx.lineWidth = U * 0.35;
  for (let i = -1; i <= 1; i += 2) {
    ctx.beginPath();
    ctx.moveTo(-half * 0.9, -U * 0.9 + i * U * 0.7);
    ctx.quadraticCurveTo(0, sag + i * U * 0.7, half * 0.9, -U * 0.9 + i * U * 0.7);
    ctx.stroke();
  }
  for (const sx of [-0.84, 0.84]) {
    ctx.strokeStyle = "rgba(232,204,158,.3)"; ctx.lineWidth = U * 0.8;
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath(); ctx.moveTo(sx * half + i * U * 1.3, -U * 2.2); ctx.lineTo(sx * half + i * U * 1.3, U * 1.6); ctx.stroke();
    }
  }
  ctx.restore();

  /* the loads. The cords stay plumb, so the tilt of the pole is the tilt of the
     load against the horizon — legible at a glance. */
  const drop = h * 0.17, bs = U * 0.38;
  for (const sx of [-1, 1]) {
    const ex = cx + Math.cos(ang) * sx * half * 0.84;
    const ey = cy + sway + Math.sin(ang) * sx * half * 0.84 - U * 0.3;
    ctx.strokeStyle = "rgba(14,11,8,.9)"; ctx.lineWidth = U * 1;
    ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(ex, ey + drop); ctx.stroke();
    ctx.strokeStyle = "rgba(244,220,176,.2)"; ctx.lineWidth = U * 0.35;
    ctx.beginPath(); ctx.moveTo(ex - U * 0.5, ey); ctx.lineTo(ex - U * 0.5, ey + drop); ctx.stroke();
    const kindOf = kind === "jars" ? "jars" : kind === "sheaf" ? "sheaf" : (sx < 0 ? "cheese" : "bread");
    basket(ctx, ex, ey + drop, bs, kindOf, ang * 0.3);
  }

  /* the brass level at the yoke — a housing, a notch, and a bubble that has to
     come home. This is the whole scoreboard, and it is a real thing to hold. */
  const th = Math.max(8, h * 0.05), tw = Math.min(w * 0.26, th * 5);
  const ly = cy + sway - h * 0.13;
  ctx.strokeStyle = "rgba(18,14,10,.9)"; ctx.lineWidth = U * 1.3;
  ctx.beginPath(); ctx.moveTo(cx, ly + th * 0.4); ctx.lineTo(cx, cy + sway - U * 1.4); ctx.stroke();
  ctx.fillStyle = "rgba(18,15,11,.94)";
  rrect(ctx, cx - tw / 2 - th * 0.34, ly - th * 0.8, tw + th * 0.68, th * 1.6, th * 0.7); ctx.fill();
  const gl = ctx.createLinearGradient(0, ly - th * 0.6, 0, ly + th * 0.6);
  gl.addColorStop(0, "rgba(214,178,116,.9)");
  gl.addColorStop(0.5, "rgba(150,118,70,.92)");
  gl.addColorStop(1, "rgba(88,66,38,.94)");
  ctx.strokeStyle = gl; ctx.lineWidth = U * 0.9;
  rrect(ctx, cx - tw / 2 - th * 0.34, ly - th * 0.8, tw + th * 0.68, th * 1.6, th * 0.7); ctx.stroke();
  /* the glass, and the safe notch in its middle */
  ctx.fillStyle = "rgba(12,14,14,.86)";
  rrect(ctx, cx - tw / 2, ly - th * 0.42, tw, th * 0.84, th * 0.42); ctx.fill();
  ctx.strokeStyle = `rgba(255,226,172,${level ? 0.55 : 0.28})`; ctx.lineWidth = U * 0.5;
  for (const sx of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(cx + sx * tw * 0.115, ly - th * 0.34);
    ctx.lineTo(cx + sx * tw * 0.115, ly + th * 0.34);
    ctx.stroke();
  }
  /* the bubble: gold when it is home, dark amber when it is not */
  const bx = cx + clamp(rel, -0.5, 0.5) * 2 * tw * 0.34;
  ctx.beginPath(); ctx.arc(bx, ly, th * 0.3, 0, TAU);
  ctx.fillStyle = level ? "rgba(255,222,158,.98)" : "rgba(196,146,74,.92)";
  ctx.fill();
  ctx.strokeStyle = "rgba(28,22,14,.9)"; ctx.lineWidth = U * 0.4; ctx.stroke();
  if (level) soft(ctx, bx, ly, th * 1.5, th * 1.2, "255,214,150", 0.4);

  /* the gesture, said once: the arrows go the moment the player drags */
  if (!touched) {
    const ay = Math.min(h * 0.93, cy + sway + drop + h * 0.15);
    ctx.save();
    ctx.lineCap = "round";
    const pulse = 0.62 + Math.sin(t * 2.6) * 0.16;
    for (const sx of [-1, 1]) {
      const ax = cx + sx * w * 0.2;
      /* a dark bed first, or a pale chevron on sunlit rock disappears */
      ctx.strokeStyle = "rgba(8,7,5,.55)"; ctx.lineWidth = U * 2.4;
      ctx.beginPath();
      ctx.moveTo(ax - sx * U * 2.6, ay - U * 2.4);
      ctx.lineTo(ax, ay);
      ctx.lineTo(ax - sx * U * 2.6, ay + U * 2.4);
      ctx.stroke();
      ctx.strokeStyle = `rgba(255,236,196,${pulse})`; ctx.lineWidth = U * 1.1;
      ctx.beginPath();
      ctx.moveTo(ax - sx * U * 2.6, ay - U * 2.4);
      ctx.lineTo(ax, ay);
      ctx.lineTo(ax - sx * U * 2.6, ay + U * 2.4);
      ctx.stroke();
    }
    ctx.restore();
  }
}

const BALANCE = {
  /* elah — bread, cheese and a staff, and a ridge that will not sit level. */
  provision(ctx, w, h, rel, t, kind, touched) {
    carryBeam(ctx, w, h, rel, t, "provision", touched);
    // crumb and dust coming off the load when the ridge tips
    const spill = clamp((Math.abs(rel) - 0.13) / 0.2, 0, 1);
    for (let i = 0; i < 16; i++) {
      const ph = (t * 1.1 + hash(i * 3.9)) % 1;
      const dir = rel > 0 ? 1 : -1;
      ctx.fillStyle = `rgba(232,208,166,${(1 - ph) * 0.4 * spill})`;
      ctx.beginPath();
      ctx.arc(w * 0.5 + dir * (w * 0.16 + ph * w * 0.3), h * 0.62 + ph * h * 0.3, h * 0.004 * (0.6 + hash(i)), 0, TAU);
      ctx.fill();
    }
  },

  /* storm — the jars are heavy and the deck keeps moving. */
  jars(ctx, w, h, rel, t, kind, touched) {
    carryBeam(ctx, w, h, rel, t, "jars", touched);
    for (let i = 0; i < 16; i++) {
      const ph = (t * (0.6 + hash(i) * 0.8) + hash(i * 5.5)) % 1;
      ctx.fillStyle = `rgba(206,228,236,${(1 - ph) * 0.2})`;
      ctx.beginPath(); ctx.arc(hash(i * 2.9) * w, h * 0.86 - ph * h * 0.4, h * 0.004 * (0.6 + hash(i)), 0, TAU); ctx.fill();
    }
  },

  /* ruth — the sheaf is heavier than it looks. */
  sheaf(ctx, w, h, rel, t, kind, touched) {
    carryBeam(ctx, w, h, rel, t, "sheaf", touched);
    // straw blown off the bundle
    for (let i = 0; i < 14; i++) {
      const ph = (t * 0.5 + hash(i * 4.4)) % 1;
      const dir = rel > 0 ? 1 : -1;
      ctx.strokeStyle = `rgba(222,192,128,${(1 - ph) * 0.4})`;
      ctx.lineWidth = h * 0.003;
      const x = w * 0.5 + dir * (w * 0.12 + ph * w * 0.34);
      const y = h * 0.6 + Math.sin(ph * 4 + i) * h * 0.06 + ph * h * 0.2;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - dir * h * 0.02, y + h * 0.012); ctx.stroke();
    }
  }
};

/* ---------------------------------------------------------------- tap */
/* Things in the frame that answer to a touch: ink surfacing, a linen strip,
   a print in the dust, a coin turned over, an ear of barley. Nothing is drawn
   that the painting already has — only the mark the touch leaves. */
const TAP = {
  lines(ctx, w, h, t, nodes) {
    const U = h / 100;
    nodes.forEach((n, i) => {
      const x = n.fx * w, y = n.fy * h;
      const w2 = w * (0.1 + hash(i * 3.3) * 0.07);
      if (n.hit) {
        // the line, now read: ink under warm light, and the seal pressed on it
        ctx.strokeStyle = "rgba(255,226,178,.6)"; ctx.lineWidth = U * 0.9;
        ctx.beginPath(); ctx.moveTo(x - w2, y); ctx.quadraticCurveTo(x, y - U * 1.2, x + w2, y); ctx.stroke();
        soft(ctx, x, y, w * 0.2, U * 12, "255,210,140", 0.2);
        ctx.save();
        ctx.translate(x, y - U * 1.6);
        const seal = ctx.createRadialGradient(-U, -U, 0, 0, 0, U * 4.2);
        seal.addColorStop(0, "rgba(168,58,42,.96)");
        seal.addColorStop(0.7, "rgba(112,32,26,.96)");
        seal.addColorStop(1, "rgba(70,20,16,.96)");
        ctx.fillStyle = seal;
        ctx.beginPath();
        for (let a2 = 0; a2 < TAU; a2 += TAU / 11) {
          const rr = U * (3.5 + hash(a2 * 3.3) * 0.7);
          const px = Math.cos(a2) * rr, py = Math.sin(a2) * rr * 0.86;
          a2 ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
        }
        ctx.closePath(); ctx.fill();
        ctx.strokeStyle = "rgba(255,190,150,.4)"; ctx.lineWidth = U * 0.4;
        ctx.beginPath(); ctx.arc(0, 0, U * 1.8, 0, TAU); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-U * 1.4, 0); ctx.lineTo(U * 1.4, 0); ctx.stroke();
        ctx.restore();
      } else {
        /* not read yet: a line surfacing out of the dark, breathing. It has to
           be findable on a bright or a dark painting alike, so it carries its
           own shadow and a knot of warm light at the point to touch. */
        const a = 0.42 + 0.14 * Math.sin(t * 2.2 + i);
        ctx.strokeStyle = "rgba(12,10,8,.55)"; ctx.lineWidth = U * 2.6;
        ctx.beginPath(); ctx.moveTo(x - w2, y); ctx.quadraticCurveTo(x, y - U * 1.2, x + w2, y); ctx.stroke();
        ctx.strokeStyle = `rgba(248,232,198,${a})`; ctx.lineWidth = U * 1.1;
        ctx.beginPath(); ctx.moveTo(x - w2, y); ctx.quadraticCurveTo(x, y - U * 1.2, x + w2, y); ctx.stroke();
        soft(ctx, x, y - U * 0.4, w * 0.15, U * 8, "255,214,160", 0.16 + 0.09 * Math.sin(t * 1.9 + i));
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        soft(ctx, x, y - U * 0.4, U * 5, U * 5, "255,226,170", 0.3 + 0.12 * Math.sin(t * 2.4 + i));
        ctx.restore();
      }
    });
  },

  wound(ctx, w, h, t, nodes) {
    const U = h / 100;
    nodes.forEach((n, i) => {
      const x = n.fx * w, y = n.fy * h;
      if (n.hit) {
        // cleaned and bound: linen, and the oil still glossy on it
        soft(ctx, x, y, U * 20, U * 12, "255,214,150", 0.2);
        body(ctx, () => {
          ctx.moveTo(x - U * 10, y - U * 2.6);
          ctx.quadraticCurveTo(x - U * 1, y - U * 5.2, x + U * 10, y - U * 2);
          ctx.lineTo(x + U * 9, y + U * 3.6);
          ctx.quadraticCurveTo(x - U * 1, y + U * 1.2, x - U * 9, y + U * 4.2);
          ctx.closePath();
        }, "rgba(186,172,146,.62)", "rgba(255,226,186,.35)", 0.9);
        // the folds of the strip, catching the light
        ctx.strokeStyle = "rgba(255,236,206,.22)"; ctx.lineWidth = U * 0.5;
        for (let f = -2; f <= 2; f++) {
          ctx.beginPath();
          ctx.moveTo(x + f * U * 3.4, y - U * 3.2 + Math.abs(f) * U * 0.4);
          ctx.lineTo(x + f * U * 3.2, y + U * 2.6);
          ctx.stroke();
        }
        const g = ctx.createLinearGradient(x - U * 6, y - U * 1, x + U * 6, y + U * 2);
        g.addColorStop(0, "rgba(255,214,150,.5)");
        g.addColorStop(1, "rgba(190,140,70,.32)");
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.ellipse(x + U * 1, y + U * 0.4, U * 2.6, U * 1.2, 0.2, 0, TAU); ctx.fill();
      } else {
        /* The painting has a forearm and no wound on it, so the wound has to
           be painted here — and it has to sit on this skin rather than on top
           of it. Everything is drawn as low-alpha stain feathered in three
           passes: the photograph underneath does the modelling, the colour
           only says what happened. One thin broken ring, and no more, tells
           the hand where to go. */
        const pulse = 0.5 + 0.5 * Math.sin(t * 1.9 + i * 1.7);
        const seed = i * 7.3 + 1.7;
        const rot = -0.66 + (hash(seed) - 0.5) * 0.36;      // along the forearm
        const L = U * (4.1 + hash(seed * 1.7) * 1.2);
        const Wd = U * (1.85 + hash(seed * 2.9) * 0.6);
        ctx.save();
        ctx.translate(x, y); ctx.rotate(rot);

        // 1. the bruise — wide, desaturated and almost all feather
        for (let k = 0; k < 3; k++) {
          const sp = 1 + k * 0.42, a = 0.2 / (k * 1.6 + 1);
          const g = ctx.createRadialGradient(0, 0, U * 0.4, 0, 0, U * 7.4 * sp);
          g.addColorStop(0, `rgba(70,36,34,${a * 1.3})`);
          g.addColorStop(0.5, `rgba(92,54,46,${a * 0.5})`);
          g.addColorStop(1, "rgba(92,54,46,0)");
          ctx.fillStyle = g;
          ctx.beginPath(); ctx.ellipse(0, 0, U * 7.4 * sp, U * 5.1 * sp, 0, 0, TAU); ctx.fill();
        }

        // 2. the torn bed, feathered: same ragged outline, three sizes
        const outline = (k) => {
          ctx.beginPath();
          for (let n = 0; n <= 26; n++) {
            const a = (n / 26) * TAU;
            const jag = (0.66 + hash(seed + n * 2.11) * 0.58) * (1 + k * 0.22);
            const px = Math.cos(a) * L * jag, py = Math.sin(a) * Wd * jag;
            n ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
          }
          ctx.closePath();
        };
        for (let k = 0; k < 3; k++) {
          ctx.fillStyle = `rgba(${58 - k * 6},${20 - k * 2},${19 - k * 2},${[0.5, 0.24, 0.1][k]})`;
          outline(k); ctx.fill();
        }

        // 3. the split itself: two thin tears, near-black, with a dry rim
        for (let k = 0; k < 2; k++) {
          const off = (k - 0.5) * Wd * 0.9, len = L * (0.5 + hash(seed + k) * 0.45);
          ctx.strokeStyle = `rgba(26,10,9,${k ? 0.6 : 0.78})`;
          ctx.lineWidth = U * (k ? 0.55 : 0.8); ctx.lineCap = "round";
          ctx.beginPath();
          ctx.moveTo(-len, off);
          ctx.quadraticCurveTo(-len * 0.2, off - U * 0.42, len * 0.4, off + U * 0.26);
          ctx.quadraticCurveTo(len * 0.7, off + U * 0.7, len, off - U * 0.14);
          ctx.stroke();
        }
        // the skin stretched over the bruise catches the lantern on its top edge
        ctx.strokeStyle = "rgba(248,214,178,.16)"; ctx.lineWidth = U * 0.5;
        ctx.beginPath(); ctx.moveTo(-L * 0.75, -Wd * 0.85);
        ctx.quadraticCurveTo(0, -Wd * 1.35, L * 0.7, -Wd * 0.8); ctx.stroke();

        // 4. dried blood: tapered trails running the way the arm lies
        for (let k = 0; k < 2; k++) {
          const sx = (hash(seed + k * 4.4) - 0.35) * L * 1.1;
          const len = L * (0.8 + hash(seed + k * 2.2) * 1.4);
          const g2 = ctx.createLinearGradient(sx, Wd * 0.2, sx + U * 0.5, Wd + len);
          g2.addColorStop(0, "rgba(56,20,18,.34)");
          g2.addColorStop(0.7, "rgba(56,20,18,.14)");
          g2.addColorStop(1, "rgba(56,20,18,0)");
          ctx.fillStyle = g2;
          ctx.beginPath();
          ctx.moveTo(sx - U * 0.36, Wd * 0.2);
          ctx.quadraticCurveTo(sx + U * 0.34, Wd + len * 0.55, sx + U * 0.02, Wd + len);
          ctx.quadraticCurveTo(sx - U * 0.44, Wd + len * 0.5, sx - U * 0.36, Wd * 0.2);
          ctx.fill();
        }
        // spatter, and road grit pressed into the rim
        for (let k = 0; k < 6; k++) {
          const a = hash(seed + k * 6.1) * TAU, rr = U * (2.2 + hash(seed + k * 2.9) * 4.2);
          ctx.fillStyle = `rgba(62,24,21,${0.12 + hash(seed + k) * 0.18})`;
          ctx.beginPath();
          ctx.ellipse(Math.cos(a) * rr * 1.4, Math.sin(a) * rr * 0.85, U * (0.18 + hash(seed + k * 3.3) * 0.24), U * 0.16, a, 0, TAU);
          ctx.fill();
        }
        for (let k = 0; k < 8; k++) {
          const a = hash(seed + k * 5.3) * TAU, rr = 0.8 + hash(seed + k * 1.9) * 0.45;
          ctx.fillStyle = `rgba(${84 + k * 3},${64 + k * 2},${42 + k * 2},${0.16 + hash(seed + k) * 0.16})`;
          ctx.beginPath();
          ctx.ellipse(Math.cos(a) * L * rr, Math.sin(a) * Wd * rr, U * 0.26, U * 0.19, a, 0, TAU);
          ctx.fill();
        }

        // 5. the one thing that says "put your hand here"
        ctx.strokeStyle = `rgba(247,221,165,${0.26 + pulse * 0.22})`;
        ctx.lineWidth = U * 0.44;
        ctx.setLineDash([U * 2.2, U * 1.9]);
        ctx.beginPath();
        ctx.ellipse(0, 0, U * 7.6 + pulse * U * 0.8, U * 5.6 + pulse * U * 0.6, 0, 0, TAU);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
      }
    });
  },

  step(ctx, w, h, t, nodes) {
    const U = h / 100;
    nodes.forEach((n, i) => {
      const x = n.fx * w, y = n.fy * h;
      const pulse = 0.5 + 0.5 * Math.sin(t * 2.4 + i);
      // a mote of dust caught in the last light — where the next step falls
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      soft(ctx, x, y, U * (10 + pulse * 3), U * (7 + pulse * 2), "255,214,158", n.hit ? 0.26 : 0.1 + pulse * 0.05);
      soft(ctx, x, y, U * 3.4, U * 2.6, "255,240,206", n.hit ? 0.5 : 0.22 + pulse * 0.1);
      ctx.restore();
      if (n.hit) {
        // touched: the dust goes up
        for (let k = 0; k < 10; k++) {
          const ph = (t * 0.8 + hash(k * 3.1 + i)) % 1;
          ctx.fillStyle = `rgba(234,214,178,${(1 - ph) * 0.4})`;
          ctx.beginPath();
          ctx.arc(x + (hash(k * 7.7 + i) - 0.5) * U * 16, y - ph * U * 12, U * (0.4 + hash(k + i) * 0.7), 0, TAU);
          ctx.fill();
        }
      }
    });
  },

  coin(ctx, w, h, t, nodes) {
    const U = h / 100;
    // a table edge at the very bottom, so the coins have somewhere to sit
    body(ctx, () => {
      ctx.moveTo(-w * 0.05, h * 0.94);
      ctx.lineTo(w * 1.05, h * 0.93);
      ctx.lineTo(w * 1.05, h * 1.05); ctx.lineTo(-w * 0.05, h * 1.05); ctx.closePath();
    }, "rgba(24,18,13,.9)", "rgba(255,200,146,.3)", 1.2);
    nodes.forEach((n, i) => {
      const x = n.fx * w, y = n.fy * h;
      if (n.hit) soft(ctx, x, y, U * 18, U * 11, "255,210,140", 0.22);
      const r = U * (4.2 + (n.hit ? 0.5 : 0));
      const g = ctx.createLinearGradient(x - r, y - r, x + r, y + r);
      g.addColorStop(0, n.hit ? "rgba(255,226,158,.95)" : "rgba(150,126,86,.8)");
      g.addColorStop(0.6, n.hit ? "rgba(208,166,94,.95)" : "rgba(98,82,56,.8)");
      g.addColorStop(1, "rgba(50,42,28,.9)");
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.7, 0.2, 0, TAU); ctx.fill();
      ctx.strokeStyle = "rgba(255,232,184,.4)"; ctx.lineWidth = U * 0.4;
      ctx.beginPath(); ctx.ellipse(x, y, r * 0.6, r * 0.4, 0.2, 0, TAU); ctx.stroke();
    });
  },

  barley(ctx, w, h, t, nodes) {
    const U = h / 100;
    nodes.forEach((n, i) => {
      const x = n.fx * w, y = n.fy * h;
      if (n.hit) {
        // the broken stem, and the ear in the hand
        soft(ctx, x, y, U * 18, U * 12, "255,216,150", 0.2);
        ctx.strokeStyle = "rgba(255,226,170,.55)"; ctx.lineWidth = U * 0.8;
        ctx.beginPath(); ctx.moveTo(x - U * 3.4, y + U * 2.4); ctx.lineTo(x + U * 3.4, y - U * 2.6); ctx.stroke();
        for (let k = 0; k < 4; k++) {
          ctx.strokeStyle = `rgba(228,202,142,${0.6 - k * 0.1})`; ctx.lineWidth = U * 0.5;
          ctx.beginPath();
          ctx.moveTo(x + U * (2.4 + k * 0.8), y - U * (2.6 + k * 1.9));
          ctx.lineTo(x + U * (4.4 + k * 0.8), y - U * (3.8 + k * 1.9));
          ctx.stroke();
        }
      } else {
        soft(ctx, x, y, U * 11, U * 7, "255,214,150", 0.08 + 0.06 * Math.sin(t * 2.4 + i));
        for (let k = 0; k < 3; k++) {
          ctx.strokeStyle = `rgba(200,176,116,${0.24 + 0.08 * Math.sin(t * 1.7 + i + k)})`;
          ctx.lineWidth = U * 0.5;
          ctx.beginPath();
          ctx.moveTo(x + U * (k * 1.6 - 2), y + U * 4);
          ctx.lineTo(x + U * (k * 1.8 - 2.4 + Math.sin(t + i) * 0.8), y - U * 3.4);
          ctx.stroke();
        }
      }
    });
  }
};

/* -------------------------------------------------------------- trace */
/* The player's finger leaves the mark; the world shows where it went. */
/* S.path is the route the finger drew, as [x, y] pairs in frame fractions.
   Accept either that or {x, y} so the shape of the data can change without
   silently drawing a trail of NaNs. */
const PX = (q) => (Array.isArray(q) ? q[0] : q?.x);
const PY = (q) => (Array.isArray(q) ? q[1] : q?.y);

function trail(ctx, w, h, path, progress, t, tint) {
  if (!path || path.length < 2) return;
  if (!Number.isFinite(PX(path[0])) || !Number.isFinite(PY(path[0]))) return;
  /* the route itself, scuffed into the ground: it is where the finger has to
     go, so it has to be visible before it is drawn */
  ctx.save();
  ctx.lineCap = "round"; ctx.lineJoin = "round";
  ctx.strokeStyle = "rgba(8,8,10,.18)";
  ctx.lineWidth = h * 0.03;
  ctx.beginPath();
  path.forEach((q, i) => (i ? ctx.lineTo(PX(q) * w, PY(q) * h + h * 0.004) : ctx.moveTo(PX(q) * w, PY(q) * h + h * 0.004)));
  ctx.stroke();
  ctx.strokeStyle = "rgba(255,242,214,.1)";
  ctx.lineWidth = h * 0.026;
  ctx.beginPath();
  path.forEach((q, i) => (i ? ctx.lineTo(PX(q) * w, PY(q) * h) : ctx.moveTo(PX(q) * w, PY(q) * h)));
  ctx.stroke();
  ctx.strokeStyle = "rgba(255,228,182,.14)";
  ctx.lineWidth = h * 0.008;
  ctx.stroke();
  // grit kicked along the route
  for (let i = 0; i < path.length; i += 2) {
    const q = path[i];
    ctx.fillStyle = `rgba(246,232,204,${0.05 + hash(i) * 0.08})`;
    ctx.beginPath();
    ctx.arc(PX(q) * w + (hash(i * 3.1) - 0.5) * h * 0.03, PY(q) * h + (hash(i * 7.7) - 0.5) * h * 0.02, h * 0.004, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
  // and the part already travelled, lit
  const n = Math.max(2, Math.floor(path.length * clamp(progress, 0, 1)));
  for (let i = 1; i < n; i++) {
    const a = path[i - 1], b = path[i];
    const fresh = i / n;
    ctx.strokeStyle = `rgba(10,9,8,${0.16 + fresh * 0.18})`;
    ctx.lineWidth = h * (0.02 + fresh * 0.01);
    ctx.beginPath();
    ctx.moveTo(PX(a) * w, PY(a) * h + h * 0.006); ctx.lineTo(PX(b) * w, PY(b) * h + h * 0.006);
    ctx.stroke();
    ctx.strokeStyle = `rgba(${tint},${0.1 + fresh * 0.3})`;
    ctx.lineWidth = h * (0.01 + fresh * 0.01);
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(PX(a) * w, PY(a) * h); ctx.lineTo(PX(b) * w, PY(b) * h);
    ctx.stroke();
  }
  const tip = path[Math.min(n, path.length) - 1];
  ctx.save(); ctx.globalCompositeOperation = "lighter";
  soft(ctx, PX(tip) * w, PY(tip) * h, h * 0.09, h * 0.09, "255,206,132", 0.2);
  // dust lifting where the finger has just been
  for (let i = 0; i < 8; i++) {
    const ph = (t * 1.1 + hash(i * 4.1)) % 1;
    ctx.fillStyle = `rgba(238,220,186,${(1 - ph) * 0.25})`;
    ctx.beginPath();
    ctx.arc(PX(tip) * w + (hash(i * 3.3) - 0.5) * h * 0.08, PY(tip) * h - ph * h * 0.06, h * 0.004, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

const TRACE = {
  road(ctx, w, h, path, progress, t) {
    // the road's own dust, blowing across the line of travel
    for (let i = 0; i < 30; i++) {
      const x = ((hash(i * 2.7) + t * 0.05) % 1) * w;
      const y = h * (0.66 + hash(i * 6.1) * 0.3);
      ctx.fillStyle = `rgba(226,206,170,${0.05 + hash(i) * 0.1})`;
      ctx.beginPath(); ctx.arc(x, y, h * (0.004 + hash(i * 3) * 0.006), 0, TAU); ctx.fill();
    }
    trail(ctx, w, h, path, progress, t, "255,206,132");
  },
  slope(ctx, w, h, path, progress, t) {
    // gravel and dry grass on a hillside that is steeper than it looks
    for (let i = 0; i < 26; i++) {
      const x = ((hash(i * 2.7) + t * 0.04) % 1) * w;
      const y = h * (0.5 + hash(i * 6.1) * 0.46);
      ctx.fillStyle = `rgba(214,194,158,${0.05 + hash(i) * 0.09})`;
      ctx.beginPath(); ctx.arc(x, y, h * (0.003 + hash(i * 3) * 0.005), 0, TAU); ctx.fill();
    }
    // loose stones rolling down the slope, one every second or so
    for (let i = 0; i < 5; i++) {
      const ph = (t * 0.28 + hash(i * 4.9)) % 1;
      const x = w * (0.2 + hash(i * 2.2) * 0.6) + ph * w * 0.16;
      const y = h * (0.42 + hash(i * 7.7) * 0.3) + ph * ph * h * 0.3;
      ctx.fillStyle = "rgba(22,20,16,.55)";
      ctx.beginPath(); ctx.ellipse(x, y, h * 0.007, h * 0.005, 0.4, 0, TAU); ctx.fill();
    }
    trail(ctx, w, h, path, progress, t, "255,206,132");
  },
  branch(ctx, w, h, path, progress, t) {
    // leaves moving in the top of the tree
    for (let i = 0; i < 14; i++) {
      const x = hash(i * 4.4) * w, y = h * (0.05 + hash(i * 2.2) * 0.24);
      const sway = Math.sin(t * 0.9 + i) * h * 0.012;
      ctx.strokeStyle = `rgba(226,206,150,${0.1 + hash(i) * 0.08})`;
      ctx.lineWidth = h * 0.004;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + sway, y + h * 0.04); ctx.stroke();
    }
    trail(ctx, w, h, path, progress, t, "255,206,132");
  }
};

/* ------------------------------------------------------------- rhythm */
/* A thing crosses the frame on a beat. It is never a cursor: it is a shadow
   moving over lit ground, and the band is the patch of light it has to cross. */
/* The beat has to be visible on a sunlit road and in a dark hall alike, which
   pure light cannot do: it is drawn as a shadow crossing a pool of light, with
   the leading edge lit. Shadow reads on the bright painting, the pool reads on
   the dark one, and the pair reads on both. */
function beatGround(ctx, w, h, marker, band, t, o = {}) {
  const groundY = o.groundY ?? h * 0.82;
  const tint = o.tint || "255,216,158";
  const hit = Math.abs(marker - band) < 0.085;
  const rx = w * 0.13, ry = h * 0.062;
  ctx.save();
  /* the mark: a pool of light with a dark rim, so it is a place on the ground */
  const dark = ctx.createRadialGradient(band * w, groundY, 0, band * w, groundY, rx * 1.25);
  dark.addColorStop(0, "rgba(8,9,10,.46)");
  dark.addColorStop(0.72, "rgba(8,9,10,.3)");
  dark.addColorStop(1, "rgba(8,9,10,0)");
  ctx.fillStyle = dark;
  ctx.beginPath(); ctx.ellipse(band * w, groundY, rx * 1.25, ry * 1.3, 0, 0, TAU); ctx.fill();
  const pool = ctx.createRadialGradient(band * w, groundY, 0, band * w, groundY, rx);
  pool.addColorStop(0, `rgba(${tint},${hit ? 0.5 : 0.3})`);
  pool.addColorStop(0.6, `rgba(${tint},${hit ? 0.22 : 0.12})`);
  pool.addColorStop(1, `rgba(${tint},0)`);
  ctx.fillStyle = pool;
  ctx.beginPath(); ctx.ellipse(band * w, groundY, rx, ry, 0, 0, TAU); ctx.fill();
  ctx.strokeStyle = `rgba(255,232,182,${hit ? 0.62 : 0.3})`;
  ctx.lineWidth = Math.max(1, h * 0.004);
  ctx.beginPath(); ctx.ellipse(band * w, groundY, rx * 0.82, ry * 0.8, 0, 0, TAU); ctx.stroke();

  /* the beat: a shadow sweeping across, lit on the edge that leads */
  const mx = marker * w;
  const sg = ctx.createRadialGradient(mx, groundY, 0, mx, groundY, w * 0.1);
  sg.addColorStop(0, "rgba(6,7,9,.5)");
  sg.addColorStop(0.6, "rgba(6,7,9,.26)");
  sg.addColorStop(1, "rgba(6,7,9,0)");
  ctx.fillStyle = sg;
  ctx.beginPath(); ctx.ellipse(mx, groundY, w * 0.1, h * 0.05, 0, 0, TAU); ctx.fill();
  ctx.strokeStyle = `rgba(255,236,196,${hit ? 0.7 : 0.4})`;
  ctx.lineWidth = Math.max(1, h * 0.005);
  ctx.beginPath();
  ctx.ellipse(mx, groundY, w * 0.052, h * 0.03, 0, -Math.PI * 0.62, Math.PI * 0.62);
  ctx.stroke();

  if (hit) {
    ctx.beginPath();
    ctx.ellipse(mx, groundY, w * 0.09, h * 0.045, 0, 0, TAU);
    ctx.strokeStyle = "rgba(255,240,206,.55)"; ctx.lineWidth = Math.max(1, h * 0.004);
    ctx.stroke();
    for (let i = 0; i < 10; i++) {
      const a2 = hash(i * 3.1) * TAU, r = hash(i * 5.5) * h * 0.06;
      ctx.fillStyle = `rgba(255,242,210,${0.42 * (1 - r / (h * 0.06))})`;
      ctx.beginPath(); ctx.arc(mx + Math.cos(a2) * r, groundY + Math.sin(a2) * r * 0.35, h * 0.004, 0, TAU); ctx.fill();
    }
  }
  ctx.restore();
}

const RHYTHM = {
  /* jericho — footsteps going past on the road, and the light between them. */
  foot(ctx, w, h, marker, band, t) {
    const U = h / 100;
    beatGround(ctx, w, h, marker, band, t, { groundY: h * 0.8 });
    // dust kicked up by the ones walking past
    for (let i = 0; i < 16; i++) {
      const ph = (t * 0.8 + hash(i * 3.7)) % 1;
      ctx.fillStyle = `rgba(224,204,170,${(1 - ph) * 0.18})`;
      ctx.beginPath();
      ctx.arc(hash(i * 6.1) * w + ph * w * 0.05, h * 0.78 + ph * h * 0.14, h * 0.004 * (0.6 + hash(i)), 0, TAU);
      ctx.fill();
    }
  },

  /* esther — the light through the hall, and the shadow of the scepter. */
  light(ctx, w, h, marker, band, t) {
    const U = h / 100;
    beatGround(ctx, w, h, marker, band, t, { groundY: h * 0.86, tint: "255,224,168" });
    // the scepter's gold throwing a warm smear across the floor
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    soft(ctx, marker * w, h * 0.86, w * 0.05, h * 0.12, "255,206,120", 0.06);
    ctx.restore();
    // dust turning in the shaft
    for (let i = 0; i < 22; i++) {
      const ph = (t * 0.16 + hash(i * 5.1)) % 1;
      const x = band * w + (hash(i * 2.3) - 0.5) * w * 0.24 + ph * w * 0.04;
      ctx.fillStyle = `rgba(255,238,204,${(1 - ph) * 0.2})`;
      ctx.beginPath(); ctx.arc(x, h * 0.2 + ph * h * 0.7, U * (0.3 + hash(i) * 0.5), 0, TAU); ctx.fill();
    }
  },

  /* jonah — heat over the plain, and a shadow crossing it. */
  sun(ctx, w, h, marker, band, t) {
    const U = h / 100;
    for (let i = 0; i < 6; i++) {
      const y = h * (0.24 + i * 0.1);
      ctx.strokeStyle = "rgba(255,214,150,.055)"; ctx.lineWidth = h * 0.012;
      ctx.beginPath();
      ctx.moveTo(0, y + Math.sin(t * 1.6 + i) * h * 0.008);
      ctx.lineTo(w, y + Math.cos(t * 1.4 + i) * h * 0.008);
      ctx.stroke();
    }
    beatGround(ctx, w, h, marker, band, t, { groundY: h * 0.84, tint: "255,206,140" });
    // the glare off the hard ground, right where the beat lands
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    soft(ctx, marker * w, h * 0.8, w * 0.07, h * 0.02, "255,238,196", 0.07);
    ctx.restore();
  }
};

/* ============================================================ the frame */

export function hasMomentArt(spec) {
  if (!spec) return false;
  if (spec.kind === "hold") return !!HOLD[spec.subject];
  if (spec.kind === "balance") return !!BALANCE[spec.subject];
  if (spec.kind === "tap") return !!TAP[spec.subject];
  if (spec.kind === "trace") return !!TRACE[spec.subject];
  if (spec.kind === "rhythm") return !!RHYTHM[spec.subject];
  return false;
}

/* The act is drawn into its own buffer, then darkened and given one warm edge,
   so it reads as an object in front of the photograph rather than a sticker
   on top of it. */
let buf = null, bctx = null;
function siloBuffer(w, h, dpr) {
  if (typeof document === "undefined") return null;
  if (!buf) { buf = document.createElement("canvas"); bctx = buf.getContext("2d"); }
  const W = Math.max(1, Math.round(w * dpr)), H = Math.max(1, Math.round(h * dpr));
  if (buf.width !== W || buf.height !== H) { buf.width = W; buf.height = H; }
  bctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  bctx.clearRect(0, 0, w, h);
  return bctx;
}

/* The last thing drawn: light in the air, so the drawing and the photograph
   sit under the same glass. */
function finish(ctx, w, h, t) {
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const key = ctx.createLinearGradient(0, 0, w * 0.9, h);
  key.addColorStop(0, "rgba(255,224,170,.1)");
  key.addColorStop(0.42, "rgba(255,204,146,.03)");
  key.addColorStop(1, "rgba(90,150,170,.04)");
  ctx.fillStyle = key; ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 5; i++) {
    const ph = (t * 0.09 + hash(i * 3.7)) % 1;
    const x = hash(i * 5.1) * w + Math.sin(t * 0.5 + i) * 10;
    const y = h * (0.05 + ph * 0.95);
    soft(ctx, x, y, 6 + hash(i * 7.3) * 12, 6 + hash(i * 7.3) * 12, "255,238,204", 0.03);
  }
  ctx.restore();
  ctx.strokeStyle = "rgba(255,226,180,.08)";
  ctx.lineWidth = 1;
  ctx.strokeRect(0.5, 0.5, w - 1, h - 1);
}

export function drawMomentArt(ctx, w, h, spec, S, dpr = 1) {
  if (!w || !h) return;
  const ang = spec?.kind === "balance" ? balanceAngle(S) : 0;
  ctx.save();
  if (ang) {
    /* the world inside the frame tips; the plate behind it tips by the same
       angle (the engine sets that on the plate element) */
    const px = w * 0.5, py = h * 0.55;
    ctx.translate(px, py); ctx.rotate(ang); ctx.scale(1.22, 1.22); ctx.translate(-px, -py);
  }
  atmosphere(ctx, w, h, S.t);
  ctx.restore();
  /* A hold has no object of its own in most frames — the painting is the thing
     you are holding on to. One warm ring says where the finger goes, and it is
     gone the moment the player presses: an affordance, not a widget. */
  if (spec?.kind === "hold" && !S.touched) {
    /* small, and low on the ground — a place for the thumb, not a seal over
       the actor's face */
    const hx = w * 0.5, hy = h * 0.76;
    const hr = Math.min(w, h) * (0.105 + Math.sin(S.t * 2.1) * 0.01);
    ctx.save();
    ctx.beginPath(); ctx.arc(hx, hy, hr, 0, TAU);
    ctx.strokeStyle = "rgba(8,8,8,.45)"; ctx.lineWidth = 6; ctx.stroke();
    ctx.strokeStyle = `rgba(255,234,190,${0.46 + Math.sin(S.t * 2.1) * 0.12})`; ctx.lineWidth = 2; ctx.stroke();
    ctx.beginPath(); ctx.arc(hx, hy, hr * 0.17, 0, TAU);
    ctx.fillStyle = "rgba(255,240,206,.9)"; ctx.fill();
    ctx.restore();
  }
  /* the load stays level while the world tips, so the act is drawn unrotated */
  /* Light-based acts (a gleam on the floor, ink surfacing, a trail of dust) are
     drawn straight onto the frame: knocking them back through the silhouette
     buffer would turn every glow into a grey smudge. Objects — a rope, a lamp,
     a plumb weight — go through the buffer so they sit in the photograph. */
  const additive = spec?.kind === "tap" || spec?.kind === "trace" || spec?.kind === "rhythm";
  const target = additive ? ctx : (siloBuffer(w, h, dpr) || ctx);
  const prev = target === ctx;
  target.save();
  const subject = spec?.subject;
  if (spec?.kind === "hold" && HOLD[subject]) HOLD[subject](target, w, h, clamp(S.charge, 0, 1), S.t);
  else if (spec?.kind === "balance" && BALANCE[subject]) {
    /* the load is level only relative to the ground, and the ground moves */
    BALANCE[subject](target, w, h, (S.pos ?? 0.5) - (S.zero ?? 0.5), S.t, subject, !!S.touched);
  }
  else if (spec?.kind === "tap" && TAP[subject]) TAP[subject](target, w, h, S.t, S.nodes || []);
  else if (spec?.kind === "trace" && TRACE[subject]) TRACE[subject](target, w, h, S.path, S.progress, S.t);
  else if (spec?.kind === "rhythm" && RHYTHM[subject]) RHYTHM[subject](target, w, h, S.marker, S.band, S.t);
  target.restore();

  if (target !== ctx) {
    target.save();
    target.setTransform(dpr, 0, 0, dpr, 0, 0);
    target.globalCompositeOperation = "source-atop";
    target.fillStyle = "rgba(12,15,18,.28)";
    target.fillRect(0, 0, w, h);
    target.restore();
    ctx.drawImage(buf, 0, 0, w, h);
  }

  finish(ctx, w, h, S.t);

  /* How close this is to done, in the material of the scene: a warm rim along
     the bottom of the frame that fills as you go. Never a bar. */
  const p = clamp(S.progress, 0, 1);
  if (p > 0.005) {
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    const g = ctx.createLinearGradient(0, h, w, h - 30);
    g.addColorStop(0, `rgba(255,206,132,${0.08 + p * 0.14})`);
    g.addColorStop(1, "rgba(255,206,132,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, h - 30, w, 30);
    ctx.restore();
    // and a thread of light along the very edge, unbroken so it never reads as a bar
    const eg = ctx.createLinearGradient(0, 0, w, 0);
    eg.addColorStop(0, "rgba(255,214,150,.06)");
    eg.addColorStop(p * 0.85, "rgba(255,226,172,.5)");
    eg.addColorStop(1, "rgba(255,214,150,.1)");
    ctx.fillStyle = eg;
    ctx.fillRect(0, h - 1.5, w, 1.5);
  }
}
