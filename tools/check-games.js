#!/usr/bin/env node
/* Exercises every multi-act canvas scene with a mock 2D context.
   Catches runtime errors in step()/draw() that jsdom's null canvas cannot see.
   Run: npm run check:games */

import { GAMES, SCENES } from "../src/engine/games.js";
import { ACT_BUILDERS } from "../src/engine/stages.js";
import { clamp, rnd, dist, overInfo } from "../src/engine/scene.js";
import { stepsFor } from "../src/data/game-steps.js";

const gradient = { addColorStop() {} };
function mockCtx() {
  const store = {};
  return new Proxy(store, {
    get(t, k) {
      if (k in t) return t[k];
      if (k === "createLinearGradient" || k === "createRadialGradient" || k === "createPattern") return () => gradient;
      if (k === "measureText") return () => ({ width: 12 });
      if (k === "getImageData") return () => ({ data: new Uint8ClampedArray(4) });
      if (k === "setLineDash") return () => undefined;
      return () => undefined;
    },
    set(t, k, v) { t[k] = v; return true; }
  });
}

function makeC(key) {
  const pointer = { x: 0, y: 0, down: false, startX: 0, startY: 0, dx: 0, dy: 0 };
  const keys = new Set();
  const c = {
    w: 390, h: 844, t: 0, dt: 0.05, game: GAMES[key], pointer, keys,
    particles: [], floats: [], font: "system-ui", hudTop: 112,
    hearts: 3, maxHearts: 3, score: 0, progress: 0, stageProgress: 0,
    shake: 0, flash: 0, hint: "", label: "", state: {}, shared: {},
    actIndex: 0, actCount: 1, actBanner: 0, actFlash: 0, ended: null,
    rnd, clamp, dist,
    spark() {}, float() {}, bump() {}, hit() {}, ring() {},
    hurt(n = 1) { c.hearts = Math.max(0, c.hearts - n); if (!c.hearts) c.end(false, c.score); },
    addScore(n) { c.score += n; },
    setHint(s) { c.hint = s; },
    end(success, score) { if (c.ended) return; c.ended = { success, score }; }
  };
  return c;
}

/* ---- drive the preparation acts for real, not just let them time out ---- */
function preludeInput(c, frame, seen) {
  const s = c.state, p = c.pointer, g = c.game;
  if (!s) return;
  const tap = (x, y) => { p.x = x; p.y = y; p.startX = x; p.startY = y; g.onDown?.(c, p); };

  // sift: reveal every cell by sweeping the lens, then tap the good items
  if (s.items && s.cells) {
    const left = s.items.find((it) => !it.got && it.good);
    if (left) {
      p.x = left.x; p.y = left.y; p.down = true;
      g.onMove?.(c, p);
      if (s.cells[left.cell].revealed) tap(left.x, left.y);
    }
    return;
  }
  // watch · shade: keep a hand on the lamp the guard's light is nearest
  if (s.mode === "shade" && s.lamps) {
    const gx = s.sweepX * c.w;
    const target = [...s.lamps].filter((l) => !l.saved).sort((a, b) => Math.abs(gx - a.x) - Math.abs(gx - b.x))[0];
    if (target) {
      if (!p.down) { p.down = true; tap(target.x, target.y); }
      else { p.x = target.x; p.y = target.y; }
    }
    return;
  }
  // watch · catch: stand under the falling sheaf and take it
  if (s.mode === "catch" && s.sheaf !== undefined) {
    if (s.sheaf && !s.sheaf.taken && !s.sheaf.missed) {
      p.x = s.sheaf.x; p.y = s.sheaf.y;
      const inReach = s.sheaf.y > c.h * 0.74 - 50 && s.sheaf.y < c.h * 0.74 + 34;
      if (inReach && !p.down) { p.down = true; tap(p.x, p.y); }
      else if (!inReach && p.down) { p.down = false; g.onUp?.(c, p); }
    } else p.down = false;
    return;
  }
  // grip · sling: turn it a full circle, then let go
  if (s.mode === "sling") {
    const pv = { x: c.w * 0.5, y: c.h * 0.62 };
    const a = frame * 0.16;
    if (s.rev < 0.95) {
      if (!p.down) { p.down = true; tap(pv.x + 46, pv.y); }
      p.x = pv.x + Math.cos(a) * 46; p.y = pv.y + Math.sin(a) * 46;
    } else if (p.down) { p.down = false; g.onUp?.(c, p); }
    return;
  }
  // grip · rope: one long haul, then release
  if (s.mode === "rope") {
    if (!p.down) { p.x = c.w * 0.5; p.y = c.h * 0.55; p.down = true; tap(p.x, p.y); }
    else if (s.pull < 0.7) p.y += 9;
    else { p.down = false; g.onUp?.(c, p); }
    return;
  }
  // grip · breath: hold under, surface before the dark closes
  if (s.mode === "breath" && typeof s.depth === "number") {
    if (!p.down) { p.down = true; tap(c.w * 0.5, c.h * 0.6); }
    else if (s.depth > 0.62) { p.down = false; g.onUp?.(c, p); }
    return;
  }
  // order: repeat the sequence during the input phase
  if (s.cells && s.seq && s.phase) {
    if (s.phase === "input" && s.shown < s.seq.length) {
      const cell = s.cells[s.seq[s.shown]];
      if (cell && seen.orderKey !== `${s.round}:${s.shown}`) {
        seen.orderKey = `${s.round}:${s.shown}`;
        tap(cell.x, cell.y);
        /* a real hand comes off the glass between two seals */
        g.onUp?.(c, p);
      }
    }
    return;
  }
  // dodge: leap the low throw, crouch under the high one
  if (s.hazards && typeof s.x === "number") { dodgeInput(c, frame); return; }
  // trace: drag up the middle of the winding ribbon
  if (typeof s.progress === "number" && s.left !== undefined) {
    const top = c.h * 0.47, bottom = c.h * 0.9;
    const y = bottom - Math.min(1, s.progress + 0.06) * (bottom - top);
    const cx = c.w * 0.5 + Math.sin(y * 0.013 + 1.2) * c.w * 0.23 + Math.sin(y * 0.031) * c.w * 0.05;
    p.x = cx; p.y = y; p.down = true;
  }
}

/* The valley: duck the chest-high throw, leap the one that skims the dust. */
function dodgeInput(c, frame) {
  const p = c.pointer, s = c.state, g = c.game;
  const near = s.hazards.find((hz) => !hz.done && hz.x - s.x > 24 && hz.x - s.x < 90);
  if (near?.kind === "high") {
    p.down = true; p.dy = 40; p.x = s.x; p.y = s.y;
    g.onDown?.(c, p); g.onMove?.(c, p);
  } else if (near?.kind === "low") {
    if (p.down) { p.down = false; p.dy = 0; g.onUp?.(c, p); }
    if (!s.jump && frame % 3 === 0) { p.down = true; g.onDown?.(c, p); p.down = false; g.onUp?.(c, p); }
  } else if (p.down) { p.down = false; p.dy = 0; g.onUp?.(c, p); }
}

/* Input scripts for the climax act. */
function climaxInput(key, c, frame) {
  const p = c.pointer, s = c.state, g = c.game;
  if (s && typeof s.x === "number" && Array.isArray(s.hazards)) { dodgeInput(c, frame); return; }
  switch (key) {
    case "sling":
      if (frame % 60 === 1) { p.startX = 60; p.startY = 500; g.onDown?.(c, p); }
      if (frame % 60 === 2) { p.x = 300; p.y = 250; g.onMove?.(c, p); g.onUp?.(c, p); }
      break;
    case "lions":
      p.down = frame % 8 !== 0; p.x = 40 + ((frame * 17) % 310); p.y = 300 + Math.sin(frame / 6) * 120;
      break;
    case "storm":
      p.down = frame % 9 !== 0; p.x = 40 + ((frame * 13) % 310); p.y = 380;
      if (frame % 22 === 0) g.onDown?.(c, p);
      break;
    case "desert": {
      const sheep = s.sheep?.find((x) => !x.got);
      const target = sheep || { x: c.w * 0.9, y: c.h * 0.56 };
      p.down = true; p.x = target.x; p.y = target.y;
      break;
    }
    case "glean": {
      const grain = s.grain?.find((x) => !x.got);
      p.down = true; p.x = grain?.x ?? c.w * 0.5; p.y = grain?.y ?? c.h * 0.7;
      break;
    }
    case "jericho": {
      // lift him: hand on the bundle, always moving up; then hold him on
      const spot = s.spot || { x: c.w * 0.3, y: c.h * 0.8 };
      p.down = true;
      p.x = spot.x;
      if (s.phase === "lift") { if (p.y < 10) p.y = spot.y; p.y -= 10; } else p.y = spot.y;
      break;
    }
    case "stones": {
      // creep toward the next stone so the water stays calm
      p.down = true;
      const st = s.spots?.find((x) => !x.got);
      if (st && st.px !== undefined) {
        const dx = st.px - p.x, dy = st.py - p.y;
        const d = Math.hypot(dx, dy) || 1;
        const step = Math.min(d, 2.4);
        p.x += (dx / d) * step; p.y += (dy / d) * step;
      }
      break;
    }
    case "window": {
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
      break;
    }
    case "flame": {
      p.down = true;
      // creep up, then rest: the fire only steadies for a still hand
      if (p.y < 10) p.y = c.h * 0.9;
      const mark = [0.42, 0.66, 0.88].find((m, i) => !s.steady?.[i]) ?? 0.88;
      p.down = (s.approach ?? 0) < mark + 0.01;
      if (p.down) p.y -= 1.6;
      break;
    }
    case "cry": {
      p.down = true;
      const door = s.doors?.find((x) => !x.done);
      if (door) {
        if (Math.abs(door.u - s.p) < 0.05) {
          g.onDown?.(c, p);
        } else if (p.x > c.w - 46) {
          p.down = false; g.onUp?.(c, p);
          p.x = 36; p.down = true; s.last = null; g.onDown?.(c, p);
        } else p.x += 11;
      }
      break;
    }
    case "prodigal": {
      const gift = s.gifts?.find((g) => !s.placed?.[g.id]);
      if (gift && gift.tx !== undefined) {
        if (s._carry !== gift.id) { s._carry = gift.id; p.down = true; p.x = gift.sx; p.y = gift.sy; }
        else {
          p.x += (gift.tx - p.x) * 0.3; p.y += (gift.ty - p.y) * 0.3;
          if (Math.hypot(gift.tx - p.x, gift.ty - p.y) < 8) p.down = false;
        }
      } else { p.down = false; s._carry = null; }
      break;
    }
    case "esther": {
      const cyc = frame % 90;
      if (s.phase === "walk") {
        if (cyc < 12) { p.down = true; p.y = c.h * 0.72 - cyc * 8; p.x = c.w * 0.5; }
        else p.down = false;
      } else if (s.phase === "kneel") { p.down = true; p.x = c.w * 0.5; p.y = c.h * 0.62; }
      else { p.down = true; p.x = c.w * 0.5; p.y = c.h * 0.557; }   // reach for the sceptre head
      break;
    }
    case "deep": {
      if (s.phase === "kelp") {
        const k = s.strands?.find((x) => !x.free);
        if (k) { p.down = true; p.x = k.x + Math.sin(frame * 1.9) * 34; p.y = k.y; }
        else p.down = false;
      } else p.down = false;
      break;
    }
    case "climb": {
      const cyc = frame % 24;
      p.x = s.side ? c.w * 0.78 : c.w * 0.22;
      if (cyc < 9) { p.down = true; if (cyc === 0 || p.y < 20) p.y = c.h * 0.62; p.y -= 9; }
      else p.down = false;
      break;
    }
    case "tend": {
      // sweep the finger along the painted forearm: wash, then bind
      const tri = (frame % 140) / 140;
      const t2 = tri < 0.5 ? tri * 2 : 2 - tri * 2;
      p.down = true;
      p.x = c.w * (0.08 + 0.68 * t2);
      p.y = c.h * (0.72 - 0.26 * t2);
      break;
    }
    default: break;
  }
}

const errors = [];
const results = [];
for (const [key, game] of [...Object.entries(GAMES), ...Object.entries(SCENES).map(([k, v]) => [`${k}/raw`, v])]) {
  const c = makeC(key);
  c.game = game;
  const ctx = mockCtx();
  const seen = {};
  const actsVisited = new Set();
  try { game.init(c); c.hint = game.hint(c); }
  catch (e) { errors.push(`${key} init: ${e.stack}`); continue; }
  for (let frame = 1; frame <= 2600 && !c.ended; frame++) {
    c.t = frame * 0.05;
    actsVisited.add(c.actIndex);
    try {
      if (c.actIndex < c.actCount - 1) preludeInput(c, frame, seen);
      else climaxInput(key.replace("/raw", ""), c, frame);
    } catch (e) { errors.push(`${key} input f${frame} act${c.actIndex}: ${e.stack}`); break; }
    if (c.actWaiting) c.beginAct?.();
    try { game.step(c, 0.05); } catch (e) { errors.push(`${key} step f${frame} act${c.actIndex}: ${e.stack}`); break; }
    if (frame % 3 === 0) {
      try { game.draw(c, ctx); } catch (e) { errors.push(`${key} draw f${frame} act${c.actIndex}: ${e.stack}`); break; }
    }
  }
  results.push(`${key.padEnd(9)} ${c.ended ? (c.ended.success ? "WON " : "lost") : "OPEN"}  acts=${actsVisited.size}/${c.actCount}  score=${String(c.score).padStart(4)}  progress=${c.progress.toFixed(2)}  hearts=${c.hearts}`);
}

for (const r of results) console.log("  " + r);

/* ---- one press is one seal ----
   The reported bug: on the decree, one press stamped two or three seals and
   then threw the round away for a "wrong seal" nobody pressed. Two causes —
   a touch screen delivering both pointerdown and touchstart (fixed in
   scene.js), and a hit test that could not tell two neighbouring seals
   apart. This drives the stage directly and hands it the same press twice. */
{
  const build = () => ACT_BUILDERS.order({
    title: ["Seal the decree", "在谕旨上用印"], prompt: ["", ""], hint: ["", ""],
    rounds: 2, seconds: 34, reward: 30, mode: "seal"
  });
  const c = makeC("seals");
  c.game = build();
  c.game.init(c);
  const s = c.state;
  const problems = [];
  const at = (cell) => ({ x: cell.x, y: cell.y, down: true, dx: 0, dy: 0 });

  /* no two seals may share a finger */
  for (let i = 0; i < s.cells.length; i++) {
    for (let j = i + 1; j < s.cells.length; j++) {
      const gap = dist(s.cells[i].x, s.cells[i].y, s.cells[j].x, s.cells[j].y);
      if (gap < s.reach * 2 + 8) problems.push(`seals ${i} and ${j} are ${Math.round(gap)}px apart with a ${Math.round(s.reach)}px reach`);
    }
  }

  /* run out the "show" phase, then deliver one press twice */
  s.phase = "input"; s.shown = 0; s.timer = 0;
  const firstCell = s.cells[s.seq[0]];
  c.game.onDown(c, at(firstCell));
  if (s.shown !== 1) problems.push(`the first press did not stamp the first seal (shown=${s.shown})`);
  const stampedOnce = s.shown;
  c.game.onDown(c, at(firstCell));          // the same finger, delivered again
  if (s.shown !== stampedOnce) problems.push("one press stamped two seals");

  /* a deliberate second press on the *same* seal is a wrong seal, not a
     second stamp: lift, then press it again */
  c.game.onUp(c, at(firstCell));
  const roundBefore = s.round, seqBefore = s.seq.join("");
  c.game.onDown(c, at(firstCell));
  if (s.shown !== 0) problems.push("pressing the same seal twice counted as two stamps");
  if (s.round !== roundBefore) problems.push("a wrong seal cost a round");
  if (s.seq.join("") === seqBefore) problems.push("a wrong seal did not deal a new sequence");

  /* and a correct press after lifting does advance */
  c.game.onUp(c, at(firstCell));
  s.phase = "input";
  c.game.onDown(c, at(s.cells[s.seq[0]]));
  if (s.shown !== 1) problems.push("a correct press after lifting did not advance");

  /* a sequence never asks for the same seal twice in a row */
  for (let r = 0; r < 40; r++) {
    const cc = makeC("seals2"); cc.game = build(); cc.game.init(cc);
    const seq = cc.state.seq;
    for (let i = 1; i < seq.length; i++) {
      if (seq[i] === seq[i - 1]) { problems.push("a sequence repeats the same seal twice in a row"); break; }
    }
  }

  if (problems.length) {
    console.error("\n✗ the seals: " + [...new Set(problems)].join("; "));
    process.exit(1);
  }
}

/* ---- four hits sends David back to the start, it does not skip the fight ----
   This was the reported bug: after four misses the act ended itself and the
   story moved straight on to the sling, so a fight that was never fought was
   scored as won. Nothing in this game is failed; the valley is simply walked
   again. */
{
  const stage = ACT_BUILDERS.dodge({
    title: ["Cross the valley", "穿过山谷"], prompt: ["", ""], hint: ["", ""], seconds: 17, reward: 30
  });
  const c = makeC("dodge-reset");
  c.game = stage;
  stage.init(c);
  const start = c.w * 0.1;
  let sawRestart = false, runs = c.state.runs, xAtRestart = null;
  for (let i = 0; i < 3000 && !c.ended; i++) {
    stage.step(c, 0.05);           // deliberately answer nothing
    if (c.state.runs !== runs) {
      runs = c.state.runs; sawRestart = true;
      xAtRestart = c.state.x;      // where he stood the moment the run began again
    }
  }
  const problems = [];
  if (c.ended) problems.push("the act ended itself after four hits");
  if (!sawRestart) problems.push("four hits never restarted the run");
  if (c.state.runs < 2) problems.push("the run counter never moved");
  if (xAtRestart === null) problems.push("the player was never put back at the start");
  else if (xAtRestart > start + c.w * 0.06) problems.push(`David was not returned to the start (x=${Math.round(xAtRestart)} of ${Math.round(start)})`);
  if (problems.length) {
    console.error("\n✗ the valley: " + problems.join("; "));
    process.exit(1);
  }
}

/* Every act of every scene must carry the three numbered steps a player reads
   before it starts, in both languages. One sentence was not enough to know
   what the hand is meant to do; this keeps it that way. */
const copyProblems = [];
for (const [key, game] of Object.entries(GAMES)) {
  const acts = game.actCount || 1;
  for (let act = 0; act < acts; act++) {
    const pair = stepsFor(key, act);
    if (!pair) { copyProblems.push(`${key} act ${act + 1}: no steps`); continue; }
    for (const lang of [0, 1]) {
      const list = lang ? pair.zh : pair.en;
      if (!Array.isArray(list) || list.length < 3) copyProblems.push(`${key} act ${act + 1}: ${lang ? "zh" : "en"} needs three steps`);
      else if (list.some((line) => !line || line.length < 12)) copyProblems.push(`${key} act ${act + 1}: ${lang ? "zh" : "en"} has an empty or stub step`);
    }
  }
}
if (copyProblems.length) {
  console.error(`\n✗ ${copyProblems.length} briefing copy problem(s):`);
  for (const p of copyProblems) console.error("  " + p);
  process.exit(1);
}
/* ---- the score clock may not charge anyone for learning -------------------
   A scene keeps a soft budget in `state.left`; nothing is ever shown and
   nothing can end when it runs out. What it must not do is shrink the payout
   for time spent reading the steps or finding the right spot, so the clock is
   only charged from the moment the player has got somewhere in the act. */
{
  const clock = [];
  /* a scene starts with `left` seconds on its budget and counts both down */
  const at = (t, progress = 0, budget = 48) => ({ state: { t, left: budget - t }, progress });

  let c = at(90);                                  // three times over, still exploring
  if (overInfo(c).keep !== 1 || overInfo(c).over !== 0) clock.push("charged for time spent before touching the act");

  c = at(5, 0.2);                                  // first progress at 5 s
  c.state.t = 20; c.state.left = 28;
  if (overInfo(c).over !== 0) clock.push("charged inside the budget after starting");

  c.state.t = 70; c.state.left = -22;               // 65 s after progress, budget 48
  const late = overInfo(c);
  if (!(late.over > 0)) clock.push("never charged even long after the budget");
  if (!(late.keep < 1 && late.keep >= 0.3)) clock.push("late payout outside 30–100%");

  c = at(100, 0);                                   // same lateness, nothing ever done
  if (overInfo(c).keep !== 1) clock.push("time alone cost points with no progress at all");

  if (clock.length) {
    console.error(`\n✗ score clock: ${clock.length} problem(s):`);
    for (const m of clock) console.error("  " + m);
    process.exit(1);
  }
}

if (errors.length) {
  console.error(`\n✗ ${errors.length} action-scene error(s):`);
  for (const e of errors) console.error("  " + e.split("\n").slice(0, 4).join("\n    "));
  process.exit(1);
}
console.log(`\n✓ All ${Object.keys(GAMES).length} set pieces stepped and drawn without errors.`);
