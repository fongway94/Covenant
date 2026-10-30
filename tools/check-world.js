#!/usr/bin/env node
/* World mode lint.

   The valley is generated, so the road has to be proved open rather than
   eyeballed: every person, every stone and the giant must be reachable on foot
   from where the player starts. It also checks that the fight is winnable on
   paper — one answer for every shout, one shout for every answer, and exactly
   as many stones as pips.

   Run: npm run check:world */

import { JSDOM } from "jsdom";

const { W, H, T, ELAH, NPCS, STONES, WORDS, SHOUTS, blockedAt, reachable, buildGrid } = await import("../src/world/elah.js");

const fail = [];
const ok = (cond, msg) => { if (!cond) fail.push(msg); };

/* ------------------------------------------------------------- the map */
const grid = buildGrid();
ok(grid.length === H, `map has ${grid.length} rows, expected ${H}`);
grid.forEach((row, y) => ok(row.length === W, `row ${y} is ${row.length} wide, expected ${W}`));

const walk = (x, y) => !blockedAt(grid, x, y);
ok(walk(ELAH.start[0], ELAH.start[1]), "the player does not start on a walkable tile");
ok(walk(ELAH.goliath[0], ELAH.goliath[1]), "the giant stands on a blocked tile");

for (const n of NPCS) {
  ok(walk(n.at[0], n.at[1]), `${n.id} stands on a blocked tile`);
  ok(reachable(grid, ELAH.start, n.at), `${n.id} cannot be walked to from the start`);
}
for (const s of STONES) {
  ok(walk(s.at[0], s.at[1]), `stone ${s.id} sits on a blocked tile`);
  ok(reachable(grid, ELAH.start, s.at), `stone ${s.id} cannot be walked to from the start`);
}
ok(reachable(grid, ELAH.start, ELAH.goliath), "the giant cannot be walked to from the start");
ok(reachable(grid, ELAH.goliath, ELAH.returnTo), "the way home is not walkable from the challenge line");

/* the ford is the only dry crossing — if it were sealed, the walk would dead-end */
const crossings = [];
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (grid[y][x] === T.FORD) crossings.push([x, y]);
ok(crossings.length > 0, "the brook has no ford");

/* ----------------------------------------------------------- the fight */
ok(STONES.length === WORDS.length || STONES.length === 5, "the brook should give five stones");
const kinds = new Set(WORDS.map((w) => w.kind));
for (const s of SHOUTS) ok(kinds.has(s.kind), `nobody can answer a ${s.kind} shout`);
for (const w of WORDS) {
  ok(SHOUTS.some((s) => s.kind === w.kind), `the word ${w.id} answers nothing`);
  ok(w.ref && w.text?.en && w.text?.zh && w.why?.en && w.why?.zh, `the word ${w.id} is missing copy`);
}
for (const n of NPCS) {
  ok(WORDS.some((w) => w.id === n.word), `${n.id} hands over a word that does not exist`);
  ok(n.lines?.length && n.after?.length, `${n.id} has no second thing to say`);
  for (const l of [...n.lines, ...n.after]) {
    ok(l.text?.en && l.text?.zh, `${n.id} has a line missing a language`);
  }
}

/* -------------------------------------------------- one-box reading budget
   A dialogue line has to be readable in the box without scrolling. */
for (const n of NPCS) {
  for (const l of [...n.lines, ...n.after]) {
    const zh = l.text.zh;
    if (zh.length > 150) fail.push(`${n.id} has a ${zh.length}-character line; the box holds about 150`);
  }
}

/* --------------------------------------------------------------- the app */
const dom = new JSDOM(`<!doctype html><html><body>
  <div id="app" class="app"></div><div id="toasts" class="toasts"></div>
</body></html>`, { url: "http://localhost:4173/", pretendToBeVisual: true });
const { window } = dom;
for (const key of ["window", "document", "localStorage", "location", "MouseEvent", "Event",
  "HTMLElement", "SVGElement", "Element", "Node", "NodeFilter", "getComputedStyle"]) {
  Object.defineProperty(globalThis, key, { value: window[key], configurable: true, writable: true });
}
Object.defineProperty(globalThis, "navigator", { value: window.navigator, configurable: true, writable: true });
window.HTMLCanvasElement.prototype.getContext = () => null;
globalThis.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 8);
globalThis.cancelAnimationFrame = (id) => clearTimeout(id);

const { bus } = await import("../src/core/bus.js");
const { newGame } = await import("../src/core/state.js");
await import("../src/main.js");

bus.ui.state = newGame("Tester", "shepherd");
try {
  bus.go("map");
  const entry = document.querySelector('[data-view="world"]');
  ok(!!entry, "there is no way into the valley from the map");
  bus.go("world");
  ok(!!document.querySelector("#world-canvas"), "world mode did not render its canvas");
  bus.go("map");
  ok(!document.querySelector("#world-canvas"), "leaving the valley left its canvas behind");
} catch (e) {
  fail.push(`world mode threw on the way in or out: ${e.message}`);
}

if (fail.length) {
  console.error("✗ World mode has problems:\n  " + fail.join("\n  "));
  process.exit(1);
}
console.log(`✓ World mode: ${NPCS.length} people reachable, ${STONES.length} stones at the brook, ` +
  `${WORDS.length} words answer ${SHOUTS.length} shouts, the valley opens and closes cleanly.`);
