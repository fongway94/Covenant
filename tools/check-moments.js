#!/usr/bin/env node
/* Validates the v0.7 story moments: data integrity, chapter coverage,
   bilingual copy, engine boot for all five kinds, and skip resolution.
   Run: npm run check:moments */

import { JSDOM } from "jsdom";

const dom = new JSDOM(`<!doctype html><html><body><div id="host"></div></body></html>`,
  { url: "http://localhost/", pretendToBeVisual: true });
for (const k of ["window", "document", "Node", "HTMLElement", "Event", "MouseEvent", "PointerEvent"]) {
  if (dom.window[k]) Object.defineProperty(globalThis, k, { value: dom.window[k], configurable: true, writable: true });
}
globalThis.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 8);
globalThis.cancelAnimationFrame = (id) => clearTimeout(id);

const { MOMENTS, momentFor, momentCount, MOMENT_WAY_FALLBACK } = await import("../src/data/moments.js");
const { startMoment } = await import("../src/engine/moments.js");
const { MOMENT_STEPS, momentSteps } = await import("../src/data/moment-steps.js");
const { CHAPTERS } = await import("../src/data/chapters.js");
const { WAY_KEYS } = await import("../src/core/state.js");

const errs = [];
const fail = (m) => errs.push(m);
const zhRe = /[\u4e00-\u9fff]/;
const KINDS = Object.keys(MOMENT_WAY_FALLBACK);

if (momentCount() !== 20) fail(`expected 20 moments, got ${momentCount()}`);
for (const ch of CHAPTERS) {
  const list = MOMENTS[ch.id];
  if (!list || list.length !== 2) { fail(`${ch.id}: expected exactly 2 story moments`); continue; }
  for (const m of list) {
    if (!ch.nodes[m.at]) fail(`${ch.id}: moment references unknown node "${m.at}"`);
    if (!KINDS.includes(m.kind)) fail(`${ch.id}/${m.at}: unknown kind ${m.kind}`);
    if (!WAY_KEYS.includes(m.way)) fail(`${ch.id}/${m.at}: unknown way ${m.way}`);
    for (const f of ["title", "prompt", "done"]) {
      if (!Array.isArray(m[f]) || m[f].length !== 2 || !m[f][0] || !m[f][1]) fail(`${ch.id}/${m.at}.${f}: missing a language`);
      else {
        if (!zhRe.test(m[f][1])) fail(`${ch.id}/${m.at}.${f}: Chinese field has no Chinese characters`);
        if (zhRe.test(m[f][0])) fail(`${ch.id}/${m.at}.${f}: English field contains Chinese`);
        if (!/[A-Za-z]/.test(m[f][0])) fail(`${ch.id}/${m.at}.${f}: English field has no Latin letters`);
      }
    }
    if (m.title[0].startsWith(" ") || m.title[1].startsWith(" ")) fail(`${ch.id}/${m.at}: leading space in title`);
  }
  if (new Set(list.map((m) => m.at)).size !== list.length) fail(`${ch.id}: two moments on the same node`);
}

/* Localisation + done-guard. */
const raw = MOMENTS.elah[0];
for (const zh of [false, true]) {
  const spec = momentFor("elah", raw.at, zh, {});
  if (!spec || spec.title !== raw.title[zh ? 1 : 0]) fail(`momentFor(${zh}) returned wrong copy`);
  if (momentFor("elah", raw.at, zh, { [raw.at + ":moment"]: true })) fail("done guard failed");
}
if (momentFor("elah", "end", false, {})) fail("momentFor returned a moment for a node without one");

/* Briefing copy: every kind of moment must say what the hand does in three
   numbered steps, in both languages. One vague sentence is the defect this
   guards against — the moments are where a new player first touches the game. */
for (const kind of [...KINDS, "default"]) {
  const pair = momentSteps(kind);
  if (!pair || pair !== MOMENT_STEPS[kind] && kind !== "default") fail(`steps: no copy for ${kind}`);
  for (const lang of ["en", "zh"]) {
    const lines = pair?.[lang];
    if (!Array.isArray(lines) || lines.length !== 3) { fail(`steps ${kind}/${lang}: need three lines`); continue; }
    lines.forEach((l, i) => {
      /* Chinese says the same thing in far fewer characters — measure each
         language by its own floor rather than by one number. */
      const min = lang === "zh" ? 8 : 20;
      if (typeof l !== "string" || l.trim().length < min) fail(`steps ${kind}/${lang}[${i}]: too short to instruct`);
      if (lang === "zh" && !zhRe.test(l)) fail(`steps ${kind}/${lang}[${i}]: no Chinese`);
      if (lang === "en" && zhRe.test(l)) fail(`steps ${kind}/${lang}[${i}]: English line contains Chinese`);
    });
    if (new Set(lines).size !== lines.length) fail(`steps ${kind}/${lang}: duplicate lines`);
  }
}
if (!MOMENT_STEPS.default) fail("steps: no fallback copy for a new kind");

/* Engine boots for all five kinds, builds its stage, and resolves on skip. */
for (const kind of KINDS) {
  const host = document.getElementById("host");
  host.innerHTML = "";
  const spec = { kind, way: "wait", title: "T", prompt: "P", done: "D", at: "x", chapterId: "elah" };
  let resolved = null;
  let controller;
  try {
    controller = startMoment(host, spec, (r) => { resolved = r; });
    if (!host.classList.contains("kind-" + kind)) fail(`${kind}: stage class missing`);
    if (!host.children.length) fail(`${kind}: no stage markup`);
    if (kind === "tap" && !host.querySelector(".moment-node")) fail("tap: no tappable node");
    if (kind === "hold" && !host.querySelector(".moment-ring")) fail("hold: no ring");
    if (kind === "trace" && !host.querySelector(".moment-path")) fail("trace: no path");
    if ((kind === "balance" || kind === "rhythm") && !host.querySelector(".moment-bar")) fail(`${kind}: no bar`);
  } catch (e) { fail(`${kind}: threw on boot — ${e.message}`); }
  controller?.skip();
  if (!resolved || resolved.success !== false || resolved.skipped !== true) fail(`${kind}: skip did not resolve`);
  controller?.stop();
}

/* A tap moment can actually be won by tapping the five nodes. */
{
  const host = document.getElementById("host");
  host.innerHTML = "";
  let resolved = null;
  const controller = startMoment(host,
    { kind: "tap", way: "step", title: "T", prompt: "P", done: "D", at: "x", chapterId: "x" },
    (r) => { resolved = r; });
  for (let i = 0; i < 5; i++) {
    const n = host.querySelector(".moment-node:not([data-hit])");
    if (!n) break;
    n.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true, clientX: 40, clientY: 40 }));
  }
  if (!resolved?.success) fail("tap moment could not be won by tapping all five nodes");
  controller.stop();
}

/* Nothing may pass itself. A balance moment used to win three and a half
   seconds after it opened, with the phone in the player's pocket; the meter
   filled and the reward landed for a move nobody made. */
{
  const host = document.getElementById("host");
  host.innerHTML = "";
  let resolved = null;
  const controller = startMoment(host,
    { kind: "balance", subject: "provision", plate: "elah-field", fx: 0.44, fy: 0.68,
      way: "stay", title: "T", prompt: "P", done: "D", at: "x", chapterId: "elah" },
    (r) => { resolved = r; });
  await new Promise((r) => setTimeout(r, 4500));
  if (resolved) fail("balance moment resolved on its own with no input");
  const meter = document.getElementById("moment-meter");
  if (meter && parseFloat(meter.style.width) > 0) fail("balance meter fills with no input");
  controller.stop();
}

dom.window.close();
if (errs.length) { errs.forEach((e) => console.error("  ✗ " + e)); process.exit(1); }
console.log(`\n✓ Story moments: ${momentCount()} across ${CHAPTERS.length} chapters, ` +
  `${KINDS.length} interaction kinds, bilingual, skippable, and winnable.`);
