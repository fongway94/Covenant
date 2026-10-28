/* Pure canvas visual kit. No imports from the game modules, so it can be
   safely used by both the engine and the act/stage layer. */

const TAU = Math.PI * 2;
const hash = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

/* ------------------------------------------------------------ foreground
   Dark silhouette layers are painted IN FRONT of the sprites. They turn a
   flat backdrop into a scene with real depth (near / middle / far planes). */
export function drawForeground(c, ctx, kind = "rocks", alpha = 1) {
  if (!kind) return;
  const { w, h, t } = c;
  const sway = Math.sin(t * 0.55) * 3;
  ctx.save();
  ctx.globalAlpha = alpha;
  const dark = "#070e13";
  const edge = "rgba(247,221,165,.09)";

  if (kind === "rocks" || kind === "dunes" || kind === "waves") {
    const layers = kind === "waves" ? 3 : 2;
    for (let L = 0; L < layers; L++) {
      const base = h * (0.87 + L * 0.045);
      ctx.fillStyle = L === 0 ? "rgba(6,13,18,.82)" : "rgba(4,9,13,.94)";
      ctx.beginPath(); ctx.moveTo(0, h);
      ctx.lineTo(0, base);
      const seg = kind === "waves" ? 16 : 40;
      for (let x = 0; x <= w + seg; x += seg) {
        const n = hash(x * 0.07 + L * 9);
        let y;
        if (kind === "waves") y = base + Math.sin(x * 0.035 + t * (1.5 + L * 0.4) + L) * (7 + L * 3);
        else if (kind === "dunes") y = base - Math.sin(x * 0.012 + L * 2.1) * (16 + n * 12);
        else y = base - n * (14 + L * 12);
        ctx.lineTo(x, y);
      }
      ctx.lineTo(w, h); ctx.closePath(); ctx.fill();
    }
    // two framing boulders
    if (kind !== "waves") {
      for (const [bx, br] of [[w * 0.06, 46], [w * 0.95, 60]]) {
        const g = ctx.createRadialGradient(bx - br * 0.3, h - br * 0.5, 2, bx, h - br * 0.4, br * 1.5);
        g.addColorStop(0, "#12212a"); g.addColorStop(1, dark);
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.ellipse(bx, h + 8, br * 1.35, br, 0.1, 0, TAU); ctx.fill();
        ctx.strokeStyle = edge; ctx.lineWidth = 1.2; ctx.stroke();
      }
    }
  } else if (kind === "reeds" || kind === "stalks") {
    const n = 26;
    const barley = kind === "stalks";
    /* A dark band under the stems first: reeds drawn straight onto a mid-tone
       road read as scratches, because there is no ground shadow beneath them. */
    const bed = ctx.createLinearGradient(0, h * 0.78, 0, h);
    bed.addColorStop(0, "rgba(6,12,16,0)");
    bed.addColorStop(1, "rgba(6,12,16,.55)");
    ctx.fillStyle = bed; ctx.fillRect(0, h * 0.78, w, h * 0.22);
    for (let i = 0; i < n; i++) {
      const x = (i / n) * w + hash(i) * 16;
      const hgt = (barley ? 52 : 66) + hash(i * 3.3) * 44;
      const lean = (hash(i * 7.1) - 0.5) * 22 + sway * (0.6 + hash(i));
      const base = h + 4;
      // taper: a stem is a filled ribbon, not a constant-width line
      const bw = 2.4 + hash(i * 5) * 2.2;
      ctx.fillStyle = i % 3 ? "#08121a" : "#0b1a21";
      ctx.beginPath();
      ctx.moveTo(x - bw * 0.5, base);
      ctx.quadraticCurveTo(x + lean * 0.35 - bw * 0.35, base - hgt * 0.6, x + lean - 0.6, base - hgt);
      ctx.quadraticCurveTo(x + lean * 0.35 + bw * 0.35, base - hgt * 0.6, x + bw * 0.5, base);
      ctx.closePath(); ctx.fill();
      // one long blade per stem, so the clump has leaves and not just spikes
      ctx.beginPath();
      ctx.moveTo(x, base - hgt * 0.45);
      ctx.quadraticCurveTo(x - 10 + lean * 0.3, base - hgt * 0.62, x - 16 + lean * 0.5, base - hgt * 0.85);
      ctx.quadraticCurveTo(x - 8 + lean * 0.3, base - hgt * 0.6, x + 1, base - hgt * 0.45);
      ctx.closePath(); ctx.fill();
      if (barley) {
        ctx.fillStyle = "rgba(200,166,96,.22)";
        for (let j = 0; j < 4; j++) {
          const yy = base - hgt + j * 7;
          ctx.beginPath(); ctx.ellipse(x + lean - 3, yy, 2, 3.4, -0.4, 0, TAU); ctx.fill();
          ctx.beginPath(); ctx.ellipse(x + lean + 3, yy, 2, 3.4, 0.4, 0, TAU); ctx.fill();
        }
      }
    }
  } else if (kind === "branches" || kind === "arch") {
    // overhanging branch / stone arch at the top
    ctx.fillStyle = "rgba(5,11,15,.9)";
    ctx.beginPath();
    ctx.moveTo(0, 0); ctx.lineTo(w, 0); ctx.lineTo(w, 26 + Math.sin(t * 0.3) * 2);
    ctx.quadraticCurveTo(w * 0.66, 52, w * 0.42, 30);
    ctx.quadraticCurveTo(w * 0.2, 16, 0, 40);
    ctx.closePath(); ctx.fill();
    if (kind === "branches") {
      for (let i = 0; i < 11; i++) {
        const x = 12 + i * (w / 11) + hash(i) * 18;
        ctx.fillStyle = i % 2 ? "rgba(24,48,40,.85)" : "rgba(32,58,44,.8)";
        ctx.save(); ctx.translate(x, 28 + hash(i * 4) * 18); ctx.rotate(hash(i * 9) * 1.4 - 0.7 + sway * 0.01);
        ctx.beginPath(); ctx.ellipse(0, 0, 26, 12, 0, 0, TAU); ctx.fill(); ctx.restore();
      }
    } else {
      // stone pillars framing both sides
      for (const [px, pw] of [[0, 22], [w - 22, 22]]) {
        const g = ctx.createLinearGradient(px, 0, px + pw, 0);
        g.addColorStop(0, "#0b151b"); g.addColorStop(0.5, "#152630"); g.addColorStop(1, "#070e13");
        ctx.fillStyle = g; ctx.fillRect(px, h * 0.18, pw, h * 0.82);
        ctx.strokeStyle = "rgba(247,221,165,.08)"; ctx.lineWidth = 1;
        for (let y = h * 0.22; y < h; y += 34) { ctx.beginPath(); ctx.moveTo(px, y); ctx.lineTo(px + pw, y); ctx.stroke(); }
      }
    }
  } else if (kind === "crowd") {
    for (let i = 0; i < 14; i++) {
      const x = (i / 14) * w + hash(i) * 14;
      const r = 12 + hash(i * 2.2) * 9;
      const y = h - 6 + hash(i * 8) * 12 + Math.sin(t * 1.3 + i) * 1.5;
      ctx.fillStyle = i % 2 ? "#080f15" : "#0a1319";
      ctx.beginPath(); ctx.arc(x, y - r, r, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.moveTo(x - r, y + r); ctx.lineTo(x - r * 0.7, h); ctx.lineTo(x + r * 0.7, h); ctx.lineTo(x + r, y + r); ctx.fill();
    }
  }
  ctx.restore();
}

/* --------------------------------------------------------------- cinematic
   Letterbox, film grain, gold hairlines and corner ornaments. Applied as the
   very last pass of every action scene so all 10 chapters share one look. */
export function drawCinematic(c, ctx, opts = {}) {
  const { w, h, t } = c;
  ctx.save();
  // film grain — changes in 1/10s buckets so it reads as grain, not noise
  const bucket = Math.floor(t * 10);
  for (let i = 0; i < 64; i++) {
    const x = hash(i * 3.1 + bucket * 0.77) * w;
    const y = hash(i * 7.7 + bucket * 1.31) * h;
    ctx.fillStyle = i % 3 ? "rgba(255,246,222,.035)" : "rgba(0,0,0,.05)";
    ctx.fillRect(x, y, 1.2, 1.2);
  }
  // letterbox
  const lg = ctx.createLinearGradient(0, 0, 0, 30);
  lg.addColorStop(0, "rgba(3,7,11,.82)"); lg.addColorStop(1, "rgba(3,7,11,0)");
  ctx.fillStyle = lg; ctx.fillRect(0, 0, w, 30);
  const lg2 = ctx.createLinearGradient(0, h - 34, 0, h);
  lg2.addColorStop(0, "rgba(3,7,11,0)"); lg2.addColorStop(1, "rgba(3,7,11,.86)");
  ctx.fillStyle = lg2; ctx.fillRect(0, h - 34, w, 34);
  // gold hairlines + corner ornaments
  ctx.strokeStyle = "rgba(231,183,91,.13)"; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(10, 27.5); ctx.lineTo(w - 10, 27.5); ctx.moveTo(10, h - 27.5); ctx.lineTo(w - 10, h - 27.5); ctx.stroke();
  ctx.strokeStyle = "rgba(231,183,91,.3)"; ctx.lineWidth = 1.4;
  const L = 13;
  for (const [x, y, sx, sy] of [[12, 34, 1, 1], [w - 12, 34, -1, 1], [12, h - 34, 1, -1], [w - 12, h - 34, -1, -1]]) {
    ctx.beginPath(); ctx.moveTo(x + sx * L, y); ctx.lineTo(x, y); ctx.lineTo(x, y + sy * L); ctx.stroke();
  }
  if (opts.flash > 0) {
    ctx.fillStyle = `rgba(255,241,205,${Math.min(0.4, opts.flash * 0.35)})`;
    ctx.fillRect(0, 0, w, h);
  }
  ctx.restore();
}

/* A small "ACT 1 / 3 — SEARCH THE BROOK" badge under the HUD. */
export function drawStageBadge(c, ctx, label, index, count) {
  if (!label) return;
  const { w } = c;
  const y = 138;
  ctx.save();
  ctx.font = `600 10px ${c.font}`;
  const text = `ACT ${index + 1}/${count}  ·  ${label}`;
  const tw = ctx.measureText(text).width;
  const bw = Math.min(w - 32, tw + 34);
  ctx.fillStyle = "rgba(7,15,21,.78)";
  roundRectLocal(ctx, (w - bw) / 2, y, bw, 24, 12); ctx.fill();
  ctx.strokeStyle = "rgba(231,183,91,.3)"; ctx.lineWidth = 1; ctx.stroke();
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillStyle = "#f2dba6"; ctx.fillText(text, w / 2, y + 12);
  // act pips
  for (let i = 0; i < count; i++) {
    ctx.beginPath(); ctx.arc(w / 2 + (i - (count - 1) / 2) * 12, y + 32, i <= index ? 2.6 : 1.8, 0, TAU);
    ctx.fillStyle = i < index ? "#4fb8a8" : i === index ? "#e7b75b" : "rgba(255,255,255,.2)";
    ctx.fill();
  }
  ctx.restore();
}

function roundRectLocal(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}

/* Soft volumetric shafts from the upper corner. One shared pass — every
   action scene gets depth for free with no extra assets or per-game code. */
export function lightRays(c, ctx, strength = 1) {
  const { w, h, t } = c;
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  const g = ctx.createLinearGradient(w * 0.86, 0, w * 0.1, h * 0.92);
  g.addColorStop(0, `rgba(255,216,154,${0.13 * strength})`);
  g.addColorStop(0.55, `rgba(255,196,120,${0.035 * strength})`);
  g.addColorStop(1, "rgba(255,190,110,0)");
  ctx.fillStyle = g;
  const drift = Math.sin(t * 0.16) * w * 0.03;
  for (let i = 0; i < 3; i++) {
    const x0 = w * (0.68 + i * 0.11) + drift;
    const spread = w * (0.07 + i * 0.025);
    ctx.beginPath();
    ctx.moveTo(x0, -10);
    ctx.lineTo(x0 + spread, -10);
    ctx.lineTo(x0 - w * 0.52 + spread * 1.5, h);
    ctx.lineTo(x0 - w * 0.52 - spread, h);
    ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}

/* A faint breathing vignette, strongest around the edges. */
export function softVignette(c, ctx, alpha = 0.34) {
  const { w, h, t } = c;
  ctx.save();
  const g = ctx.createRadialGradient(w / 2, h * 0.46, h * 0.18, w / 2, h * 0.5, h * 0.78);
  g.addColorStop(0, "rgba(3,8,12,0)");
  g.addColorStop(1, `rgba(3,8,12,${alpha + Math.sin(t * 0.5) * 0.02})`);
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

/* Golden-hour grade applied over the backdrop: warm from above, cool below. */
export function goldenHour(c, ctx) {
  const { w, h } = c;
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  const g = ctx.createLinearGradient(0, 0, w * 0.6, h);
  g.addColorStop(0, "rgba(255,196,110,.14)");
  g.addColorStop(0.5, "rgba(255,170,90,.04)");
  g.addColorStop(1, "rgba(20,60,90,.12)");
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  ctx.restore();
}
