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
  "path", "aim", "taprow",
  /* compound gestures, for the chapter's own game */
  "walktap", "catch", "twosides", "steer", "aimrelease"
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
  /* a warm glow first, so the fingertip is visible on any painting */
  const halo = ctx.createRadialGradient(x, y, 1, x, y, r * 2.6);
  halo.addColorStop(0, "rgba(255,236,190,.45)");
  halo.addColorStop(1, "rgba(255,200,110,0)");
  ctx.fillStyle = halo;
  ctx.beginPath(); ctx.arc(x, y, r * 2.6, 0, TAU); ctx.fill();
  ctx.fillStyle = "rgba(0,0,0,.38)";
  ctx.beginPath(); ctx.ellipse(x, y + r * 0.6, r * 0.95, r * 0.5, 0, 0, TAU); ctx.fill();
  const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.35, r * 0.15, x, y, r);
  g.addColorStop(0, "#fffaf0");
  g.addColorStop(0.5, "#f6dfae");
  g.addColorStop(1, "#c9962f");
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
  ctx.strokeStyle = `rgba(90,64,24,.55)`;
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke();
  ctx.strokeStyle = `rgba(255,246,222,${0.45 + press * 0.5})`;
  ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.arc(x, y, r + 3 + press * 11, 0, TAU); ctx.stroke();
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
  const r = Math.max(6.5, u * 0.1);

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
    /* `jumpduck` teaches both halves of the same fight: leap the ground throw,
       then drop under the one aimed at the chest. One throw per half cycle. */
    const up = kind === "jump" || (kind === "jumpduck" && p < 0.5);
    const pp = kind === "jumpduck" ? (p % 0.5) * 2 : p;
    const ground = h * 0.86;
    const spearY = up ? ground - 10 : ground - h * 0.52;
    const sx = -14 + pp * (w + 28);

    /* the spear on its way across, with a soft trail */
    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.strokeStyle = "rgba(226,232,232,.9)"; ctx.lineWidth = 2; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(sx - 40, spearY); ctx.lineTo(sx - 14, spearY); ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = "#cfd6d5"; ctx.lineWidth = 3.4;
    ctx.beginPath(); ctx.moveTo(sx - 16, spearY); ctx.lineTo(sx + 14, spearY); ctx.stroke();
    ctx.fillStyle = "#eef2f2";
    ctx.beginPath(); ctx.moveTo(sx - 16, spearY - 4); ctx.lineTo(sx - 25, spearY); ctx.lineTo(sx - 16, spearY + 4); ctx.closePath(); ctx.fill();
    ctx.restore();

    /* the body: standing, leaping over, or crouched under */
    const mid = pp > 0.18 && pp < 0.78;
    const k = mid ? Math.sin(((pp - 0.18) / 0.6) * Math.PI) : 0;
    const fy = up ? ground - k * h * 0.42 : ground;
    const crouch = up ? 0 : k;
    const body = 13 * (1 - crouch * 0.45);
    const headR = 4.6;
    ctx.save();
    ctx.strokeStyle = "rgba(248,238,214,.95)"; ctx.lineWidth = 3.6; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(cx, fy - body); ctx.lineTo(cx, fy); ctx.stroke();
    /* arms: up when leaping, tucked in when ducking */
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    if (up) {
      ctx.moveTo(cx - 1, fy - body * 0.75); ctx.lineTo(cx - 9, fy - body * 0.75 - 7 - k * 4);
      ctx.moveTo(cx + 1, fy - body * 0.75); ctx.lineTo(cx + 9, fy - body * 0.75 - 7 - k * 4);
    } else {
      ctx.moveTo(cx - 1, fy - body * 0.7); ctx.lineTo(cx - 7, fy - body * 0.35);
      ctx.moveTo(cx + 1, fy - body * 0.7); ctx.lineTo(cx + 7, fy - body * 0.35);
    }
    ctx.stroke();
    ctx.fillStyle = "rgba(248,238,214,.98)";
    ctx.beginPath(); ctx.arc(cx, fy - body - headR + (up ? 0 : 2), headR, 0, TAU); ctx.fill();
    ctx.restore();

    /* the hand that makes it happen */
    const hx = cx + 22, hy = up ? ground - 2 : ground - h * 0.5;
    if (pp < 0.34) ripple(ctx, hx, hy, pp / 0.34);
    finger(ctx, hx, hy, r * 0.92, 0.95, pp < 0.34 ? 0.9 : 0.25);
    arrow(ctx, hx + 13, hy, hx + 13, hy + (up ? -16 : 12), 0.7);
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
  } else if (kind === "walktap") {
    /* walk along the street, stop in front of the door, then call out */
    const door = { x: w * 0.72, y: cy };
    ctx.save();
    ctx.strokeStyle = "rgba(226,206,164,.6)"; ctx.lineWidth = 2;
    ctx.strokeRect(door.x - 11, door.y - 20, 22, 40);
    ctx.fillStyle = "rgba(255,232,180,.7)";
    ctx.beginPath(); ctx.arc(door.x, door.y - 6, 2.4, 0, TAU); ctx.fill();
    ctx.restore();
    if (p < 0.62) {
      const q = p / 0.62;
      ctx.save();
      ctx.strokeStyle = "rgba(226,206,164,.45)"; ctx.lineWidth = 2; ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.moveTo(w * 0.14, cy + 18); ctx.lineTo(door.x - 22, cy + 18); ctx.stroke();
      ctx.restore();
      const x = w * 0.14 + q * (door.x - 22 - w * 0.14);
      finger(ctx, x, cy + 18, r * 0.92, 1, 0.45);
    } else {
      const q = (p - 0.62) / 0.38;
      const vx = door.x - 24, vy = door.y - 4;
      if (q < 0.22) ripple(ctx, vx, vy, q / 0.22);
      finger(ctx, vx, vy + 14, r * 0.9, 1, q < 0.3 ? 0.95 : 0.18);
      /* three sound waves leaving the caller */
      ctx.save();
      for (let i = 0; i < 3; i++) {
        const t2 = Math.min(1, Math.max(0, q * 1.6 - i * 0.22));
        if (t2 <= 0) continue;
        ctx.globalAlpha = 0.75 * (1 - t2);
        ctx.strokeStyle = "rgba(255,240,205,.95)"; ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.arc(vx, vy, 8 + t2 * 26, -1.0, 1.0); ctx.stroke();
      }
      ctx.restore();
    }
  } else if (kind === "catch") {
    /* stand under the sheaf and take it as it falls */
    const fall = Math.min(1, (p % 0.6) / 0.6);
    const gy = h * (0.14 + fall * 0.6);
    ctx.save();
    ctx.fillStyle = "rgba(226,196,120,.95)";
    ctx.beginPath(); ctx.ellipse(cx, gy, 7, 10, 0.5, 0, TAU); ctx.fill();
    ctx.strokeStyle = "rgba(200,166,90,.8)"; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(cx, gy - 8); ctx.lineTo(cx, gy + 8); ctx.stroke();
    ctx.restore();
    const bucketY = h * 0.8;
    const near = gy > bucketY - 16;
    if (near && p % 0.6 > 0.5) ripple(ctx, cx, bucketY, ((p % 0.6) - 0.5) / 0.1, "230,200,140");
    finger(ctx, cx, bucketY, r, 1, near ? 0.85 : 0.3);
    arrow(ctx, cx - 26, h * 0.3, cx - 26, bucketY - 6, 0.35);
  } else if (kind === "twosides") {
    /* hand over hand up a tree: left side, then right side, then up */
    const half = (p % 1) < 0.5;
    const q = ((p % 0.5) / 0.5);
    const x = half ? w * 0.3 : w * 0.7;
    const y = h * (0.86 - q * 0.66);
    ctx.save();
    ctx.strokeStyle = "rgba(214,196,160,.35)"; ctx.lineWidth = 2; ctx.setLineDash([3, 4]);
    ctx.beginPath(); ctx.moveTo(w * 0.3, h * 0.92); ctx.lineTo(w * 0.3, h * 0.1); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(w * 0.7, h * 0.92); ctx.lineTo(w * 0.7, h * 0.1); ctx.stroke();
    ctx.restore();
    /* the hand that is not moving waits where it stopped */
    if (!half) finger(ctx, w * 0.3, h * 0.24, r * 0.8, 0.35, 0);
    if (half) finger(ctx, w * 0.7, h * 0.24, r * 0.8, 0.35, 0);
    finger(ctx, x, y, r, 1, 0.55);
    arrow(ctx, x + 14, h * 0.8, x + 14, h * 0.2, 0.45);
  } else if (kind === "steer") {
    /* hold the tiller and turn it, then bail: drag one way, then tap the bucket */
    if (p < 0.62) {
      const q = (p / 0.62) * TAU * 1.1;
      const R = Math.min(w * 0.2, h * 0.26);
      ctx.save();
      /* the wheel rim, drawn bright enough to read on a dark card */
      ctx.strokeStyle = "rgba(226,206,164,.85)"; ctx.lineWidth = 3.2;
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.stroke();
      ctx.strokeStyle = "rgba(226,206,164,.5)"; ctx.lineWidth = 2;
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI;
        ctx.beginPath();
        ctx.moveTo(cx - Math.cos(a) * R, cy - Math.sin(a) * R);
        ctx.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R);
        ctx.stroke();
      }
      ctx.fillStyle = "rgba(255,232,180,.9)";
      ctx.beginPath(); ctx.arc(cx, cy, 3, 0, TAU); ctx.fill();
      ctx.restore();
      const a = -Math.PI / 2 + q * 0.55;
      finger(ctx, cx + Math.cos(a) * R, cy + Math.sin(a) * R, r, 1, 0.55);
    } else {
      const q = (p - 0.62) / 0.38;
      const bx = cx + w * 0.3, by = cy + h * 0.16;
      ctx.save();
      /* a pail going over the side */
      ctx.strokeStyle = "rgba(178,214,238,.9)"; ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(bx - 9, by - 8); ctx.lineTo(bx + 9, by - 8);
      ctx.lineTo(bx + 6, by + 7); ctx.lineTo(bx - 6, by + 7); ctx.closePath(); ctx.stroke();
      ctx.beginPath(); ctx.arc(bx, by - 8, 9, Math.PI, 0); ctx.stroke();
      ctx.globalAlpha = 0.5 + Math.sin(q * 20) * 0.3;
      ctx.strokeStyle = "rgba(170,220,250,.9)"; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(bx, by + 8); ctx.lineTo(bx, by + 16); ctx.stroke();
      ctx.restore();
      if (q < 0.3) ripple(ctx, bx, by, q / 0.3, "170,220,250");
      finger(ctx, bx, by, r * 0.9, 1, q < 0.35 ? 0.95 : 0.2);
    }
  } else if (kind === "aimrelease") {
    /* pull the sling back, then let go: the stone flies and lands */
    if (p < 0.55) {
      const q = p / 0.55;
      const bx = cx + w * 0.1, by = h * 0.72;
      ctx.save();
      ctx.strokeStyle = "rgba(226,206,164,.8)"; ctx.lineWidth = 2.4; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(bx - 6, by - 6); ctx.lineTo(bx + 6, by - 2); ctx.stroke();
      ctx.restore();
      const fx = bx + q * w * 0.07, fy = by + q * h * 0.2;
      finger(ctx, fx, fy, r, 1, 0.6);
      arrow(ctx, bx, by + 6, bx + w * 0.08, by + h * 0.24, 0.5);
    } else {
      const q = (p - 0.55) / 0.45;
      const bx = cx + w * 0.17, by = h * 0.92;
      const tx = w * 0.2, ty = h * 0.3;
      ctx.save();
      /* the arc of the stone */
      ctx.strokeStyle = "rgba(170,220,250,.5)"; ctx.lineWidth = 1.6; ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.moveTo(bx, by); ctx.quadraticCurveTo((bx + tx) / 2, ty - h * 0.1, tx, ty); ctx.stroke();
      ctx.restore();
      /* the giant's mark where it lands */
      ctx.save();
      ctx.strokeStyle = q > 0.85 ? "rgba(255,240,190,.95)" : "rgba(226,206,164,.5)";
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(tx, ty, 7, 0, TAU); ctx.stroke();
      ctx.restore();
      const sx = bx + (tx - bx) * q;
      const sy = by + (ty - by) * q - Math.sin(q * Math.PI) * h * 0.12;
      ctx.fillStyle = "rgba(255,246,214,.98)";
      ctx.beginPath(); ctx.arc(sx, sy, 3.6, 0, TAU); ctx.fill();
      finger(ctx, bx - q * w * 0.03, by, r * 0.9, 1, q < 0.16 ? 0.9 : 0.1);
      if (q < 0.16) ripple(ctx, bx, by, q / 0.16);
    }
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
