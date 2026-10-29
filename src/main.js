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
  storyHtml, mountStory, cleanupStory, startChapter, tapStory, chooseOption, exitChapterToMap, startAct, showActHelp,
  continueStory, prayNow, openScroll, miniTap, miniSkip, reflectAnswer,
  goToReflection, leaveStory, finishStory,
  skipAction, actionDone, hotspotTap, hotspotDone, hotspotSkip,
  revealHints, guidedChoose, skipMoment, pauseGame, resumeGame,
  startActionNow, startMomentNow, startHotspotsNow, miniStart
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

/* Reading comfort, not a decoration. The old range topped out at 1.14, which
   nobody could see; large is now a third bigger than normal, and the smallest
   step is still comfortable. Canvas HUD text reads the same variable, so the
   instructions inside a scene grow with the setting too. */
const SCALE = { small: 0.98, normal: 1.1, large: 1.42 };

function applySettings() {
  const settings = ui.state?.settings;
  document.documentElement.style.setProperty("--scale", SCALE[settings?.textSize] || 1);
  /* Audio is the one subsystem that can be left in a broken state by the OS —
     a suspended or dropped AudioContext after a long sleep. It must never be
     able to abort a render: render() runs from every tap handler, so a throw
     here turns the whole app into a screen that ignores input. */
  try { setEnabled(settings?.sound ?? true); } catch { /* audio is optional */ }
  try { setMusicEnabled(settings?.music ?? isMusicEnabled()); } catch { /* audio is optional */ }
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
      // Action scenes add the drum pulse and a heartbeat under it.
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
  /* The running action scene owns its canvas and its animation loop. Replacing
     root.innerHTML destroys that canvas, so preserve the live node and splice it
     into the freshly rendered layout. Without this, pausing (or any dialog, or
     returning from an app switch) left a frozen, unresponsive scene. */
  const liveCanvas = ui.view === "story" && ui.story?.phase === "action"
    ? document.getElementById("action-canvas") : null;
  root.innerHTML = html + (ui.modal ? modalHtml(ui) : "");
  if (liveCanvas) {
    const placeholder = root.querySelector("#action-canvas");
    if (placeholder && placeholder !== liveCanvas && placeholder.parentNode) {
      placeholder.parentNode.replaceChild(liveCanvas, placeholder);
    }
  }
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
  try { syncAmbience(); } catch { /* a dead audio context must not break the screen */ }
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
let cardHandledAt = 0;

root.addEventListener("click", (e) => {
  if (cardHandledAt && Date.now() - cardHandledAt < 900) { cardHandledAt = 0; return; }
  if (suppressClick) { suppressClick = false; return; }
  const el = e.target.closest("[data-action]");
  if (!el) {
    /* "Tap anywhere to continue" has to mean anywhere: the empty space under
       the dialogue box is the biggest target on the page and a thumb lands
       there more often than on the box itself. Anything that is a control of
       its own (a button, a choice, the scroll) keeps its own behaviour. */
    const st = ui.story;
    /* Not the background page: that one is a wall of text with its own button,
       and a stray tap while reading it would start the chapter early. */
    if (st && (st.phase === "lines" || st.phase === "reply")
        && !e.target.closest("button, a, input, .choice, .modal, .paused-how, #dialogue-text")) {
      try { tapStory(ui); } catch { /* never let a stray tap break the app */ }
    }
    return;
  }
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
    case "set-text": {
      ui.state.settings.textSize = el.dataset.size;
      saveGame(ui.state); sfx("tap"); render();
      const label = { small: tx("Standard text", "标准字号"), normal: tx("Comfortable text", "舒适字号"), large: tx("Large text", "大字号") }[el.dataset.size];
      if (label) toast(label, "A");
      break;
    }
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
    case "chapter-exit": exitChapterToMap(ui); break;
    case "open-scroll": openScroll(ui); break;
    case "tap-story": tapStory(ui); break;
    case "choose": chooseOption(ui, Number(el.dataset.index)); break;
    case "locked-choice": toast(ui.state?.settings?.cleanMode
      ? tx("Some doors open later. Keep walking.", "有些门要到后来才开。继续走吧。")
      : tx("This path needs a higher virtue. Pray or keep walking.", "这条路需要更高的品格。祷告或继续前行。"), "✟"); break;
    case "story-continue": continueStory(ui); break;
    case "pray-now": if (!prayHeld) prayNow(ui); break;
    case "mini-start": miniStart(ui); break;
    case "mini-tap": miniTap(ui); break;
    case "mini-skip": miniSkip(ui); break;
    case "moment-start": startMomentNow(ui); break;
    case "moment-skip": skipMoment(ui); break;

    case "game-start": startActionNow(ui); break;
    case "game-act-start": startAct(ui); break;
    case "game-help": showActHelp(ui); break;
    case "game-pause": pauseGame(ui, { by: "user" }); break;
    case "game-resume": resumeGame(ui); break;
    case "game-skip": skipAction(ui); break;
    case "action-done": actionDone(ui); break;
    case "hotspot-start": startHotspotsNow(ui); break;
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
/* A phone lock is not an ordinary tab switch: the OS may freeze the page
   between two statements, drop the animation loop, suspend audio, and — on
   iOS — swallow the synthetic click that follows a restored page. So the whole
   cycle is written to need nothing from the previous step: state is re-derived,
   the DOM is rebuilt, and the way out of a pause never depends on a tap. */

/* Every input state that can be left mid-gesture when the screen locks. A
   finger that was down when the phone froze never sends its pointerup, so a
   stale drag or a held key would otherwise survive into the next session. */
function resetTransientInput() {
  drag = null;
  suppressClick = false;
  cardHandledAt = 0;
  prayHeld = false;
  if (prayTimer) { clearTimeout(prayTimer); prayTimer = null; }
  for (const el of root.querySelectorAll(".dragging, .holding, .walking")) {
    el.classList.remove("dragging", "holding", "walking");
  }
}

function syncPauseCard() {
  const shouldShow = ui.story?.phase === "action" && !!ui.story.game?.paused;
  const card = document.querySelector(".action-paused");
  if (!card) {
    // Paused with no card on screen would be a dead end: rebuild the screen.
    if (shouldShow) { try { bus.render(); } catch { /* noop */ } }
    return;
  }
  card.classList.toggle("on", shouldShow);
}

let wasHidden = false;

function onHidden() {
  wasHidden = true;
  try { duckAmbience(true); } catch { /* noop */ }
  resetTransientInput();
  /* Leaving the app mid-scene must not cost the player stones or time: freeze
     the world and show the resume card. `silent` keeps the lock moment free of
     a full DOM rebuild — that is the riskiest thing to do to a page the OS is
     about to freeze. */
  if (ui.story?.phase === "action" && !ui.story.game?.paused) pauseGame(ui, { silent: true });
  else syncPauseCard();
  document.body.classList.add("app-paused");
}

let autoResumeTimer = null;
function clearAutoResume() { if (autoResumeTimer) { clearTimeout(autoResumeTimer); autoResumeTimer = null; } }

function onVisible() {
  wasHidden = false;
  /* Whatever happened while the screen was off, the app must come back usable:
     the frozen-animation class always goes, and the pause card is re-derived
     from state rather than left over from the last painted frame. */
  document.body.classList.remove("app-paused");
  try { duckAmbience(false); } catch { /* noop */ }
  resetTransientInput();

  const inAction = ui.story?.phase === "action" && !!ui.story.game;
  if (inAction) {
    /* Rebuild the action screen once on return. It costs one render and it is
       the difference between "the page came back" and "the page came back as a
       photograph": a fresh DOM means fresh buttons, a fresh canvas mount and no
       half-finished handler from the moment the OS froze us. */
    try { bus.render(); } catch { /* the screen is still whatever was there */ }
  }
  syncPauseCard();

  if (inAction) {
    const ctrl = ui.story.game.controller;
    let live = false;
    try { live = !!(ctrl && (ctrl.alive ? ctrl.alive() : true)); } catch { live = false; }
    if (!live && !ui.story.game.paused) {
      // The loop died during sleep. Rebuild it instead of showing a dead frame.
      ui.story.game.controller = null;
      try { bus.render(); } catch { /* nothing else we can do here */ }
    }
    /* A pause the phone forced is lifted on its own. Waiting for a tap means
       one wedged input path leaves the player staring at a card that answers
       nothing — which is exactly what a locked phone used to do. */
    if (ui.story.game.paused && (ui.story.game.pausedBy || "system") !== "user") {
      clearAutoResume();
      autoResumeTimer = setTimeout(() => {
        autoResumeTimer = null;
        if (ui.story?.phase === "action" && ui.story.game?.paused && ui.story.game.pausedBy !== "user") {
          try { resumeGame(ui); } catch { /* card taps still work */ }
        }
      }, 650);
    }
  }
}

/* Taps on the pause card are handled on pointerdown, in the capture phase.
   pointerdown always reaches the page; the click that follows it does not,
   because after a restored page iOS can drop it and because our own scenes call
   preventDefault on pointer events. Whatever happens, the card answers. */
document.addEventListener("pointerdown", (e) => {
  const el = e.target.closest?.(".action-paused");
  if (!el || !el.classList.contains("on")) return;
  const act = e.target.closest?.("[data-action]")?.dataset.action;
  clearAutoResume();
  cardHandledAt = Date.now();
  if (act === "game-skip") { try { skipAction(ui); } catch { /* noop */ } }
  else { try { resumeGame(ui); } catch { /* noop */ } }
}, true);
document.addEventListener("keydown", (e) => {
  if (e.key !== " " && e.key !== "Enter") return;
  const card = document.querySelector(".action-paused.on");
  if (!card) return;
  e.preventDefault();
  clearAutoResume();
  try { resumeGame(ui); } catch { /* noop */ }
});

document.addEventListener("visibilitychange", () => {
  if (document.hidden) onHidden(); else onVisible();
});
/* iOS restores a backgrounded page through pagehide/pageshow, and sometimes
   without a visibilitychange at all. */
window.addEventListener("pageshow", (e) => { if (!document.hidden && e.persisted) onVisible(); });
window.addEventListener("focus", () => {
  if (document.hidden) return;
  document.body.classList.remove("app-paused");
  if (wasHidden && ui.story?.phase === "action") onVisible();
});

/* ------------------------------------------------------------ offline cache */

if (typeof navigator !== "undefined" && "serviceWorker" in navigator && location.protocol.startsWith("http")) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => { /* offline cache is optional */ });
  });
}

render();
