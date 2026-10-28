/* Multi-act action scenes.
   Each chapter used to be ONE mini-game. Now every action scene is a short
   set piece: one or two "preparation" acts (search / rhythm / trace / charge /
   memory / dodge) followed by the chapter's original climax mechanic.

   Acts never block the story: a prelude that times out still advances to the
   climax, just with a smaller score. Only the climax decides the bonus. */

import { tx } from "../core/i18n.js";
import { clamp, rnd, dist, drawBackdrop, drawWeather, shadow, star, roundRect,
  pilgrim, giant, npc, actor, actorShadow, preloadSprites } from "./scene.js";
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
  const y = 176, hh = 102;
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
  wrapText(ctx, T(cfg.prompt), 26, y + 53, w - 52, 12, 3);

  // timer bar
  const ratio = clamp((s.left ?? cfg.seconds) / cfg.seconds, 0, 1);
  ctx.fillStyle = "rgba(255,255,255,.1)"; roundRect(ctx, 26, y + hh - 12, w - 52, 5, 2.5); ctx.fill();
  ctx.fillStyle = ratio > 0.3 ? "#d6b46c" : "#d65c42";
  roundRect(ctx, 26, y + hh - 12, (w - 52) * ratio, 5, 2.5); ctx.fill();

  // goal pips on the right of the title
  if (s.goalText) {
    ctx.textAlign = "right"; ctx.fillStyle = "#f2dba6"; ctx.font = `700 13px ${c.font}`;
    ctx.fillText(s.goalText, w - 26, y + 37);
  }
  // hint line below the card
  ctx.textAlign = "center"; ctx.fillStyle = "rgba(244,231,203,.5)"; ctx.font = `10px ${c.font}`;
  ctx.fillText(T(cfg.hint), w / 2, y + hh + 16);

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
  /* Clamping this at 1 used to pin the clock: a player who kept missing never
     reached the end of the act, because every miss reset the floor. The act is
     a preparation, not a trap — time has to be allowed to run out. */
  s.left = Math.max(0, s.left - seconds);
  s.flash = 1; c.bump(7); c.hit("miss");
  c.float(c.w / 2, c.h * 0.6, tx(msg, "失误"), "#e08b78");
}

const FIELD = (c) => ({ top: c.h * 0.47, bottom: c.h * 0.9 });

/** Draw the act's painted hero with its contact shadow; falls back to the
    vector pilgrim when the artwork is missing, so nothing can break. */
function stageHero(c, ctx, cfg, x, y, h, o = {}) {
  if (!cfg.hero) return false;
  actorShadow(ctx, x, y + 2, h * 0.2, o.shadow ?? 0.28);
  const drew = actor(ctx, cfg.hero, x, y, h, o);
  if (!drew) pilgrim(ctx, x, y, o.fallbackScale ?? 1.05, c.t * 2, 1, 1, true);
  return drew;
}

/* ══════════════════════════════════ ACT TYPE 1 · SIFT (scratch & search) ══ */
/* Drag a lens over silt to uncover hidden items. Decoys cost time.
   This replaces the old "five glowing dots" with a genuine search. */
function siftStage(cfg) {
  return {
    label: () => T(cfg.title),
    init(c) {
      /* A patch of bank, not the whole valley: the search only has to cover
         ground you could actually reach down and sweep. */
      const cols = 8, rows = 4;
      const x0 = c.w * 0.08, y0 = c.h * 0.70, cw = (c.w * 0.84) / cols, ch = (c.h * 0.2) / rows;
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
        lens: { x: c.w * 0.5, y: y0 + ch * rows * 0.5, r: 46 }, flash: 0, finished: false };
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
      /* The search used to be a visible grid of tiles, which read as a board
         game laid over the painting — and it was drawn as one opaque slab of
         brown, so sweeping it uncovered nothing at all. The dust is now only
         where the dust still is: one soft mound per cell you have not swept.
         Clear a patch and the plate underneath shows through, which is the
         whole promise of the gesture. */
      for (const cell of s.cells) {
        if (cell.revealed) continue;
        const cx = s.x0 + cell.q * s.cw + s.cw / 2, cy = s.y0 + cell.r * s.ch + s.ch / 2;
        const n = hash(cell.q * 3 + cell.r * 17);
        const base = cfg.siltRgb || "108,80,50";
        // two offset mounds per cell, so the crust has no repeating edge
        for (let k = 0; k < 2; k++) {
          const ox = (hash(cell.q * 7 + cell.r * 3 + k) - 0.5) * s.cw * 0.7;
          const oy = (hash(cell.r * 11 + cell.q * 5 + k) - 0.5) * s.ch * 0.7;
          const r = Math.max(s.cw, s.ch) * (0.62 + hash(k + n * 3) * 0.5);
          const g = ctx.createRadialGradient(cx + ox - r * 0.2, cy + oy - r * 0.3, r * 0.1, cx + ox, cy + oy, r);
          g.addColorStop(0, `rgba(${base},.82)`);
          g.addColorStop(0.5, `rgba(${base},.6)`);
          g.addColorStop(1, `rgba(${base},0)`);
          ctx.fillStyle = g;
          ctx.beginPath(); ctx.arc(cx + ox, cy + oy, r, 0, TAU); ctx.fill();
        }
        // grit sitting on the crust
        for (let k = 0; k < 4; k++) {
          const px = cx + (hash(cell.q * 11 + cell.r * 7 + k) - 0.5) * s.cw * 1.1;
          const py = cy + (hash(cell.r * 13 + cell.q * 5 + k) - 0.5) * s.ch * 1.1;
          ctx.fillStyle = `rgba(${150 + k * 12},${126 + k * 9},${92 + k * 7},${0.1 + hash(k + n) * 0.16})`;
          ctx.beginPath(); ctx.ellipse(px, py, 1 + hash(k * 3 + n) * 2.2, 0.9 + hash(k) * 1.4, 0, 0, TAU); ctx.fill();
        }
      }
      // anything you have already swept clean is now lying in the open
      for (const it of s.items) {
        if (!s.cells[it.cell].revealed) continue;
        drawSiftItem(ctx, it, cfg, c.t);
      }
      ctx.restore();
      // collected counter stones along the bottom of the field
      for (let i = 0; i < cfg.goal; i++) {
        const x = c.w * 0.5 + (i - (cfg.goal - 1) / 2) * 22, y = FIELD(c).bottom + 20;
        ctx.fillStyle = i < s.found ? "#e7d3a6" : "rgba(255,255,255,.12)";
        ctx.beginPath(); ctx.ellipse(x, y, 7, 5.5, 0, 0, TAU); ctx.fill();
        if (i < s.found) { ctx.fillStyle = "rgba(255,255,255,.45)"; ctx.beginPath(); ctx.arc(x - 2, y - 1.6, 1.7, 0, TAU); ctx.fill(); }
      }
      // what the sweep does: dust lifts off the ground you have just cleared
      if (c.pointer.down) {
        ctx.save();
        ctx.globalCompositeOperation = "screen";
        const dg = ctx.createRadialGradient(s.lens.x, s.lens.y, 2, s.lens.x, s.lens.y, s.lens.r * 0.9);
        dg.addColorStop(0, "rgba(255,236,196,.16)");
        dg.addColorStop(1, "rgba(255,220,160,0)");
        ctx.fillStyle = dg;
        ctx.beginPath(); ctx.arc(s.lens.x, s.lens.y, s.lens.r * 0.9, 0, TAU); ctx.fill();
        ctx.restore();
        // a handful of grit thrown up by the sweep, not a cursor sprite
        for (let i = 0; i < 7; i++) {
          const a = hash(i * 7.7 + Math.floor(s.t * 12)) * TAU;
          const rr = s.lens.r * (0.25 + hash(i * 3.3) * 0.8);
          ctx.fillStyle = `rgba(${cfg.siltRgb || "150,124,86"},${0.10 + hash(i) * 0.16})`;
          ctx.beginPath();
          ctx.arc(s.lens.x + Math.cos(a) * rr, s.lens.y + Math.sin(a) * rr,
            1.4 + hash(i * 9.1) * 2.6, 0, TAU);
          ctx.fill();
        }
      }
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
        c.float(best.x, best.y - 12, tx("Found", "找到了"), "#f4d79b");
      } else {
        best.got = true;
        penalty(c, s, 4, "EMPTY");
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
    /* A sheep lying up in the dust, waiting to be found. At this size the
       silhouette is the whole of it: a fleece made of overlapping arcs, a dark
       face turned down to the ground, four thin legs tucked under. */
    const lift = it.got ? Math.sin(clamp(t * 2, 0, 1) * Math.PI) * 3 : 0;
    ctx.translate(0, -lift);
    shadow(ctx, 0, 12, 17, 5, 0.44);
    const wool = ctx.createRadialGradient(-5, -7, 1, 0, 0, 19);
    wool.addColorStop(0, "#fdf6e6"); wool.addColorStop(0.6, cfg.good || "#ded0b0");
    wool.addColorStop(1, "#8d8268");
    ctx.fillStyle = wool;
    for (const [bx, by, br] of [[-7, -3, 8.6], [3, -6, 8], [-2, 3, 9.4], [-10, 5, 7], [6, 2, 7.4]]) {
      ctx.beginPath(); ctx.arc(bx, by, br, 0, TAU); ctx.fill();
    }
    // the face, down in the dust
    ctx.fillStyle = "#413a30";
    ctx.beginPath(); ctx.ellipse(12, 3, 5.4, 4.4, 0.42, 0, TAU); ctx.fill();
    ctx.fillStyle = "rgba(255,246,228,.42)";
    ctx.beginPath(); ctx.ellipse(11, 0.6, 3, 1.7, 0.3, 0, TAU); ctx.fill();
    // a brow of wool over it, so the head belongs to the body
    ctx.fillStyle = cfg.good || "#ded0b0";
    ctx.beginPath(); ctx.arc(9, -3, 5.2, 0, TAU); ctx.fill();
    // legs
    ctx.strokeStyle = "rgba(44,36,28,.92)"; ctx.lineWidth = 2.2; ctx.lineCap = "round";
    for (const lx of [-9, -3, 3, 8]) {
      ctx.beginPath(); ctx.moveTo(lx, 8); ctx.lineTo(lx - 0.8, 14); ctx.stroke();
    }
    if (!it.got) {
      // the dust it is lying in breathes a little, which is the only tell
      ctx.strokeStyle = `rgba(247,221,165,${0.12 + Math.sin(t * 2.4 + it.x) * 0.05})`;
      ctx.lineWidth = 6;
      ctx.beginPath(); ctx.arc(0, 0, 20, 0, TAU); ctx.stroke();
    }
  } else {
    // a hollow where something used to lie: dust that has already settled
    const g = ctx.createRadialGradient(0, 0, 1, 0, 0, 13);
    g.addColorStop(0, "rgba(28,22,16,.85)"); g.addColorStop(1, "rgba(28,22,16,0)");
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.ellipse(0, 1, 13, 9, 0.2, 0, TAU); ctx.fill();
    ctx.strokeStyle = "rgba(236,214,180,.18)"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.ellipse(0, -1.5, 11, 6.5, 0.2, 0.2, 2.6); ctx.stroke();
  }
  ctx.restore();
}

/* ══════════════════ ACT TYPE 2 · WATCH (shade a flame, catch a sheaf) ═══
   The old version was a light sliding along a track, and you tapped when it
   crossed a golden band. It measured a tap, not a thing. Two modes now:

     shade — a guard's torch sweeps the den. Cup each prayer lamp with your
             hand as the light passes, or it flares and he sees.
     catch — the reapers' sheaves fall in rhythm. Take each one out of the air
             as it reaches your hands. */

function rhythmStage(cfg) {
  const mode = cfg.mode || (cfg.hero === "ruth" ? "catch" : "shade");

  function init(c) {
    if (cfg.hero) preloadSprites();
    const lamps = [[0.22, 0.68], [0.5, 0.74], [0.78, 0.68]].map(([fx, fy], i) => ({
      x: c.w * fx, y: c.h * fy, saved: false, flare: 0, lit: 1, i
    }));
    c.state = {
      t: 0, left: cfg.seconds, round: 0, flash: 0, finished: false, mode,
      lamps, sweepX: -0.2, sweepV: 0.42, sweepY: c.h * 0.5,
      sheaf: null, spawn: 0.6, caught: 0, dropped: 0, hands: 0, pulse: 0
    };
    c.setHint(T(cfg.hint));
  }

  function step(c, dt) {
    const s = c.state; if (s.finished) return;
    tick(c, s, cfg, dt); if (s.finished) return;
    const p = c.pointer;
    s.pulse = Math.max(0, s.pulse - dt * 2);

    if (mode === "shade") {
      // the guard walks his round; the light crosses the den and comes back
      s.sweepX += s.sweepV * dt;
      if (s.sweepX > 1.15) { s.sweepX = 1.15; s.sweepV = -Math.abs(s.sweepV); }
      if (s.sweepX < -0.15) { s.sweepX = -0.15; s.sweepV = Math.abs(s.sweepV); }
      const gx = s.sweepX * c.w;
      for (const l of s.lamps) {
        if (l.saved) continue;
        const near = Math.abs(gx - l.x) < 96;
        // a hand actually over the lamp is the only thing that hides a flame
        const covered = p.down && dist(p.x, p.y, l.x, l.y) < 52;
        if (near) {
          if (covered) { l.lit = Math.max(0, l.lit - dt * 6); l.sheltered = true; }
          else {
            l.lit = 1;
            if ((l.cool || 0) <= 0) {
              l.cool = 1.4; l.flare = 1;
              penalty(c, s, 2, "SEEN");
              c.spark(l.x, l.y, "#e0a070", 14, 110);
            }
          }
        } else {
          l.lit = Math.min(1, l.lit + dt * 2);
          /* Once the light has come close, been hidden from, and moved well
             past, that lamp is safe — which is a thing the player can see. */
          if (l.sheltered && Math.abs(gx - l.x) > 132) {
            l.saved = true; s.round++;
            c.addScore(12); c.hit("good");
            c.float(l.x, l.y - 44, tx("Unseen", "没被看见"), "#f4d79b");
            c.spark(l.x, l.y, "#f4d79b", 16, 120);
            if (s.round >= cfg.rounds) win(c, s, cfg, cfg.reward || 30);
          }
        }
        l.cool = Math.max(0, (l.cool || 0) - dt);
        l.flare = Math.max(0, (l.flare || 0) - dt * 0.8);
      }
      c.progress = s.round / cfg.rounds;
    }

    if (mode === "catch") {
      s.spawn -= dt;
      if (!s.sheaf && s.spawn <= 0) {
        s.sheaf = { x: c.w * rnd(0.25, 0.75), y: c.h * 0.34, v: 0, rot: rnd(-0.4, 0.4), taken: false, missed: false };
      }
      if (s.sheaf && !s.sheaf.taken && !s.sheaf.missed) {
        const sh = s.sheaf;
        sh.v += 900 * dt;                 // sheaves fall; gravity is not decorative
        sh.y += sh.v * dt;
        sh.rot += dt * 1.2;
        const reach = c.h * 0.74;
        const inReach = sh.y > reach - 50 && sh.y < reach + 34;
        // a hand under it, or it hits the stubble
        if (p.down && inReach && Math.abs(p.x - sh.x) < 74) {
          sh.taken = true; s.caught++; s.round++;
          c.addScore(12); c.hit("good"); s.pulse = 1;
          c.spark(sh.x, reach, "#e8d6a4", 16, 120);
          c.float(sh.x, reach - 40, tx("Gathered", "拾到了"), "#f4d79b");
          s.spawn = 0.5;
          if (s.round >= cfg.rounds) win(c, s, cfg, cfg.reward || 30);
        } else if (sh.y > c.h) {
          sh.missed = true; s.dropped++;
          penalty(c, s, 2, "LOST");
          s.spawn = 0.4;
        }
      }
      if (s.sheaf && (s.sheaf.taken || s.sheaf.missed) && (s.sheaf.taken ? true : true)) {
        if (s.sheaf.taken || s.sheaf.y > c.h) s.sheaf = null;
      }
      c.progress = s.round / cfg.rounds;
    }

    c.setHint(`${T(cfg.hint)}   ${s.round}/${cfg.rounds}   ${Math.ceil(s.left)}s`);
  }

  function draw(c, ctx) {
    const s = c.state;
    stageBg(c, ctx, cfg);
    const heroH = clamp(c.h * 0.19, 82, 168);

    if (mode === "shade") {
      const drew = stageHero(c, ctx, cfg, c.w * 0.5, c.h * 0.86, heroH, {
        rot: 0.02 + Math.sin(s.t * 0.8) * 0.01, squash: 1 + Math.sin(s.t * 1.2) * 0.008, shadow: 0.24
      });
      if (!drew) npc(ctx, c.w * 0.5, c.h * 0.82, { s: 1.2, phase: s.t, robe: cfg.robe || "#3c6070", cloth: "#14202a", glow: "rgba(247,221,165,.18)" });
      // the three prayer lamps
      for (const l of s.lamps) {
        const covered = c.pointer.down && dist(c.pointer.x, c.pointer.y, l.x, l.y) < 52;
        ctx.save();
        ctx.fillStyle = "rgba(10,14,18,.5)";
        ctx.beginPath(); ctx.ellipse(l.x, l.y + 14, 24, 8, 0, 0, TAU); ctx.fill();
        // the clay lamp
        const g = ctx.createLinearGradient(l.x - 16, l.y, l.x + 16, l.y + 16);
        g.addColorStop(0, "#b98a5c"); g.addColorStop(1, "#4e3624");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(l.x - 16, l.y + 8);
        ctx.quadraticCurveTo(l.x, l.y - 4, l.x + 16, l.y + 8);
        ctx.quadraticCurveTo(l.x + 12, l.y + 18, l.x, l.y + 18);
        ctx.quadraticCurveTo(l.x - 12, l.y + 18, l.x - 16, l.y + 8);
        ctx.fill();
        ctx.fillStyle = "#3a2718";
        ctx.beginPath(); ctx.ellipse(l.x, l.y + 6, 6, 2.4, 0, 0, TAU); ctx.fill();
        // the flame, which your hand hides
        if (l.lit > 0.02 && !covered) {
          ctx.save();
          ctx.globalCompositeOperation = "screen";
          const fg = ctx.createRadialGradient(l.x, l.y - 6, 1, l.x, l.y - 6, 40 * l.lit);
          fg.addColorStop(0, `rgba(255,228,168,${0.5 * l.lit})`);
          fg.addColorStop(1, "rgba(255,180,90,0)");
          ctx.fillStyle = fg; ctx.beginPath(); ctx.arc(l.x, l.y - 6, 40 * l.lit, 0, TAU); ctx.fill();
          ctx.restore();
          ctx.fillStyle = `rgba(255,238,196,${0.7 + Math.sin(s.t * 9 + l.i) * 0.2})`;
          ctx.beginPath(); ctx.ellipse(l.x, l.y - 6 - l.lit * 3, 2.6, 5 + l.lit * 3, 0, 0, TAU); ctx.fill();
        }
        if (l.saved) {
          ctx.strokeStyle = "rgba(247,221,165,.4)"; ctx.lineWidth = 1.4;
          ctx.beginPath(); ctx.arc(l.x, l.y + 4, 26, 0, TAU); ctx.stroke();
        }
        ctx.restore();
      }
      // the guard's light: a cone crossing the den
      const gx = s.sweepX * c.w;
      ctx.save();
      ctx.globalCompositeOperation = "screen";
      const cone = ctx.createLinearGradient(gx, s.sweepY - 200, gx, s.sweepY + 160);
      cone.addColorStop(0, "rgba(255,204,136,.3)");
      cone.addColorStop(1, "rgba(255,150,70,0)");
      ctx.fillStyle = cone;
      ctx.beginPath();
      ctx.moveTo(gx - 26, s.sweepY - 220);
      ctx.lineTo(gx + 26, s.sweepY - 220);
      ctx.lineTo(gx + 130, s.sweepY + 130);
      ctx.lineTo(gx - 130, s.sweepY + 130);
      ctx.closePath(); ctx.fill();
      ctx.restore();
      ctx.fillStyle = "rgba(255,222,168,.75)";
      ctx.beginPath(); ctx.arc(gx, s.sweepY - 220, 5.5, 0, TAU); ctx.fill();
      // the pool of light it throws on the rock, which is what you time against
      ctx.save();
      ctx.globalCompositeOperation = "screen";
      const pool = ctx.createRadialGradient(gx, s.sweepY + 120, 4, gx, s.sweepY + 120, 120);
      pool.addColorStop(0, "rgba(255,196,120,.34)");
      pool.addColorStop(1, "rgba(255,150,70,0)");
      ctx.fillStyle = pool;
      ctx.beginPath(); ctx.ellipse(gx, s.sweepY + 120, 120, 46, 0, 0, TAU); ctx.fill();
      ctx.restore();
      if (c.pointer.down) handShadow(ctx, c.pointer.x, c.pointer.y + 4, 0.34, 1.35);
    }

    if (mode === "catch") {
      /* A sheaf in the air is a bundle of stalks, so it is drawn as stalks:
         five of them, tapering and bending under the seed, tied with one band.
         The field in the plate already has standing sheaves, so nothing
         standing is drawn again. */
      const sheafArt = (x, y, rot, alpha, sc) => {
        ctx.save();
        ctx.translate(x, y); ctx.rotate(rot); ctx.scale(sc, sc);
        ctx.globalAlpha = alpha;
        for (let k = -2; k <= 2; k++) {
          const bend = k * 1.6;
          ctx.strokeStyle = k % 2 ? "rgba(158,128,74,1)" : "rgba(188,158,96,1)";
          ctx.lineWidth = 1.9; ctx.lineCap = "round";
          ctx.beginPath();
          ctx.moveTo(k * 2.2, 16);
          ctx.quadraticCurveTo(bend * 1.2, -14, bend * 2.2, -40 + Math.abs(k) * 2.6);
          ctx.stroke();
          for (let g = 0; g < 3; g++) {
            const gy = -40 + Math.abs(k) * 2.6 + g * 4.6;
            const gx = bend * 2.2 + Math.sin(g * 1.7 + k) * 1.1;
            ctx.fillStyle = `rgba(${214 - g * 8},${184 - g * 8},${118 - g * 6},.95)`;
            ctx.beginPath(); ctx.ellipse(gx - 1.4, gy, 1.5, 2.6, -0.5, 0, TAU); ctx.fill();
            ctx.beginPath(); ctx.ellipse(gx + 1.4, gy + 1.2, 1.5, 2.6, 0.5, 0, TAU); ctx.fill();
          }
        }
        ctx.strokeStyle = "rgba(84,60,32,.95)"; ctx.lineWidth = 3.2;
        ctx.beginPath(); ctx.moveTo(-8, 4); ctx.lineTo(8, 1); ctx.stroke();
        ctx.strokeStyle = "rgba(196,168,120,.35)"; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(-8, 3); ctx.lineTo(8, 0); ctx.stroke();
        ctx.restore();
      };

      /* Gleaners catch into the fold of an apron, not into their palms. So the
         thing on screen is cloth: her own robe held out by two corners, hanging
         in gathers, swinging when you move it and dipping when a sheaf lands.
         It has to be deep, or it is a green crescent and not a thing that can
         hold anything. */
      const ax = c.pointer.down ? c.pointer.x : c.w * 0.5;
      const caught = s.sheaf && Math.abs(s.sheaf.x - ax) < 52 && s.sheaf.y > c.h * 0.5;
      const sag = 58 + Math.sin(s.t * 2.1) * 2.2 + (caught ? 11 : 0);
      const tilt = clamp((ax - c.w * 0.5) / c.w * 0.55, -0.2, 0.2);
      ctx.save();
      ctx.translate(ax, c.h * 0.70); ctx.rotate(tilt);
      const cs = ctx.createRadialGradient(0, sag + 10, 8, 0, sag + 10, 120);
      cs.addColorStop(0, "rgba(20,22,12,.38)"); cs.addColorStop(1, "rgba(20,22,12,0)");
      ctx.fillStyle = cs;
      ctx.beginPath(); ctx.ellipse(0, sag + 8, 112, 28, 0, 0, TAU); ctx.fill();
      /* Backlit like everything else in these acts: the cloth is a dark drape
         against the sun on the stubble, not a lit green bowl. Only its top edge
         catches the light. */
      const cloth = ctx.createLinearGradient(-30, -10, 26, sag);
      cloth.addColorStop(0, "rgba(46,44,32,.94)");
      cloth.addColorStop(0.45, "rgba(28,28,20,.96)");
      cloth.addColorStop(1, "rgba(14,14,10,.97)");
      ctx.fillStyle = cloth;
      ctx.beginPath();
      ctx.moveTo(-74, -4);
      ctx.quadraticCurveTo(0, -12, 74, -4);
      ctx.quadraticCurveTo(66, sag * 0.5, 36, sag * 0.9);
      ctx.quadraticCurveTo(16, sag * 1.06, -6, sag * 0.98);
      ctx.quadraticCurveTo(-46, sag * 0.82, -74, -4);
      ctx.closePath(); ctx.fill();
      const inside = ctx.createRadialGradient(-4, sag * 0.5, 6, -4, sag * 0.5, sag * 0.86);
      inside.addColorStop(0, "rgba(8,14,12,.5)"); inside.addColorStop(1, "rgba(8,14,12,0)");
      ctx.fillStyle = inside;
      ctx.beginPath(); ctx.ellipse(-4, sag * 0.52, sag * 0.7, sag * 0.5, 0, 0, TAU); ctx.fill();
      for (let i = -2; i <= 2; i++) {
        const fx = i * 26;
        const deep = 0.34 - Math.abs(i) * 0.07;
        ctx.strokeStyle = `rgba(8,16,12,${deep})`;
        ctx.lineWidth = 2.6;
        ctx.beginPath();
        ctx.moveTo(fx * 0.88, -2);
        ctx.quadraticCurveTo(fx * 1.14, sag * 0.56, fx * 0.52, sag * (0.94 - Math.abs(i) * 0.02));
        ctx.stroke();
        ctx.strokeStyle = "rgba(222,200,152,.13)"; ctx.lineWidth = 1.7;
        ctx.beginPath();
        ctx.moveTo(fx * 0.88 + 6, -2);
        ctx.quadraticCurveTo(fx * 1.14 + 7, sag * 0.54, fx * 0.52 + 7, sag * (0.92 - Math.abs(i) * 0.02));
        ctx.stroke();
      }
      ctx.strokeStyle = "rgba(222,206,166,.2)"; ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(-70, -4); ctx.quadraticCurveTo(0, -12, 70, -4);
      ctx.stroke();
      for (const side of [-1, 1]) {
        ctx.fillStyle = "rgba(14,14,10,.5)";
        ctx.beginPath(); ctx.ellipse(side * 72, -4, 7.5, 5.5, side * 0.2, 0, TAU); ctx.fill();
        ctx.fillStyle = "rgba(232,216,172,.18)";
        ctx.beginPath(); ctx.ellipse(side * 72 - side * 2, -7, 4.2, 2.1, side * 0.2, 0, TAU); ctx.fill();
      }
      ctx.restore();

      if (s.sheaf) {
        const sh = s.sheaf;
        // the arc it has come down through, so its landing point is readable
        for (let g = 1; g <= 2; g++) {
          sheafArt(sh.x + g * 5, sh.y - g * 20, sh.rot - g * 0.1, 0.22 - g * 0.07, 1);
        }
        sheafArt(sh.x, sh.y, sh.rot, 1, 1);
        // where it will arrive, so the catch is judged by eye and not by luck
        const f = clamp((sh.y - c.h * 0.34) / (c.h * 0.66 - c.h * 0.34), 0, 1);
        ctx.fillStyle = `rgba(30,34,20,${0.08 + f * 0.2})`;
        ctx.beginPath();
        ctx.ellipse(sh.x, c.h * 0.8, 20 + f * 14, 7 + f * 4, 0, 0, TAU); ctx.fill();
      }
    }
    for (let i = 0; i < cfg.rounds; i++) {
      const xx = c.w / 2 + (i - (cfg.rounds - 1) / 2) * 24;
      const y = c.h * 0.94;
      ctx.beginPath(); ctx.arc(xx, y, i < s.round ? 6 : 4.5, 0, TAU);
      ctx.fillStyle = i < s.round ? "#4fb8a8" : "rgba(255,255,255,.16)"; ctx.fill();
    }
    stageChrome(c, ctx, cfg, { ...s, goalText: `${s.round}/${cfg.rounds}` });
  }

  return { label: () => T(cfg.title), init, step, draw, onDown() {}, onMove() {} };
}

/* ══════════════════════════════════ ACT TYPE 3 · TRACE (walk the road) ══
   The mechanic stays: your finger is the walker, and the road is the only
   line that gets you up the hill. What changed is the material. The road used
   to be a translucent golden ribbon with two crisp edges drawn over the
   painting — a corridor from a puzzle game. It is now a trodden track in the
   plate's own dust: scumbled edges, ruts, stones, your footprints behind you,
   and loose scree wherever you have stepped off it. */
function traceStage(cfg) {
  const centre = (c, y) => c.w * 0.5 + Math.sin(y * 0.013 + 1.2) * c.w * 0.23 + Math.sin(y * 0.031) * c.w * 0.05;
  return {
    label: () => T(cfg.title),
    init(c) {
      if (cfg.hero) preloadSprites();
      c.state = { t: 0, left: cfg.seconds, progress: 0, flash: 0, finished: false,
        wobble: 0, prints: [], dust: [], off: 0 };
      c.setHint(T(cfg.hint));
    },
    step(c, dt) {
      const s = c.state; if (s.finished) return;
      tick(c, s, cfg, dt); if (s.finished) return;
      const f = FIELD(c), p = c.pointer;
      const active = p.down || c.keys.has("arrowup") || c.keys.has("w");
      let moved = false;
      if (active) {
        const kb = c.keys.has("arrowup") || c.keys.has("w");
        const py = kb ? f.bottom - (s.progress + 0.08) * (f.bottom - f.top) : p.y;
        const target = clamp((f.bottom - py) / (f.bottom - f.top), 0, 1);
        const cx = centre(c, py);
        const onRoad = kb || Math.abs(p.x - cx) < 36;
        if (onRoad) {
          const before = s.progress;
          s.progress = Math.min(1, s.progress + dt * 0.42, target + 0.001);
          moved = s.progress > before;
          s.off = Math.max(0, s.off - dt * 3);
        } else {
          s.left -= dt * 1.6; s.flash = 0.7; s.wobble = 1; s.off = Math.min(1, s.off + dt * 4);
          // scree skitters away under a foot that has left the track
          if (Math.random() < dt * 22) {
            s.dust.push({ x: cx + (p.x - cx) * 0.5, y: py, r: rnd(1, 3), life: 0.6, vx: rnd(-30, 30), vy: rnd(-18, 4) });
          }
        }
      }
      // footprints, laid down as the walker moves rather than per frame
      if (moved && s.progress > 0.008 && (!s.prints.length || s.progress - s.prints[s.prints.length - 1].p > 0.035)) {
        const py = f.bottom - s.progress * (f.bottom - f.top);
        s.prints.push({ p: s.progress, x: centre(c, py) + (s.prints.length % 2 ? 6.5 : -6.5), y: py });
        if (s.prints.length > 26) s.prints.shift();
      }
      for (const d of s.dust) { d.x += d.vx * dt; d.y += d.vy * dt; d.vy += 60 * dt; d.life -= dt; }
      s.dust = s.dust.filter((d) => d.life > 0);
      s.wobble = Math.max(0, s.wobble - dt * 2);
      c.progress = s.progress;
      c.setHint(`${T(cfg.hint)}   ${Math.round(s.progress * 100)}%   ${Math.ceil(s.left)}s`);
      // A finger rarely reaches the exact top pixel on a phone. Once the last
      // stretch of road is walked, treat it as arrived instead of stalling.
      if (s.progress >= 0.94) { s.progress = 1; win(c, s, cfg, cfg.reward || 30); }
    },
    draw(c, ctx) {
      const s = c.state; stageBg(c, ctx, cfg);
      const f = FIELD(c);
      const bottom = f.bottom, top = f.top, span = bottom - top;

      /* The track itself. Nothing drawn here has a hard edge: the dust is
         lighter where feet have worn it, and it fades out sideways. Width
         narrows with distance so the road has perspective instead of being a
         constant ribbon. */
      const half = (y) => 16 + ((y - top) / span) * 18;
      const track = (y) => centre(c, y);
      /* The worn ground is stamped, not filled: a chain of soft radial blobs
         down the line of the road. Filling a polygon row by row gave a ladder
         of stripes, and the obvious fix — erasing the edges with
         destination-out inside a clip — punched holes straight through the
         painted plate, because a clip does not protect the canvas underneath.
         Blobs have no edges to erase and nothing outside them is touched. */
      for (let y = top; y <= bottom; y += 7) {
        const hw = half(y);
        for (let k = -1; k <= 1; k++) {
          const cx = track(y) + k * hw * 0.42;
          const r = hw * (0.95 - Math.abs(k) * 0.35);
          const g = ctx.createRadialGradient(cx, y, 1, cx, y, r);
          g.addColorStop(0, "rgba(232,216,184,.055)");
          g.addColorStop(0.5, "rgba(220,202,168,.038)");
          g.addColorStop(1, "rgba(206,188,152,0)");
          ctx.fillStyle = g;
          ctx.beginPath(); ctx.ellipse(cx, y, r, r * 0.85, 0, 0, TAU); ctx.fill();
        }
      }
      // two wheel ruts, and the stones and thorns that line the verge
      for (const side of [-1, 1]) {
        ctx.strokeStyle = "rgba(72,56,36,.2)"; ctx.lineWidth = 3.2;
        ctx.beginPath();
        for (let y = top; y <= bottom; y += 7) {
          const x = track(y) + side * half(y) * 0.42;
          if (y === top) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      for (let i = 0; i < 34; i++) {
        const f2 = hash(i * 3.7);
        const y = top + f2 * span;
        const side = i % 2 ? 1 : -1;
        const x = track(y) + side * (half(y) + 6 + hash(i * 9.1) * 26);
        const rr = 1.2 + hash(i * 5.3) * 2.8;
        ctx.fillStyle = `rgba(${132 + hash(i) * 40},${118 + hash(i * 2) * 30},${92 + hash(i * 3) * 24},.34)`;
        ctx.beginPath(); ctx.ellipse(x, y, rr, rr * 0.7, hash(i * 11) * 3, 0, TAU); ctx.fill();
        if (hash(i * 7.7) > 0.72) {
          // a thorn tuft, dry and grey
          ctx.strokeStyle = "rgba(120,112,78,.3)"; ctx.lineWidth = 1;
          for (let k = -1; k <= 1; k++) {
            ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + k * 4, y - 7 - hash(i + k) * 4); ctx.stroke();
          }
        }
      }
      // your own prints, fading with distance behind you
      for (let i = 0; i < s.prints.length; i++) {
        const pr = s.prints[i];
        const age = 1 - i / Math.max(1, s.prints.length);
        ctx.fillStyle = `rgba(58,44,28,${0.1 + age * 0.24})`;
        ctx.beginPath(); ctx.ellipse(pr.x, pr.y, 4.6, 2.6, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = `rgba(246,232,200,${0.06 + age * 0.1})`;
        ctx.beginPath(); ctx.ellipse(pr.x, pr.y - 3.4, 4.2, 1.5, 0, 0, TAU); ctx.fill();
      }
      // scree knocked loose
      for (const d of s.dust) {
        ctx.fillStyle = `rgba(206,186,148,${d.life * 0.4})`;
        ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, TAU); ctx.fill();
      }
      ctx.restore();

      /* The end of the road is a light somebody left on for you, not a star
         sprite. */
      const gx = centre(c, top), gy = top + 6;
      ctx.save();
      ctx.globalCompositeOperation = "screen";
      const glow = ctx.createRadialGradient(gx, gy, 2, gx, gy, 78);
      glow.addColorStop(0, "rgba(255,226,168,.5)");
      glow.addColorStop(0.45, "rgba(255,196,120,.18)");
      glow.addColorStop(1, "rgba(255,180,90,0)");
      ctx.fillStyle = glow;
      ctx.beginPath(); ctx.arc(gx, gy, 78, 0, TAU); ctx.fill();
      ctx.restore();
      ctx.fillStyle = "rgba(255,238,200,.85)";
      ctx.beginPath(); ctx.ellipse(gx, gy - 2, 2.6, 4.2, 0, 0, TAU); ctx.fill();

      // the walker
      const py = bottom - s.progress * span;
      const px = centre(c, py) + (s.wobble ? Math.sin(c.t * 30) * 5 : 0);
      const walkH = clamp(c.h * 0.13, 56, 118);
      const drewWalker = stageHero(c, ctx, cfg, px, py, walkH, {
        rot: 0.05 + Math.sin(c.t * 8) * 0.015, squash: 1 + Math.sin(c.t * 8) * 0.012, shadow: 0.26
      });
      if (!drewWalker) pilgrim(ctx, px, py, 1.05, c.t * 2, 1, 1, true);
      // a stumble, when the foot is not on the road
      if (s.off > 0.05) {
        ctx.fillStyle = `rgba(206,120,86,${s.off * 0.16})`;
        ctx.fillRect(0, 0, c.w, c.h);
      }
      stageChrome(c, ctx, cfg, { ...s, goalText: `${Math.round(s.progress * 100)}%` });
    },
    onDown() {}, onMove() {}
  };
}

/* ══════════════════ ACT TYPE 4 · GRIP (do the thing with your hand) ═════
   This act used to be a power bar with a sliding golden band: you held until
   the fill entered the band, and let go. Nothing on screen was being held. It
   is now three real grips, chosen by `cfg.mode`:

     sling  — swing the stone round your hand; let go while it is singing.
     rope   — haul a wet rope through your fists, hand over hand.
     breath — hold your breath until your vision narrows, then surface.

   All three are judged by the object's own state (how many turns, how much
   rope, how much air), never by a separate meter. */

/* There is no first-person hand in these acts, and that is deliberate.

   Every version of "your hand" drawn at this size — an ellipse with four
   petals, then shaded anatomy, then a backlit silhouette — read as a flower, a
   mitten or a berry. A hand is the one thing the eye is most expert at, and a
   procedurally drawn one at forty pixels will always be wrong.

   So the camera stays in the player's eyes. You see what the hand does: the
   sling folding over itself, the rope coming in through your fists, the apron
   you hold open, and — in the dark — the shadow of your hand falling across a
   lamp. A shadow is allowed to be ambiguous; a hand is not. */
function handPalm(ctx) {
  ctx.moveTo(-13, 4);
  ctx.quadraticCurveTo(-15, -6, -7, -8);
  ctx.quadraticCurveTo(0, -9.5, 8, -8);
  ctx.quadraticCurveTo(15, -6, 14, 4);
  ctx.quadraticCurveTo(13, 14, 0, 15);
  ctx.quadraticCurveTo(-12, 14, -13, 4);
  ctx.closePath();
}
function handFinger(ctx, bx, by, ang, len, w) {
  ctx.save();
  ctx.translate(bx, by); ctx.rotate(ang);
  ctx.moveTo(-w, 0);
  ctx.quadraticCurveTo(-w * 1.02, len * 0.72, -w * 0.6, len * 0.94);
  ctx.quadraticCurveTo(0, len * 1.22, w * 0.6, len * 0.94);
  ctx.quadraticCurveTo(w * 1.02, len * 0.72, w, 0);
  ctx.closePath();
  ctx.restore();
}
/* One outline for a hand that is only ever seen as a shadow: palm, a forearm
   stub, four fingers with the notches between them, and a thumb. */
function handShape(ctx) {
  ctx.beginPath();
  handPalm(ctx);
  ctx.moveTo(-8, 8); ctx.lineTo(-7.5, 27);
  ctx.quadraticCurveTo(-1, 30.5, 6, 27);
  ctx.lineTo(6, 8); ctx.closePath();
  const ang = [-0.58, -0.2, 0.18, 0.55];
  const len = [19, 23.5, 22, 17.5];
  for (let i = 0; i < 4; i++) handFinger(ctx, Math.sin(ang[i]) * 10, -6.5, ang[i], len[i], 5.0);
  handFinger(ctx, -12, 1, -1.15, 16.5, 5.6);
}
function handShadow(ctx, x, y, rot, sc = 1) {
  ctx.save();
  ctx.translate(x, y); ctx.rotate(rot); ctx.scale(sc, sc);
  // a shadow has no edge: stack low-alpha copies to fake a soft blur
  const off = [[0, 0], [0.9, 0.4], [-0.8, 0.7], [0.4, -0.9], [-0.5, -0.5], [1.4, 1.1], [-1.3, 1.0]];
  for (let pass = 0; pass < 2; pass++) {
    for (const [dx, dy] of off) {
      ctx.save();
      ctx.translate(dx * (pass + 1) * 1.5, dy * (pass + 1) * 1.5);
      ctx.fillStyle = `rgba(4,4,6,${pass ? 0.055 : 0.1})`;
      handShape(ctx);
      ctx.fill();
      ctx.restore();
    }
  }
  ctx.restore();
}
function chargeStage(cfg) {
  const mode = cfg.mode || (cfg.hero === "david" ? "sling" : cfg.hero === "fisherman" ? "rope" : "breath");
  const pivot = (c) => ({ x: c.w * 0.5, y: c.h * 0.62 });

  function init(c) {
    if (cfg.hero) preloadSprites();
    c.state = {
      t: 0, left: cfg.seconds, round: 0, flash: 0, finished: false, mode,
      // sling
      rev: 0, dir: 0, lastAng: null, fly: null, whip: 0,
      // rope
      pull: 0, lastY: null, hauls: 0, handY: c.h * 0.72, grip: 0,
      // breath
      air: 1, depth: 0, diving: false, surfacing: 0, gasp: 0
    };
    c.setHint(T(cfg.hint));
  }

  function step(c, dt) {
    const s = c.state; if (s.finished) return;
    tick(c, s, cfg, dt); if (s.finished) return;
    const p = c.pointer;

    if (mode === "sling") {
      const pv = pivot(c);
      if (p.down) {
        const ang = Math.atan2(p.y - pv.y, p.x - pv.x);
        if (s.lastAng !== null) {
          let d = ang - s.lastAng;
          while (d > Math.PI) d -= TAU;
          while (d < -Math.PI) d += TAU;
          // a change of direction loses the wind-up: a sling has to keep going one way
          if (Math.abs(d) > 0.002 && s.dir !== 0 && Math.sign(d) !== s.dir) s.rev = Math.max(0, s.rev - 0.3);
          else {
            s.dir = Math.sign(d) || s.dir;
            s.rev = Math.min(2.6, s.rev + Math.abs(d) / TAU);
          }
          s.whip = Math.min(1, s.rev / 1.1);
        }
        s.lastAng = ang;
      } else {
        if (s.rev > 0) {
          if (s.rev >= 0.92) {
            // released while it was singing: the stone goes
            s.fly = { x: pv.x, y: pv.y, t: 0 };
            s.round++; s.dir = 0; s.rev = 0;
            c.addScore(12); c.hit("good");
            c.float(c.w / 2, c.h * 0.42, tx("A clean throw", "干净的一甩"), "#f4d79b");
            if (s.round >= cfg.rounds) win(c, s, cfg, cfg.reward || 30);
          } else if (s.rev > 0.25) {
            c.float(pv.x, pv.y - 40, tx("Not enough wind", "还没转起来"), "#d8b48e");
            s.rev = 0; s.dir = 0;
          } else { s.rev = 0; s.dir = 0; }
        }
        s.lastAng = null;
      }
      if (s.fly) {
        s.fly.t += dt;
        if (s.fly.t > 0.5) s.fly = null;
      }
      c.progress = s.round / cfg.rounds;
    }

    if (mode === "rope") {
      /* Only downward travel on the rope counts, and only while you are
         actually holding it — a stroke is one hand over the other. */
      if (p.down) {
        if (s.lastY !== null && p.y > s.lastY) s.pull = Math.min(1.4, s.pull + (p.y - s.lastY) / (c.h * 0.34));
        s.lastY = p.y; s.grip = Math.min(1, s.grip + dt * 4);
      } else {
        if (s.grip > 0.3) {
          if (s.pull >= 0.55) {
            s.hauls++; s.round++;
            c.addScore(11); c.hit("good");
            c.float(c.w * 0.5, c.h * 0.46, tx("Hauled!", "拉上一把"), "#f4d79b");
            c.spark(c.w * 0.5, s.handY, "#bcd9d6", 14, 120);
            if (s.round >= cfg.rounds) win(c, s, cfg, cfg.reward || 30);
          } else if (s.pull > 0.15) c.float(c.w * 0.5, c.h * 0.86, tx("Pull further", "再拉长一点"), "#d8b48e");
        }
        s.pull = 0; s.lastY = null; s.grip = 0;
      }
      s.handY = c.h * (0.72 - s.round * 0.1) + Math.sin(s.t * 2) * 3;
      c.progress = (s.round + Math.min(1, s.pull)) / cfg.rounds;
    }

    if (mode === "breath") {
      if (p.down) {
        s.diving = true;
        s.air = Math.max(0, s.air - dt * 0.42);
        s.depth = 1 - s.air;
        if (s.air <= 0) {
          s.diving = false; s.gasp = 1;
          penalty(c, s, 3, "A GASP");
          s.air = 1; s.depth = 0; s.diving = false;
        }
      } else if (s.diving) {
        s.diving = false;
        if (s.depth >= 0.42 && s.depth <= 0.92) {
          s.round++; c.addScore(12); c.hit("good");
          c.float(c.w / 2, c.h * 0.4, tx("One breath, one dive", "一口气，一次下潜"), "#cfe8e4");
          c.spark(c.w * 0.5, c.h * 0.5, "#cfe8e4", 20, 140);
          if (s.round >= cfg.rounds) win(c, s, cfg, cfg.reward || 30);
        } else if (s.depth > 0.1) c.float(c.w / 2, c.h * 0.4, tx("Too shallow", "太浅了"), "#d8b48e");
        s.air = 1; s.depth = 0; s.surfacing = 1;
      }
      s.surfacing = Math.max(0, s.surfacing - dt * 2);
      s.gasp = Math.max(0, s.gasp - dt * 1.6);
      c.progress = s.round / cfg.rounds;
    }

    c.setHint(`${T(cfg.hint)}   ${s.round}/${cfg.rounds}   ${Math.ceil(s.left)}s`);
  }

  function draw(c, ctx) {
    const s = c.state;
    stageBg(c, ctx, cfg);
    const p = c.pointer;

    if (mode === "sling") {
      const pv = pivot(c);
      const heroH = clamp(c.h * 0.24, 100, 190);
      const drew = stageHero(c, ctx, cfg, c.w * 0.34, c.h * 0.82, heroH, {
        rot: -0.04 - s.whip * 0.06, squash: 1 - s.whip * 0.01, shadow: 0.3
      });
      if (!drew) pilgrim(ctx, c.w * 0.34, c.h * 0.82, 1.1, c.t * 2, 1, 1, true);
      /* The pivot is your grip: the pouch of the sling, folded over the cord,
         with the stone circling above it. Drawing the hand itself here was what
         made this read as a sticker; a hand-shaped shadow behind the pouch is
         all the information the eye needs. */
      handShadow(ctx, pv.x + 6, pv.y + 8, -0.5, 0.85);
      ctx.save();
      ctx.translate(pv.x, pv.y); ctx.rotate(-0.35);
      const pouch = ctx.createLinearGradient(0, -9, 0, 10);
      pouch.addColorStop(0, "#6a5236"); pouch.addColorStop(1, "#2b2119");
      ctx.fillStyle = pouch;
      ctx.beginPath();
      ctx.moveTo(-13, -6); ctx.quadraticCurveTo(0, -12, 13, -6);
      ctx.quadraticCurveTo(10, 8, 0, 10);
      ctx.quadraticCurveTo(-10, 8, -13, -6);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = "rgba(226,198,150,.45)"; ctx.lineWidth = 1.1;
      ctx.beginPath(); ctx.moveTo(-10, -4); ctx.quadraticCurveTo(0, -8, 10, -4); ctx.stroke();
      ctx.restore();
      const rad = 26 + s.rev * 16;
      const ang = s.lastAng !== null ? s.lastAng : -c.t * 2;
      ctx.strokeStyle = `rgba(240,224,190,${0.25 + s.rev * 0.4})`;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(pv.x, pv.y, rad, ang - 0.9 - s.rev * 1.6, ang);
      ctx.stroke();
      // the cord, drawn as a tapering spiral
      ctx.strokeStyle = "rgba(228,210,178,.7)"; ctx.lineWidth = 1.4;
      ctx.beginPath();
      for (let k = 0; k <= 26; k++) {
        const f = k / 26, a = ang - f * (1.2 + s.rev * 2.4), rr = rad * (1 - f * 0.18);
        const x = pv.x + Math.cos(a) * rr, y = pv.y + Math.sin(a) * rr;
        if (k === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.fillStyle = "#efe3c2";
      ctx.beginPath(); ctx.arc(pv.x + Math.cos(ang) * rad, pv.y + Math.sin(ang) * rad, 5, 0, TAU); ctx.fill();
      // the mark to hit
      const tg = { x: c.w * 0.77, y: c.h * 0.4 };
      const ready = s.rev >= 0.92;
      ctx.strokeStyle = ready ? "rgba(255,236,180,.85)" : "rgba(226,196,150,.3)";
      ctx.lineWidth = ready ? 2.6 : 1.6;
      for (let r = 0; r < 2; r++) {
        ctx.beginPath(); ctx.arc(tg.x, tg.y, 14 + r * 13, 0, TAU); ctx.stroke();
      }
      if (s.fly) {
        const f = s.fly.t / 0.5;
        ctx.fillStyle = "rgba(255,246,214,.95)";
        ctx.beginPath();
        ctx.arc(pv.x + (tg.x - pv.x) * f, pv.y + (tg.y - pv.y) * f - Math.sin(f * Math.PI) * 40, 5, 0, TAU);
        ctx.fill();
      }
    }

    if (mode === "rope") {
      /* The painting already has the mast, the yard and the torn sail, and an
         earlier version drew a second one on top of them and then hung a
         vertical bar down the middle of the frame, which read as a pole. What
         is added is only the halyard: a wet line running down from the yard on
         the right through your hands, and what you have hauled lying coiled on
         the deck. */
      const top = { x: c.w * 0.84, y: c.h * 0.11 };
      const hand = { x: c.w * 0.58, y: s.handY };
      const ease = 0.42 + s.pull * 0.3;
      const sag = 92 - s.pull * 44;
      const ropePath = (off) => {
        ctx.beginPath();
        ctx.moveTo(top.x + off, top.y);
        ctx.bezierCurveTo(
          top.x - sag + off, top.y + (hand.y - top.y) * 0.36,
          hand.x + sag + off, top.y + (hand.y - top.y) * ease,
          hand.x + off, hand.y);
      };
      /* A rope and not a spar: no single bright edge, which is what made the
         earlier version read as a pole. Instead, three strands laid side by
         side, each catching a different amount of storm light. */
      /* A wet rope in a night squall is nearly a silhouette. The earlier
         version kept drawing it as a lit tan line, which read as a spar. */
      ropePath(0);
      ctx.strokeStyle = "rgba(6,6,5,.97)"; ctx.lineWidth = 7.2; ctx.lineCap = "round"; ctx.stroke();
      ropePath(0);
      ctx.strokeStyle = "rgba(26,24,20,.9)"; ctx.lineWidth = 4.2; ctx.stroke();
      ropePath(0);
      ctx.strokeStyle = "rgba(96,94,84,.14)"; ctx.lineWidth = 1.3;
      ctx.setLineDash([4, 7]); ctx.lineDashOffset = -s.t * 34; ctx.stroke(); ctx.setLineDash([]);

      // the turns of tarred cord you take hold of: three, one per haul
      for (let i = 0; i < 3; i++) {
        const wy = hand.y + 6 + i * 15 - s.pull * 10;
        const wx = hand.x + 2 + i * 0.8;
        ctx.strokeStyle = "rgba(18,16,12,.88)"; ctx.lineWidth = 5;
        ctx.beginPath(); ctx.moveTo(wx - 8, wy + 4); ctx.lineTo(wx + 8, wy - 4); ctx.stroke();
        ctx.strokeStyle = "rgba(204,188,152,.4)"; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.moveTo(wx - 7, wy + 2); ctx.lineTo(wx + 7, wy - 5); ctx.stroke();
      }
      // the tail of it, falling away out of your grip
      // the tail of it, falling away out of your grip and into the spray
      ctx.strokeStyle = "rgba(14,13,11,.85)"; ctx.lineWidth = 4.6; ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(hand.x + 1, hand.y + 40);
      ctx.quadraticCurveTo(hand.x - 30, c.h * 0.78, hand.x - 74, c.h * 0.82);
      ctx.stroke();
      // what you have already hauled, coiled on the deck
      for (let i = 0; i < s.hauls; i++) {
        ctx.strokeStyle = `rgba(74,64,46,${0.7 - i * 0.14})`; ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.ellipse(hand.x - 80, c.h * 0.84 - i * 7, 24 - i * 2, 7, 0.12, 0, TAU);
        ctx.stroke();
      }
      if (s.pull > 0.05) {
        // water squeezed out of the rope by your grip
        ctx.fillStyle = `rgba(200,230,228,${Math.min(0.5, s.pull * 0.4)})`;
        for (let i = 0; i < 4; i++) {
          const dy = hand.y + 22 + i * 16;
          ctx.beginPath(); ctx.ellipse(hand.x + (i % 2 ? 7 : -7), dy, 2, 4, 0, 0, TAU); ctx.fill();
        }
      }
    }

    if (mode === "breath") {
      const heroH = clamp(c.h * 0.26, 110, 200);
      const drew = stageHero(c, ctx, cfg, c.w * 0.5, c.h * 0.84, heroH, {
        rot: s.diving ? 0.12 : 0.02, squash: 1 + Math.sin(s.t * 1.4) * 0.01, shadow: 0.28
      });
      if (!drew) pilgrim(ctx, c.w * 0.5, c.h * 0.84, 1.1, c.t * 2, 1, 1, true);
      // the water rises past the frame as the breath runs out
      const line = c.h * (0.9 - s.depth * 0.55);
      const wg = ctx.createLinearGradient(0, line, 0, c.h);
      wg.addColorStop(0, "rgba(60,116,124,.34)");
      wg.addColorStop(1, "rgba(12,34,42,.82)");
      ctx.fillStyle = wg;
      ctx.fillRect(0, line, c.w, c.h - line);
      /* The surface is not a drawn squiggle: it is where the light comes
         through the water. Two soft caustic bands, the brighter one on top,
         and the underside of the swell beneath them. */
      ctx.save();
      ctx.globalCompositeOperation = "screen";
      for (let band = 0; band < 2; band++) {
        const by = line + band * 9;
        const ca = 0.16 - band * 0.06;
        ctx.strokeStyle = `rgba(196,236,232,${ca + Math.sin(s.t * 2.6 + band) * 0.05})`;
        ctx.lineWidth = band ? 5 : 8;
        ctx.beginPath();
        for (let x = -10; x <= c.w + 10; x += 12) {
          const y = by + Math.sin(x * 0.033 + s.t * 1.7 + band * 1.1) * (5 - band * 2);
          if (x === -10) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      ctx.restore();
      // the breath you are spending, leaving you as bubbles
      const bx0 = c.w * 0.5, by0 = c.h * 0.8;
      for (let i = 0; i < 9; i++) {
        const ph = (s.t * (s.diving ? 0.55 : 0.3) + i * 0.11) % 1;
        const bx = bx0 + Math.sin(ph * 7 + i) * (10 + ph * 26);
        const by = by0 - ph * (by0 - line) * 0.95;
        ctx.fillStyle = `rgba(214,242,238,${(1 - ph) * 0.5})`;
        ctx.beginPath(); ctx.arc(bx, by, 1.4 + (i % 3) * 0.9 + ph * 1.6, 0, TAU); ctx.fill();
      }
      // the edges darken: the body's own warning that the breath is going
      if (s.depth > 0.05) {
        const v = ctx.createRadialGradient(c.w / 2, c.h * 0.5, c.h * (0.42 - s.depth * 0.3), c.w / 2, c.h * 0.5, c.h * 0.8);
        v.addColorStop(0, "rgba(0,0,0,0)");
        v.addColorStop(1, `rgba(2,8,10,${0.35 + s.depth * 0.5})`);
        ctx.fillStyle = v; ctx.fillRect(0, 0, c.w, c.h);
      }
      if (s.gasp > 0.02) {
        ctx.fillStyle = `rgba(180,90,70,${s.gasp * 0.3})`;
        ctx.fillRect(0, 0, c.w, c.h);
      }
    }

    // pips: how many clean ones are done
    for (let i = 0; i < cfg.rounds; i++) {
      const xx = c.w / 2 + (i - (cfg.rounds - 1) / 2) * 24;
      const y = c.h * 0.94;
      ctx.beginPath(); ctx.arc(xx, y, i < s.round ? 6 : 4.5, 0, TAU);
      ctx.fillStyle = i < s.round ? "#4fb8a8" : "rgba(255,255,255,.16)"; ctx.fill();
    }
    stageChrome(c, ctx, cfg, { ...s, goalText: `${s.round}/${cfg.rounds}` });
  }

  return {
    label: () => T(cfg.title),
    init, step, draw,
    onDown(c, p) {
      const s = c.state; if (s.finished) return;
      if (mode === "sling") { s.lastAng = Math.atan2(p.y - pivot(c).y, p.x - pivot(c).x); }
      if (mode === "rope") { s.lastY = p.y; s.grip = 0.01; }
    },
    onUp(c) {
      const s = c.state; if (s.finished) return;
      if (mode === "rope") s.grip = 1;   // releasing is what completes the stroke
    }
  };
}

/* ══════════════════ ACT TYPE 5 · RECALL (seals and branches) ═══════════
   This was six floating glyphs — ◍ ✧ ❀ ✟ ⌁ ✦ — lighting up in an order and
   being tapped back. Abstract to the point of having no subject. Two modes:

     seal   — the herald reads the decree, and you press the royal seals into
              wax on the scroll in the order he read them.
     branch — the crowd below points which bough to take; you go where they
              point, in that order. */

const SEAL_NAMES = ["lion", "crown", "wing", "star", "cup", "key"];

function drawSeal(ctx, x, y, r, i, lit, t) {
  ctx.save(); ctx.translate(x, y);
  // the wax sits proud of the parchment, so it drops its own small shadow
  const ds = ctx.createRadialGradient(2, 5, 1, 2, 5, r * 1.2);
  ds.addColorStop(0, "rgba(20,10,6,.5)"); ds.addColorStop(1, "rgba(20,10,6,0)");
  ctx.fillStyle = ds;
  ctx.beginPath(); ctx.ellipse(2, 5, r * 1.2, r * 0.9, 0, 0, TAU); ctx.fill();
  // the wax disc
  const g = ctx.createRadialGradient(-r * 0.3, -r * 0.35, r * 0.1, 0, 0, r);
  g.addColorStop(0, lit ? "#e88a68" : "#a9523f");
  g.addColorStop(0.7, lit ? "#b8503a" : "#7d3a2a");
  g.addColorStop(1, lit ? "#74281a" : "#4a231a");
  ctx.fillStyle = g;
  ctx.beginPath();
  for (let k = 0; k <= 14; k++) {
    const a = (k / 14) * TAU;
    const rr = r * (0.94 + Math.sin(k * 2.3 + i) * 0.06);
    ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = lit ? "rgba(255,214,168,.75)" : "rgba(255,190,150,.2)";
  ctx.lineWidth = 1.4; ctx.stroke();
  // a wet highlight on the shoulder of the wax
  const hg = ctx.createRadialGradient(-r * 0.42, -r * 0.45, 0.5, -r * 0.42, -r * 0.45, r * 0.7);
  hg.addColorStop(0, `rgba(255,226,196,${lit ? 0.5 : 0.26})`);
  hg.addColorStop(1, "rgba(255,226,196,0)");
  ctx.fillStyle = hg;
  ctx.beginPath(); ctx.arc(-r * 0.42, -r * 0.45, r * 0.7, 0, TAU); ctx.fill();
  // an impressed sign in the wax
  ctx.strokeStyle = lit ? "rgba(38,8,4,.95)" : "rgba(28,8,6,.9)";
  ctx.lineWidth = 2.4; ctx.lineCap = "round";
  const s = r * 0.42;
  ctx.beginPath();
  switch (SEAL_NAMES[i % 6]) {
    case "lion":
      ctx.moveTo(-s, s * 0.6); ctx.lineTo(0, -s * 0.7); ctx.lineTo(s, s * 0.6);
      ctx.moveTo(-s * 0.45, s * 0.05); ctx.lineTo(s * 0.45, s * 0.05); break;
    case "crown":
      ctx.moveTo(-s, s * 0.5); ctx.lineTo(-s, -s * 0.3); ctx.lineTo(-s * 0.35, s * 0.1);
      ctx.lineTo(0, -s * 0.75); ctx.lineTo(s * 0.35, s * 0.1); ctx.lineTo(s, -s * 0.3);
      ctx.lineTo(s, s * 0.5); ctx.closePath(); break;
    case "wing":
      ctx.moveTo(-s, s * 0.4); ctx.quadraticCurveTo(0, -s * 0.8, s, -s * 0.2);
      ctx.quadraticCurveTo(s * 0.2, s * 0.1, -s, s * 0.4); break;
    case "star":
      for (let k = 0; k < 10; k++) {
        const a = -Math.PI / 2 + k * Math.PI / 5, rr = k % 2 ? s * 0.45 : s;
        ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
      }
      ctx.closePath(); break;
    case "cup":
      ctx.moveTo(-s * 0.7, -s * 0.5); ctx.lineTo(s * 0.7, -s * 0.5);
      ctx.quadraticCurveTo(s * 0.5, s * 0.5, 0, s * 0.6);
      ctx.quadraticCurveTo(-s * 0.5, s * 0.5, -s * 0.7, -s * 0.5); break;
    default:
      ctx.arc(0, -s * 0.2, s * 0.45, 0, TAU);
      ctx.moveTo(0, s * 0.25); ctx.lineTo(0, s * 0.8);
      ctx.moveTo(-s * 0.35, s * 0.8); ctx.lineTo(s * 0.35, s * 0.8); break;
  }
  ctx.stroke();
  ctx.save(); ctx.translate(0, 1.2);
  ctx.strokeStyle = "rgba(255,206,168,.28)"; ctx.stroke();
  ctx.restore();
  if (lit) {
    ctx.save(); ctx.globalCompositeOperation = "screen";
    const halo = ctx.createRadialGradient(0, 0, r * 0.4, 0, 0, r * 2.2);
    halo.addColorStop(0, `rgba(255,196,140,${0.3 + Math.sin(t * 4) * 0.08})`);
    halo.addColorStop(1, "rgba(255,140,80,0)");
    ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(0, 0, r * 2.2, 0, TAU); ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

function orderStage(cfg) {
  const mode = cfg.mode || "seal";

  function init(c) {
    const n = 6;
    const cells = Array.from({ length: n }, (_, i) => ({
      i,
      x: c.w * (0.2 + (i % 3) * 0.3),
      y: c.h * (mode === "seal" ? 0.60 : 0.5) + Math.floor(i / 3) * c.h * (mode === "seal" ? 0.13 : 0.15)
    }));
    c.state = {
      t: 0, left: cfg.seconds, cells, round: 0, seq: [], shown: 0, phase: "show",
      timer: 0, flash: 0, finished: false, active: -1, stamped: [], mode
    };
    newRound(c, c.state, cfg);
    c.setHint(T(cfg.hint));
  }

  function step(c, dt) {
    const s = c.state; if (s.finished) return;
    tick(c, s, cfg, dt); if (s.finished) return;
    s.timer -= dt;
    if (s.phase === "show") {
      const beat = Math.floor((s.showTotal - s.timer) / 0.62);
      s.active = beat < s.seq.length ? s.seq[beat] : -1;
      if (s.timer <= 0) { s.phase = "input"; s.shown = 0; s.active = -1; }
    }
    c.progress = (s.round + (s.phase === "show" ? 0 : s.shown / Math.max(1, s.seq.length))) / cfg.rounds;
    c.setHint(s.phase === "show"
      ? (mode === "seal" ? tx("The herald reads the decree…", "传令官宣读谕旨…") : tx("The crowd points the way…", "人群指路…"))
      : `${T(cfg.hint)}   ${s.shown}/${s.seq.length}`);
  }

  function draw(c, ctx) {
    const s = c.state;
    stageBg(c, ctx, cfg);

    if (mode === "seal") {
      /* A decree is a physical thing: a skin of parchment with a torn edge,
         curled at the corners, lying on the floor in front of the throne. The
         old version was a hard cream rectangle pasted over the king — a UI
         panel wearing a costume. */
      ctx.save();
      ctx.translate(c.w * 0.5, c.h * 0.68); ctx.rotate(-0.048);
      const sw = c.w * 0.82, sh = c.h * 0.34;
      // the shadow it casts on the floor
      const shd = ctx.createRadialGradient(4, sh * 0.5, 10, 4, sh * 0.5, sw * 0.62);
      shd.addColorStop(0, "rgba(6,4,3,.5)"); shd.addColorStop(1, "rgba(6,4,3,0)");
      ctx.fillStyle = shd;
      ctx.beginPath(); ctx.ellipse(4, sh * 0.52, sw * 0.62, sh * 0.72, 0, 0, TAU); ctx.fill();
      // the skin: a torn edge, not a rounded rectangle
      const edge = (k) => Math.sin(k * 12.9) * 3.2 + Math.sin(k * 31.7) * 1.6;
      ctx.beginPath();
      for (let k = 0; k <= 16; k++) { const f = k / 16; ctx.lineTo(-sw / 2 + f * sw, -sh / 2 + edge(k)); }
      for (let k = 0; k <= 10; k++) { const f = k / 10; ctx.lineTo(sw / 2 + edge(k + 20), -sh / 2 + f * sh); }
      for (let k = 16; k >= 0; k--) { const f = k / 16; ctx.lineTo(-sw / 2 + f * sw, sh / 2 + edge(k + 40)); }
      for (let k = 10; k >= 0; k--) { const f = k / 10; ctx.lineTo(-sw / 2 + edge(k + 60), -sh / 2 + f * sh); }
      ctx.closePath();
      const skin = ctx.createLinearGradient(-sw / 2, -sh / 2, sw / 2, sh / 2);
      skin.addColorStop(0, "#cfbd97"); skin.addColorStop(0.45, "#bda884");
      skin.addColorStop(0.8, "#a08b6a"); skin.addColorStop(1, "#836f52");
      ctx.fillStyle = skin; ctx.fill();
      const lit = ctx.createLinearGradient(0, -sh / 2, 0, sh / 2);
      lit.addColorStop(0, "rgba(255,246,222,.32)");
      lit.addColorStop(0.4, "rgba(255,246,222,0)");
      lit.addColorStop(1, "rgba(38,24,14,.5)");
      ctx.fillStyle = lit; ctx.fill();
      // the hall is lamplit, not daylight: knock the paper back into the room
      ctx.save(); ctx.clip();
      ctx.fillStyle = "rgba(38,26,16,.22)";
      ctx.fillRect(-sw / 2 - 8, -sh / 2 - 8, sw + 16, sh + 16);
      ctx.restore();
      ctx.save(); ctx.clip();
      for (let i = 0; i < 7; i++) {
        const bx = (hash(i * 5.1) - 0.5) * sw, by = (hash(i * 9.7) - 0.5) * sh;
        const br = 16 + hash(i * 2.3) * 44;
        const bl = ctx.createRadialGradient(bx, by, 1, bx, by, br);
        bl.addColorStop(0, "rgba(120,88,52,.14)"); bl.addColorStop(1, "rgba(120,88,52,0)");
        ctx.fillStyle = bl; ctx.beginPath(); ctx.arc(bx, by, br, 0, TAU); ctx.fill();
      }
      // writing, kept to the margins so it never runs through a seal
      ctx.strokeStyle = "rgba(78,56,34,.34)"; ctx.lineWidth = 1.6; ctx.lineCap = "round";
      for (const [row, ly] of [[0, -sh * 0.4], [1, -sh * 0.35], [2, sh * 0.3], [3, sh * 0.35]]) {
        let lx = -sw * 0.42;
        ctx.beginPath();
        while (lx < sw * 0.4) {
          const w = 12 + hash(row * 31 + lx) * 26;
          ctx.moveTo(lx, ly); ctx.lineTo(Math.min(sw * 0.4, lx + w), ly);
          lx += w + 6 + hash(lx + row) * 10;
        }
        ctx.stroke();
      }
      ctx.restore();
      ctx.restore();
    } else {
      /* No trunk and no boughs are drawn here: the plate is already a sycamore
         with a man up it, and an earlier version laid a tan fork over the
         painted tree. What is added is the drop below — the one thing that
         changes if you take a wrong bough. */
      const drop = ctx.createLinearGradient(0, c.h * 0.8, 0, c.h);
      drop.addColorStop(0, "rgba(6,10,12,0)");
      drop.addColorStop(1, "rgba(6,10,12,.6)");
      ctx.fillStyle = drop;
      ctx.fillRect(0, c.h * 0.8, c.w, c.h * 0.2);
    }

    for (let i = 0; i < s.cells.length; i++) {
      const cell = s.cells[i], active = i === s.active;
      const done = s.stamped.includes(i);
      if (mode === "seal") {
        drawSeal(ctx, cell.x, cell.y, 26, i, active, c.t);
        if (done) {
          // the seal sits pressed into the wax, so it is marked by its own shine
          ctx.strokeStyle = "rgba(255,240,200,.5)"; ctx.lineWidth = 1.6;
          ctx.beginPath(); ctx.arc(cell.x, cell.y, 31, 0, TAU); ctx.stroke();
        }
      } else {
        /* A bough hanging out of the canopy above you, close enough to take
           hold of: the stem fades up into leaves the plate already has, the
           leaf mass is olive and in shadow, and the fig at the give of the
           branch is where your hand goes. Light runs down the stem when the
           crowd points at it — no ring, no reticle. */
        ctx.save();
        ctx.translate(cell.x, cell.y);
        const sway = Math.sin(c.t * 1.1 + i * 1.7) * 2.4;
        const rot = (i % 3 - 1) * 0.12;
        ctx.rotate(rot);
        const stem = ctx.createLinearGradient(0, -120, 0, 14);
        stem.addColorStop(0, "rgba(58,48,34,0)");
        stem.addColorStop(0.45, "rgba(74,62,44,.75)");
        stem.addColorStop(1, "rgba(96,80,56,.95)");
        ctx.strokeStyle = stem; ctx.lineWidth = 5.5; ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(sway * 0.4, -118);
        ctx.quadraticCurveTo(sway, -50, 0, 10);
        ctx.stroke();
        // the shadow the bough casts on the crowd below
        const ls = ctx.createRadialGradient(4, 30, 4, 4, 30, 40);
        ls.addColorStop(0, "rgba(6,10,8,.28)"); ls.addColorStop(1, "rgba(6,10,8,0)");
        ctx.fillStyle = ls;
        ctx.beginPath(); ctx.ellipse(4, 30, 40, 20, 0, 0, TAU); ctx.fill();
        // the leaf mass: olive, in the tree's own shadow, with one lit edge
        for (let k = 0; k < 7; k++) {
          const a2 = -2.5 + k * 0.52 + Math.sin(i + k) * 0.1;
          const lx = Math.cos(a2) * (16 + (k % 3) * 7), ly = -6 + Math.sin(a2) * (13 + (k % 2) * 6);
          ctx.save();
          ctx.translate(lx, ly); ctx.rotate(a2 + 1.1);
          const lg = ctx.createLinearGradient(-9, 0, 9, 0);
          if (active) { lg.addColorStop(0, "rgba(176,192,120,.95)"); lg.addColorStop(1, "rgba(96,112,64,.95)"); }
          else { lg.addColorStop(0, "rgba(104,116,74,.86)"); lg.addColorStop(1, "rgba(58,68,42,.9)"); }
          ctx.fillStyle = lg;
          ctx.beginPath(); ctx.ellipse(0, 0, 10.5, 4.2, 0, 0, TAU); ctx.fill();
          ctx.strokeStyle = "rgba(30,38,20,.35)"; ctx.lineWidth = 0.8; ctx.stroke();
          ctx.restore();
        }
        // the fig where the branch gives
        const fg = ctx.createRadialGradient(-3, 1, 1, 0, 4, 11);
        fg.addColorStop(0, active ? "rgba(246,222,170,.96)" : "rgba(150,116,68,.92)");
        fg.addColorStop(1, active ? "rgba(112,70,32,.96)" : "rgba(58,40,24,.96)");
        ctx.fillStyle = fg;
        ctx.beginPath(); ctx.ellipse(0, 6, 8.4, 10, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = "rgba(255,236,196,.36)";
        ctx.beginPath(); ctx.ellipse(-2.4, 2.4, 2.8, 2, -0.3, 0, TAU); ctx.fill();
        if (done) {
          ctx.strokeStyle = "rgba(255,236,180,.42)"; ctx.lineWidth = 1.3;
          ctx.beginPath(); ctx.arc(0, 6, 13, 0, TAU); ctx.stroke();
        }
        if (active) {
          ctx.save(); ctx.globalCompositeOperation = "screen";
          const glow = ctx.createRadialGradient(0, 2, 2, 0, 2, 44);
          glow.addColorStop(0, `rgba(255,226,166,${0.26 + Math.sin(c.t * 5) * 0.07})`);
          glow.addColorStop(1, "rgba(255,180,90,0)");
          ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(0, 2, 44, 0, TAU); ctx.fill();
          ctx.restore();
        }
        ctx.restore();
      }
    }

    for (let i = 0; i < s.seq.length; i++) {
      const xx = c.w / 2 + (i - (s.seq.length - 1) / 2) * 18;
      ctx.beginPath(); ctx.arc(xx, c.h * 0.9, i < s.shown ? 5.5 : 4, 0, TAU);
      ctx.fillStyle = i < s.shown ? "#4fb8a8" : "rgba(255,255,255,.16)"; ctx.fill();
    }
    stageChrome(c, ctx, cfg, { ...s, goalText: `${s.round}/${cfg.rounds}` });
  }

  return {
    label: () => T(cfg.title),
    init, step, draw,
    onDown(c, p) {
      const s = c.state; if (s.finished || s.phase !== "input") return;
      let hit = -1;
      for (let i = 0; i < s.cells.length; i++) if (dist(p.x, p.y, s.cells[i].x, s.cells[i].y) < 40) hit = i;
      if (hit < 0) return;
      if (hit === s.seq[s.shown]) {
        s.shown++; s.stamped.push(hit);
        c.addScore(5); c.hit("tap");
        c.spark(s.cells[hit].x, s.cells[hit].y, "#f0b48a", 10, 90);
        if (s.shown >= s.seq.length) {
          s.round++; c.addScore(10); c.hit("good");
          if (s.round >= cfg.rounds) win(c, s, cfg, cfg.reward || 30);
          else {
            newRound(c, s, cfg);
            c.float(c.w / 2, c.h * 0.42, mode === "seal" ? tx("Sealed", "已用印") : tx("Higher", "再往上"), "#f4d79b");
          }
        }
      } else { penalty(c, s, 3, mode === "seal" ? "WRONG SEAL" : "WRONG BOUGH"); newRound(c, s, cfg); }
    }
  };
}
function newRound(c, s, cfg) {
  const len = 3 + s.round;
  s.seq = Array.from({ length: len }, () => Math.floor(Math.random() * 6));
  s.phase = "show"; s.shown = 0; s.stamped = [];
  s.showTotal = len * 0.62 + 0.35; s.timer = s.showTotal; s.active = -1;
}

/* ══════════════════════════════════ ACT TYPE 6 · DODGE (cross the valley) ══
   David's middle act, and the last of the six to still be drawn in symbols:
   the spears were a line with a triangle on the end, and the valley floor was
   a grey band with an outlined edge. Both are now made of the same stuff as
   the plate — ash wood, iron, dust, and a giant who is very far away. */
function spearArt(ctx, x, y, rot, len, alpha, sc) {
  ctx.save();
  ctx.translate(x, y); ctx.rotate(rot); ctx.scale(sc, sc);
  ctx.globalAlpha = alpha;
  // the shaft, tapered, with a shadow side
  const shaft = ctx.createLinearGradient(0, -2.6, 0, 2.6);
  shaft.addColorStop(0, "#8e7450");
  shaft.addColorStop(0.45, "#5e482c");
  shaft.addColorStop(1, "#2c2115");
  ctx.fillStyle = shaft;
  ctx.beginPath();
  ctx.moveTo(-len / 2, -2.4); ctx.lineTo(len / 2 - 14, -1.6);
  ctx.lineTo(len / 2 - 14, 1.6); ctx.lineTo(-len / 2, 2.4);
  ctx.closePath(); ctx.fill();
  // the grip binding
  ctx.fillStyle = "rgba(30,24,16,.85)";
  ctx.fillRect(-len * 0.12, -2.6, 9, 5.2);
  // the iron head
  const iron = ctx.createLinearGradient(len / 2 - 18, -5, len / 2 + 6, 5);
  iron.addColorStop(0, "#cdd3d2");
  iron.addColorStop(0.5, "#8d9493");
  iron.addColorStop(1, "#4d5453");
  ctx.fillStyle = iron;
  ctx.beginPath();
  ctx.moveTo(len / 2 - 15, -3.4);
  ctx.lineTo(len / 2 + 9, 0);
  ctx.lineTo(len / 2 - 15, 3.4);
  ctx.closePath(); ctx.fill();
  // the socket that joins head to shaft
  ctx.fillStyle = "rgba(58,62,62,.9)";
  ctx.fillRect(len / 2 - 19, -3, 6, 6);
  // one hard highlight along the top of the shaft
  ctx.strokeStyle = "rgba(228,206,166,.35)"; ctx.lineWidth = 0.9;
  ctx.beginPath(); ctx.moveTo(-len / 2 + 3, -1.6); ctx.lineTo(len / 2 - 16, -1); ctx.stroke();
  ctx.restore();
}

function dodgeStage(cfg) {
  return {
    label: () => T(cfg.title),
    init(c) {
      preloadSprites();
      c.state = { t: 0, left: cfg.seconds, x: c.w * 0.12, y: c.h * 0.78,
        vy: 0, jump: false, hazards: [], spawn: 0, hits: 0, flash: 0, finished: false,
        stuck: [], puffs: [] };
      c.setHint(T(cfg.hint));
    },
    step(c, dt) {
      const s = c.state; if (s.finished) return;
      tick(c, s, cfg, dt); if (s.finished) return;
      s.x = Math.min(c.w * 0.86, s.x + dt * (c.w * 0.052));
      if (s.jump) {
        // Canvas Y grows downward: gravity must ADD to vy, not subtract.
        s.vy += 570 * dt;
        s.y = Math.min(c.h * 0.78, Math.max(c.h * 0.16, s.y + s.vy * dt));
        if (s.y >= c.h * 0.78 && s.vy >= 0) { s.y = c.h * 0.78; s.vy = 0; s.jump = false; }
      }
      // Spears must be spaced further apart than one full jump cycle, or the
      // player is still airborne when the next one arrives and cannot dodge.
      if (s.spawn < 14 && s.t > s.spawn * 1.15) {
        s.spawn++;
        s.hazards.push({ x: c.w + 20, y: c.h * 0.78 - rnd(0, 14), r: rnd(11, 17),
          rot: rnd(0, TAU), hit: false, land: rnd(0.2, 0.8) });
      }
      for (const hz of s.hazards) { hz.x -= dt * (c.w * 0.34); hz.rot += dt * 3; }
      // a spear that gets past you sticks in the ground behind and throws dust
      for (const hz of s.hazards) {
        if (hz.stuck || hz.x > s.x - 10) continue;
        hz.stuck = true;
        s.stuck.push({ x: hz.x, y: c.h * 0.79, rot: -0.7 + rnd(-0.1, 0.1), life: 2.4 });
        for (let i = 0; i < 5; i++) {
          s.puffs.push({ x: hz.x, y: c.h * 0.79, r: rnd(3, 9), life: 0.7, vx: rnd(-30, 30), vy: rnd(-34, -6) });
        }
      }
      s.hazards = s.hazards.filter((h) => h.x > -30);
      for (const hz of s.hazards) {
        if (hz.hit || dist(s.x, s.y - 18, hz.x, hz.y - 8) > hz.r + 12) continue;
        hz.hit = true; s.hits++; s.flash = 1; c.bump(8); c.hit("miss");
        s.left -= 2; c.float(s.x, s.y - 50, tx("HIT!", "被击中！"), "#e08b78");
        for (let i = 0; i < 8; i++) {
          s.puffs.push({ x: s.x, y: s.y - 20, r: rnd(3, 10), life: 0.6, vx: rnd(-52, 52), vy: rnd(-46, -8) });
        }
        if (s.hits >= 4) { s.finished = true; c.end(true, c.score); return; }
      }
      for (const st of s.stuck) st.life -= dt;
      s.stuck = s.stuck.filter((st) => st.life > 0);
      for (const pf of s.puffs) { pf.x += pf.vx * dt; pf.y += pf.vy * dt; pf.vy += 90 * dt; pf.r += dt * 9; pf.life -= dt; }
      s.puffs = s.puffs.filter((pf) => pf.life > 0);
      c.progress = (s.x - c.w * 0.12) / (c.w * 0.74);
      c.setHint(`${T(cfg.hint)}   ${tx("HITS", "被击中")} ${s.hits}/4`);
      if (s.x >= c.w * 0.86) win(c, s, cfg, cfg.reward || 30);
    },
    draw(c, ctx) {
      const s = c.state; stageBg(c, ctx, cfg);
      const horizon = c.h * 0.8;

      /* Goliath at the far end of the valley, dimmed by the dust between you
         and him rather than standing on a drawn floor line. */
      const gH = clamp(c.h * 0.44, 160, 300);
      const gx = c.w * 0.94;
      ctx.save();
      const haze = ctx.createRadialGradient(gx, c.h * 0.62, 10, gx, c.h * 0.62, gH * 1.15);
      haze.addColorStop(0, "rgba(212,186,150,.2)");
      haze.addColorStop(1, "rgba(212,186,150,0)");
      ctx.fillStyle = haze;
      ctx.beginPath(); ctx.arc(gx, c.h * 0.62, gH * 1.15, 0, TAU); ctx.fill();
      ctx.restore();
      actorShadow(ctx, gx, horizon + 1, gH * 0.24, 0.28);
      const giantDrawn = actor(ctx, "goliath", gx, horizon, gH,
        { rot: Math.sin(c.t * 0.6) * 0.01, squash: 1 + Math.sin(c.t * 1.5) * 0.006, alpha: 0.9 });
      if (!giantDrawn) giant(ctx, c.w * 0.88, c.h * 0.68, 1.45, c.t);

      /* The floor is the plate's own dust; the only thing painted on it is
         what the fight has kicked up. An earlier version laid a grey band
         across the bottom third of the painting, which hid exactly the ground
         the player is watching their feet on. */
      for (let i = 0; i < 26; i++) {
        const px = hash(i * 2.3) * c.w;
        const pz = hash(i * 7.1);
        const py = horizon + pz * (c.h - horizon);
        const rr = 0.8 + pz * 3.2;
        ctx.fillStyle = `rgba(${206 + hash(i) * 30},${188 + hash(i * 3) * 26},${152 + hash(i * 5) * 22},${0.05 + pz * 0.1})`;
        ctx.beginPath(); ctx.ellipse(px, py, rr, rr * 0.62, 0, 0, TAU); ctx.fill();
      }

      // spears already in the ground, still quivering
      for (const st of s.stuck) {
        const q = Math.sin(c.t * 22 + st.x) * 0.03 * Math.min(1, st.life);
        spearArt(ctx, st.x, st.y - 54, st.rot + q, 74, Math.min(1, st.life), 1.9);
      }
      for (const pf of s.puffs) {
        ctx.fillStyle = `rgba(196,178,144,${pf.life * 0.3})`;
        ctx.beginPath(); ctx.arc(pf.x, pf.y, pf.r, 0, TAU); ctx.fill();
      }

      // the spears in the air: a blur behind each one, then the thing itself
      for (const hz of s.hazards) {
        const sp = hz.r > 14 ? 1.9 : 1.55;
        const rot = 0.06 + Math.sin(c.t * 5 + hz.land * 9) * 0.05;
        for (let g = 1; g <= 3; g++) {
          spearArt(ctx, hz.x + g * 20, hz.y - g * 0.8, rot, 74, 0.09 - g * 0.025, sp);
        }
        actorShadow(ctx, hz.x, horizon + 4, 22, 0.14);
        spearArt(ctx, hz.x, hz.y - 10, rot, 74, 1, sp);
      }

      const dH = clamp(c.h * 0.30, 110, 200);
      actorShadow(ctx, s.x, horizon + 2, dH * 0.2, 0.42);
      const runDrawn = actor(ctx, "david", s.x, s.y, dH, {
        rot: s.jump ? -0.05 : 0.05 + Math.sin(c.t * 9) * 0.012,
        squash: s.jump ? 1.02 : 1 + Math.sin(c.t * 9) * 0.015
      });
      if (!runDrawn) pilgrim(ctx, s.x, s.y, 1.15, c.t * 3, 1, 1, true);
      stageChrome(c, ctx, cfg, { ...s, goalText: `${s.hits}/4` });
    },
    onDown(c) { const s = c.state; if (!s.finished && !s.jump) { s.jump = true; s.vy = -245; c.hit("tap"); } },
    onKey(c, k, down) { if (down && (k === " " || k === "arrowup")) this.onDown(c); }
  };
}

function glowDot(ctx, x, y, r, color) {
  const g = ctx.createRadialGradient(x, y, 1, x, y, r);
  g.addColorStop(0, color); g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
}

/* Function declaration (hoisted) so `withStages` is safe even when this module
   is still mid-evaluation inside the scene↔games circular import. */
function builderFor(kind) {
  switch (kind) {
    case "rhythm": return rhythmStage;
    case "trace": return traceStage;
    case "charge": return chargeStage;
    case "order": return orderStage;
    case "dodge": return dodgeStage;
    case "sift": default: return siftStage;
  }
}
export const ACT_BUILDERS = { sift: siftStage, rhythm: rhythmStage, trace: traceStage,
  charge: chargeStage, order: orderStage, dodge: dodgeStage };

/* --------------------------------------------------------------- composition */

/**
 * Wrap a normal game so it runs `preludes` first, then the original game.
 * The original game keeps calling c.end(true/false, score) as before — the
 * wrapper redirects a successful act into the next act instead of finishing.
 */
export function withStages(game, preludes) {
  const list = (Array.isArray(preludes) ? preludes : [preludes]).filter(Boolean);
  if (!list.length) return game;
  const acts = [...list.map((cfg) => builderFor(cfg.kind)(cfg)), game];
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
