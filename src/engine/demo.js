/* A hand that shows the gesture instead of describing it.
   Every briefing card is read by someone who has not played this scene yet, and
   a sentence like "drag in a circle" is a poor teacher on a phone. Each card
   therefore carries a small looping animation of a finger doing the exact
   movement the scene expects, drawn on a canvas — no images, no video, nothing
   to download. `data-demo="<kind>"` on a <canvas> is all it takes.

   The same animator is used by the pause card, so a player who stops mid-scene
   can be reminded of the movement without leaving the scene. */

const KINDS = new Set([
  "circle", "hold", "tap", "jump", "duck", "jumpduck", "drag", "pull", "lift",
  "path", "aim", "taprow"
]);

const TAU = Math.PI * 2;
let raf = null;
let mounted = [];
let t0 = 0;

function dprOf(cv) {
  const d = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
  return Math.min(2, Math.max(1, d));
}

function fit(cv) {
  const r = cv.getBoundingClientRect();
  const w = Math.max(60, Math.round(r.width || 96));
  const h = Math.max(34, Math.round(r.height || 52));
  const d = dprOf(cv);
  if (cv.width !== Math.round(w * d) || cv.height !== Math.round(h * d)) {
    cv.width = Math.round(w * d); cv.height = Math.round(h * d);
  }
  return { w, h, d };
}

/* A fingertip: soft shadow, warm core, thin ring — the same mark the scenes use
   for touch feedback, so the animation teaches the vocabulary as well as the
   movement. */
function finger(ctx, x, y, r, a = 1, press = 0) {
  ctx.save();
  ctx.globalAlpha = a;
  ctx.fillStyle = "rgba(0,0,0,.35)";
  ctx.beginPath(); ctx.ellipse(x, y + r * 0.55, r * 0.95, r * 0.5, 0, 0, TAU); ctx.fill();
  const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.35, r * 0.15, x, y, r);
  g.addColorStop(0, "#fff6de");
  g.addColorStop(0.55, "#f2d59b");
  g.addColorStop(1, "rgba(231,183,91,.55)");
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
  ctx.strokeStyle = `rgba(255,246,222,${0.55 + press * 0.4})`;
  ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.arc(x, y, r + 2 + press * 9, 0, TAU); ctx.stroke();
  ctx.restore();
}

function arrow(ctx, x1, y1, x2, y2, a, color = "rgba(255,240,205,.75)") {
  ctx.save();
  ctx.globalAlpha = a;
  ctx.strokeStyle = color; ctx.lineWidth = 1.6; ctx.lineCap = "round";
  ctx.setLineDash([4, 4]);
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  ctx.setLineDash([]);
  const ang = Math.atan2(y2 - y1, x2 - x1);
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - Math.cos(ang - 0.5) * 7, y2 - Math.sin(ang - 0.5) * 7);
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - Math.cos(ang + 0.5) * 7, y2 - Math.sin(ang + 0.5) * 7);
  ctx.stroke();
  ctx.restore();
}

function ripple(ctx, x, y, p, color = "255,240,205") {
  if (p <= 0 || p >= 1) return;
  ctx.save();
  ctx.globalAlpha = (1 - p) * 0.55;
  ctx.strokeStyle = `rgba(${color},1)`;
  ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.arc(x, y, 6 + p * 22, 0, TAU); ctx.stroke();
  ctx.restore();
}

/* One drawing per kind. `p` runs 0→1 and repeats; each ends with a short hold
   so the eye can catch the end position before it starts again. */
function paint(ctx, kind, w, h, p, t) {
  const cx = w / 2, cy = h / 2;
  const u = Math.min(w, h * 1.7);
  const r = Math.max(4.5, u * 0.075);

  if (kind === "circle") {
    const R = Math.min(w * 0.3, h * 0.32);
    const a = -Math.PI / 2 + p * TAU * 1.15;
    ctx.save();
    ctx.strokeStyle = "rgba(255,240,205,.22)"; ctx.lineWidth = 1.4;
    ctx.setLineDash([3, 4]);
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = "rgba(255,215,150,.75)"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(cx, cy, R, a - Math.min(2.2, p * 6), a); ctx.stroke();
    ctx.restore();
    finger(ctx, cx + Math.cos(a) * R, cy + Math.sin(a) * R, r, 1, p > 0.86 ? 0.5 : 0);
    if (p > 0.86) ripple(ctx, cx + Math.cos(a) * R, cy + Math.sin(a) * R, (p - 0.86) / 0.14);
  } else if (kind === "hold") {
    const fill = Math.min(1, p / 0.8);
    ctx.save();
    ctx.strokeStyle = "rgba(255,240,205,.25)"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(cx, cy, r + 12, 0, TAU); ctx.stroke();
    ctx.strokeStyle = "rgba(255,214,140,.95)"; ctx.lineWidth = 3; ctx.lineCap = "round";
    ctx.beginPath(); ctx.arc(cx, cy, r + 12, -Math.PI / 2, -Math.PI / 2 + fill * TAU); ctx.stroke();
    ctx.restore();
    finger(ctx, cx, cy, r, 1, 0.35 + Math.sin(t * 6) * 0.12);
  } else if (kind === "tap" || kind === "taprow") {
    const spots = kind === "taprow"
      ? [[w * 0.22, h * 0.55], [w * 0.5, h * 0.38], [w * 0.78, h * 0.58]]
      : [[cx, cy]];
    const seg = 1 / spots.length;
    const i = Math.min(spots.length - 1, Math.floor(p / seg));
    const local = (p - i * seg) / seg;
    for (let k = 0; k < spots.length; k++) {
      const [sx, sy] = spots[k];
      const lit = k === i ? 1 : (k < i ? 0.35 : 0.18);
      ctx.save();
      ctx.fillStyle = `rgba(255,224,160,${0.18 + lit * 0.4})`;
      ctx.beginPath(); ctx.arc(sx, sy, r * 0.9, 0, TAU); ctx.fill();
      ctx.restore();
      if (k === i) ripple(ctx, sx, sy, Math.min(1, local * 2));
    }
    const [sx, sy] = spots[i];
    const press = local < 0.35 ? 1 : 0.2;
    finger(ctx, sx, sy - (local < 0.35 ? 1 : 0) * 2, r, 1, press);
  } else if (kind === "jump" || kind === "duck" || kind === "jumpduck") {
    /* `jumpduck` teaches both halves of the same fight: leap over the low one,
       then drop under the high one. One loop per throw. */
    const up = kind === "jump" || (kind === "jumpduck" && p < 0.5);
    const pp = kind === "jumpduck" ? (p % 0.5) * 2 : p;
    /* a spear crossing at ankle height (jump over) or head height (duck under) */
    const sx = w * (0.06 + pp * 0.88);
    const spearY = up ? h * 0.74 : h * 0.40;
    ctx.save();
    ctx.strokeStyle = "rgba(214,196,160,.75)"; ctx.lineWidth = 3; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(sx - 12, spearY); ctx.lineTo(sx + 12, spearY); ctx.stroke();
    ctx.fillStyle = "rgba(228,232,232,.9)";
    ctx.beginPath(); ctx.moveTo(sx - 12, spearY - 3); ctx.lineTo(sx - 18, spearY); ctx.lineTo(sx - 12, spearY + 3); ctx.closePath(); ctx.fill();
    ctx.restore();
    const mid = pp > 0.2 && pp < 0.75;
    const k = mid ? Math.sin(((pp - 0.2) / 0.55) * Math.PI) : 0;
    const fy = up ? h * 0.62 - k * h * 0.3 : h * 0.56 + k * h * 0.16;
    const headY = up ? h * 0.74 : h * 0.40;
    /* the body that ducks or leaps, drawn as a simple lit figure */
    ctx.save();
    ctx.globalAlpha = 0.9;
    ctx.strokeStyle = "rgba(244,231,203,.85)"; ctx.lineWidth = 3; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(cx, fy - 1); ctx.lineTo(cx, fy + 12); ctx.stroke();
    ctx.fillStyle = "rgba(244,231,203,.95)";
    ctx.beginPath(); ctx.arc(cx, fy - 7, 4.4, 0, TAU); ctx.fill();
    ctx.restore();
    if (up) {
      if (pp < 0.22) finger(ctx, cx, h * 0.78, r, 1, 0.9);
      if (pp < 0.3) ripple(ctx, cx, h * 0.78, pp / 0.3);
      arrow(ctx, cx + 6, h * 0.78, cx + 6, h * 0.62, 0.6);
    } else {
      const dx = cx + 16;
      if (pp < 0.3) {
        finger(ctx, dx, h * 0.5 - k * h * 0.16, r, 1, 0.6);
      } else finger(ctx, dx, h * 0.62, r, 1, 0.4);
      arrow(ctx, dx, h * 0.52, dx, h * 0.68, 0.55);
    }
    void headY;
  } else if (kind === "drag") {
    const x = w * (0.12 + Math.min(1, p / 0.8) * 0.76);
    arrow(ctx, w * 0.14, cy + 12, w * 0.86, cy + 12, 0.5);
    finger(ctx, x, cy, r, 1, p < 0.85 ? 0.5 : 0);
    if (p > 0.85) ripple(ctx, x, cy, (p - 0.85) / 0.15);
  } else if (kind === "pull") {
    const y = h * (0.14 + Math.min(1, p / 0.8) * 0.66);
    ctx.save();
    ctx.strokeStyle = "rgba(214,196,160,.5)"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(cx, h * 0.1); ctx.lineTo(cx, h * 0.94); ctx.stroke();
    ctx.restore();
    finger(ctx, cx, y, r, 1, 0.6);
    arrow(ctx, cx + 14, h * 0.2, cx + 14, h * 0.62, 0.55);
  } else if (kind === "lift") {
    const y = h * (0.84 - Math.min(1, p / 0.8) * 0.66);
    ctx.save();
    ctx.strokeStyle = "rgba(214,196,160,.45)"; ctx.lineWidth = 2;
    ctx.setLineDash([3, 4]);
    ctx.beginPath(); ctx.moveTo(cx, h * 0.92); ctx.lineTo(cx, h * 0.1); ctx.stroke();
    ctx.restore();
    finger(ctx, cx, y, r, 1, 0.55);
    arrow(ctx, cx + 14, h * 0.74, cx + 14, h * 0.24, 0.55);
  } else if (kind === "path") {
    const q = Math.min(1, p / 0.85);
    const x = w * (0.14 + q * 0.72);
    const y = h * (0.62 - Math.sin(q * Math.PI) * 0.26);
    ctx.save();
    ctx.strokeStyle = "rgba(255,240,205,.3)"; ctx.lineWidth = 1.6; ctx.setLineDash([3, 4]);
    ctx.beginPath();
    for (let i = 0; i <= 24; i++) {
      const qq = i / 24;
      const px = w * (0.14 + qq * 0.72), py = h * (0.62 - Math.sin(qq * Math.PI) * 0.26);
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.restore();
    finger(ctx, x, y, r, 1, 0.35);
  } else if (kind === "aim") {
    const k = Math.min(1, p / 0.5);
    const bx = cx - w * 0.22, by = h * 0.76;
    const tx = bx + k * w * 0.12, ty = by - k * h * 0.3;
    ctx.save();
    ctx.strokeStyle = "rgba(160,210,240,.35)"; ctx.lineWidth = 1.4; ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.moveTo(tx, ty); ctx.quadraticCurveTo(tx + w * 0.08, ty - h * 0.3, tx + w * 0.3, ty - h * 0.16); ctx.stroke();
    ctx.restore();
    finger(ctx, tx, ty, r, 1, p > 0.45 ? 0.7 : 0.25);
    if (p > 0.5) ripple(ctx, tx, ty, (p - 0.5) / 0.5, "170,220,250");
  }
}

function tick(ts) {
  if (!t0) t0 = ts;
  const t = (ts - t0) / 1000;
  for (const item of mounted) {
    const { cv, kind } = item;
    if (!cv.isConnected) continue;
    const { w, h, d } = fit(cv);
    const ctx = cv.getContext("2d");
    if (!ctx) continue;
    ctx.setTransform(d, 0, 0, d, 0, 0);
    ctx.clearRect(0, 0, w, h);
    paint(ctx, kind, w, h, (t * 0.62 + item.offset) % 1, t);
  }
  raf = requestAnimationFrame(tick);
}

/** Start every demo inside `scope`. Safe to call after each render. */
export function mountDemos(scope) {
  stopDemos();
  const nodes = (scope || (typeof document !== "undefined" ? document : null))
    ?.querySelectorAll?.("canvas[data-demo]") || [];
  let i = 0;
  for (const cv of nodes) {
    const kind = KINDS.has(cv.dataset.demo) ? cv.dataset.demo : "tap";
    mounted.push({ cv, kind, offset: (i++ % 3) * 0.12 });
  }
  if (mounted.length && typeof requestAnimationFrame === "function" && !raf) {
    raf = requestAnimationFrame(tick);
  }
  return mounted.length;
}

export function stopDemos() {
  mounted = [];
  if (raf && typeof cancelAnimationFrame === "function") cancelAnimationFrame(raf);
  raf = null; t0 = 0;
}

/** Which animation belongs with a scene's gesture. */
export function demoFor(kind) {
  const map = {
    circle: "circle", hold: "hold", tap: "tap", jump: "jump", duck: "duck",
    drag: "drag", pull: "pull", lift: "lift", path: "path", aim: "aim", taprow: "taprow"
  };
  return map[kind] || "tap";
}

export const DEMO_KINDS = KINDS;
