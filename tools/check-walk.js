#!/usr/bin/env node
/* The walk-through lint.

   World mode is driven end to end with a stub 2d context and a stub clock: the
   player walks to all four people, takes their four words, gathers five stones
   at the brook, crosses the challenge line, wins the fight with nothing but
   the right answer each time, and comes back to the field on the other side.
   Anything that throws, soft-locks or fails to hand control back fails here.

   Run: npm run check:walk */

const calls = { text: 0, fills: 0 };
function makeCtx() {
  const grad = { addColorStop() {} };
  const ctx = {
    canvas: null, globalAlpha: 1, fillStyle: "", strokeStyle: "", lineWidth: 1, font: "",
    textAlign: "", textBaseline: "", lineCap: "", lineJoin: "", shadowBlur: 0, shadowColor: "",
    save() {}, restore() {}, translate() {}, scale() {}, rotate() {}, setTransform() {},
    beginPath() {}, closePath() {}, moveTo() {}, lineTo() {}, arc() {}, arcTo() {}, ellipse() {},
    quadraticCurveTo() {}, bezierCurveTo() {}, rect() {}, clip() {},
    fill() { calls.fills++; }, stroke() {}, fillRect() {}, strokeRect() {}, clearRect() {},
    fillText() { calls.text++; }, strokeText() {},
    measureText(t) { return { width: String(t).length * 7 }; },
    createLinearGradient() { return grad; }, createRadialGradient() { return grad; },
    createPattern() { return null; }, drawImage() {}, putImageData() {}, getImageData() { return { data: [] }; }
  };
  return ctx;
}

const listeners = new Map();
const noop = () => {};
function mkCanvas() {
  const ctx = makeCtx();
  const c = {
    width: 400, height: 700, clientWidth: 400, clientHeight: 700,
    style: {}, dataset: {},
    getContext: () => ctx,
    getBoundingClientRect: () => ({ width: 400, height: 700, left: 0, top: 0, right: 400, bottom: 700 }),
    addEventListener(k, fn) { listeners.set("c:" + k, fn); },
    removeEventListener(k) { listeners.delete("c:" + k); },
    setAttribute() {}, appendChild() {}, removeEventListener() {}
  };
  return c;
}

globalThis.window = {
  devicePixelRatio: 2,
  addEventListener(k, fn) { listeners.set("w:" + k, fn); },
  removeEventListener(k) { listeners.delete("w:" + k); }
};
globalThis.document = {
  documentElement: { style: { setProperty() {}, getPropertyValue: () => "1.1" }, classList: { toggle() {}, add() {}, remove() {} } },
  body: { style: {}, classList: { toggle() {}, add() {}, remove() {} } },
  getElementById: () => null,
  querySelector: () => null
};
globalThis.getComputedStyle = () => ({ fontFamily: "system-ui", getPropertyValue: () => "1.1" });
let rafCb = null;
globalThis.requestAnimationFrame = (cb) => { rafCb = cb; return 1; };
globalThis.cancelAnimationFrame = () => { rafCb = null; };

const { startField } = await import("../src/world/field.js");
const { startBattle } = await import("../src/world/battle.js");
const { ELAH, NPCS, STONES, SHOUTS, WORDS } = await import("../src/world/elah.js");
const { TILE } = await import("../src/world/elah.js");

let t = 0;
function tick(n = 1) {
  for (let i = 0; i < n; i++) { t += 16.7; if (rafCb) { const cb = rafCb; rafCb = null; cb(t); } }
}
function tap(x, y) { listeners.get("c:pointerdown")?.({ preventDefault() {}, clientX: x, clientY: y, pointerId: 1 }); }

const canvas = mkCanvas();
let reached = null, words = [];
let field = startField(canvas, {
  onReachGiant: (d) => { reached = d; },
  onWord: (w) => words.push(w)
});
tick(4);

const st = field.state;
const cam = st.cam;

/* walk to each person and talk to them */
for (const n of NPCS) {
  st.p.x = (n.at[0] + 0.5) * TILE;
  st.p.y = (n.at[1] + 0.5) * TILE + TILE * 0.6;
  tick(12);
  const sx = (n.at[0] + 0.5) * TILE - cam.x;
  const sy = (n.at[1] + 0.5) * TILE - cam.y - 18;
  tap(sx, sy); tick(2);
  if (!st.dialogue) throw new Error(`tapping ${n.id} did not open a dialogue`);
  for (let i = 0; i < 12; i++) { tap(200, 600); tick(2); if (!st.dialogue) break; }
  if (st.dialogue) throw new Error(`${n.id} dialogue never closed`);
}

/* the brook */
for (const s of STONES) {
  st.p.x = (s.at[0] + 0.5) * TILE;
  st.p.y = (s.at[1] + 0.5) * TILE;
  tick(3);
}
if (st.picked.size !== 5) throw new Error(`picked ${st.picked.size} stones, expected 5`);
if (st.words.size !== 4) throw new Error(`collected ${st.words.size} words, expected 4`);

/* up to the line */
st.p.x = (ELAH.goliath[0] + 0.5) * TILE;
st.p.y = (ELAH.challengeRow - 1.5) * TILE;
tick(3);
if (!reached) throw new Error("crossing the challenge line did not hand over to the fight");
if (reached.stones !== 5) throw new Error("handed over the wrong stone count");

/* the fight */
field.pause();
let won = false, done = false;
const battle = startBattle(canvas, { words: reached.words, onWin: () => { won = true; }, onDone: () => { done = true; } });
tick(3);
for (let round = 0; round < 5; round++) {
  const bs = battle.state;
  tap(200, 300); tick(2);                     // hear it, then answer
  const need = SHOUTS[bs.shout].kind;
  const card = bs.cardsAt.find((c) => WORDS.find((w) => w.id === c.id).kind === need);
  if (!card) throw new Error(`no card can answer the ${need} shout`);
  tap(card.x + 20, card.y + card.h / 2); tick(2);
  if (bs.phase !== "throw") throw new Error(`a right answer did not load the sling (phase ${bs.phase})`);
  tap(120, 520); tick(1);
  tick(40);                                    // the stone flies
  if (bs.phase === "choose" || bs.phase === "shout") { /* next shout, fine */ }
}
if (!won) throw new Error("five right answers did not win the fight");
tap(200, 400); tick(2);
if (!done) throw new Error("the win screen did not hand control back");

battle.stop();
field.resume();
field.standDownGiant();
tick(10);
if (field.state.phase !== "return") throw new Error("returning from the fight lost the field phase");

console.log(`✓ walked, talked to ${NPCS.length} people, picked up ${st.picked.size} stones, ` +
  `answered ${SHOUTS.length} shouts, won the fight, came back to the field. ` +
  `(${calls.text} text runs drawn)`);
