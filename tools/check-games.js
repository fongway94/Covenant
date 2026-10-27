#!/usr/bin/env node
/* Exercises every canvas action scene with a mock 2D context.
   Catches runtime errors in step()/draw() that jsdom's null canvas cannot see.
   Run: npm run check:games */

import { GAMES } from "../src/engine/games.js";
import { clamp, rnd, dist } from "../src/engine/scene.js";

const gradient = { addColorStop() {} };
function mockCtx() {
  const store = {};
  return new Proxy(store, {
    get(t, k) {
      if (k in t) return t[k];
      if (k === "createLinearGradient" || k === "createRadialGradient" || k === "createPattern") return () => gradient;
      if (k === "measureText") return () => ({ width: 12 });
      if (k === "getImageData") return () => ({ data: new Uint8ClampedArray(4) });
      return () => undefined;
    },
    set(t, k, v) { t[k] = v; return true; }
  });
}

function makeC(key) {
  const pointer = { x: 0, y: 0, down: false, startX: 0, startY: 0, dx: 0, dy: 0 };
  const keys = new Set();
  const c = {
    w: 390, h: 620, t: 0, dt: 0.05, game: GAMES[key], pointer, keys,
    particles: [], floats: [], font: "system-ui",
    hearts: 3, maxHearts: 3, score: 0, progress: 0, shake: 0, flash: 0,
    hint: "", label: "", state: {}, hudTop: 112, ended: null,
    rnd, clamp, dist,
    spark() {}, float() {}, bump() {}, hit() {},
    hurt(n = 1) { c.hearts = Math.max(0, c.hearts - n); if (!c.hearts) c.end(false, c.score); },
    addScore(n) { c.score += n; },
    setHint(s) { c.hint = s; },
    end(success, score) { if (c.ended) return; c.ended = { success, score }; }
  };
  return c;
}

/* Simple input scripts so each game is played, not merely stepped. */
function input(key, c, frame) {
  const p = c.pointer, s = c.state, g = c.game;
  switch (key) {
    case "sling":
      if (frame % 60 === 1) { p.startX = 60; p.startY = 500; g.onDown?.(c, p); }
      if (frame % 60 === 2) { p.x = 300; p.y = 250; g.onMove?.(c, p); g.onUp?.(c, p); }
      break;
    case "lions": case "jericho": case "prodigal": case "esther":
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
    case "deep": {
      const orb = s.orbs?.[0];
      p.down = true; p.x = c.w * 0.26; p.y = orb?.y ?? c.h * 0.5;
      break;
    }
    case "climb":
      if (frame % 7 === 0 && g.onDown && s.seq) {
        p.x = s.seq[s.step] === 0 ? c.w * 0.25 : c.w * 0.75;
        p.y = c.h * 0.6;
        g.onDown(c, p);
      }
      break;
    default: break;
  }
}

const errors = [];
const results = [];
for (const [key, game] of Object.entries(GAMES)) {
  const c = makeC(key);
  const ctx = mockCtx();
  try {
    game.init(c);
    c.hint = game.hint(c);
  } catch (e) { errors.push(`${key} init: ${e.stack}`); continue; }
  for (let frame = 1; frame <= 1400 && !c.ended; frame++) {
    c.t = frame * 0.05;
    try { input(key, c, frame); } catch (e) { errors.push(`${key} input f${frame}: ${e.stack}`); break; }
    try { game.step(c, 0.05); } catch (e) { errors.push(`${key} step f${frame}: ${e.stack}`); break; }
    if (frame % 3 === 0) {
      try { game.draw(c, ctx); } catch (e) { errors.push(`${key} draw f${frame}: ${e.stack}`); break; }
    }
  }
  results.push(`${key.padEnd(9)} ${c.ended ? (c.ended.success ? "WON " : "lost") : "OPEN"}  score=${String(c.score).padStart(4)}  progress=${c.progress.toFixed(2)}  hearts=${c.hearts}`);
}

for (const r of results) console.log("  " + r);
if (errors.length) {
  console.error(`\n✗ ${errors.length} action-scene error(s):`);
  for (const e of errors) console.error("  " + e.split("\n").slice(0, 3).join("\n    "));
  process.exit(1);
}
console.log(`\n✓ All ${Object.keys(GAMES).length} action scenes stepped and drawn without errors.`);
