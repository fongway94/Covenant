#!/usr/bin/env node
/* Audits every preparation act and every climax game for stuck states,
   inverted physics and NaN drift. Run: npm run check:acts

   Each act is driven with an "oracle" that reads its internal state and
   performs the intended input. An act that cannot be completed before its
   own timer (or that leaves a character off-screen / NaN) is a bug. */

import { ACT_BUILDERS } from "../src/engine/stages.js";
import { PRELUDES, GAMES } from "../src/engine/games.js";
import { clamp, rnd, dist } from "../src/engine/scene.js";

const gradient = { addColorStop() {} };
function mockCtx() {
  return new Proxy({}, {
    get(t, k) {
      if (k in t) return t[k];
      if (["createLinearGradient", "createRadialGradient", "createPattern"].includes(k)) return () => gradient;
      if (k === "measureText") return () => ({ width: 12 });
      if (k === "getImageData") return () => ({ data: new Uint8ClampedArray(4) });
      return () => undefined;
    },
    set(t, k, v) { t[k] = v; return true; }
  });
}

function makeC(w = 390, h = 720) {
  const pointer = { x: 0, y: 0, down: false, startX: 0, startY: 0, dx: 0, dy: 0 };
  const c = {
    w, h, t: 0, dt: 1 / 60, game: { fg: "rocks" }, pointer, keys: new Set(),
    particles: [], floats: [], font: "system-ui", hudTop: 112,
    hearts: 3, maxHearts: 3, score: 0, progress: 0, stageProgress: 0,
    shake: 0, flash: 0, hint: "", label: "", state: {}, shared: {},
    actIndex: 0, actCount: 1, actBanner: 0, actFlash: 0, ended: null,
    rnd, clamp, dist,
    spark() {}, float() {}, bump() {}, hit() {}, ring() {}, addScore(n) { c.score += n; },
    hurt(n = 1) { c.hearts = Math.max(0, c.hearts - n); if (!c.hearts) c.end(false, c.score); },
    setHint(s) { c.hint = s; },
    end(success, score) { if (!c.ended) c.ended = { success: !!success, score: Math.round(score ?? c.score) }; }
  };
  return c;
}

function badNumbers(obj, path = "state", depth = 0) {
  if (depth > 4 || !obj || typeof obj !== "object") return [];
  const out = [];
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === "number" && !Number.isFinite(v)) out.push(`${path}.${k}=${v}`);
    else if (Array.isArray(v)) v.slice(0, 40).forEach((x, i) => out.push(...badNumbers(x, `${path}.${k}[${i}]`, depth + 1)));
    else if (v && typeof v === "object" && depth < 3) out.push(...badNumbers(v, `${path}.${k}`, depth + 1));
  }
  return out;
}

const centre = (c, y) => c.w * 0.5 + Math.sin(y * 0.013 + 1.2) * c.w * 0.23 + Math.sin(y * 0.031) * c.w * 0.05;
const tap = (c, act, x, y) => {
  const p = c.pointer; p.x = x; p.y = y; p.startX = x; p.startY = y;
  act.onDown?.(c, p);
};

/* Drive one preparation act to completion using its own state as an oracle. */
function driveAct(kind, cfg) {
  const build = ACT_BUILDERS[kind];
  const c = makeC();
  const ctx = mockCtx();
  const act = build(cfg);
  const errors = [];
  let jumpChecked = false, maxUp = Infinity, landed = false, frames = 0;
  const groundY = c.h * 0.78;
  act.init?.(c);

  const maxFrames = Math.ceil((cfg.seconds + 4) * 60);
  while (!c.ended && frames < maxFrames) {
    frames++; c.t = frames / 60;
    const s = c.state, p = c.pointer;

    try {
      if (kind === "sift") {
        const left = s.items?.find((it) => !it.got && it.good);
        if (left) {
          p.x = left.x; p.y = left.y; p.down = true;
          act.onMove?.(c, p);
          if (s.cells[left.cell].revealed) tap(c, act, left.x, left.y);
        }
      } else if (kind === "rhythm") {
        if (Math.abs(s.pos - s.band) <= s.bandW / 2) tap(c, act, c.w * 0.5, c.h * 0.63);
      } else if (kind === "charge") {
        if (!s.holding) tap(c, act, c.w * 0.5, c.h * 0.6);
        else if (Math.abs(s.power - s.band) <= s.bandW / 2) { p.down = false; act.onUp?.(c, p); }
      } else if (kind === "order") {
        if (s.phase === "input" && s.shown < s.seq.length) {
          const cell = s.cells[s.seq[s.shown]];
          if (cell) tap(c, act, cell.x, cell.y);
        }
      } else if (kind === "trace") {
        const top = c.h * 0.47, bottom = c.h * 0.9;
        const y = bottom - Math.min(0.99, s.progress + 0.05) * (bottom - top);
        p.x = centre(c, y); p.y = y; p.down = true;
      } else if (kind === "dodge") {
        // Jump once early, then verify gravity brings the pilgrim back down.
        if (frames > 20) maxUp = Math.min(maxUp, s.y);
        if (frames > 20 && !s.jump && Math.abs(s.y - groundY) < 0.01) landed = true;
        const incoming = s.hazards?.some((hz) => !hz.hit && hz.x - s.x > 34 && hz.x - s.x < 74);
        if (incoming && !s.jump) tap(c, act, s.x, s.y);
      }
      act.step?.(c, 1 / 60);
      if (frames % 4 === 0) act.draw?.(c, ctx);
      const bad = badNumbers(c.state);
      if (bad.length) { errors.push(`non-finite values at frame ${frames}: ${bad.slice(0, 3).join(", ")}`); break; }
    } catch (e) { errors.push(`frame ${frames}: ${e.stack?.split("\n").slice(0, 2).join(" ")}`); break; }
  }

  if (!c.ended) errors.push(`never ended within ${maxFrames} frames`);
  else if (!c.ended.success) errors.push(`ended as failure`);
  if (c.ended?.success && c.score < (cfg.reward || 30) * 0.5) errors.push(`timed out instead of being completed (score ${c.score})`);

  if (kind === "dodge") {
    if (frames < 40) errors.push("dodge ended before the jump test could run");
    if (!landed) errors.push(`jump never landed (minY=${maxUp.toFixed(1)}, groundY=${groundY.toFixed(1)})`);
    if (maxUp < c.h * 0.05) errors.push(`pilgrim flew off the top of the screen (minY=${maxUp.toFixed(1)})`);
    jumpChecked = true;
  }
  return { errors, frames, score: c.score, jumpChecked, landed };
}

/* Drive a climax game with its normal input and check it terminates cleanly. */
function driveClimax(key, game) {
  const c = makeC();
  const ctx = mockCtx();
  const errors = [];
  let frames = 0;
  try { game.init?.(c); } catch (e) { return [`init: ${e.message}`]; }
  const maxFrames = 60 * 90;
  while (!c.ended && frames < maxFrames) {
    frames++; c.t = frames / 60;
    const p = c.pointer, s = c.state;
    try {
      if (key === "sling") {
        if (frames % 70 === 1) { p.startX = 60; p.startY = 500; game.onDown?.(c, p); }
        if (frames % 70 === 2) { p.x = 300; p.y = 250; game.onMove?.(c, p); game.onUp?.(c, p); }
      } else if (["lions", "jericho", "prodigal", "esther"].includes(key)) {
        p.down = frames % 8 !== 0; p.x = 40 + ((frames * 17) % 310); p.y = 300 + Math.sin(frames / 6) * 120;
      } else if (key === "storm") {
        p.down = frames % 9 !== 0; p.x = 40 + ((frames * 13) % 310); p.y = 380;
        if (frames % 22 === 0) game.onDown?.(c, p);
      } else if (key === "desert") {
        const sh = s.sheep?.find((x) => !x.got) || { x: c.w * 0.9, y: c.h * 0.56 };
        p.down = true; p.x = sh.x; p.y = sh.y;
      } else if (key === "glean") {
        const g = s.grain?.find((x) => !x.got) || { x: c.w * 0.5, y: c.h * 0.7 };
        p.down = true; p.x = g.x; p.y = g.y;
      } else if (key === "deep") {
        p.down = true; p.x = c.w * 0.26; p.y = s.orbs?.[0]?.y ?? c.h * 0.5;
      } else if (key === "tend") {
        /* Sweep along the arm: first to wash the length of the wound, then to
           wind the linen round it. A real finger traces the same diagonal. */
        const tri = (frames % 140) / 140;
        const t2 = tri < 0.5 ? tri * 2 : 2 - tri * 2;
        p.down = true;
        p.x = c.w * (0.08 + 0.68 * t2);
        p.y = c.h * (0.72 - 0.26 * t2);
      } else if (key === "climb" && frames % 7 === 0 && s.seq) {
        p.x = s.seq[s.step] === 0 ? c.w * 0.25 : c.w * 0.75; p.y = c.h * 0.6;
        game.onDown?.(c, p);
      }
      game.step?.(c, 1 / 60);
      if (frames % 5 === 0) game.draw?.(c, ctx);
      const bad = badNumbers(c.state);
      if (bad.length) { errors.push(`non-finite values at frame ${frames}: ${bad.slice(0, 3).join(", ")}`); break; }
    } catch (e) { errors.push(`frame ${frames}: ${e.stack?.split("\n").slice(0, 2).join(" ")}`); break; }
  }
  if (!c.ended) errors.push(`climax never ended within ${maxFrames} frames`);
  return errors;
}

/* ------------------------------------------------------------------ run */
const allErrors = [];
console.log("Preparation acts:");
for (const [key, list] of Object.entries(PRELUDES)) {
  for (const cfg of (Array.isArray(list) ? list : [list])) {
    const r = driveAct(cfg.kind, cfg);
    const extra = cfg.kind === "dodge" && r.landed ? " (jump lands ✓)" : "";
    console.log(`  ${(key + "/" + cfg.kind).padEnd(20)} ${r.errors.length ? "FAIL" : "ok  "} ${String(r.frames).padStart(5)} frames  score=${String(r.score).padStart(3)}${extra}`);
    for (const e of r.errors) allErrors.push(`${key}/${cfg.kind}: ${e}`);
  }
}
console.log("\nClimax games:");
for (const [key, game] of Object.entries(GAMES)) {
  const errs = driveClimax(key, game);
  console.log(`  ${key.padEnd(20)} ${errs.length ? "FAIL" : "ok"}`);
  for (const e of errs) allErrors.push(`${key}: ${e}`);
}

if (allErrors.length) {
  console.error(`\n✗ ${allErrors.length} issue(s):`);
  for (const e of allErrors) console.error("  • " + e);
  process.exit(1);
}
console.log("\n✓ Every act completes, every jump lands, every game terminates — no stuck states or NaN drift.");
