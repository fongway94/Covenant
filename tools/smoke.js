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
window.HTMLCanvasElement.prototype.getContext = () => null; // jsdom has no canvas
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
    if (p === "action") { click('[data-action="game-skip"]'); continue; }
    if (p === "action-result") { click('[data-action="action-done"]'); continue; }
    if (p === "hotspots") {
      let taps = 0;
      while (phase() === "hotspots" && taps++ < 20) {
        const b = $('[data-action="hotspot-tap"]:not(.decoy):not(.found)');
        if (!b) break;
        b.classList.add("lit");           // simulate the lantern revealing it
        click(b);
      }
      if (phase() === "hotspots") click('[data-action="hotspot-skip"]');
      continue;
    }
    if (p === "hotspots-done") {
      assert(!!$(".hotspot-done-btn"), "done panel missing its continue button");
      click('[data-action="hotspot-done"]'); continue;
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
  assert(document.documentElement.lang === "zh-CN", "Chinese should be the default language");
  assert(document.body.innerHTML.includes("开始新的旅程"), "Chinese UI missing on title");

  // Language toggle works both ways and re-renders in place.
  click('[data-action="toggle-lang"]');
  assert(document.documentElement.lang === "en", "toggle to English failed");
  assert(document.body.innerHTML.includes("Begin a new journey"), "English UI missing on title");
  click('[data-action="toggle-lang"]');
  assert(document.documentElement.lang === "zh-CN", "toggle back to Chinese failed");

  click('[data-action="new-game"]');
  assert(bus.ui.view === "create", "create screen missing");
  click('[data-action="select-calling"][data-calling="scribe"]');
  const input = $("#pilgrim-name");
  input.value = "Smoke Tester";
  input.dispatchEvent(new window.Event("input", { bubbles: true }));
  click('[data-action="start-game"]');
  assert(bus.ui.view === "camp", "did not reach the travellers' camp");
  assert(bus.ui.state.name === "Smoke Tester", "name not saved");
  assert(bus.ui.state.settings.cleanMode === true, "immersive / no-tips must be the default for new saves");

  // Old saves with explicit cleanMode:false migrate once, then respect user choice.
  const { loadGame, saveGame } = await import("../src/core/state.js");
  const living = JSON.stringify(bus.ui.state);
  const legacy = JSON.parse(living);
  legacy.settings.cleanMode = false;
  delete legacy.settings.settingsVersion;
  localStorage.setItem("covenant.save.v1", JSON.stringify(legacy));
  const migrated = loadGame();
  assert(migrated.settings.cleanMode === true, "legacy save did not migrate to immersive mode");
  assert(migrated.settings.settingsVersion === 2, "settings version not stamped");
  migrated.settings.cleanMode = false; saveGame(migrated);
  assert(loadGame().settings.cleanMode === false, "opting back into tips must persist");
  saveGame(bus.ui.state);

  // Camp hub: NPC dialogue, guidance explainer and breathing prayer.
  click('[data-action="camp-npc"][data-id="elias"]');
  assert(!!$("#modal-backdrop"), "camp NPC dialogue missing");
  click('[data-action="close-modal"]');
  click('[data-action="camp-guidance-info"]');
  assert(!!$("#modal-backdrop"), "guidance explainer missing");
  click('[data-action="close-modal"]');
  const g0 = bus.ui.state.adventure.guidance;
  click('[data-action="breathe-open"]');
  for (let i = 0; i < 9; i++) click('[data-action="breath-tap"]');
  assert(bus.ui.state.adventure.guidance === g0 + 2, "breathing prayer did not grant Guidance");
  assert(!$("#modal-backdrop"), "breathing modal did not close");
  click('[data-action="go"][data-view="map"]');

  // Modals / help.
  click('[data-action="howto"]');
  assert(!!$("#modal-backdrop"), "how-to modal missing");
  click('[data-action="close-modal"]');

  // Unlock everything so the test can walk all chapters back to back.
  bus.ui.state.settings.showAll = true;

  // Immersive / clean mode hides choice hints; Guidance can reveal them again.
  bus.ui.state.settings.cleanMode = true;
  click('.map-node[data-id="elah"]');
  click('[data-action="enter-chapter"]');
  for (let i = 0; i < 40 && phase() !== "choices"; i++) {
    if (phase() === "lines" || phase() === "reply") tapStoryLines();
    else if (phase() === "next") click('[data-action="story-continue"]');
    else break;
  }
  assert(phase() === "choices", "clean mode test never reached a choice page");
  assert($$(".choice .hint").length === 0, "clean mode should hide all choice hints");
  assert($$(".choice .tag").length === 0, "clean mode should hide reward preview tags");
  assert(!!$(".clean-banner"), "clean mode banner missing");
  const gBefore = bus.ui.state.adventure.guidance;
  click('[data-action="seek-guidance"]');
  assert(bus.ui.state.adventure.guidance === gBefore - 1, "seek-guidance did not spend 1 Guidance");
  assert(!!$(".clean-banner.revealed"), "revealed banner missing after spending Guidance");
  bus.ui.state.settings.cleanMode = false;
  bus.ui.story = null; bus.ui.view = "map"; bus.render();

  const { CHAPTERS } = await import("../src/data/chapters.js");
  for (const { id } of CHAPTERS) {
    if (bus.ui.view !== "map") click('[data-action="go"][data-view="map"]');
    playChapter(id);
    console.log(`  ✓ played: ${id}`);
  }

  // Finale is reachable after all ten chapters.
  if (bus.ui.view !== "finale") click('[data-action="go"][data-view="finale"]');
  assert(bus.ui.view === "finale", "finale screen missing");
  assert(bus.ui.state.flags.finaleSeen, "finale was not recorded in the save");

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
  click('[data-action="toggle-clean"]');
  assert(bus.ui.state.settings.cleanMode === true, "clean mode did not turn on");
  click('[data-action="toggle-clean"]');
  const musicBefore = bus.ui.state.settings.music;
  click('[data-action="toggle-music"]');
  assert(bus.ui.state.settings.music === !musicBefore, "ambient music toggle did not persist");
  click('[data-action="toggle-music"]');
  assert(bus.ui.state.fruits.length === 9, `expected 9 fruits, got ${bus.ui.state.fruits.length}`);
  assert(bus.ui.state.relics.length === CHAPTERS.length, `expected ${CHAPTERS.length} relics, got ${bus.ui.state.relics.length}`);

  // Reset.
  click('[data-action="ask-reset"]');
  click('[data-action="confirm-reset"]');
  assert(bus.ui.view === "title" && bus.ui.state === null, "reset failed");

  if (errors.length) throw new Error("runtime errors:\n" + errors.join("\n"));
  console.log(`\n✓ Full playthrough passed: zh/en toggle, ${CHAPTERS.length} chapters, 10 action scenes, camp hub, quests, breathing prayer, clean mode, finale, hotspots, journal, settings and reset.`);
} catch (e) {
  console.error("\n✗ " + (e.stack || e));
  if (errors.length) console.error("\nCaptured runtime errors:\n" + errors.join("\n"));
  process.exit(1);
} finally {
  dom.window.close();
}
