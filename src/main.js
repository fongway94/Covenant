/* Covenant — app shell, router, and input handling. */

import { esc } from "./core/util.js";
import { loadGame, saveGame, clearGame, newGame } from "./core/state.js";
import { setEnabled, sfx } from "./core/audio.js";
import { bus } from "./core/bus.js";
import { titleHtml, createHtml, aboutHtml } from "./screens/home.js";
import { mapHtml, journalHtml, characterHtml } from "./screens/world.js";
import { modalHtml } from "./screens/modals.js";
import {
  storyHtml, mountStory, cleanupStory, startChapter, tapStory, chooseOption,
  continueStory, prayNow, openScroll, miniTap, miniSkip, reflectAnswer,
  goToReflection, leaveStory, finishStory
} from "./screens/story.js";

const root = document.getElementById("app");
const toastsEl = document.getElementById("toasts");

const ui = {
  view: "title",
  state: loadGame(),
  story: null,
  modal: null,
  journalTab: "scrolls",
  createCall: "shepherd",
  createName: ""
};

bus.ui = ui;
bus.render = render;

const SCALE = { small: 0.92, normal: 1, large: 1.14 };

function applySettings() {
  const settings = ui.state?.settings;
  document.documentElement.style.setProperty("--scale", SCALE[settings?.textSize] || 1);
  setEnabled(settings?.sound ?? true);
}

function toast(msg, ico = "✧") {
  if (!toastsEl || !msg) return;
  const d = document.createElement("div");
  d.className = "toast";
  d.innerHTML = `<span class="ico">${esc(ico)}</span><span>${esc(msg)}</span>`;
  toastsEl.appendChild(d);
  setTimeout(() => {
    d.style.transition = "opacity .3s ease, transform .3s ease";
    d.style.opacity = "0";
    d.style.transform = "translateY(-8px)";
    setTimeout(() => d.remove(), 320);
  }, 2700);
}
bus.toast = toast;

function render() {
  cleanupStory(ui);
  applySettings();
  let html;
  switch (ui.view) {
    case "create": html = createHtml(ui); break;
    case "map": html = mapHtml(ui); break;
    case "journal": html = journalHtml(ui); break;
    case "character": html = characterHtml(ui); break;
    case "about": html = aboutHtml(ui); break;
    case "story": html = ui.story ? storyHtml(ui) : mapHtml(ui); break;
    default: html = titleHtml(ui);
  }
  root.innerHTML = html + (ui.modal ? modalHtml(ui) : "");
  if (ui.view === "story" && ui.story) mountStory(ui);
  if (ui.view === "map") {
    const cur = root.querySelector(".map-node.current");
    const sc = root.querySelector(".map-scroll");
    if (cur && sc) sc.scrollTop = Math.max(0, cur.offsetTop - sc.clientHeight * 0.42);
  }
}
bus.render = render;

function go(view) {
  if (["map", "journal", "character", "story"].includes(view) && !ui.state) { ui.view = "title"; ui.modal = null; render(); return; }
  ui.modal = null;
  ui.view = view;
  sfx("tap");
  render();
  if (toastsEl) toastsEl.innerHTML = "";
}
bus.go = go;

/* ------------------------------------------------------------------ input */

root.addEventListener("click", (e) => {
  const t = e.target.closest("[data-action]");
  if (!t) return;
  const a = t.dataset.action;
  switch (a) {
    case "noop": return;

    case "go": go(t.dataset.view); break;
    case "continue": go("map"); break;
    case "new-game":
      ui.createName = ""; ui.createCall = "shepherd"; go("create");
      break;
    case "select-calling":
      ui.createCall = t.dataset.calling; sfx("tap"); render();
      break;
    case "start-game": {
      const input = root.querySelector("#pilgrim-name");
      ui.createName = (input?.value || ui.createName || "Pilgrim").trim() || "Pilgrim";
      ui.state = newGame(ui.createName, ui.createCall);
      saveGame(ui.state);
      sfx("unlock");
      go("map");
      toast("Your journey begins. Tap a chapter on the map.", "✦");
      break;
    }
    case "howto": ui.modal = { type: "howto" }; sfx("tap"); render(); break;
    case "close-modal": ui.modal = null; render(); break;

    case "chapter-detail": ui.modal = { type: "chapter", id: t.dataset.id }; sfx("tap"); render(); break;
    case "enter-chapter": startChapter(ui, t.dataset.id); break;
    case "open-item": ui.modal = { type: "item", kind: t.dataset.kind, id: t.dataset.id }; sfx("tap"); render(); break;
    case "journal-tab": ui.journalTab = t.dataset.tab; sfx("tap"); render(); break;

    case "toggle-sound":
      ui.state.settings.sound = !ui.state.settings.sound;
      saveGame(ui.state); sfx("tap"); render();
      break;
    case "set-text":
      ui.state.settings.textSize = t.dataset.size;
      saveGame(ui.state); sfx("tap"); render();
      break;
    case "toggle-demo":
      ui.state.settings.showAll = !ui.state.settings.showAll;
      saveGame(ui.state); sfx("tap"); render();
      toast(ui.state.settings.showAll ? "All chapters are now open." : "Chapter order restored.", "✧");
      break;
    case "ask-reset": ui.modal = { type: "reset" }; render(); break;
    case "confirm-reset":
      clearGame(); ui.state = null; ui.story = null; ui.modal = null;
      go("title"); toast("Journey erased. A new one is waiting.", "✧");
      break;

    case "ask-leave": ui.modal = { type: "leave" }; render(); break;
    case "confirm-leave": leaveStory(ui); break;
    case "open-scroll": openScroll(ui); break;
    case "tap-story": tapStory(ui); break;
    case "choose": chooseOption(ui, Number(t.dataset.index)); break;
    case "locked-choice": toast("This path needs a higher virtue. Pray or keep walking.", "✟"); break;
    case "story-continue": continueStory(ui); break;
    case "pray-now": prayNow(ui); break;
    case "mini-tap": miniTap(ui); break;
    case "mini-skip": miniSkip(ui); break;
    case "reflect": goToReflection(ui); break;
    case "reflect-answer": reflectAnswer(ui, Number(t.dataset.index)); break;
    case "finish-story": finishStory(ui); break;
    default: break;
  }
});

/* Backdrop clicks close the modal; clicks inside the panel do not. */
root.addEventListener("click", (e) => {
  if (e.target.id === "modal-backdrop" && ui.modal) { ui.modal = null; render(); }
});

root.addEventListener("input", (e) => {
  if (e.target.id === "pilgrim-name") ui.createName = e.target.value;
});

/* Keyboard niceties for desktop / accessibility. */
document.addEventListener("keydown", (e) => {
  if (!ui.story || ui.view !== "story") return;
  if (ui.modal) { if (e.key === "Escape") { ui.modal = null; render(); } return; }
  if (ui.story.phase === "mini" && (e.key === " " || e.key === "Enter")) { e.preventDefault(); miniTap(ui); return; }
  if ((ui.story.phase === "lines" || ui.story.phase === "reply") && (e.key === " " || e.key === "Enter")) {
    e.preventDefault(); tapStory(ui);
  }
});

/* Offline support. */
if (typeof navigator !== "undefined" && "serviceWorker" in navigator && location.protocol.startsWith("http")) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => { /* offline cache is optional */ });
  });
}

render();
