/* Multi-act action scenes.
   Each chapter used to be ONE mini-game. Now every action scene is a short
   set piece: one or two "preparation" acts (search / rhythm / trace / charge /
   memory / dodge) followed by the chapter's original climax mechanic.

   Acts never block the story: a prelude that times out still advances to the
   climax, just with a smaller score. Only the climax decides the bonus. */

import { tx } from "../core/i18n.js";
import { clamp, rnd, dist, drawBackdrop, drawWeather, shadow, star, roundRect,
  pilgrim, giant, npc } from "./scene.js";
import { drawForeground, drawCinematic, drawStageBadge, goldenHour } from "./visual.js";

const TAU = Math.PI * 2;
const T = (pair) => tx(pair[0], pair[1]);
const hash = (n) => { const x = Math.sin(n * 91.7 + 13.3) * 43758.5453; return x - Math.floor(x); };

/* ---------------------------------------------------------------- shared UI */

function stageBg(c, ctx, cfg) {
  drawBackdrop(c, ctx, cfg.art, { top: "#172934", bottom: "#0b141c", alpha: 0.46, weather: cfg.weather });
  goldenHour(c, ctx);
}

/** Parchment-style briefing card + timer bar + goal pips shared by all acts. */
function stageChrome(c, ctx, cfg, s) {
  const { w, h } = c;
  const y = 176, hh = 92;
  ctx.save();
  ctx.fillStyle = "rgba(7,15,21,.78)";
  roundRect(ctx, 14, y, w - 28, hh, 12); ctx.fill();
  ctx.strokeStyle = "rgba(231,183,91,.2)"; ctx.lineWidth = 1; ctx.stroke();

  ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#e7b75b"; ctx.font = `700 9px ${c.font}`;
  ctx.fillText(tx("PREPARE", "准备"), 26, y + 18);
  ctx.fillStyle = "#f4e7cb"; ctx.font = `600 15px ${c.font}`;
  ctx.fillText(T(cfg.title), 26, y + 37);
  ctx.fillStyle = "rgba(244,231,203,.62)"; ctx.font = `11px ${c.font}`;
  wrapText(ctx, T(cfg.prompt), 26, y + 53, w - 52, 13, 2);

  // timer bar
  const ratio = clamp((s.left ?? cfg.seconds) / cfg.seconds, 0, 1);
  ctx.fillStyle = "rgba(255,255,255,.1)"; roundRect(ctx, 26, y + hh - 14, w - 52, 5, 2.5); ctx.fill();
  ctx.fillStyle = ratio > 0.3 ? "#d6b46c" : "#d65c42";
  roundRect(ctx, 26, y + hh - 14, (w - 52) * ratio, 5, 2.5); ctx.fill();

  // goal pips on the right of the title
  if (s.goalText) {
    ctx.textAlign = "right"; ctx.fillStyle = "#f2dba6"; ctx.font = `700 13px ${c.font}`;
    ctx.fillText(s.goalText, w - 26, y + 37);
  }
  // hint line below the card
  ctx.textAlign = "center"; ctx.fillStyle = "rgba(244,231,203,.5)"; ctx.font = `10px ${c.font}`;
  ctx.fillText(T(cfg.hint), w / 2, y + hh + 17);

  if (s.flash > 0) {
    ctx.fillStyle = `rgba(214,92,66,${s.flash * 0.18})`;
    ctx.fillRect(0, 0, w, h);
  }
  ctx.restore();
}

function wrapText(ctx, text, x, y, maxW, lh, maxLines) {
  const words = String(text).split(/(\s+)/);
  let line = "", lines = [];
  for (const wd of words) {
    if (ctx.measureText(line + wd).width > maxW && line) { lines.push(line.trim()); line = ""; }
    line += wd;
  }
  if (line.trim()) lines.push(line.trim());
  // Chinese has no spaces — hard-wrap when needed.
  if (lines.length === 1 && lines[0].length > 34) {
    const all = lines[0]; lines = [];
    for (let i = 0; i < all.length; i += 24) lines.push(all.slice(i, i + 24));
  }
  for (let i = 0; i < Math.min(maxLines, lines.length); i++) ctx.fillText(lines[i], x, y + i * lh);
}

function tick(c, s, cfg, dt) {
  s.t += dt;
  s.left -= dt;
  s.flash = Math.max(0, (s.flash || 0) - dt * 2.2);
  if (s.left <= 0 && !s.finished) {
    s.finished = true;
    if (cfg.carry) c.shared[cfg.carry] = Math.max(1, s.found || 0);
    c.float(c.w / 2, c.h * 0.62, tx("Time! Move on.", "时间到！继续前进。"), "#d6b46c");
    c.end(true, c.score);          // soft success — the story always continues
  }
}
function win(c, s, cfg, bonus) {
  if (s.finished) return;
  s.finished = true;
  if (cfg.carry) c.shared[cfg.carry] = s.found || cfg.goal || cfg.rounds || 3;
  c.addScore(bonus);
  c.spark(c.w / 2, c.h * 0.55, "#f4d79b", 30, 200);
  c.float(c.w / 2, c.h * 0.55 - 20, tx("READY!", "准备好了！"), "#f4d79b");
  c.hit("complete");
  c.end(true, c.score);
}
function penalty(c, s, seconds = 3, msg = "MISS") {
  s.left = Math.max(1, s.left - seconds);
  s.flash = 1; c.bump(7); c.hit("miss");
  c.float(c.w / 2, c.h * 0.6, tx(msg, "失误"), "#e08b78");
}

const FIELD = (c) => ({ top: c.h * 0.47, bottom: c.h * 0.9 });

/* ══════════════════════════════════ ACT TYPE 1 · SIFT (scratch & search) ══ */
/* Drag a lens over silt to uncover hidden items. Decoys cost time.
   This replaces the old "five glowing dots" with a genuine search. */
function siftStage(cfg) {
  return {
    label: () => T(cfg.title),
    init(c) {
      const f = FIELD(c), cols = 12, rows = 9;
      const x0 = c.w * 0.05, y0 = f.top, cw = (c.w * 0.9) / cols, ch = (f.bottom - f.top) / rows;
      const cells = [];
      for (let r = 0; r < rows; r++) for (let q = 0; q < cols; q++) cells.push({ q, r, revealed: false });
      const pool = [...cells.keys()];
      const pick = () => pool.splice(Math.floor(Math.random() * pool.length), 1)[0];
      const items = [];
      for (let i = 0; i < cfg.goal; i++) items.push({ cell: pick(), good: true, got: false });
      for (let i = 0; i < (cfg.decoys || 5); i++) items.push({ cell: pick(), good: false, got: false });
      for (const it of items) {
        const cc = cells[it.cell];
        it.x = x0 + cc.q * cw + cw * 0.5 + rnd(-cw * 0.2, cw * 0.2);
        it.y = y0 + cc.r * ch + ch * 0.5 + rnd(-ch * 0.2, ch * 0.2);
      }
      c.state = { t: 0, left: cfg.seconds, found: 0, cells, items, cols, rows, x0, y0, cw, ch,
        lens: { x: c.w * 0.5, y: (f.top + f.bottom) / 2, r: 54 }, flash: 0, finished: false,
        goalText: () => `${s.found}/${cfg.goal}` };
      const s = c.state;
      c.setHint(T(cfg.hint));
    },
    step(c, dt) {
      const s = c.state; if (s.finished) return;
      tick(c, s, cfg, dt);
      if (s.finished) return;
      const p = c.pointer;
      s.lens.x = p.x || s.lens.x; s.lens.y = p.y || s.lens.y;
      if (p.down || c.keys.has("arrowleft") || c.keys.has("arrowright")) reveal(c, s, s.lens.x, s.lens.y, s.lens.r);
      c.progress = s.found / cfg.goal;
      c.setHint(`${T(cfg.hint)}   ${tx("FOUND", "已找到")} ${s.found}/${cfg.goal}   ${Math.ceil(s.left)}s`);
      if (s.found >= cfg.goal) win(c, s, cfg, cfg.reward || 30);
    },
    draw(c, ctx) {
      const s = c.state; stageBg(c, ctx, cfg);
      // silt / sand / water cells
      for (const cell of s.cells) {
        const x = s.x0 + cell.q * s.cw, y = s.y0 + cell.r * s.ch;
        if (!cell.revealed) {
          const n = hash(cell.q * 3 + cell.r * 17);
          ctx.fillStyle = `rgba(${cfg.siltRgb || "74,60,42"},${0.68 + n * 0.14})`;
          ctx.fillRect(x, y, s.cw + 0.6, s.ch + 0.6);
          ctx.strokeStyle = "rgba(255,236,190,.06)"; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(x + 3, y + s.ch * (0.3 + n * 0.4));
          ctx.quadraticCurveTo(x + s.cw / 2, y + s.ch * (0.2 + n * 0.6), x + s.cw - 3, y + s.ch * (0.35 + n * 0.3)); ctx.stroke();
        } else {
          ctx.fillStyle = "rgba(20,42,52,.28)"; ctx.fillRect(x, y, s.cw + 0.6, s.ch + 0.6);
        }
      }
      // revealed items only
      for (const it of s.items) {
        if (it.got || !s.cells[it.cell].revealed) continue;
        drawSiftItem(ctx, it, cfg, c.t);
      }
      // collected counter stones along the bottom of the field
      for (let i = 0; i < cfg.goal; i++) {
        const x = c.w * 0.5 + (i - (cfg.goal - 1) / 2) * 22, y = FIELD(c).bottom + 20;
        ctx.fillStyle = i < s.found ? "#e7d3a6" : "rgba(255,255,255,.12)";
        ctx.beginPath(); ctx.ellipse(x, y, 7, 5.5, 0, 0, TAU); ctx.fill();
        if (i < s.found) { ctx.fillStyle = "rgba(255,255,255,.45)"; ctx.beginPath(); ctx.arc(x - 2, y - 1.6, 1.7, 0, TAU); ctx.fill(); }
      }
      // lens
      ctx.save();
      const g = ctx.createRadialGradient(s.lens.x, s.lens.y, 8, s.lens.x, s.lens.y, s.lens.r);
      g.addColorStop(0, "rgba(247,221,165,.08)"); g.addColorStop(1, "rgba(247,221,165,0)");
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(s.lens.x, s.lens.y, s.lens.r, 0, TAU); ctx.fill();
      ctx.strokeStyle = "rgba(247,221,165,.45)"; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.arc(s.lens.x, s.lens.y, s.lens.r, 0, TAU); ctx.stroke();
      ctx.fillStyle = "rgba(247,221,165,.5)"; ctx.font = `16px ${c.font}`; ctx.textAlign = "center";
      ctx.fillText("◎", s.lens.x, s.lens.y + 6);
      ctx.restore();
      stageChrome(c, ctx, cfg, { ...s, goalText: `${s.found}/${cfg.goal}` });
    },
    onDown(c, p) {
      const s = c.state; if (s.finished) return;
      reveal(c, s, p.x, p.y, s.lens.r);
      let best = null, bd = 28;
      for (const it of s.items) {
        if (it.got || !s.cells[it.cell].revealed) continue;
        const d = dist(p.x, p.y, it.x, it.y);
        if (d < bd) { bd = d; best = it; }
      }
      if (!best) return;
      if (best.good) {
        best.got = true; s.found++; c.addScore(8); c.hit("good");
        c.spark(best.x, best.y, "#f4d79b", 12, 110);
        c.float(best.x, best.y - 12, tx("SMOOTH", "光滑"), "#f4d79b");
      } else {
        best.got = true;
        penalty(c, s, 4, "JAGGED!");
        c.spark(best.x, best.y, "#8a7a64", 10, 90);
      }
      if (s.found >= cfg.goal) win(c, s, cfg, cfg.reward || 30);
    },
    onMove(c, p) { const s = c.state; if (!s.finished) reveal(c, s, p.x, p.y, s.lens.r); }
  };
}
function reveal(c, s, x, y, r) {
  for (const cell of s.cells) {
    if (cell.revealed) continue;
    const cx = s.x0 + cell.q * s.cw + s.cw / 2, cy = s.y0 + cell.r * s.ch + s.ch / 2;
    if (dist(x, y, cx, cy) < r + Math.max(s.cw, s.ch) * 0.35) cell.revealed = true;
  }
}
function drawSiftItem(ctx, it, cfg, t) {
  ctx.save(); ctx.translate(it.x, it.y);
  if (it.good) {
    shadow(ctx, 0, 6, 11, 3, 0.45);
    const g = ctx.createRadialGradient(-3, -4, 1, 0, 0, 12);
    g.addColorStop(0, "#f4e6c6"); g.addColorStop(0.6, cfg.good || "#c9b48e"); g.addColorStop(1, "#6d6250");
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, 0, 9.5, 7.4, 0.2, 0, TAU); ctx.fill();
    ctx.strokeStyle = "rgba(255,248,224,.75)"; ctx.lineWidth = 1.1; ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,.55)"; ctx.beginPath(); ctx.ellipse(-3, -2.6, 2.6, 1.4, -0.4, 0, TAU); ctx.fill();
    ctx.strokeStyle = `rgba(247,221,165,${0.22 + Math.sin(t * 3 + it.x) * 0.1})`; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(0, 0, 14 + Math.sin(t * 2 + it.x) * 2, 0, TAU); ctx.stroke();
  } else {
    ctx.fillStyle = "#4b4438";
    ctx.beginPath();
    for (let i = 0; i < 7; i++) {
      const a = i / 7 * TAU, rr = i % 2 ? 5 : 9;
      ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,.16)"; ctx.lineWidth = 1; ctx.stroke();
  }
  ctx.restore();
}

/* ══════════════════════════════════ ACT TYPE 2 · RHYTHM (timing) ═════════ */
function rhythmStage(cfg) {
  return {
    label: () => T(cfg.title),
    init(c) {
      c.state = { t: 0, left: cfg.seconds, pos: 0.05, dir: 1, speed: 0.78,
        band: rnd(0.28, 0.7), bandW: 0.13, round: 0, flash: 0, finished: false, pulse: 0 };
      c.setHint(T(cfg.hint));
    },
    step(c, dt) {
      const s = c.state; if (s.finished) return;
      tick(c, s, cfg, dt); if (s.finished) return;
      s.pos += s.dir * s.speed * dt;
      if (s.pos > 1) { s.pos = 1; s.dir = -1; }
      if (s.pos < 0) { s.pos = 0; s.dir = 1; }
      s.pulse = Math.max(0, s.pulse - dt * 2);
      c.progress = s.round / cfg.rounds;
      c.setHint(`${T(cfg.hint)}   ${s.round}/${cfg.rounds}   ${Math.ceil(s.left)}s`);
    },
    draw(c, ctx) {
      const s = c.state; stageBg(c, ctx, cfg);
      const y = c.h * 0.63, x0 = c.w * 0.09, ww = c.w * 0.82;
      // track
      ctx.fillStyle = "rgba(7,15,21,.75)"; roundRect(ctx, x0 - 8, y - 20, ww + 16, 40, 20); ctx.fill();
      ctx.strokeStyle = "rgba(231,183,91,.24)"; ctx.lineWidth = 1; ctx.stroke();
      // golden window
      const bx = x0 + (s.band - s.bandW / 2) * ww, bw = s.bandW * ww;
      const bg = ctx.createLinearGradient(bx, 0, bx + bw, 0);
      bg.addColorStop(0, "rgba(231,183,91,.1)"); bg.addColorStop(0.5, "rgba(247,221,165,.5)"); bg.addColorStop(1, "rgba(231,183,91,.1)");
      ctx.fillStyle = bg; roundRect(ctx, bx, y - 14, bw, 28, 8); ctx.fill();
      ctx.strokeStyle = "#f2d493"; ctx.lineWidth = 1.4; ctx.stroke();
      // moving light
      const px = x0 + s.pos * ww;
      glowDot(ctx, px, y, 15 + s.pulse * 12, "#f6dfa0");
      ctx.fillStyle = "#fff6dc"; ctx.beginPath(); ctx.arc(px, y, 6.5, 0, TAU); ctx.fill();
      // round pips
      for (let i = 0; i < cfg.rounds; i++) {
        const xx = c.w / 2 + (i - (cfg.rounds - 1) / 2) * 24;
        ctx.beginPath(); ctx.arc(xx, y + 42, i < s.round ? 6 : 4.5, 0, TAU);
        ctx.fillStyle = i < s.round ? "#4fb8a8" : "rgba(255,255,255,.16)"; ctx.fill();
      }
      // figure praying in the background
      npc(ctx, c.w * 0.5, c.h * 0.5, { s: 1.25, phase: s.t, robe: cfg.robe || "#3c6070", cloth: "#14202a", glow: "rgba(247,221,165,.18)" });
      stageChrome(c, ctx, cfg, { ...s, goalText: `${s.round}/${cfg.rounds}` });
    },
    onDown(c) {
      const s = c.state; if (s.finished) return;
      if (Math.abs(s.pos - s.band) <= s.bandW / 2) {
        s.round++; s.pulse = 1; c.addScore(10); c.hit("good");
        c.spark(c.w * 0.09 + s.pos * c.w * 0.82, c.h * 0.63, "#f6dfa0", 16, 130);
        c.float(c.w / 2, c.h * 0.58, tx("IN RHYTHM", "合拍"), "#f4d79b");
        s.band = rnd(0.18, 0.82); s.speed = Math.min(1.8, s.speed + 0.16);
        s.bandW = Math.max(0.085, s.bandW - 0.008);
        if (s.round >= cfg.rounds) win(c, s, cfg, cfg.reward || 30);
      } else penalty(c, s, 3, "OFF BEAT");
    }
  };
}

/* ══════════════════════════════════ ACT TYPE 3 · TRACE (steady path) ═════ */
function traceStage(cfg) {
  const centre = (c, y) => c.w * 0.5 + Math.sin(y * 0.013 + 1.2) * c.w * 0.23 + Math.sin(y * 0.031) * c.w * 0.05;
  return {
    label: () => T(cfg.title),
    init(c) {
      c.state = { t: 0, left: cfg.seconds, progress: 0, flash: 0, finished: false, wobble: 0 };
      c.setHint(T(cfg.hint));
    },
    step(c, dt) {
      const s = c.state; if (s.finished) return;
      tick(c, s, cfg, dt); if (s.finished) return;
      const f = FIELD(c), p = c.pointer;
      const active = p.down || c.keys.has("arrowup") || c.keys.has("w");
      if (active) {
        const kb = c.keys.has("arrowup") || c.keys.has("w");
        const py = kb ? f.bottom - (s.progress + 0.08) * (f.bottom - f.top) : p.y;
        const target = clamp((f.bottom - py) / (f.bottom - f.top), 0, 1);
        const cx = centre(c, py);
        const onRoad = kb || Math.abs(p.x - cx) < 36;
        if (onRoad) {
          s.progress = Math.min(1, s.progress + dt * 0.42, target + 0.001);
        } else {
          s.left -= dt * 1.6; s.flash = 0.7; s.wobble = 1;
        }
      }
      s.wobble = Math.max(0, s.wobble - dt * 2);
      c.progress = s.progress;
      c.setHint(`${T(cfg.hint)}   ${Math.round(s.progress * 100)}%   ${Math.ceil(s.left)}s`);
      if (s.progress >= 0.995) win(c, s, cfg, cfg.reward || 30);
    },
    draw(c, ctx) {
      const s = c.state; stageBg(c, ctx, cfg);
      const f = FIELD(c);
      // corridor ribbon
      ctx.save();
      ctx.beginPath();
      for (let y = f.bottom; y >= f.top; y -= 6) ctx.lineTo(centre(c, y) - 34, y);
      for (let y = f.top; y <= f.bottom; y += 6) ctx.lineTo(centre(c, y) + 34, y);
      ctx.closePath();
      const g = ctx.createLinearGradient(0, f.top, 0, f.bottom);
      g.addColorStop(0, "rgba(247,221,165,.32)"); g.addColorStop(1, "rgba(160,120,66,.16)");
      ctx.fillStyle = g; ctx.fill();
      ctx.strokeStyle = "rgba(247,221,165,.5)"; ctx.lineWidth = 1.6; ctx.stroke();
      // footsteps
      ctx.setLineDash([4, 9]); ctx.strokeStyle = "rgba(255,248,224,.45)"; ctx.lineWidth = 2;
      ctx.beginPath(); for (let y = f.bottom; y >= f.top; y -= 6) ctx.lineTo(centre(c, y), y); ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
      // goal light
      glowDot(ctx, centre(c, f.top), f.top, 30, "#f6dfa0");
      star(ctx, centre(c, f.top), f.top, 10, "#fff1c8", 0.9);
      // traveller
      const py = f.bottom - s.progress * (f.bottom - f.top);
      const px = centre(c, py) + (s.wobble ? Math.sin(c.t * 30) * 5 : 0);
      pilgrim(ctx, px, py, 1.05, c.t * 2, 1, 1, true);
      if (s.progress > 0.02) {
        ctx.fillStyle = "rgba(247,221,165,.7)"; ctx.font = `10px ${c.font}`; ctx.textAlign = "center";
        ctx.fillText(`${Math.round(s.progress * 100)}%`, px, py - 52);
      }
      stageChrome(c, ctx, cfg, { ...s, goalText: `${Math.round(s.progress * 100)}%` });
    },
    onDown() {}, onMove() {}
  };
}

/* ══════════════════════════════════ ACT TYPE 4 · CHARGE (hold & release) ═ */
function chargeStage(cfg) {
  return {
    label: () => T(cfg.title),
    init(c) {
      c.state = { t: 0, left: cfg.seconds, power: 0, holding: false, band: 0.6,
        bandW: 0.16, round: 0, flash: 0, finished: false, glow: 0 };
      c.setHint(T(cfg.hint));
    },
    step(c, dt) {
      const s = c.state; if (s.finished) return;
      tick(c, s, cfg, dt); if (s.finished) return;
      s.band = 0.5 + Math.sin(s.t * 0.85) * 0.23;
      s.bandW = Math.max(0.1, 0.17 - s.round * 0.02);
      if (s.holding) {
        s.power += dt * 0.66;
        if (s.power >= 1) { s.power = 0; s.holding = false; penalty(c, s, 3, "OVERPULL"); }
      }
      s.glow = Math.max(0, s.glow - dt * 2);
      c.progress = s.round / cfg.rounds;
      c.setHint(`${T(cfg.hint)}   ${s.round}/${cfg.rounds}   ${Math.ceil(s.left)}s`);
    },
    draw(c, ctx) {
      const s = c.state; stageBg(c, ctx, cfg);
      const x = c.w * 0.14, y = c.h * 0.6, ww = c.w * 0.72, hh = 34;
      ctx.fillStyle = "rgba(7,15,21,.8)"; roundRect(ctx, x - 6, y - 6, ww + 12, hh + 12, 12); ctx.fill();
      ctx.strokeStyle = "rgba(231,183,91,.24)"; ctx.lineWidth = 1; ctx.stroke();
      // target band
      const bx = x + (s.band - s.bandW / 2) * ww, bw = s.bandW * ww;
      ctx.fillStyle = "rgba(247,221,165,.4)"; roundRect(ctx, bx, y, bw, hh, 6); ctx.fill();
      ctx.strokeStyle = "#ffe6a8"; ctx.lineWidth = 1.5; ctx.stroke();
      // power fill
      const fw = s.power * ww;
      const pg = ctx.createLinearGradient(x, 0, x + Math.max(1, fw), 0);
      pg.addColorStop(0, "rgba(79,184,168,.55)"); pg.addColorStop(1, "rgba(247,221,165,.9)");
      ctx.fillStyle = pg; roundRect(ctx, x, y, Math.max(2, fw), hh, 6); ctx.fill();
      // rope / crank illustration
      ctx.save(); ctx.translate(c.w * 0.5, c.h * 0.5);
      ctx.strokeStyle = "rgba(231,183,91,.5)"; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(0, 0, 26, 0, TAU); ctx.stroke();
      ctx.rotate(s.power * 8);
      for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(i * Math.PI / 2) * 26, Math.sin(i * Math.PI / 2) * 26); ctx.stroke(); }
      ctx.restore();
      glowDot(ctx, x + fw, y + hh / 2, 16 + s.glow * 12, "#f4d79b");
      for (let i = 0; i < cfg.rounds; i++) {
        const xx = c.w / 2 + (i - (cfg.rounds - 1) / 2) * 24;
        ctx.beginPath(); ctx.arc(xx, y + hh + 24, i < s.round ? 6 : 4.5, 0, TAU);
        ctx.fillStyle = i < s.round ? "#4fb8a8" : "rgba(255,255,255,.16)"; ctx.fill();
      }
      stageChrome(c, ctx, cfg, { ...s, goalText: `${s.round}/${cfg.rounds}` });
    },
    onDown(c) { const s = c.state; if (!s.finished) { s.holding = true; s.power = 0; } },
    onUp(c) {
      const s = c.state; if (s.finished || !s.holding) return;
      s.holding = false;
      if (Math.abs(s.power - s.band) <= s.bandW / 2) {
        s.round++; s.glow = 1; c.addScore(10); c.hit("good");
        c.spark(c.w * 0.5, c.h * 0.5, "#f4d79b", 18, 140);
        c.float(c.w / 2, c.h * 0.55, tx("HELD!", "拉住了！"), "#f4d79b");
        if (s.round >= cfg.rounds) win(c, s, cfg, cfg.reward || 30);
      } else penalty(c, s, 3, "SLIPPED");
      s.power = 0;
    }
  };
}

/* ══════════════════════════════════ ACT TYPE 5 · ORDER (watch & repeat) ══ */
function orderStage(cfg) {
  const GLYPHS = ["◍", "✧", "❀", "✟", "⌁", "✦"];
  return {
    label: () => T(cfg.title),
    init(c) {
      const cells = GLYPHS.map((g, i) => ({ g, x: c.w * (0.2 + (i % 3) * 0.3), y: c.h * (0.56 + Math.floor(i / 3) * 0.16) }));
      const s = { t: 0, left: cfg.seconds, cells, round: 0, seq: [], shown: 0,
        phase: "show", timer: 0, idx: 0, flash: 0, finished: false, active: -1 };
      c.state = s;
      newRound(c, s, cfg);
      c.setHint(T(cfg.hint));
    },
    step(c, dt) {
      const s = c.state; if (s.finished) return;
      tick(c, s, cfg, dt); if (s.finished) return;
      s.timer -= dt;
      if (s.phase === "show") {
        // step through the sequence in 0.62s beats
        const beat = Math.floor((s.showTotal - s.timer) / 0.62);
        s.active = beat < s.seq.length ? s.seq[beat] : -1;
        if (s.timer <= 0) { s.phase = "input"; s.shown = 0; s.active = -1; }
      }
      c.progress = (s.round + (s.phase === "show" ? 0 : s.shown / Math.max(1, s.seq.length))) / cfg.rounds;
      c.setHint(s.phase === "show" ? tx("Watch the order…", "记住顺序…") : `${T(cfg.hint)}   ${s.shown}/${s.seq.length}`);
    },
    draw(c, ctx) {
      const s = c.state; stageBg(c, ctx, cfg);
      for (let i = 0; i < s.cells.length; i++) {
        const cell = s.cells[i], active = i === s.active;
        ctx.save();
        if (active) glowDot(ctx, cell.x, cell.y, 42, "#f6dfa0");
        ctx.fillStyle = active ? "rgba(247,221,165,.4)" : "rgba(10,22,30,.82)";
        ctx.beginPath(); ctx.arc(cell.x, cell.y, 27, 0, TAU); ctx.fill();
        ctx.strokeStyle = active ? "#ffe6a8" : "rgba(231,183,91,.28)"; ctx.lineWidth = active ? 2.4 : 1.3; ctx.stroke();
        ctx.fillStyle = active ? "#2b1e0a" : "#e8d9b6";
        ctx.font = `22px ${c.font}`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(cell.g, cell.x, cell.y + 1);
        ctx.restore();
      }
      // progress pips
      for (let i = 0; i < s.seq.length; i++) {
        const xx = c.w / 2 + (i - (s.seq.length - 1) / 2) * 18;
        ctx.beginPath(); ctx.arc(xx, c.h * 0.9, i < s.shown ? 5.5 : 4, 0, TAU);
        ctx.fillStyle = i < s.shown ? "#4fb8a8" : "rgba(255,255,255,.16)"; ctx.fill();
      }
      stageChrome(c, ctx, cfg, { ...s, goalText: `${s.round}/${cfg.rounds}` });
    },
    onDown(c, p) {
      const s = c.state; if (s.finished || s.phase !== "input") return;
      let hit = -1;
      for (let i = 0; i < s.cells.length; i++) if (dist(p.x, p.y, s.cells[i].x, s.cells[i].y) < 34) hit = i;
      if (hit < 0) return;
      if (hit === s.seq[s.shown]) {
        s.shown++; c.addScore(5); c.hit("tap");
        c.spark(s.cells[hit].x, s.cells[hit].y, "#f4d79b", 8, 90);
        if (s.shown >= s.seq.length) {
          s.round++; c.addScore(10); c.hit("good");
          if (s.round >= cfg.rounds) win(c, s, cfg, cfg.reward || 30);
          else { newRound(c, s, cfg); c.float(c.w / 2, c.h * 0.5, tx("Again…", "再来一次…"), "#f4d79b"); }
        }
      } else { penalty(c, s, 3, "FORGOT"); newRound(c, s, cfg); }
    }
  };
}
function newRound(c, s, cfg) {
  const len = 3 + s.round;
  s.seq = Array.from({ length: len }, () => Math.floor(Math.random() * 6));
  s.phase = "show"; s.shown = 0;
  s.showTotal = len * 0.62 + 0.35; s.timer = s.showTotal; s.active = -1;
}

/* ══════════════════════════════════ ACT TYPE 6 · DODGE (run the valley) ══ */
/* David's middle act: cross the valley while Goliath hurls spears. */
function dodgeStage(cfg) {
  return {
    label: () => T(cfg.title),
    init(c) {
      c.state = { t: 0, left: cfg.seconds, x: c.w * 0.12, y: c.h * 0.78,
        vy: 0, jump: false, hazards: [], spawn: 0, hits: 0, flash: 0, finished: false };
      c.setHint(T(cfg.hint));
    },
    step(c, dt) {
      const s = c.state; if (s.finished) return;
      tick(c, s, cfg, dt); if (s.finished) return;
      s.x = Math.min(c.w * 0.86, s.x + dt * (c.w * 0.052));
      if (s.jump) { s.vy -= 560 * dt; s.y += s.vy * dt; if (s.y >= c.h * 0.78) { s.y = c.h * 0.78; s.vy = 0; s.jump = false; } }
      if (s.spawn < 16 && s.t > s.spawn * 0.82) {
        s.spawn++;
        s.hazards.push({ x: c.w + 20, y: c.h * 0.78 - rnd(0, 14), r: rnd(11, 17), rot: rnd(0, TAU), hit: false });
      }
      for (const hz of s.hazards) { hz.x -= dt * (c.w * 0.34); hz.rot += dt * 3; }
      s.hazards = s.hazards.filter((h) => h.x > -30);
      for (const hz of s.hazards) {
        if (hz.hit || dist(s.x, s.y - 18, hz.x, hz.y - 8) > hz.r + 12) continue;
        hz.hit = true; s.hits++; s.flash = 1; c.bump(8); c.hit("miss");
        s.left -= 3; c.float(s.x, s.y - 50, tx("HIT!", "被击中！"), "#e08b78");
        if (s.hits >= 3) { s.finished = true; c.end(true, c.score); return; }
      }
      c.progress = (s.x - c.w * 0.12) / (c.w * 0.74);
      c.setHint(`${T(cfg.hint)}   ${tx("HITS", "被击中")} ${s.hits}/3`);
      if (s.x >= c.w * 0.86) win(c, s, cfg, cfg.reward || 30);
    },
    draw(c, ctx) {
      const s = c.state; stageBg(c, ctx, cfg);
      // distant giant
      glowDot(ctx, c.w * 0.88, c.h * 0.56, 84, "rgba(224,139,120,.5)");
      giant(ctx, c.w * 0.88, c.h * 0.68, 1.45, c.t);
      // ground
      ctx.fillStyle = "rgba(38,45,36,.55)"; ctx.fillRect(0, c.h * 0.8, c.w, c.h * 0.2);
      ctx.strokeStyle = "rgba(240,196,106,.2)"; ctx.beginPath(); ctx.moveTo(0, c.h * 0.8); ctx.lineTo(c.w, c.h * 0.8); ctx.stroke();
      // hazards (spears / jagged stones)
      for (const hz of s.hazards) {
        ctx.save(); ctx.translate(hz.x, hz.y); ctx.rotate(hz.rot);
        ctx.strokeStyle = "#c9b48e"; ctx.lineWidth = 3; ctx.lineCap = "round";
        ctx.beginPath(); ctx.moveTo(-hz.r, 0); ctx.lineTo(hz.r, 0); ctx.stroke();
        ctx.fillStyle = "#e0d6bb";
        ctx.beginPath(); ctx.moveTo(hz.r + 7, 0); ctx.lineTo(hz.r - 2, -4); ctx.lineTo(hz.r - 2, 4); ctx.closePath(); ctx.fill();
        ctx.restore();
      }
      pilgrim(ctx, s.x, s.y, 1.15, c.t * 3, 1, 1, true);
      ctx.fillStyle = "rgba(247,221,165,.6)"; ctx.font = `10px ${c.font}`; ctx.textAlign = "center";
      ctx.fillText(tx("THE LINE", "阵前"), c.w * 0.88, c.h * 0.72);
      stageChrome(c, ctx, cfg, { ...s, goalText: `${s.hits}/3` });
    },
    onDown(c) { const s = c.state; if (!s.finished && !s.jump) { s.jump = true; s.vy = -215; c.hit("tap"); } },
    onKey(c, k, down) { if (down && (k === " " || k === "arrowup")) this.onDown(c); }
  };
}

function glowDot(ctx, x, y, r, color) {
  const g = ctx.createRadialGradient(x, y, 1, x, y, r);
  g.addColorStop(0, color); g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
}

const BUILDERS = { sift: siftStage, rhythm: rhythmStage, trace: traceStage, charge: chargeStage,
  order: orderStage, dodge: dodgeStage };

/* --------------------------------------------------------------- composition */

/**
 * Wrap a normal game so it runs `preludes` first, then the original game.
 * The original game keeps calling c.end(true/false, score) as before — the
 * wrapper redirects a successful act into the next act instead of finishing.
 */
export function withStages(game, preludes) {
  const list = (Array.isArray(preludes) ? preludes : [preludes]).filter(Boolean);
  if (!list.length) return game;
  const acts = [...list.map((cfg) => (BUILDERS[cfg.kind] || siftStage)(cfg)), game];
  const wrapped = {
    ...game,
    acts,
    actCount: acts.length,
    hint(c) { return tx(this.hintEn, this.hintZh); },
    init(c) {
      c.shared = { ...(c.shared || {}) };
      c.actIndex = 0; c.actCount = acts.length;
      c.actBanner = 1.8; c.actFlash = 0.55;
      let finished = false;
      const rawEnd = c.end.bind(c);
      c.end = (success, score) => {
        if (finished) return;
        c.score = Math.max(0, Math.round(score ?? c.score));
        if (success && c.actIndex < acts.length - 1) {
          // act cleared → brief cinematic beat, then the next act begins
          c.actIndex++;
          c.actBanner = 1.9; c.actFlash = 0.6;
          c.hearts = c.maxHearts;         // each act is a fresh challenge
          c.hit("unlock");
          c.spark(c.w / 2, c.h * 0.45, "#f4d79b", 22, 170);
          acts[c.actIndex].init?.(c);
          c.progress = 0;
          return;
        }
        finished = true;
        rawEnd(success, c.score);
      };
      acts[0].init?.(c);
    },
    step(c, dt) {
      c.actBanner = Math.max(0, (c.actBanner || 0) - dt);
      c.actFlash = Math.max(0, (c.actFlash || 0) - dt);
      if (c.actBanner > 1.25) return;     // hold the "ACT CLEAR" beat briefly
      c.progress = 0;
      acts[c.actIndex].step?.(c, dt);
      const stageP = clamp(c.progress, 0, 1);
      c.stageProgress = stageP;
      c.progress = (c.actIndex + stageP) / c.actCount;
    },
    draw(c, ctx) {
      acts[c.actIndex].draw?.(c, ctx);
      drawForeground(c, ctx, c.game.fg || "rocks", 0.85);
      drawCinematic(c, ctx, { flash: c.actFlash || 0 });
      drawStageBadge(c, ctx, currentLabel(c), c.actIndex, c.actCount);
      if (c.actBanner > 1.25) {
        const a = clamp((c.actBanner - 1.25) / 0.35, 0, 1);
        ctx.save(); ctx.globalAlpha = a;
        ctx.fillStyle = "rgba(6,13,19,.72)"; ctx.fillRect(0, c.h * 0.38, c.w, c.h * 0.2);
        ctx.fillStyle = "#f2dba6"; ctx.font = `700 13px ${c.font}`; ctx.textAlign = "center";
        ctx.fillText(tx("ACT CLEAR", "本幕完成"), c.w / 2, c.h * 0.47);
        ctx.font = `600 16px ${c.font}`;
        ctx.fillText(currentLabel(c), c.w / 2, c.h * 0.5);
        ctx.restore();
      }
    },
    onDown(c, p) { acts[c.actIndex].onDown?.(c, p); },
    onMove(c, p) { acts[c.actIndex].onMove?.(c, p); },
    onUp(c, p) { acts[c.actIndex].onUp?.(c, p); },
    onKey(c, k, down) { acts[c.actIndex].onKey?.(c, k, down); }
  };
  return wrapped;
}
function currentLabel(c) {
  const act = c.game.acts?.[c.actIndex];
  if (act?.label) return act.label();
  return tx(c.game.titleEn, c.game.titleZh);
}
