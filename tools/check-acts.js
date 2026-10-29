#!/usr/bin/env node
/* Audits every preparation act and every climax game for stuck states,
   inverted physics and NaN drift. Run: npm run check:acts

   Each act is driven with an "oracle" that reads its internal state and
   performs the intended input. An act that cannot be completed before its
   own timer (or that leaves a character off-screen / NaN) is a bug. */

import { ACT_BUILDERS } from "../src/engine/stages.js";
import { PRELUDES, GAMES, SCENES } from "../src/engine/games.js";
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
/* The hand movements each act kind expects. Shared by the act oracle (which
   drives one stage on its own) and the climax oracle (which has to clear the
   preparation acts of a wrapped scene before the climax is even reachable). */
function feed(kind, c, act, frames, ex) {
  const s = c.state, p = c.pointer;
      if (kind === "sift") {
        const left = s.items?.find((it) => !it.got && it.good);
        if (left) {
          p.x = left.x; p.y = left.y; p.down = true;
          act.onMove?.(c, p);
          if (s.cells[left.cell].revealed) tap(c, act, left.x, left.y);
        }
      } else if (kind === "rhythm" && s.mode === "shade") {
        /* Cover whichever lamp the guard's light is nearest, and stay on it. */
        const gx = s.sweepX * c.w;
        const target = [...s.lamps].filter((l) => !l.saved)
          .sort((a, b) => Math.abs(gx - a.x) - Math.abs(gx - b.x))[0];
        if (target) {
          if (!p.down) { p.x = target.x; p.y = target.y; p.down = true; act.onDown?.(c, p); }
          else { p.x = target.x; p.y = target.y; }
        }
      } else if (kind === "rhythm" && s.mode === "catch") {
        /* Stand under the sheaf and take it as it arrives. */
        if (s.sheaf && !s.sheaf.taken && !s.sheaf.missed) {
          p.x = s.sheaf.x; p.y = s.sheaf.y;
          const inReach = s.sheaf.y > c.h * 0.74 - 50 && s.sheaf.y < c.h * 0.74 + 34;
          if (inReach && !p.down) { p.down = true; act.onDown?.(c, p); }
          else if (!inReach && p.down) { p.down = false; act.onUp?.(c, p); }
        } else { p.down = false; }
      } else if (kind === "charge" && s.mode === "sling") {
        /* Turn the sling a full revolution, then let go. */
        const pv = { x: c.w * 0.5, y: c.h * 0.62 };
        const a = frames * 0.16;
        const rad = 46;
        if (s.rev < 0.95) {
          if (!p.down) { p.x = pv.x + rad; p.y = pv.y; p.down = true; act.onDown?.(c, p); }
          p.x = pv.x + Math.cos(a) * rad; p.y = pv.y + Math.sin(a) * rad;
        } else if (p.down) { p.down = false; act.onUp?.(c, p); }
      } else if (kind === "charge" && s.mode === "rope") {
        /* One long haul down the rope, then release. */
        if (!p.down) {
          p.x = c.w * 0.5; p.y = c.h * 0.55; p.down = true; act.onDown?.(c, p);
        } else if (s.pull < 0.7) {
          p.y += 9;
        } else { p.down = false; act.onUp?.(c, p); }
      } else if (kind === "charge") {
        /* Breathe in, hold until the vision narrows, surface. */
        if (!p.down) { p.x = c.w * 0.5; p.y = c.h * 0.6; p.down = true; act.onDown?.(c, p); }
        else if (s.depth < 0.62) { /* keep holding */ }
        else { p.down = false; act.onUp?.(c, p); }
      } else if (kind === "order") {
        if (s.phase === "input" && s.shown < s.seq.length) {
          const cell = s.cells[s.seq[s.shown]];
          /* one press is one seal: press, then lift, exactly as a hand does */
          if (cell) { tap(c, act, cell.x, cell.y); act.onUp?.(c, p); }
        }
      } else if (kind === "trace") {
        const top = c.h * 0.47, bottom = c.h * 0.9;
        const y = bottom - Math.min(0.99, s.progress + 0.05) * (bottom - top);
        p.x = centre(c, y); p.y = y; p.down = true;
      } else if (kind === "dodge") {
        /* Both answers are exercised: leap the low throw, crouch under the high
           one, and verify gravity brings the leap back down to the ground. */
        if (frames > 20) ex.maxUp = Math.min(ex.maxUp, s.y);
        if (frames > 20 && !s.jump && Math.abs(s.y - ex.groundY) < 0.01) ex.landed = true;
        const near = s.hazards?.find((hz) => !hz.done && hz.x - s.x > 30 && hz.x - s.x < 80);
        if (near?.kind === "high") {
          p.down = true; p.dy = 40; p.x = s.x; p.y = s.y;
          act.onDown?.(c, p);
          act.onMove?.(c, p);
          ex.ducked = true;
        } else if (near?.kind === "low") {
          if (p.down) { p.down = false; p.dy = 0; act.onUp?.(c, p); }
          /* a leap cannot start while the last crouch is still coming up */
          if (!s.jump && s.duck < 0.2) {
            /* a tap is press AND release: the leap is launched on release */
            p.x = s.x; p.y = s.y; p.startX = s.x; p.startY = s.y; p.dy = 0;
            p.down = true; act.onDown?.(c, p);
            p.down = false; act.onUp?.(c, p);
          }
        } else if (p.down) {
          p.down = false; p.dy = 0; act.onUp?.(c, p);
        }
      }
}

function driveAct(kind, cfg) {
  const build = ACT_BUILDERS[kind];
  const c = makeC();
  const ctx = mockCtx();
  const act = build(cfg);
  const errors = [];
  let jumpChecked = false, frames = 0;
  const ex = { maxUp: Infinity, landed: false, groundY: c.h * 0.78 };
  act.init?.(c);

  /* The valley restarts from the top on the fourth hit, so a driver that is
     merely adequate needs more than one pass' worth of frames to finish. */
  const maxFrames = Math.ceil((cfg.seconds + 4) * 60 * (kind === "dodge" ? 3 : 1));
  while (!c.ended && frames < maxFrames) {
    frames++; c.t = frames / 60;
    const s = c.state, p = c.pointer;

    try {
      feed(kind, c, act, frames, ex);
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
    if (!ex.ducked) errors.push("the crouch answer was never needed — every throw was low");
    if (!ex.landed) errors.push(`jump never landed (minY=${ex.maxUp.toFixed(1)}, groundY=${ex.groundY.toFixed(1)})`);
    if (ex.maxUp < c.h * 0.05) errors.push(`pilgrim flew off the top of the screen (minY=${ex.maxUp.toFixed(1)})`);
    jumpChecked = true;
  }
  return { errors, frames, score: c.score, jumpChecked, landed: ex.landed };
}

/* Drive a climax game with its normal input and check it terminates cleanly. */
function driveClimax(key, game) {
  const c = makeC();
  const ctx = mockCtx();
  const errors = [];
  let frames = 0;
  try { game.init?.(c); } catch (e) { return [`init: ${e.message}`]; }
  /* A wrapped scene is its preparation acts plus the climax. Nothing closes an
     act on its own any more (no clock, no auto-skip), so the oracle has to play
     each preparation act with the hand movement that act kind expects, and only
     then hand over to the climax. */
  const pre = PRELUDES[key];
  const preList = Array.isArray(pre) ? pre : (pre ? [pre] : []);
  const ex = { maxUp: Infinity, landed: false, groundY: c.h * 0.78 };
  const onClimax = () => !c.actCount || (c.actIndex ?? 0) >= c.actCount - 1;
  const maxFrames = 60 * 150;
  while (!c.ended && frames < maxFrames) {
    frames++; c.t = frames / 60;
    const p = c.pointer, s = c.state;
    try {
      if (!onClimax() && preList[c.actIndex]) {
        feed(preList[c.actIndex].kind, c, game, frames, ex);
      } else if (key === "sling") {
        if (frames % 70 === 1) { p.startX = 60; p.startY = 500; game.onDown?.(c, p); }
        if (frames % 70 === 2) { p.x = 300; p.y = 250; game.onMove?.(c, p); game.onUp?.(c, p); }
      } else if (key === "lions") {
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
      } else if (key === "jericho") {
        const spot = s.spot || { x: c.w * 0.3, y: c.h * 0.8 };
        p.down = true; p.x = spot.x;
        if (s.phase === "lift") { if (p.y < 10) p.y = spot.y; p.y -= 10; } else p.y = spot.y;
      } else if (key === "stones") {
        p.down = true;
        const st = s.spots?.find((x) => !x.got);
        if (st && st.px !== undefined) {
          const dx = st.px - p.x, dy = st.py - p.y;
          const d = Math.hypot(dx, dy) || 1;
          const step = Math.min(d, 2.4);
          p.x += (dx / d) * step; p.y += (dy / d) * step;
        }
      } else if (key === "window") {
        p.down = true;
        if (s.phase === "latch") {
          const l = s.latchPt || { x: c.w * 0.54, y: c.h * 0.48 };
          p.x = l.x;
          if (s.latch === 0 || p.y < 10) p.y = l.y;
          p.y -= 7;
        } else if (s.l < 1) {
          if (p.x > (s.seamX ?? c.w * 0.5) - 40) p.x = (s.seamX ?? c.w * 0.5) - 45;
          p.x = Math.max(8, p.x - 11); p.y = c.h * 0.4;
        } else {
          if (p.x < (s.seamX ?? c.w * 0.5) + 40) p.x = (s.seamX ?? c.w * 0.5) + 45;
          p.x = Math.min(c.w - 8, p.x + 11); p.y = c.h * 0.4;
        }
      } else if (key === "flame") {
        p.down = true;
        if (p.y < 10) p.y = c.h * 0.9;
        const mark = [0.42, 0.66, 0.88].find((m, i) => !s.steady?.[i]) ?? 0.88;
        p.down = (s.approach ?? 0) < mark + 0.01;
        if (p.down) p.y -= 1.6;
      } else if (key === "cry") {
        p.down = true;
        const door = s.doors?.find((x) => !x.done);
        if (door) {
          if (Math.abs(door.u - s.p) < 0.05) {
            game.onDown?.(c, p);
          } else if (p.x > c.w - 46) {
            p.down = false; game.onUp?.(c, p);
            p.x = 36; p.down = true; s.last = null; game.onDown?.(c, p);
          } else p.x += 11;
        }
      } else if (key === "prodigal") {
        const gift = s.gifts?.find((g) => !s.placed?.[g.id]);
        if (gift && gift.tx !== undefined) {
          if (s._carry !== gift.id) { s._carry = gift.id; p.down = true; p.x = gift.sx; p.y = gift.sy; }
          else {
            p.x += (gift.tx - p.x) * 0.3; p.y += (gift.ty - p.y) * 0.3;
            if (Math.hypot(gift.tx - p.x, gift.ty - p.y) < 8) p.down = false;
          }
        } else { p.down = false; s._carry = null; }
      } else if (key === "esther") {
        const cyc = frames % 90;
        if (s.phase === "walk") {
          if (cyc < 12) { p.down = true; p.y = c.h * 0.72 - cyc * 8; p.x = c.w * 0.5; }
          else p.down = false;
        } else if (s.phase === "kneel") {
          p.down = true; p.x = c.w * 0.5; p.y = c.h * 0.62;
        } else { p.down = true; p.x = c.w * 0.5; p.y = c.h * 0.557; }   // reach for the sceptre head
      } else if (key === "deep") {
        if (s.phase === "kelp") {
          const k = s.strands?.find((x) => !x.free);
          if (k) {
            p.down = true;
            p.x = k.x + Math.sin(frames * 1.9) * 34;
            p.y = k.y;
          } else p.down = false;
        } else p.down = false;   // the belly is pressing: do not move
      } else if (key === "climb") {
        const cyc = frames % 24;
        p.x = s.side ? c.w * 0.78 : c.w * 0.22;
        if (cyc < 9) { p.down = true; if (cyc === 0 || p.y < 20) p.y = c.h * 0.62; p.y -= 9; }
        else p.down = false;
      } else if (key === "tend") {
        /* Sweep along the arm: first to wash the length of the wound, then to
           wind the linen round it. A real finger traces the same diagonal. */
        const tri = (frames % 140) / 140;
        const t2 = tri < 0.5 ? tri * 2 : 2 - tri * 2;
        p.down = true;
        p.x = c.w * (0.08 + 0.68 * t2);
        p.y = c.h * (0.72 - 0.26 * t2);
      }
      /* A held act waits for the player. The oracle presses the button, which
         is exactly what the briefing card does in the app. */
      if (c.actWaiting) c.beginAct?.();
      game.step?.(c, 1 / 60);
      if (frames % 5 === 0) game.draw?.(c, ctx);
      const bad = badNumbers(c.state);
      if (bad.length) { errors.push(`non-finite values at frame ${frames}: ${bad.slice(0, 3).join(", ")}`); break; }
    } catch (e) { errors.push(`frame ${frames}: ${e.stack?.split("\n").slice(0, 2).join(" ")}`); break; }
  }
  if (!c.ended) errors.push(`climax never ended within ${maxFrames} frames`);
  return { errors, ended: c.ended };
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
for (const [key, game] of Object.entries(SCENES)) {
  const r = driveClimax(key, game);
  if (r.ended && !r.ended.success) allErrors.push(`${key} (raw): the scene cannot be finished — it ended "${r.ended.success ? "win" : "loss"}" with score ${r.ended.score}`);
  for (const e of r.errors) allErrors.push(`${key} (raw): ${e}`);
}
for (const [key, game] of Object.entries(GAMES)) {
  const errs = driveClimax(key, game).errors;
  console.log(`  ${key.padEnd(20)} ${errs.length ? "FAIL" : "ok"}`);
  for (const e of errs) allErrors.push(`${key}: ${e}`);
}

if (allErrors.length) {
  console.error(`\n✗ ${allErrors.length} issue(s):`);
  for (const e of allErrors) console.error("  • " + e);
  process.exit(1);
}
console.log("\n✓ Every act completes, every jump lands, every game terminates — no stuck states or NaN drift.");
