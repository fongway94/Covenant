/* Covenant — app shell, router, i18n, and input handling. */

import { esc } from "./core/util.js";
import { loadGame, saveGame, clearGame, newGame, claimQuest, metNpc, markFinale } from "./core/state.js";
import { setEnabled, sfx, setMusicEnabled, isMusicEnabled, setAmbience,
  resumeAudio, duckAmbience, CHAPTER_AMBIENCE } from "./core/audio.js";
import { bus } from "./core/bus.js";
import { t, tx, isZh, getLang, setLang, translateDOM, initI18n } from "./core/i18n.js";
import { titleHtml, createHtml, aboutHtml } from "./screens/home.js";
import { mapHtml, journalHtml, characterHtml } from "./screens/world.js";
import { modalHtml } from "./screens/modals.js";
import { campHtml, finaleHtml, startBreath, tapBreath } from "./screens/camp.js";
import {
  storyHtml, mountStory, cleanupStory, startChapter, tapStory, chooseOption,
  continueStory, prayNow, openScroll, miniTap, miniSkip, reflectAnswer,
  goToReflection, leaveStory, finishStory,
  skipAction, actionDone, hotspotTap, hotspotDone, hotspotSkip,
  revealHints, guidedChoose, skipMoment
} from "./screens/story.js";
import { mountAtmosphere } from "./engine/atmosphere.js";

const root = document.getElementById("app");
const toastsEl = document.getElementById("toasts");

/* One WebGL context, moved into whichever art container is currently on
   screen. Re-attaching an existing canvas keeps its context alive. */
const atmoCanvas = document.createElement("canvas");
atmoCanvas.className = "atmo-canvas";
atmoCanvas.setAttribute("aria-hidden", "true");

const ui = {
  view: "title",
  state: loadGame(),
  story: null,
  modal: null,
  journalTab: "scrolls",
  createCall: "shepherd",
  createName: "",
  mapPos: null,
  breathe: null
};

bus.ui = ui;
bus.render = render;
initI18n();

const SCALE = { small: 0.92, normal: 1, large: 1.14 };

function applySettings() {
  const settings = ui.state?.settings;
  document.documentElement.style.setProperty("--scale", SCALE[settings?.textSize] || 1);
  setEnabled(settings?.sound ?? true);
  setMusicEnabled(settings?.music ?? isMusicEnabled());
}

/** Pick the ambient bed for the current screen. Cheap + idempotent. */
let audioUnlocked = false;
function syncAmbience() {
  if (!audioUnlocked) return;   // never create an AudioContext before a gesture
  let kind = "title";
  let intensity = 0;
  if (ui.state) {
    if (ui.view === "story" && ui.story) {
      kind = CHAPTER_AMBIENCE[ui.story.chapterId] || "camp";
      // Action scenes add a stronger drum pulse and a faster, brighter harp.
      intensity = ["mini", "action", "hotspots", "hotspots-done"].includes(ui.story.phase) ? 1 : 0;
    }
    else if (ui.view === "finale") kind = "finale";
    else if (["camp", "map", "journal", "character", "create"].includes(ui.view)) kind = "camp";
    else kind = "title";
  }
  setAmbience(kind, intensity);
}

function toast(msg, ico = "✧") {
  if (!toastsEl || !msg) return;
  const d = document.createElement("div");
  d.className = "toast";
  d.innerHTML = `<span class="ico">${esc(ico)}</span><span>${esc(t(msg))}</span>`;
  toastsEl.appendChild(d);
  while (toastsEl.children.length > 2) toastsEl.firstElementChild.remove();
  setTimeout(() => {
    d.style.transition = "opacity .3s ease, transform .3s ease";
    d.style.opacity = "0";
    d.style.transform = "translateY(-8px)";
    setTimeout(() => d.remove(), 320);
  }, 2700);
}
bus.toast = toast;

let renderCount = 0;
function render() {
  cleanupStory(ui);
  applySettings();
  let html;
  switch (ui.view) {
    case "create": html = createHtml(ui); break;
    case "camp": html = ui.state ? campHtml(ui) : titleHtml(ui); break;
    case "finale": html = ui.state ? finaleHtml(ui) : titleHtml(ui); break;
    case "map": html = mapHtml(ui); break;
    case "journal": html = journalHtml(ui); break;
    case "character": html = characterHtml(ui); break;
    case "about": html = aboutHtml(ui); break;
    case "story": html = ui.story ? storyHtml(ui) : mapHtml(ui); break;
    default: html = titleHtml(ui); break;
  }
  root.innerHTML = html + (ui.modal ? modalHtml(ui) : "");
  root.dataset.render = String(++renderCount);
  const art = root.querySelector(".story-art, .action-screen, .title-art, .camp-hero, .finale-art");
  if (art) {
    art.appendChild(atmoCanvas);
    mountAtmosphere(atmoCanvas, { intensity: ui.view === "story" ? 1 : 0.72 });
  }
  if (ui.view === "story" && ui.story) mountStory(ui);
  if (ui.view === "map") {
    const cur = root.querySelector(".map-node.current");
    const sc = root.querySelector(".map-scroll");
    if (cur && sc) sc.scrollTop = Math.max(0, cur.offsetTop - sc.clientHeight * 0.42);
    mountMapToken();
  }
  translateDOM(root);
  // Leftover reward toasts used to cover the lantern-search header.
  if (ui.story?.phase === "hotspots" && toastsEl) toastsEl.innerHTML = "";
  syncAmbience();
}
bus.render = render;

function go(view) {
  if (["camp", "finale", "map", "journal", "character", "story"].includes(view) && !ui.state) { ui.view = "title"; ui.modal = null; render(); return; }
  ui.modal = null;
  ui.view = view;
  sfx("tap");
  render();
  if (toastsEl) toastsEl.innerHTML = "";
}
bus.go = go;

/* ------------------------------------------------------------------ actions */

let suppressClick = false;
let prayTimer = null;
let prayHeld = false;

root.addEventListener("click", (e) => {
  if (suppressClick) { suppressClick = false; return; }
  const el = e.target.closest("[data-action]");
  if (!el) return;
  const a = el.dataset.action;
  switch (a) {
    case "noop": return;

    case "go": go(el.dataset.view); break;
    case "continue": go("camp"); break;
    case "new-game":
      ui.createName = ""; ui.createCall = "shepherd"; go("create");
      break;
    case "select-calling":
      ui.createCall = el.dataset.calling; sfx("tap"); render();
      break;
    case "start-game": {
      const input = root.querySelector("#pilgrim-name");
      ui.createName = (input?.value || ui.createName || tx("Pilgrim", "朝圣者")).trim() || tx("Pilgrim", "朝圣者");
      ui.state = newGame(ui.createName, ui.createCall);
      saveGame(ui.state);
      sfx("unlock");
      go("camp");
      toast(tx("Your journey begins. Rest at the camp, then open the map.", "你的旅程开始了。先在营地歇脚，再打开地图。"), "✦");
      break;
    }
    case "toggle-lang": {
      const next = isZh() ? "en" : "zh";
      setLang(next);
      sfx("tap");
      render();
      toast(tx("已切换为中文", "Switched to English"), "✧");
      break;
    }
    case "howto": ui.modal = { type: "howto" }; sfx("tap"); render(); break;
    case "close-modal": ui.modal = null; render(); break;

    case "chapter-detail": ui.modal = { type: "chapter", id: el.dataset.id }; sfx("tap"); render(); break;
    case "enter-chapter": startChapter(ui, el.dataset.id); break;
    case "open-item": ui.modal = { type: "item", kind: el.dataset.kind, id: el.dataset.id }; sfx("tap"); render(); break;
    case "journal-tab": ui.journalTab = el.dataset.tab; sfx("tap"); render(); break;

    case "toggle-sound":
      ui.state.settings.sound = !ui.state.settings.sound;
      saveGame(ui.state); sfx("tap"); render();
      break;
    case "toggle-music": {
      const next = !isMusicEnabled();
      if (ui.state) { ui.state.settings.music = next; saveGame(ui.state); }
      setMusicEnabled(next);
      sfx("tap"); render();
      toast(next ? tx("Ambient music on", "环境音乐已开启") : tx("Ambient music off", "环境音乐已关闭"), next ? "♪" : "✧");
      break;
    }
    case "set-text":
      ui.state.settings.textSize = el.dataset.size;
      saveGame(ui.state); sfx("tap"); render();
      break;
    case "toggle-demo":
      ui.state.settings.showAll = !ui.state.settings.showAll;
      saveGame(ui.state); sfx("tap"); render();
      toast(ui.state.settings.showAll ? tx("All chapters are now open.", "所有章节现已开放。") : tx("Chapter order restored.", "章节顺序已恢复。"), "✧");
      break;
    case "ask-reset": ui.modal = { type: "reset" }; render(); break;
    case "confirm-reset":
      clearGame(); ui.state = null; ui.story = null; ui.modal = null; ui.mapPos = null;
      go("title"); toast(tx("Journey erased. A new one is waiting.", "旅程已清除。新的路在等你。"), "✧");
      break;

    case "ask-leave": ui.modal = { type: "leave" }; render(); break;
    case "confirm-leave": leaveStory(ui); break;
    case "open-scroll": openScroll(ui); break;
    case "tap-story": tapStory(ui); break;
    case "choose": chooseOption(ui, Number(el.dataset.index)); break;
    case "locked-choice": toast(ui.state?.settings?.cleanMode
      ? tx("Some doors open later. Keep walking.", "有些门要到后来才开。继续走吧。")
      : tx("This path needs a higher virtue. Pray or keep walking.", "这条路需要更高的品格。祷告或继续前行。"), "✟"); break;
    case "story-continue": continueStory(ui); break;
    case "pray-now": if (!prayHeld) prayNow(ui); break;
    case "mini-tap": miniTap(ui); break;
    case "mini-skip": miniSkip(ui); break;
    case "moment-skip": skipMoment(ui); break;

    case "game-skip": skipAction(ui); break;
    case "action-done": actionDone(ui); break;
    case "hotspot-tap": hotspotTap(ui, Number(el.dataset.index)); break;
    case "hotspot-done": hotspotDone(ui); break;
    case "hotspot-skip": hotspotSkip(ui); break;

    case "reflect": goToReflection(ui); break;
    case "reflect-answer": reflectAnswer(ui, Number(el.dataset.index)); break;
    case "finish-story": finishStory(ui); break;

    /* ------------------------------- camp hub / adventure */
    case "camp-npc":
      metNpc(ui.state, el.dataset.id);
      ui.modal = { type: "camp-npc", id: el.dataset.id };
      sfx("tap"); render(); break;
    case "camp-guidance-info": ui.modal = { type: "guidance" }; sfx("tap"); render(); break;
    case "breathe-open": startBreath(ui); sfx("pray"); render(); break;
    case "breath-tap": {
      const r = tapBreath(ui);
      if (r?.done) {
        if (r.already) toast(tx("You have already breathed today. Come back after the next chapter.", "今天已经呼吸祷告过了。完成下一章后再来。"), "✟");
        else toast(tx("+2 Guidance · +1 Faith · be still and know", "+2 引导 · +1 信心 · 要休息，要知道"), "✟");
        sfx(r.already ? "tap" : "complete");
      } else sfx("tap");
      render(); break;
    }
    case "claim-quest": {
      const r = claimQuest(ui.state, el.dataset.id);
      if (r) { ui.modal = { type: "quest-reward", quest: r.quest }; sfx("unlock"); }
      else toast(tx("That task is not finished yet.", "这件事还没有完成。"), "✧");
      render(); break;
    }
    case "toggle-clean":
      ui.state.settings.cleanMode = !ui.state.settings.cleanMode;
      saveGame(ui.state); sfx("tap"); render();
      toast(ui.state.settings.cleanMode
        ? tx("Immersive mode on (default) — hints hidden. Spend Guidance to reveal one page.", "沉浸模式已开启（默认）——提示已隐藏。可花费引导显明一页。")
        : tx("Immersive mode off — tips are visible again.", "沉浸模式已关闭——提示重新显示。"), "✧");
      break;
    case "seek-guidance": revealHints(ui); break;
    case "guided-choice": guidedChoose(ui, Number(el.dataset.index)); break;
    case "go-finale": markFinale(ui.state); go("finale"); break;
    case "mirror-scroll":
      ui.modal = { type: "item", kind: "verse", id: el.dataset.id };
      sfx("tap"); render();
      break;
    default: break;
  }
});

root.addEventListener("click", (e) => {
  if (e.target.id === "modal-backdrop" && ui.modal) { ui.modal = null; render(); }
});

root.addEventListener("input", (e) => {
  if (e.target.id === "pilgrim-name") ui.createName = e.target.value;
});

/* ------------------------------------------------- swipe / drag to choose */

let drag = null;
root.addEventListener("pointerdown", (e) => {
  const b = e.target.closest('.choice[data-action="choose"], .choice[data-action="reflect-answer"]');
  if (!b) return;
  drag = { el: b, x: e.clientX, y: e.clientY, moved: false, acted: false };
  b.classList.add("dragging");
});
root.addEventListener("pointermove", (e) => {
  if (!drag) return;
  const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
  if (Math.abs(dx) > 8) drag.moved = true;
  drag.el.style.transform = `translateX(${Math.max(-70, Math.min(70, dx))}px) rotate(${dx * 0.02}deg)`;
  drag.el.style.opacity = String(Math.max(0.5, 1 - Math.abs(dx) / 160));
  if (Math.abs(dy) > 60) drag.moved = false;
});
function endDrag(e) {
  if (!drag) return;
  const d = drag; drag = null;
  d.el.classList.remove("dragging");
  d.el.style.transform = ""; d.el.style.opacity = "";
  const dx = (e.clientX ?? d.x) - d.x;
  if (d.moved && Math.abs(dx) > 52) {
    suppressClick = true;
    d.el.classList.add("swiped");
    sfx("choose");
    if (d.el.dataset.action === "choose") chooseOption(ui, Number(d.el.dataset.index));
    else reflectAnswer(ui, Number(d.el.dataset.index));
  }
}
root.addEventListener("pointerup", endDrag);
root.addEventListener("pointercancel", endDrag);

/* ------------------------------------------------------------ hold to pray */

root.addEventListener("pointerdown", (e) => {
  const b = e.target.closest('[data-hold="pray"]');
  if (!b || b.disabled) return;
  prayHeld = false;
  b.classList.add("holding");
  if (prayTimer) clearTimeout(prayTimer);
  prayTimer = setTimeout(() => {
    prayHeld = true;
    b.classList.remove("holding");
    b.classList.add("prayed");
    prayNow(ui);
  }, 850);
});
function cancelPray() {
  const b = root.querySelector('[data-hold="pray"]');
  if (b) b.classList.remove("holding");
  if (prayTimer) { clearTimeout(prayTimer); prayTimer = null; }
}
root.addEventListener("pointerup", (e) => {
  if (prayTimer && e.target.closest('[data-hold="pray"]')) {
    const wasHeld = prayHeld;
    cancelPray();
    if (!wasHeld) { /* a quick tap still prays via the click handler */ }
  }
});
root.addEventListener("pointercancel", cancelPray);

/* --------------------------------------------- draggable pilgrim on the map */

function mountMapToken() {
  const token = root.querySelector(".map-token");
  if (!token) return;
  let dragging = false, moved = false;
  const canvas = root.querySelector(".map-canvas");
  const down = (e) => {
    dragging = true; moved = false;
    token.classList.add("walking");
    token.setPointerCapture?.(e.pointerId);
    e.preventDefault();
  };
  const move = (e) => {
    if (!dragging || !canvas) return;
    const r = canvas.getBoundingClientRect();
    const x = Math.max(4, Math.min(96, ((e.clientX - r.left) / r.width) * 100));
    const y = Math.max(2, Math.min(94, ((e.clientY - r.top) / r.height) * 100));
    token.style.left = `${x}%`; token.style.top = `${y}%`;
    ui.mapPos = { x, y };
    if (Math.abs(x - parseFloat(token.dataset.x || 0)) > 1) moved = true;
  };
  const up = (e) => {
    if (!dragging) return;
    dragging = false;
    token.classList.remove("walking");
    if (moved) {
      suppressClick = true;
      const near = [...root.querySelectorAll(".map-node")].find((n) => {
        const nx = parseFloat(n.style.left), ny = parseFloat(n.style.top);
        return Math.abs(nx - ui.mapPos.x) < 9 && Math.abs(ny - ui.mapPos.y) < 7;
      });
      if (near && !near.classList.contains("locked")) {
        ui.modal = { type: "chapter", id: near.dataset.id };
        sfx("tap"); render();
      }
    }
  };
  token.addEventListener("pointerdown", down);
  token.addEventListener("pointermove", move);
  token.addEventListener("pointerup", up);
  token.addEventListener("pointercancel", up);
}

/* -------------------------------------------------------- keyboard niceties */

document.addEventListener("keydown", (e) => {
  if (!ui.story || ui.view !== "story") return;
  if (ui.modal) { if (e.key === "Escape") { ui.modal = null; render(); } return; }
  if (ui.story.phase === "mini" && (e.key === " " || e.key === "Enter")) { e.preventDefault(); miniTap(ui); return; }
  if ((ui.story.phase === "lines" || ui.story.phase === "reply") && (e.key === " " || e.key === "Enter")) {
    e.preventDefault(); tapStory(ui);
  }
});

/* ------------------------------------------------- audio unlock / lifecycle */
/* Browsers refuse to start audio before a real gesture. The first tap or key
   resumes the shared AudioContext; render() then starts the ambient bed. */
const kickAudio = () => { audioUnlocked = true; resumeAudio(); syncAmbience(); };
document.addEventListener("pointerdown", kickAudio, { once: true });
document.addEventListener("keydown", kickAudio, { once: true });
document.addEventListener("visibilitychange", () => duckAmbience(document.hidden));

/* ------------------------------------------------------------ offline cache */

if (typeof navigator !== "undefined" && "serviceWorker" in navigator && location.protocol.startsWith("http")) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => { /* offline cache is optional */ });
  });
}

render();
