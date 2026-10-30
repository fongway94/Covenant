/* Four-direction character rig.

   The painted art in assets/art/sprites is one pose per character — fine for a
   cut-in, useless for walking. So the world mode draws its own actors: four
   facings, four-frame walk cycle, feet anchored at (x, y), sized in px so a
   figure reads the same on a small phone and a laptop.

   Every character is a palette, not a bitmap. When hand-painted four-direction
   sheets exist, SHEETS below is the only line that changes: load the image and
   drawActor() slices 4 rows x 4 columns instead of calling the rig.

   Local space: 40 units tall, feet at 0, head top at -40. Everything scales. */

const TAU = Math.PI * 2;

export const DIRS = ["down", "left", "right", "up"];

export const CHARS = {
  pilgrim: {
    robe: "#1b2a33", robe2: "#24363f", trim: "#c9a45c", skin: "#c9a45c",
    hair: "#14202a", cape: "#20333d", staff: true, glow: "#24404d"
  },
  corin: {
    robe: "#3a2f46", robe2: "#4a3d59", trim: "#d8b273", skin: "#c39a63",
    hair: "#221b2b", cape: "#2b2335", hood: true, scroll: true
  },
  soldier: {
    robe: "#3d4a3a", robe2: "#4b5a46", trim: "#9aa285", skin: "#bd9560",
    hair: "#1d241a", helm: true
  },
  woman: {
    robe: "#4a3340", robe2: "#5b4250", trim: "#e0bb8c", skin: "#c9a06c",
    hair: "#2a1c22", veil: true
  },
  david: {
    robe: "#7a5230", robe2: "#8d6339", trim: "#e8c78a", skin: "#c9a06c",
    hair: "#3a2416", cape: "#5f3f24", sling: true, glow: "#5a3f22"
  },
  elder: {
    robe: "#2f3b46", robe2: "#3d4c58", trim: "#b9a06a", skin: "#c9a06c",
    hair: "#b9b2a4", beard: true, cloak: true
  },
  giant: {
    robe: "#2b3540", robe2: "#3a4550", trim: "#8e949c", skin: "#c8a06a",
    hair: "#1a222a", helm: true, big: true
  }
};

/* Painted sheets go here when they exist: { id: "assets/art/walk/david.png" }
   Layout expected: 4 rows (down, left, right, up) x 4 frames, no padding. */
export const SHEETS = {};

const sheetCache = new Map();

function sheet(id) {
  const src = SHEETS[id];
  if (!src || typeof Image === "undefined") return null;
  if (sheetCache.has(id)) return sheetCache.get(id);
  let img = null;
  try { img = new Image(); img.src = src; } catch { img = null; }
  sheetCache.set(id, img);
  return img;
}

/** Draw the painted sheet if one is loaded, otherwise the rig. Returns true if
    the sheet was used, so callers can tell them apart in tests. */
function drawSheet(ctx, id, x, y, h, o) {
  const img = sheet(id);
  if (!img || !img.complete || !img.naturalWidth) return false;
  const cols = 4, rows = 4;
  const fw = img.naturalWidth / cols, fh = img.naturalHeight / rows;
  const row = Math.max(0, DIRS.indexOf(o.dir || "down"));
  const col = ((o.frame || 0) % cols + cols) % cols;
  const dw = h * (fw / fh);
  ctx.save();
  ctx.translate(x, y);
  if (o.alpha != null) ctx.globalAlpha = o.alpha;
  try {
    ctx.drawImage(img, col * fw, row * fh, fw, fh, -dw / 2, -h, dw, h);
  } catch { ctx.restore(); return false; }
  ctx.restore();
  return true;
}

/* --------------------------------------------------------------- the rig */

/** One walking figure, feet on the ground at (x, y).
    o.dir    "down" | "left" | "right" | "up"   (default "down")
    o.frame  0..3 walk cycle (fractional values are fine — halves interpolate)
    o.h      on-screen height in px (default 46)
    o.alpha  0..1
    o.glow   true to add a warm halo (the player, and anyone being spoken to)
    o.squash transient 0.9..1.1 for landing/stagger */
export function drawActor(ctx, id, x, y, o = {}) {
  const p = CHARS[id] || CHARS.pilgrim;
  const h = o.h || 46;
  const dir = o.dir || "down";
  const frame = o.frame || 0;
  if (drawSheet(ctx, id, x, y, h, o)) return true;

  const s = h / 40;
  const step = Math.sin((frame / 4) * TAU);      /* -1 .. 1 leg swing */
  const bob = Math.abs(Math.sin((frame / 4) * TAU)) * 0.8;   /* 0 .. 0.8 */

  ctx.save();
  ctx.translate(x, y);
  if (p.big) ctx.scale(s * 1.02, s * 1.02); else ctx.scale(s, s);
  if (o.alpha != null) ctx.globalAlpha = o.alpha;
  if (o.squash) ctx.scale(1 / o.squash, o.squash);
  if (o.glow) {
    const g = ctx.createRadialGradient(0, -18, 2, 0, -18, 30);
    g.addColorStop(0, "rgba(244,215,155,.22)");
    g.addColorStop(1, "rgba(244,215,155,0)");
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, -18, 30, 0, TAU); ctx.fill();
  }
  ctx.translate(0, -bob);

  const facingAway = dir === "up";
  const side = dir === "left" || dir === "right";
  if (dir === "left") ctx.scale(-1, 1);   /* draw "right", mirror for "left" */

  /* ---- legs: only the down/up facings show both; a profile shows both too,
     one behind the other, which is what reads as walking from the side. */
  const legSpread = side ? 1.6 : 2.4;
  const swing = step * (side ? 2.6 : 1.9);
  ctx.strokeStyle = p.hair;
  ctx.lineWidth = 2.6;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-legSpread, -13); ctx.lineTo(-legSpread - swing, -0.5);
  ctx.moveTo(legSpread, -13); ctx.lineTo(legSpread + swing, -0.5);
  ctx.stroke();
  /* heels */
  ctx.strokeStyle = p.trim;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-legSpread - swing - 1, -0.4); ctx.lineTo(-legSpread - swing + 1, -0.4);
  ctx.moveTo(legSpread + swing - 1, -0.4); ctx.lineTo(legSpread + swing + 1, -0.4);
  ctx.stroke();

  /* ---- cape / cloak behind the body */
  if (p.cape || p.cloak) {
    const flap = Math.sin((frame / 4) * TAU + 0.6) * 1.4;
    ctx.fillStyle = p.cape || p.robe;
    ctx.beginPath();
    if (facingAway) {
      ctx.moveTo(-7, -29); ctx.quadraticCurveTo(-10 + flap, -20, -8.5, -8);
      ctx.lineTo(8.5, -8); ctx.quadraticCurveTo(10 - flap, -20, 7, -29);
    } else {
      ctx.moveTo(-6.5, -28); ctx.quadraticCurveTo(-11 - flap, -19, -8, -9);
      ctx.lineTo(-4, -11); ctx.closePath();
    }
    ctx.fill();
  }

  /* ---- robe */
  const hem = facingAway ? 9.4 : 8.8;
  ctx.fillStyle = facingAway ? p.robe2 : p.robe;
  ctx.beginPath();
  ctx.moveTo(-hem, -2);
  ctx.lineTo(-6.4, -28);
  ctx.quadraticCurveTo(0, -30.5, 6.4, -28);
  ctx.lineTo(hem, -2);
  ctx.quadraticCurveTo(0, 0.8, -hem, -2);
  ctx.fill();

  /* ---- sash / belt */
  ctx.fillStyle = p.trim;
  ctx.globalAlpha = (o.alpha ?? 1) * 0.8;
  ctx.beginPath();
  ctx.moveTo(-6.4, -17); ctx.lineTo(6.4, -17); ctx.lineTo(6.2, -15.2); ctx.lineTo(-6.2, -15.2);
  ctx.fill();
  ctx.globalAlpha = o.alpha ?? 1;

  /* ---- arms, swinging opposite the legs */
  const armSwing = -step * (side ? 2.2 : 1.4);
  ctx.strokeStyle = p.robe;
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  if (side) {
    ctx.moveTo(0, -25); ctx.lineTo(4 + armSwing, -15);
  } else {
    ctx.moveTo(-6, -26); ctx.lineTo(-7.4 - armSwing, -15);
    ctx.moveTo(6, -26); ctx.lineTo(7.4 + armSwing, -15);
  }
  ctx.stroke();
  /* hands */
  ctx.fillStyle = p.skin;
  if (side) { ctx.beginPath(); ctx.arc(4 + armSwing, -14.4, 1.6, 0, TAU); ctx.fill(); }
  else {
    ctx.beginPath(); ctx.arc(-7.4 - armSwing, -14.4, 1.5, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(7.4 + armSwing, -14.4, 1.5, 0, TAU); ctx.fill();
  }

  /* ---- staff, planted with the walk */
  if (p.staff) {
    const tilt = step * 1.1;
    ctx.strokeStyle = "#8d6b3f";
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(8 + tilt, -1); ctx.lineTo(7.6 + tilt * 2, -34);
    ctx.stroke();
    ctx.fillStyle = "#f4d79b";
    ctx.beginPath(); ctx.arc(7.6 + tilt * 2, -35, 2.1, 0, TAU); ctx.fill();
  }
  /* ---- sling, coiled at the hip */
  if (p.sling) {
    ctx.strokeStyle = "#c9a45c";
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.arc(-7.5, -19, 2.6, 0.4, TAU - 0.4); ctx.stroke();
  }
  /* ---- scroll, held against the chest */
  if (p.scroll) {
    ctx.fillStyle = "#e8dcc0";
    ctx.beginPath();
    ctx.rect(side ? -2 : 4.6, -25, 2.6, 7);
    ctx.fill();
  }

  /* ---- head */
  const headY = -35.2;
  ctx.fillStyle = p.skin;
  ctx.beginPath(); ctx.ellipse(0, headY, 5.8, 6.6, 0, 0, TAU); ctx.fill();

  /* beard / veil / hair / helm, back to front */
  if (p.beard && !facingAway) {
    ctx.fillStyle = p.hair;
    ctx.beginPath(); ctx.ellipse(0, headY + 5.4, 4.4, 3.6, 0, 0, TAU); ctx.fill();
  }
  if (p.veil) {
    ctx.fillStyle = p.hair;
    ctx.beginPath();
    ctx.ellipse(0, headY + 1.2, 7.2, 8.6, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = p.skin;
    ctx.beginPath(); ctx.ellipse(1.1, headY + 0.4, 4.6, 5.6, 0, 0, TAU); ctx.fill();
  } else {
    ctx.fillStyle = p.hair;
    ctx.beginPath();
    ctx.arc(0, headY - 1.4, 6.2, Math.PI * 1.02, TAU * 0.99);
    ctx.lineTo(6.2, headY - 0.6); ctx.lineTo(-6.2, headY - 0.6);
    ctx.fill();
  }
  if (p.helm) {
    ctx.fillStyle = p.trim;
    ctx.beginPath();
    ctx.arc(0, headY - 1.6, 7.2, Math.PI, TAU);
    ctx.lineTo(7.2, headY + 0.6); ctx.lineTo(-7.2, headY + 0.6);
    ctx.fill();
    ctx.fillStyle = "rgba(255,240,205,.5)";
    ctx.beginPath(); ctx.arc(-2.2, headY - 4.2, 1.4, 0, TAU); ctx.fill();
  }
  if (p.hood) {
    ctx.fillStyle = p.hair;
    ctx.beginPath();
    ctx.arc(0, headY - 0.8, 7.4, Math.PI * 0.98, TAU * 1.01);
    ctx.lineTo(7.4, headY + 2.4); ctx.lineTo(-7.4, headY + 2.4);
    ctx.fill();
  }

  /* ---- face: only on the facings that show one */
  if (!facingAway) {
    const eyeX = side ? 3.4 : 2.1;
    ctx.fillStyle = "rgba(252,246,232,.9)";
    ctx.beginPath(); ctx.arc(eyeX, headY + 0.4, 1.05, 0, TAU); ctx.fill();
    if (!side) { ctx.beginPath(); ctx.arc(-eyeX, headY + 0.4, 1.05, 0, TAU); ctx.fill(); }
    /* brow — a small line that gives the face an expression */
    ctx.strokeStyle = "rgba(20,26,32,.55)";
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(eyeX - 1.4, headY - 1.8); ctx.lineTo(eyeX + 1.4, headY - 1.6);
    ctx.stroke();
  }
  /* ---- rim light, warm, always on the side facing the sun */
  ctx.strokeStyle = "rgba(247,221,165,.4)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(5.4, -27.6); ctx.lineTo(7.2, -10);
  ctx.stroke();

  ctx.restore();
  return true;
}

/** Feet-level contact shadow. Separate so a figure can stand on a bridge or in
    shallow water and still be stitched to the ground. */
export function drawShadow(ctx, x, y, w, alpha = 0.32) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = "#04080b";
  ctx.beginPath();
  ctx.ellipse(x, y, w, Math.max(1.6, w * 0.28), 0, 0, TAU);
  ctx.fill();
  ctx.restore();
}
