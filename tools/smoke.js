#!/usr/bin/env node
/* Headless UI smoke test. Run after `npm install`: npm run smoke
   Boots the whole app in jsdom and plays every chapter through to the end. */
import { JSDOM } from "jsdom";

const dom = new JSDOM(`<!doctype html><html><body>
  <div id="app" class="app"></div><div id="toasts" class="toasts"></div>
</body></html>`, { url: "http://localhost:4173/", pretendToBeVisual: true });

const { window } = dom;
for (const key of ["window", "document", "localStorage", "location", "MouseEvent", "Event", "HTMLElement", "SVGElement", "Element", "Node", "getComputedStyle"]) {
  Object.defineProperty(globalThis, key, { value: window[key], configurable: true, writable: true });
}
Object.defineProperty(globalThis, "navigator", { value: window.navigator, configurable: true, writable: true });
let rafCount = 0;
globalThis.requestAnimationFrame = (cb) => (rafCount++ < 400 ? setTimeout(() => cb(Date.now()), 4) : 0);
globalThis.cancelAnimationFrame = (id) => clearTimeout(id);

const errors = [];
process.on("uncaughtException", (e) => errors.push(String(e.stack || e)));
window.addEventListener("error", (e) => errors.push(String(e.message)));

const { bus } = await import("../src/core/bus.js");
await import("../src/main.js");

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const click = (s) => { const el = typeof s === "string" ? $(s) : s; if (!el) throw new Error(`missing element: ${s}`); el.click(); };
const phase = () => bus.ui.story?.phase;
const assert = (cond, msg) => { if (!cond) throw new Error("ASSERT: " + msg); };

function tapStoryLines(limit = 80) {
  for (let i = 0; i < limit; i++) {
    const p = phase();
    if (p !== "lines" && p !== "reply") return;
    click("#dialogue");
  }
  throw new Error("dialogue never finished");
}

function playChapter(id) {
  assert(bus.ui.view === "map", `expected map before ${id}, got ${bus.ui.view}`);
  click(`.map-node[data-id="${id}"]`);
  click('[data-action="enter-chapter"]');
  assert(bus.ui.view === "story", `chapter ${id} did not open`);

  let guard = 0;
  while (guard++ < 300) {
    const p = phase();
    if (p === "reward") break;
    if (p === "lines" || p === "reply") { tapStoryLines(); continue; }
    if (p === "choices") {
      const c = $$('[data-action="choose"]')[0];
      assert(c, `no unlocked choice in ${id} / ${bus.ui.story.nodeId}`);
      click(c);
      continue;
    }
    if (p === "next") { click('[data-action="story-continue"]'); continue; }
    if (p === "mini") {
      let spins = 0;
      while (phase() === "mini" && spins++ < 30) click('[data-action="mini-tap"]');
      continue;
    }
    throw new Error(`unexpected phase ${p} in ${id}`);
  }
  assert(phase() === "reward", `${id} did not reach the reward screen (phase=${phase()})`);
  click('[data-action="reflect"]');
  assert(phase() === "reflect", `reflection did not open for ${id}`);
  click('[data-action="reflect-answer"]');
  assert(phase() === "reflect-done", `reflection did not resolve for ${id}`);
  click('[data-action="finish-story"]');
}

try {
  assert(bus.ui.view === "title", "should boot to title");
  click('[data-action="new-game"]');
  assert(bus.ui.view === "create", "create screen missing");
  click('[data-action="select-calling"][data-calling="scribe"]');
  const input = $("#pilgrim-name");
  input.value = "Smoke Tester";
  input.dispatchEvent(new window.Event("input", { bubbles: true }));
  click('[data-action="start-game"]');
  assert(bus.ui.view === "map", "did not reach the map");
  assert(bus.ui.state.name === "Smoke Tester", "name not saved");

  // Modals / help.
  click('[data-action="howto"]');
  assert(!!$("#modal-backdrop"), "how-to modal missing");
  click('[data-action="close-modal"]');

  // Unlock everything so the test can walk all chapters back to back.
  bus.ui.state.settings.showAll = true;

  for (const id of ["elah", "lions", "jericho", "storm", "prodigal", "esther"]) {
    if (bus.ui.view !== "map") click('[data-action="go"][data-view="map"]');
    playChapter(id);
    console.log(`  ✓ played: ${id}`);
  }

  // Journal tabs + item modals.
  click('[data-action="go"][data-view="journal"]');
  for (const tab of ["scrolls", "relics", "fruits", "seals"]) {
    click(`[data-action="journal-tab"][data-tab="${tab}"]`);
    assert($$(".codex-item, .fruit").length > 0, `journal ${tab} is empty`);
  }
  click('[data-action="open-item"]');
  assert(!!$("#modal-backdrop"), "item modal missing");
  click('[data-action="close-modal"]');

  // Character settings.
  click('[data-action="go"][data-view="character"]');
  click('[data-action="toggle-sound"]');
  click('[data-action="set-text"][data-size="large"]');
  click('[data-action="toggle-demo"]');
  click('[data-action="toggle-demo"]');
  assert(bus.ui.state.fruits.length === 9, `expected 9 fruits, got ${bus.ui.state.fruits.length}`);
  assert(bus.ui.state.relics.length === 6, `expected 6 relics, got ${bus.ui.state.relics.length}`);

  // Reset.
  click('[data-action="ask-reset"]');
  click('[data-action="confirm-reset"]');
  assert(bus.ui.view === "title" && bus.ui.state === null, "reset failed");

  if (errors.length) throw new Error("runtime errors:\n" + errors.join("\n"));
  console.log("\n✓ Full playthrough passed: 6 chapters, journal, settings, modals and reset.");
} catch (e) {
  console.error("\n✗ " + (e.stack || e));
  if (errors.length) console.error("\nCaptured runtime errors:\n" + errors.join("\n"));
  process.exit(1);
} finally {
  dom.window.close();
}
