#!/usr/bin/env node
/* Boots the app in Chinese and reports any visible English that slipped through.
   Run: npm run check:i18n  (needs jsdom from npm install) */
import { JSDOM } from "jsdom";

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
localStorage.setItem("covenant.lang.v1", "zh");

const { bus } = await import("../src/core/bus.js");
const { newGame } = await import("../src/core/state.js");
await import("../src/main.js");

/* Brand names, scripture refs, code paths and numerals are not UI copy. */
const ALLOW = /^(COVENANT|Covenant|Capacitor|PWA|KJV|XP|EN|OK|MBTI|HTML|CSS|JavaScript|iOS|Android|Galatians|Psalm|docs\/|assets\/|src\/|www\/|[A-Za-z]{0,2})$/;
const found = new Map();

function scan(label) {
  const walker = document.createTreeWalker(document.getElementById("app"), window.NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const n = walker.currentNode;
    if (!n.nodeValue) continue;
    const p = n.parentElement;
    if (!p || /^(SCRIPT|STYLE|CODE|PRE|TEXTAREA)$/.test(p.tagName)) continue;
    for (const raw of n.nodeValue.split(/[\n·|]+/)) {
      const s = raw.trim();
      if (!s || s.length < 3) continue;
      if (!/[A-Za-z]{3,}/.test(s)) continue;
      if (ALLOW.test(s)) continue;
      const stripped = s
        .replace(/\b(Covenant|圣约|HTML|CSS|JavaScript|PWA|iOS|Android|App Store|Google Play|Capacitor|KJV|XP|EN|English|OK|MBTI|Galatians|I|II|III|IV|V|VI|VII|VIII|IX|X|v\d+(?:\.\d+)*)\b/gi, "")
        .replace(/[0-9]+/g, "");
      if (!/[A-Za-z]{3,}/.test(stripped)) continue;
      const key = s.slice(0, 120);
      found.set(key, (found.get(key) || new Set()).add(label));
    }
  }
}

bus.ui.state = newGame("测试者", "scribe");
for (const v of ["title", "create", "map", "camp", "finale", "journal", "character", "about"]) {
  bus.ui.view = v; bus.ui.modal = null;
  if (v === "journal") for (const tab of ["scrolls", "relics", "fruits", "seals"]) { bus.ui.journalTab = tab; bus.render(); scan(`journal:${tab}`); }
  else { bus.render(); scan(v); }
}

for (const m of [
  { type: "howto" }, { type: "scroll", id: "elah" }, { type: "pray", id: "elah" },
  { type: "leave" }, { type: "reset" }, { type: "chapter", id: "elah" },
  { type: "item", kind: "fruit", id: "love" }, { type: "item", kind: "relic", id: "stones" },
  { type: "item", kind: "seal", id: "first_light" }, { type: "item", kind: "verse", id: "storms" },
  { type: "camp-npc", id: "elias" }, { type: "guidance" }, { type: "breathe" },
  { type: "quest-reward", quest: { id: "fire", glyph: "✟", titleEn: "Keep the fire lit", titleZh: "守住篝火", reward: { guidance: 2, faith: 1 } } }
]) {
  if (m.type === "breathe") bus.ui.breathe = { step: 0, cycle: 0 };
  bus.ui.modal = m; bus.render(); scan(`modal:${m.type}`);
}
bus.ui.modal = null;

const { startChapter, tapStory, goToReflection, reflectAnswer } = await import("../src/screens/story.js");
const ui = bus.ui;
const { CHAPTERS } = await import("../src/data/chapters.js");
for (const { id } of CHAPTERS) {
  ui.view = "map"; startChapter(ui, id); scan(`story:${id}:lines`);
  for (let i = 0; i < 30; i++) tapStory(ui);
  scan(`story:${id}:after`);
  ui.story.phase = "choices"; bus.render(); scan(`story:${id}:choices`);
  ui.story.result = { newSeals: [], xp: 32, newRelic: "stones", levels: 0 };
  ui.story.phase = "reward"; bus.render(); scan(`story:${id}:reward`);
  goToReflection(ui); scan(`story:${id}:reflect`);
  reflectAnswer(ui, 0); scan(`story:${id}:reflect-done`);
  ui.story = null;
}

/* --- reverse check: English mode must not leak Chinese UI copy --- */
const { setLang } = await import("../src/core/i18n.js");
setLang("en");
const cjk = new Set();
function scanCJK(label) {
  const walker = document.createTreeWalker(document.getElementById("app"), window.NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const v = walker.currentNode.nodeValue || "";
    const el = walker.currentNode.parentElement;
    if (el && el.closest(".lang-btn, .avatar, .finale-avatar, .hud-name, .char-hero")) return;
    const trimmed = v.trim();
    if (/^(中|文|中文|中文 \/ EN|中文 \/ English)$/.test(trimmed)) return;
    if (/[\u3400-\u9fff]/.test(v) && !v.includes("测试者")) cjk.add(`${label}: ${trimmed.slice(0, 90)}`);
  }
}
for (const v of ["title", "create", "map", "camp", "finale", "journal", "character", "about"]) {
  bus.ui.view = v; bus.ui.modal = null; bus.render(); scanCJK(v);
}
for (const m of [{ type: "howto" }, { type: "scroll", id: "elah" }, { type: "pray", id: "elah" },
  { type: "chapter", id: "elah" }, { type: "item", kind: "fruit", id: "love" },
  { type: "camp-npc", id: "elias" }, { type: "guidance" }, { type: "breathe" }]) {
  if (m.type === "breathe") bus.ui.breathe = { step: 0, cycle: 0 };
  bus.ui.modal = m; bus.render(); scanCJK(`modal:${m.type}`);
}
bus.ui.modal = null;
for (const { id } of CHAPTERS) {
  ui.view = "map"; startChapter(ui, id); scanCJK(`story:${id}`);
  ui.story = null;
}

const lines = [...found.keys()].sort();
console.log(`Scanned ${["title", "create", "map", "camp", "finale", "journal", "character", "about", "14 modals", `${CHAPTERS?.length || 10} chapters`].join(", ")} (both languages).`);
if (cjk.size) {
  console.log(`\n⚠ ${cjk.size} Chinese string(s) still visible in English mode:`);
  for (const l of [...cjk].slice(0, 20)) console.log("  • " + l);
  process.exitCode = 1;
}
if (lines.length) {
  console.log(`\n⚠ ${lines.length} English string(s) still visible in Chinese mode:\n`);
  for (const l of lines) console.log(`  • ${l}   [${[...found.get(l)].slice(0, 3).join(", ")}]`);
}
if (lines.length || cjk.size) process.exitCode = 1;
else console.log("\n✓ No untranslated English in Chinese mode, no Chinese leakage in English mode.");
dom.window.close();
