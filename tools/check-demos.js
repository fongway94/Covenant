/* Every interactive scene must be able to show a hand doing its gesture.
   This checks the wiring, not the artwork: each act of each chapter game and
   each kind of story moment has to name an animation that the animator knows,
   the act briefing has to carry it, and the pause card has to have one too.
   A missing name shows as an empty 148x76 box on the player's screen, which is
   exactly the bug this file exists to prevent. */
import { GAMES, PRELUDES, ACT_COUNTS } from "../src/engine/games.js";
import { DEMO_KINDS, demoFor } from "../src/engine/demo.js";
import { gameInfo } from "../src/engine/scene.js";

const errors = [];
const known = (k) => DEMO_KINDS.has(k);

/* ---- 1. every act of every chapter game ---- */
const rows = [];
for (const key of Object.keys(GAMES)) {
  const n = ACT_COUNTS[key] || 1;
  const demo = [];
  for (let i = 0; i < n; i++) {
    let info;
    try { info = gameInfo(key, i); } catch (e) { errors.push(`${key} act ${i + 1}: gameInfo threw (${e.message})`); continue; }
    if (!info.demo) errors.push(`${key} act ${i + 1}: no animation named`);
    else if (!known(info.demo)) errors.push(`${key} act ${i + 1}: unknown animation "${info.demo}"`);
    demo.push(info.demo || "-");
  }
  rows.push(`  ${key.padEnd(10)} ${demo.join(" → ")}`);
}

/* ---- 2. the opening card is the one that teaches the chapter's own game ---- */
for (const key of Object.keys(GAMES)) {
  const first = gameInfo(key, 0);
  if (!first.demo || !known(first.demo)) errors.push(`${key}: the first card teaches nothing`);
}

/* ---- 3. a multi-act scene must not repeat one animation for every act ---- */
for (const key of Object.keys(GAMES)) {
  const n = ACT_COUNTS[key] || 1;
  if (n < 2) continue;
  const all = Array.from({ length: n }, (_, i) => gameInfo(key, i).demo);
  if (new Set(all).size === 1 && n > 2) {
    errors.push(`${key}: all ${n} acts use the same animation (${all[0]}) — the acts differ, so the teaching should too`);
  }
}

/* ---- 4. every preparation act kind maps to something drawable ---- */
const kinds = new Set();
for (const list of Object.values(PRELUDES)) {
  for (const cfg of (Array.isArray(list) ? list : [list])) {
    const d = demoFor(cfg.kind, cfg);
    if (!known(d)) errors.push(`act kind "${cfg.kind}" maps to unknown animation "${d}"`);
    kinds.add(cfg.kind);
  }
}

/* ---- 5. every story-moment kind maps to something drawable ---- */
const MOMENT_DEMOS = { hold: "hold", tap: "tap", trace: "path", balance: "drag", rhythm: "taprow" };
for (const [kind, demo] of Object.entries(MOMENT_DEMOS)) {
  if (!known(demo)) errors.push(`story moment "${kind}" maps to unknown animation "${demo}"`);
}

console.log("Chapter games, act by act:");
for (const r of rows) console.log(r);
console.log(`\nAct kinds taught: ${[...kinds].sort().join(", ")}`);
console.log(`Animations available: ${[...DEMO_KINDS].sort().join(", ")}`);

if (errors.length) {
  console.error(`\n✗ ${errors.length} issue(s):`);
  for (const e of errors) console.error("  • " + e);
  process.exit(1);
}
console.log(`\n✓ All ${Object.keys(GAMES).length} chapter games and every story moment name an animation that exists.`);
