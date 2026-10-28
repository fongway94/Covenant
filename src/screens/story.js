import { esc, icon } from "../core/util.js";
import { STATS, STAT_KEYS, FRUITS, RELICS, countDone } from "../data/compendium.js";
import { chapterById } from "../data/chapters.js";
import { addStat, addXp, grantFruit, checkSeals, completeChapter, recordReflection, hasPrayed, pray as prayState, saveGame, xpNeeded, spendGuidance, adventure, markFinale, addWay, addWaysFromStats, addHintUse } from "../core/state.js";
import { deeperFor } from "../data/deeper.js";
import { momentFor } from "../data/moments.js";
import { startMoment } from "../engine/moments.js";
import { sfx } from "../core/audio.js";
import { bus } from "../core/bus.js";
import { tx, isZh } from "../core/i18n.js";
import { startScene, gameInfo } from "../engine/scene.js";
import { portraitFor, chapterPortrait } from "../data/portraits.js";
import { musicButton } from "./home.js";

const CHAPTER_COUNT = 10;

/* ------------------------------------------------------------------ helpers */

function st(ui) { return ui.story; }
function chapter(ui) { return chapterById(st(ui).chapterId); }
function node(ui) { return chapter(ui).nodes[st(ui).nodeId]; }

export function currentLines(ui) {
  const s = st(ui);
  if (s.phase === "reply" && s.reply) return s.reply.lines;
  return node(ui).lines || [];
}

function meets(ui, require) {
  if (!require) return true;
  return Object.entries(require).every(([k, v]) => (ui.state.stats[k] || 0) >= v);
}

function speakerMarkup(ch, who) {
  if (!who) return `<div class="speaker narrator" id="speaker"><span class="portrait narrator-pop">✧</span><span class="who">${tx("The Story", "旁白")}</span></div>`;
  const c = ch.cast[who] || { name: who, role: "" };
  const art = portraitFor(who);
  return `<div class="speaker" id="speaker"><span class="portrait has-art" style="background-image:url('${art}')"></span><span class="who">${esc(c.name)}${c.role ? `<span class="role">${esc(c.role)}</span>` : ""}</span></div>`;
}

function toast(msg, ico = "✧") { bus.toast(msg, ico); }

/* ------------------------------------------------------------------ lifecycle */

export function startChapter(ui, id) {
  const ch = chapterById(id);
  if (!ch) return;
  stopScene(ui);
  cleanupStory(ui);
  ui.modal = null;
  ui.story = {
    chapterId: id, nodeId: ch.start, phase: "lines", lineIndex: 0,
    reply: null, mini: null, result: null, bump: {}, typing: false,
    timer: null, miniRaf: null, reflectionChoice: null,
    doneNodes: {}, game: null, hotspots: null, revealed: false,
    moment: null, momentController: null, scrollRead: {}
  };
  ui.view = "story";
  sfx("choose");
  bus.render();
}

function stopScene(ui) {
  const s = ui.story;
  if (s?.game?.controller) { try { s.game.controller.stop(); } catch { /* noop */ } s.game.controller = null; }
}

export function cleanupStory(ui) {
  const s = ui.story;
  if (!s) return;
  if (s.momentController) { try { s.momentController.stop(); } catch { /* noop */ } s.momentController = null; }
  if (s.timer) { clearInterval(s.timer); s.timer = null; }
  if (s.miniRaf && typeof cancelAnimationFrame === "function") { cancelAnimationFrame(s.miniRaf); s.miniRaf = null; }
  s.typing = false;
  if (s.mini) s.mini.last = 0;
  /* NOTE: the action-scene controller is intentionally NOT stopped here —
     render() calls cleanupStory(), and the canvas must survive re-renders. */
}

function enterNode(ui, id) {
  const s = st(ui);
  s.nodeId = id;
  s.lineIndex = 0;
  s.reply = null;
  s.phase = "lines";
  s.bump = {};
  s.revealed = false;
  bus.render();
}

/* ------------------------------------------------------------------ typewriter */

function finishTyping(ui) {
  const s = st(ui);
  if (!s) return;
  if (s.timer) { clearInterval(s.timer); s.timer = null; }
  s.typing = false;
  const el = document.getElementById("dialogue-text");
  if (el) el.innerHTML = esc(s.fullText || "");
}

function renderLineDOM(ui) {
  const s = st(ui);
  const ch = chapter(ui);
  const lines = currentLines(ui);
  const [who, text] = lines[Math.min(s.lineIndex, lines.length - 1)] || ["", ""];
  const sp = document.getElementById("speaker");
  const txEl = document.getElementById("dialogue-text");
  if (!sp || !txEl) return;
  sp.outerHTML = speakerMarkup(ch, who);
  txEl.innerHTML = "";
  s.fullText = text;
  s.typing = true;
  let i = 0;
  /* Chinese glyphs carry more meaning per character, so type a little slower. */
  const step = Math.max(1, Math.ceil(text.length / 78));
  if (s.timer) clearInterval(s.timer);
  s.timer = setInterval(() => {
    if (!ui.story || ui.story !== s) { clearInterval(s.timer); return; }
    i += step;
    txEl.innerHTML = esc(text.slice(0, i));
    if (i >= text.length) finishTyping(ui);
  }, 18);
  sfx("tap");
}

export function mountStory(ui) {
  if (!ui.story) return;
  const p = ui.story.phase;
  if (p === "lines" || p === "reply") renderLineDOM(ui);
  else if (p === "mini") startMiniLoop(ui);
  else if (p === "action") mountActionScene(ui);
  else if (p === "hotspots") mountHotspots(ui);
  else if (p === "reward") burstReward(ui);
  else if (p === "moment") mountMoment(ui);
}

/* ------------------------------------------------------------------ choices */

function applyEffects(ui, choice, label = "Choice") {
  const s = ui.state;
  const bump = {};
  for (const [k, v] of Object.entries(choice.stat || {})) bump[k] = addStat(s, k, v);
  addWaysFromStats(s, choice.stat);   // recorded behaviour for the Journey Mirror
  const levels = addXp(s, choice.xp || 0);
  const gained = [];
  for (const f of (choice.give?.fruit ? [choice.give.fruit] : [])) if (grantFruit(s, f)) gained.push(f);
  if (choice.flag) s.flags[choice.flag] = true;
  const newSeals = checkSeals(s);
  saveGame(s);

  ui.story.bump = bump;
  const parts = Object.entries(bump).filter(([, v]) => v > 0).map(([k, v]) => `+${v} ${STATS[k].name}`);
  if (choice.xp) parts.push(tx(`+${choice.xp} XP`, `+${choice.xp} 经验`));
  for (const f of gained) {
    const fruit = FRUITS.find((x) => x.id === f);
    parts.push(`${fruit.glyph} ${fruit.name}`);
  }
  if (parts.length) toast(parts.join(" · "), "✦");
  for (const seal of newSeals) toast(tx(`Seal earned: ${seal.name}`, `获得印记：${seal.name}`), seal.glyph);
  if (levels > 0) { sfx("level"); toast(tx(`Level up! You are now level ${s.level}`, `升级！你现在是 ${s.level} 级`), "✦"); }
  return { gained, newSeals };
}

export function chooseOption(ui, index, force = false) {
  const s = st(ui);
  if (s.phase !== "choices") return;
  const choice = node(ui).choices[index];
  if (!choice) return;
  if (!force && !meets(ui, choice.require)) {
    const need = Object.entries(choice.require || {}).map(([k, v]) => `${STATS[k].name} ${v}`).join(" & ");
    toast(tx(`Not yet — this needs ${need}. Pray or keep walking.`, `还不行——这需要 ${need}。可以祷告，或继续成长。`), "✟");
    return;
  }
  sfx("choose");
  applyEffects(ui, choice);
  if (choice.reply) {
    s.reply = { lines: [[choice.replyBy || "", choice.reply]], to: choice.to };
    s.phase = "reply";
    s.lineIndex = 0;
    bus.render();
  } else {
    enterNode(ui, choice.to);
  }
}

/** Spend 1 Guidance to reveal the hidden hints on the current choice page. */
export function revealHints(ui) {
  const s = st(ui);
  if (!s || s.phase !== "choices" || s.revealed) return false;
  if (!spendGuidance(ui.state, 1)) { toast(tx("You need one Guidance. Pray or rest at the campfire.", "你需要 1 点引导。可以祷告，或在营火旁歇息。"), "✟"); return false; }
  addHintUse(ui.state, 1);
  s.revealed = true;
  sfx("unlock");
  bus.render();
  toast(tx("Guidance spent · the path is clearer", "已花费引导 · 路更清楚了"), "✧");
  return true;
}

/** Spend 2 Guidance to walk through a virtue gate you have not reached. */
export function guidedChoose(ui, index) {
  const s = st(ui);
  if (!s || s.phase !== "choices") return false;
  const choice = node(ui).choices[index];
  if (!choice || meets(ui, choice.require)) return false;
  if (!spendGuidance(ui.state, 2)) { toast(tx("You need two Guidance. Pray or rest at the campfire.", "你需要 2 点引导。可以祷告，或在营火旁歇息。"), "✟"); return false; }
  addHintUse(ui.state, 1);
  toast(tx("Guidance opened the door", "引导为你开了门"), "✟");
  chooseOption(ui, index, true);
  return true;
}

export function continueStory(ui) {
  const n = node(ui);
  sfx("tap");
  if (n.next) enterNode(ui, n.next);
  else afterLines(ui);
}

export function tapStory(ui) {
  const s = st(ui);
  if (s.typing) { finishTyping(ui); return; }
  if (s.phase !== "lines" && s.phase !== "reply") return;
  const lines = currentLines(ui);
  if (s.lineIndex < lines.length - 1) {
    s.lineIndex += 1;
    renderLineDOM(ui);
    return;
  }
  if (s.phase === "reply") {
    const to = s.reply?.to;
    s.reply = null;
    if (to) enterNode(ui, to);
    else afterLines(ui);
    return;
  }
  afterLines(ui);
}

function afterLines(ui) {
  const s = st(ui);
  const n = node(ui);
  const key = s.nodeId;
  const m = momentFor(chapter(ui).id, key, isZh(), s.doneNodes);
  if (m) { startMomentPhase(ui, m); return; }
  if (n.game && !s.doneNodes[key + ":game"]) { startAction(ui, n.game); return; }
  if (n.hotspots && !s.doneNodes[key + ":hot"]) { startHotspots(ui, n.hotspots); return; }
  if (n.mini && !n.game) {
    s.mini = initMini(n.mini);
    s.phase = "mini";
    bus.render();
  } else if (n.end || (!n.choices && !n.next)) {
    finishChapter(ui);
  } else if (n.choices) {
    s.phase = "choices";
    sfx("good");
    bus.render();
  } else {
    s.phase = "next";
    bus.render();
  }
}

function finishChapter(ui) {
  const s = st(ui);
  if (!s.result) s.result = completeChapter(ui.state, chapter(ui));
  s.phase = "reward";
  sfx("complete");
  bus.render();
}

/* ------------------------------------------------------------------ prayer */

export function prayNow(ui) {
  const ch = chapter(ui);
  if (hasPrayed(ui.state, ch.id)) { toast(tx("You have already prayed in this chapter.", "你在本章已经祷告过了。"), "✟"); return false; }
  prayState(ui.state, ch.id);
  sfx("pray");
  ui.modal = { type: "pray", id: ch.id };
  bus.render();
  toast(tx("+1 Faith · +1 Guidance · a promise for the road", "+1 信心 · +1 引导 · 一句路上的应许"), "✟");
  return true;
}

export function openScroll(ui) {
  const s = st(ui);
  s.scrollRead = s.scrollRead || {};
  if (!s.scrollRead[s.chapterId]) { s.scrollRead[s.chapterId] = true; addWay(ui.state, "notice", 1); }
  ui.modal = { type: "scroll", id: s.chapterId };
  sfx("tap");
  bus.render();
}

/* ------------------------------------------------------------- action scenes */

function startAction(ui, gameKey) {
  const s = st(ui);
  s.game = { key: gameKey, controller: null, result: null };
  s.phase = "action";
  sfx("unlock");
  bus.render();
}

function mountActionScene(ui) {
  const s = st(ui);
  if (!s?.game) return;
  const canvas = document.getElementById("action-canvas");
  if (!canvas) return;

  // v0.7.2: a re-render (dialog, app switch, language toggle) used to swap in a
  // brand-new <canvas>, leaving the running loop attached to a detached node —
  // the scene froze and no longer accepted input. main.js now preserves the live
  // canvas; if one still gets replaced, stop the orphan and start cleanly.
  if (s.game.controller) {
    if (s.game.controller.canvas === canvas) {
      if (s.game.paused) s.game.controller.pause();
      return;
    }
    try { s.game.controller.stop(); } catch { /* noop */ }
    s.game.controller = null;
  }

  // The lantern search at the brook decides how many stones David actually
  // carries into the Goliath fight.
  const seed = {};
  if (s.game.key === "sling") {
    const found = Object.values(s.hotspotFound || {});
    if (found.length) seed.stones = found[found.length - 1];
  }
  s.game.controller = startScene(canvas, s.game.key, (res) => finishAction(ui, res), seed);
  if (s.game.paused) s.game.controller.pause();
}

function finishAction(ui, result) {
  const s = ui.story;
  if (!s || s.phase !== "action" || !s.game) return;
  const key = s.game.key;
  s.game.controller = null;
  s.doneNodes[s.nodeId + ":game"] = true;
  const success = !!result.success && !result.skipped;
  if (success) {
    applyEffects(ui, { stat: { courage: 1, faith: 1 }, xp: 14, flag: key + "Won" }, "Action");
    addWay(ui.state, "step", 2);   // entered the scene rather than skipping it
    sfx("good");
  }
  s.game.result = { ...result, success };
  s.phase = "action-result";
  bus.render();
}

/* Pause and resume used to rebuild the whole app with bus.render(). That is a
   lot of DOM work to do at the exact moment a phone is being locked, and it
   made the paused screen depend on a successful re-render: if anything in the
   render pipeline threw (a suspended AudioContext after a long sleep was the
   usual suspect), the last painted frame — the pause card — stayed on screen
   and every later tap died in the same exception, which read as a frozen game.
   The card is already in the DOM at all times, so both directions now toggle
   one class and touch state only. A re-render happens only when the DOM is
   demonstrably wrong, and it can no longer swallow the way out. */

/** Freeze the action scene. Used by the pause button and by app-switch. */
export function pauseGame(ui, opts = {}) {
  const s = st(ui);
  if (!s?.game || s.phase !== "action") return false;
  s.game.paused = true;
  /* Who asked for the pause matters. A pause the player chose stays until they
     say otherwise; a pause the phone forced (screen lock, app switch) is lifted
     automatically when they come back, because a card that depends on a tap
     arriving is one wedged input pipeline away from a dead screen. */
  s.game.pausedBy = opts.by === "user" ? "user" : "system";
  try { s.game.controller?.pause(); } catch { /* noop */ }
  const card = typeof document !== "undefined" && document.querySelector(".action-paused");
  if (card) card.classList.add("on");
  else if (!opts.silent) bus.render();     // the overlay vanished: rebuild once
  return true;
}

/** Resume exactly where the player left off. */
export function resumeGame(ui) {
  const s = st(ui);
  const card = typeof document !== "undefined" && document.querySelector(".action-paused");
  // Hand the screen back first, whatever the state says: a card that cannot be
  // dismissed is the one bug a player can never work around.
  if (card) card.classList.remove("on");
  if (!s?.game) return false;
  s.game.paused = false;
  s.game.pausedBy = null;
  const ctrl = s.game.controller;
  let live = false;
  try { live = !!(ctrl && (ctrl.alive ? ctrl.alive() : true)); } catch { live = false; }
  if (live) { try { ctrl.resume(); } catch { /* noop */ } }
  else {
    /* The scene lost its loop while the phone was asleep. Rather than leave a
       dead picture behind a dismissed card, rebuild it on the same canvas. */
    s.game.controller = null;
    try { bus.render(); } catch { /* the card is already gone; nothing else to do */ }
  }
  sfx("tap");
  return true;
}

export function skipAction(ui) {
  const s = st(ui);
  if (s.phase !== "action" || !s.game) return;
  if (s.game.controller) { try { s.game.controller.skip(); } catch { finishAction(ui, { score: 0, success: false, skipped: true }); } }
  else finishAction(ui, { score: 0, success: false, skipped: true });
}

export function actionDone(ui) {
  const s = st(ui);
  if (s.phase !== "action-result") return;
  s.phase = "lines";
  afterLines(ui);
}

/* -------------------------------------------------------------- hotspots */

/* -------------------------------------------------------------- hidden-object
   A lantern search, not five glowing dots. The player drags a pool of light
   over the artwork; hidden objects are invisible until the light reaches them.
   Decoys look similar but cost focus, and the lantern burns down on a timer. */

function seeded(n) { const x = Math.sin(n * 91.7 + 13.3) * 43758.5453; return x - Math.floor(x); }

function hotspotPositions(total, seed) {
  const pts = [];
  for (let r = 0; r < 4; r++) for (let q = 0; q < 4; q++) {
    const a = seeded(q * 7.1 + r * 31.7 + seed);
    const b = seeded(q * 19.3 + r * 5.9 + seed * 2);
    pts.push([9 + q * 26 + a * 11, 7 + r * 23 + b * 9]);
  }
  // deterministic shuffle
  for (let i = pts.length - 1; i > 0; i--) {
    const j = Math.floor(seeded(i * 13.7 + seed) * (i + 1));
    [pts[i], pts[j]] = [pts[j], pts[i]];
  }
  return pts.slice(0, Math.min(total, pts.length));
}

function startHotspots(ui, cfg) {
  const s = st(ui);
  const seed = (chapter(ui).id || "x").split("").reduce((a, ch) => a + ch.charCodeAt(0), 0) + (cfg.count || 3);
  const pos = hotspotPositions(cfg.count + (cfg.count >= 5 ? 6 : 5), seed);
  s.hotspots = {
    cfg, found: [], pos,
    real: new Set(Array.from({ length: cfg.count }, (_, i) => i)),
    focus: 3, seed
  };
  s.phase = "hotspots";
  sfx("tap");
  bus.render();
}

/** Attach the lantern listeners after the DOM has been rendered. */
function mountHotspots(ui) {
  const field = document.getElementById("hotspot-field");
  const lens = document.getElementById("hotspot-lens");
  if (!field || !lens) return;
  const light = (e) => {
    const r = field.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const x = e.clientX - r.left, y = e.clientY - r.top;
    lens.style.left = `${(x / r.width) * 100}%`;
    lens.style.top = `${(y / r.height) * 100}%`;
    for (const b of field.querySelectorAll(".hotspot")) {
      if (b.classList.contains("found")) continue;
      const bx = parseFloat(b.style.left) / 100 * r.width;
      const by = parseFloat(b.style.top) / 100 * r.height;
      const near = Math.hypot(bx - x, by - y) < 78;
      if (near) b.classList.add("revealed");   // stays visible after the light moves on
      b.classList.toggle("lit", near);
    }
  };
  // Only a DRAG moves the lantern. A bare tap must not reveal an item,
  // otherwise the search collapses back into "tap everything".
  let last = null;
  field.addEventListener("pointermove", (e) => {
    if (e.pointerType !== "touch" && e.buttons === 0) return;
    const p = { clientX: e.clientX, clientY: e.clientY };
    if (last && Math.hypot(p.clientX - last.clientX, p.clientY - last.clientY) < 3) return;
    last = p; light(p);
  }, { passive: true });
  const bar = document.getElementById("hotspot-timer-fill");
  bar?.addEventListener("animationend", () => {
    if (ui.story?.phase === "hotspots") hotspotSkip(ui);
  });
}

function loseFocus(ui, msg) {
  const h = st(ui).hotspots;
  if (!h) return;
  h.focus = Math.max(0, h.focus - 1);
  sfx("miss");
  bus.toast(tx(msg, "看错了"), "✧");
  const pips = document.querySelectorAll("#hotspot-focus i");
  if (pips[h.focus]) pips[h.focus].classList.remove("on");
  const field = document.getElementById("hotspot-field");
  if (field) { field.classList.add("shake"); setTimeout(() => field.classList.remove("shake"), 320); }
  if (h.focus <= 0) hotspotSkip(ui);
}

export function hotspotTap(ui, index) {
  const s = st(ui);
  if (s.phase !== "hotspots" || !s.hotspots) return;
  const h = s.hotspots;
  if (h.found.includes(index)) return;
  const el = document.querySelector(`.hotspot[data-index="${index}"]`);
  if (!el) return;
  if (!el.classList.contains("lit") && !el.classList.contains("revealed")) {
    loseFocus(ui, "Too dark — move the lantern here first."); return;
  }
  if (!h.real.has(index)) { loseFocus(ui, "A false one. Look closer."); return; }

  h.found.push(index);
  addWay(ui.state, "notice", 1);
  sfx("good");
  s.hotspotFound = s.hotspotFound || {};
  s.hotspotFound[s.nodeId] = h.found.length;
  el.classList.add("found"); el.classList.remove("lit", "revealed");
  el.textContent = "✓";
  const counter = document.getElementById("hotspot-count");
  if (counter) counter.textContent = `${tx("Found", "已找到")} ${h.found.length} / ${h.cfg.count}`;
  const dots = document.querySelectorAll("#hotspot-progress i");
  if (dots[h.found.length - 1]) dots[h.found.length - 1].classList.add("on");

  if (h.found.length >= h.cfg.count) {
    s.doneNodes[s.nodeId + ":hot"] = true;
    applyEffects(ui, { stat: h.cfg.stat || {}, xp: h.cfg.xp || 8 }, "Discovery");
    s.phase = "hotspots-done";
    bus.render();
  }
}

export function hotspotDone(ui) {
  const s = st(ui);
  if (s.phase !== "hotspots" && s.phase !== "hotspots-done") return;
  s.phase = "lines";
  afterLines(ui);
}

export function hotspotSkip(ui) {
  const s = st(ui);
  if (!s.hotspots) return;
  s.hotspotFound = s.hotspotFound || {};
  s.hotspotFound[s.nodeId] = s.hotspots.found.length;
  s.doneNodes[s.nodeId + ":hot"] = true;
  s.phase = "lines";
  afterLines(ui);
}

function hotspotsHtml(ui) {
  const s = st(ui);
  const h = s.hotspots;
  if (!h) return "";
  const cfg = h.cfg;
  const done = s.phase === "hotspots-done";
  const title = tx(cfg.title, cfg.titleZh);
  const prompt = tx(cfg.prompt, cfg.promptZh);
  const decoy = cfg.decoyGlyph || "◇";
  const seconds = cfg.seconds || 28;
  const dots = h.pos.map((p, i) => {
    const isReal = h.real.has(i);
    const found = h.found.includes(i);
    return `<button class="hotspot ${isReal ? "" : "decoy"} ${found ? "found" : ""}" style="left:${p[0]}%;top:${p[1]}%" data-action="hotspot-tap" data-index="${i}" ${done ? "disabled" : ""} aria-label="${isReal ? "item" : "decoy"} ${i + 1}">${found ? "✓" : isReal ? cfg.glyph : decoy}</button>`;
  }).join("");
  return `<div class="screen hotspot-screen ${done ? "done" : ""}" style="background-image:url('${chapter(ui).art}')">
    <div class="hotspot-head">
      <div class="eyebrow">${tx("LANTERN SEARCH", "提灯搜寻")}</div>
      <h2>${esc(title)}</h2>
      <p class="small">${esc(prompt)}</p>
      <div class="hotspot-count" id="hotspot-count">${tx("Found", "已找到")} ${h.found.length} / ${cfg.count}</div>
      ${done ? "" : `<div class="hotspot-timer"><i id="hotspot-timer-fill" style="animation-duration:${seconds}s"></i></div>`}
      <div class="hotspot-focus" id="hotspot-focus">${tx("FOCUS", "专注")} ${[0, 1, 2].map((i) => `<i class="${i < h.focus ? "on" : ""}"></i>`).join("")}</div>
      <div class="hotspot-progress" id="hotspot-progress">${Array.from({ length: cfg.count }, (_, i) => `<i class="${i < h.found.length ? "on" : ""}"></i>`).join("")}</div>
    </div>
    <div class="hotspot-field" id="hotspot-field">
      <div class="hotspot-lens" id="hotspot-lens"></div>
      ${dots}
      <div class="dust d1"></div><div class="dust d2"></div><div class="dust d3"></div>
    </div>
    ${done
      ? `<div class="hotspot-done"><div class="result-icon">✦</div><h3>${tx("Well done!", "做得好！")}</h3><p class="small muted">${tx("Bonus earned", "获得奖励")} · +${cfg.xp || 8} ${tx("XP", "经验")} · ${tx("Found", "已找到")} ${h.found.length}/${cfg.count}</p>
         <button class="btn btn-primary hotspot-done-btn" data-action="hotspot-done">${tx("Keep going", "继续")} ${icon("forward", 16)}</button></div>`
      : `<div class="hotspot-foot"><p class="tiny muted">${tx("Drag the lantern to reveal · avoid the pale decoys · 3 mistakes ends the search", "拖动提灯照亮 · 避开浅色的假物 · 失误 3 次搜寻结束")}</p>
         <button class="btn btn-ghost btn-sm hotspot-skip" data-action="hotspot-skip">${tx("Skip — no bonus", "跳过——没有奖励")}</button></div>`}
  </div>`;
}

/* ------------------------------------------------------------------ minigame */

function initMini(cfg) {
  return { cfg, round: 0, pos: 0, dir: 1, results: [], done: false, feedback: cfg.prompt, last: 0 };
}

function miniLoop(ui, ts) {
  if (!ui.story || !ui.story.mini) return;
  const m = st(ui).mini;
  if (!m || m.done || st(ui).phase !== "mini") return;
  const dt = Math.min(48, ts - (m.last || ts));
  m.last = ts;
  m.pos += m.dir * m.cfg.speed * dt;
  if (m.pos >= 100) { m.pos = 100; m.dir = -1; }
  else if (m.pos <= 0) { m.pos = 0; m.dir = 1; }
  const marker = document.getElementById("mg-marker");
  if (marker) marker.style.left = `calc(${m.pos}% - 2.5px)`;
  if (typeof requestAnimationFrame === "function") st(ui).miniRaf = requestAnimationFrame((t) => miniLoop(ui, t));
}

function startMiniLoop(ui) {
  const m = st(ui).mini;
  if (!m || m.done) return;
  m.last = 0;
  if (typeof requestAnimationFrame === "function") st(ui).miniRaf = requestAnimationFrame((t) => miniLoop(ui, t));
}

function updateMiniDOM(ui) {
  const m = st(ui).mini;
  const cfg = m.cfg;
  const target = cfg.targets[m.round];
  const zone = document.getElementById("mg-zone");
  if (zone) { zone.style.left = `${target - cfg.zone / 2}%`; zone.style.width = `${cfg.zone}%`; }
  const dots = document.querySelectorAll(".mg-dot");
  dots.forEach((d, i) => { d.className = "mg-dot" + (i < m.results.length ? (m.results[i] ? " hit" : " miss") : ""); });
  const fb = document.getElementById("mg-feedback");
  if (fb) fb.textContent = m.feedback;
}

export function miniTap(ui) {
  const m = st(ui).mini;
  if (!m || m.done || st(ui).phase !== "mini") return;
  const target = m.cfg.targets[m.round];
  const hit = Math.abs(m.pos - target) <= m.cfg.zone / 2;
  m.results.push(hit);
  m.feedback = hit ? m.cfg.hitText : m.cfg.missText;
  m.round += 1;
  sfx(hit ? "hit" : "miss");
  if (m.round >= m.cfg.targets.length) finishMini(ui, m.results.filter(Boolean).length);
  else updateMiniDOM(ui);
}

export function miniSkip(ui) { if (st(ui).mini && !st(ui).mini.done) finishMini(ui, 0); }

function finishMini(ui, hits) {
  const m = st(ui).mini;
  m.done = true;
  const total = m.cfg.targets.length;
  const success = hits >= Math.ceil(total / 2);
  const n = node(ui);
  if (success && m.cfg.win) {
    applyEffects(ui, { stat: m.cfg.win.stat, xp: m.cfg.win.xp, flag: m.cfg.win.flag }, "Focus");
    sfx("good");
    toast(tx(`${hits}/${total} — ${m.cfg.hitText} Bonus earned.`, `${hits}/${total} — ${m.cfg.hitText} 奖励已获得。`), "◎");
  } else {
    toast(tx(`${hits}/${total} — ${m.cfg.missText} The story goes on.`, `${hits}/${total} — ${m.cfg.missText} 故事继续。`), "⌇");
  }
  enterNode(ui, n.next);
}

/* ------------------------------------------------------------------ reflection */

export function reflectAnswer(ui, index) {
  const s = st(ui);
  if (s.phase !== "reflect" || s.reflectionChoice !== null) return;
  const ch = chapter(ui);
  const opt = ch.reflection.options[index];
  if (!opt) return;
  s.reflectionChoice = index;
  const res = recordReflection(ui.state, ch.id, opt.stat);
  s.phase = "reflect-done";
  sfx("good");
  for (const seal of res.newSeals) toast(tx(`Seal earned: ${seal.name}`, `获得印记：${seal.name}`), seal.glyph);
  bus.render();
}

export function goToReflection(ui) { st(ui).phase = "reflect"; sfx("tap"); bus.render(); }

export function leaveStory(ui) {
  stopScene(ui);
  cleanupStory(ui);
  ui.story = null;
  ui.modal = null;
  ui.view = "camp";
  bus.render();
}

export function finishStory(ui) {
  stopScene(ui);
  cleanupStory(ui);
  const allDone = countDone(ui.state) >= CHAPTER_COUNT;
  if (allDone) markFinale(ui.state);
  ui.story = null;
  ui.modal = null;
  ui.view = allDone ? "finale" : "camp";
  sfx("choose");
  bus.render();
  if (allDone) toast(tx("You have walked every chapter. The road continues.", "你走完了每一章。路仍在继续。"), "✺");
}

/* ------------------------------------------------------------------ rendering */

function burstReward(ui) {
  if (typeof document === "undefined") return;
  const host = document.getElementById("reward-burst");
  if (!host) return;
  const colors = ["#f0c46a", "#7fd4c8", "#e7b75b", "#f4e7cb"];
  for (let i = 0; i < 18; i++) {
    const d = document.createElement("i");
    d.className = "confetti";
    d.style.left = `${8 + Math.random() * 84}%`;
    d.style.background = colors[i % colors.length];
    d.style.animationDelay = `${Math.random() * 0.5}s`;
    d.style.setProperty("--dx", `${(Math.random() - 0.5) * 160}px`);
    host.appendChild(d);
    setTimeout(() => d.remove(), 2600);
  }
}

function hudRow(ui, ch) {
  const s = ui.state;
  const bump = st(ui).bump || {};
  const chips = STAT_KEYS.map((k) => `<div class="chip ${bump[k] ? "up" : ""}"><b>${s.stats[k]}</b>${esc(STATS[k].name)}</div>`).join("");
  const prayed = hasPrayed(s, ch.id);
  return `<div class="story-hud">
    <div class="stat-chips">${chips}</div>
    <span class="guidance-mini" title="${tx("Guidance", "引导")}">✟ ${adventure(s).guidance || 0}</span>
    <button class="pray-btn" id="pray-btn" data-hold="pray" data-action="pray-now" ${prayed ? "disabled" : ""} aria-label="${tx("Hold to pray", "按住祷告")}"><span class="pray-ring"></span>${icon("pray", 13)} <span>${prayed ? tx("Prayed", "已祷告") : tx("Pray", "祷告")}</span></button>
  </div>`;
}

function choicesHtml(ui) {
  const s = st(ui);
  const n = node(ui);
  if (s.phase === "choices") {
    const clean = !!ui.state?.settings?.cleanMode;
    const showHints = !clean || s.revealed;
    const guidance = adventure(ui.state).guidance || 0;
    const cards = n.choices.map((c, i) => {
      const locked = !meets(ui, c.require);
      const need = c.require ? Object.entries(c.require).map(([k, v]) => `${STATS[k].name} ${v}`).join(" & ") : "";
      const cls = ["choice", locked ? "locked" : "", c.faith && !locked ? "faith" : "", clean && !showHints ? "clean" : ""].filter(Boolean).join(" ");
      const hint = !showHints ? "" : locked
        ? tx(`Requires ${need} — pray once this chapter, or keep growing.`, `需要 ${need}——可在本章祷告一次，或继续成长。`)
        : (c.hint || "");
      const guided = locked && clean && !showHints && guidance >= 2;
      const action = locked ? (guided ? "guided-choice" : "locked-choice") : "choose";
      const tag = guided
        ? `<span class="tag guided-tag">✟ 2</span>`
        : (showHints && c.tag ? `<span class="tag">${esc(c.tag)}</span>` : "");
      return `<button class="${cls}" style="animation-delay:${i * 55}ms" data-action="${action}" data-index="${i}">
        <span class="num">${locked && showHints ? icon("lock", 12) : i + 1}</span>
        <span class="body"><span class="label">${esc(c.t)}</span>${hint ? `<span class="hint">${esc(hint)}</span>` : ""}</span>
        ${tag}
        <span class="swipe-hint">›</span>
      </button>`;
    }).join("");
    const banner = clean && !showHints
      ? `<div class="clean-banner"><span>✧</span><p>${tx("Hints are hidden. Listen to the story and choose honestly.", "提示已隐藏。听故事，诚实地做选择。")}</p>
          <button data-action="seek-guidance" ${guidance < 1 ? "disabled" : ""}>✟ 1 ${tx("Reveal", "显明")}</button></div>`
      : (clean && s.revealed ? `<div class="clean-banner revealed"><span>✧</span><p>${tx("Guidance has lit this page of the path.", "引导照亮了这一段路。")}</p></div>` : "");
    return banner + cards;
  }
  if (s.phase === "next") {
    return `<button class="btn btn-primary continue-btn" data-action="story-continue">${tx("Continue", "继续")} ${icon("forward", 16)}</button>`;
  }
  return "";
}

function miniHtml(ui) {
  const m = st(ui).mini;
  if (!m) return "";
  const cfg = m.cfg;
  const target = cfg.targets[Math.min(m.round, cfg.targets.length - 1)];
  const dots = cfg.targets.map((_, i) => `<span class="mg-dot ${i < m.results.length ? (m.results[i] ? "hit" : "miss") : ""}"></span>`).join("");
  return `<div class="minigame">
    <div class="glyph">${cfg.glyph}</div>
    <div class="eyebrow">${tx("A moment to focus", "凝神一刻")}</div>
    <h2>${esc(cfg.title)}</h2>
    <p class="small muted" style="max-width:300px;margin:-6px auto 0">${esc(cfg.prompt)}</p>
    <div class="mg-track">
      <div class="mg-zone" id="mg-zone" style="left:${target - cfg.zone / 2}%;width:${cfg.zone}%"></div>
      <div class="mg-marker" id="mg-marker" style="left:calc(${m.pos}% - 2.5px)"></div>
    </div>
    <div class="mg-rounds">${dots}</div>
    <div class="mg-feedback" id="mg-feedback">${esc(m.feedback)}</div>
    <button class="btn btn-primary" data-action="mini-tap" style="max-width:300px">${tx("Tap when the light reaches the mark", "当光点到达标记时点击")}</button>
    <button class="btn btn-ghost btn-sm" data-action="mini-skip" style="max-width:300px">${tx("Skip — no bonus", "跳过——没有奖励")}</button>
  </div>`;
}

function actionHtml(ui) {
  const s = st(ui);
  const key = s.game?.key || "sling";
  const info = gameInfo(key);
  const ch = chapter(ui);
  return `<div class="screen action-screen">
    <div class="action-art" style="background-image:url('${ch.art}')"></div>
    <canvas id="action-canvas" class="action-canvas" aria-label="${esc(info.title)}"></canvas>
    <div class="action-head">
      <div class="action-tools">
        <button class="action-pause" data-action="game-pause" aria-label="${tx("Pause", "暂停")}">❚❚</button>
        <button class="action-skip" data-action="game-skip">${tx("Skip", "跳过")} →</button>
      </div>
      <div class="eyebrow">${tx("ACTION SCENE", "互动关卡")} · ${esc(ch.title)}</div>
      <h2>${esc(info.title)}</h2>
      <p class="small">${esc(info.prompt)}</p>
    </div>
    <div class="action-paused ${s.game?.paused ? "on" : ""}" data-action="game-resume">
      <div class="action-paused-card">
        <div class="action-paused-glyph">❚❚</div>
        <div class="eyebrow">${tx("Paused", "已暂停")}</div>
        <h3>${tx("The story waits for you", "故事在等你")}</h3>
        <p class="small muted">${tx("Nothing moves while you are away — no timers, no lost stones.", "你不在时一切静止——计时暂停，石子不会消失。")}</p>
        <button class="btn btn-primary btn-sm" data-action="game-resume">${icon("play", 15)} ${tx("Resume", "继续")}</button>
        <button class="btn btn-ghost btn-sm" data-action="game-skip">${tx("Leave this scene", "离开这个关卡")}</button>
      </div>
    </div>
  </div>`;
}

function actionResultHtml(ui) {
  const s = st(ui);
  const r = s.game?.result || {};
  const ok = !!r.success;
  const stars = ok ? 3 : r.skipped ? 0 : 1;
  return `<div class="screen action-screen action-result">
    <div class="action-art" style="background-image:url('${chapter(ui).art}')"></div>
    <div class="result-panel">
      <div class="result-icon">${ok ? "✦" : "✧"}</div>
      <div class="eyebrow">${tx("Scene complete", "关卡完成")}</div>
      <h2>${esc(ok ? tx("Well done!", "做得好！") : tx("The story continues.", "故事继续。"))}</h2>
      <div class="result-stars">${[0, 1, 2].map((i) => `<span class="${i < stars ? "on" : ""}">★</span>`).join("")}</div>
      <div class="result-score">${tx("SCORE", "得分")} <strong>${r.score || 0}</strong></div>
      <div class="card-quiet small">${esc(ok ? tx("Bonus earned", "获得奖励") + " · +14 " + tx("XP", "经验") + " · +1 " + tx("Courage", "勇气") + " · +1 " + tx("Faith", "信心") : tx("No bonus", "没有奖励"))}</div>
      <button class="btn btn-primary" data-action="action-done">${tx("Keep going", "继续")} ${icon("forward", 16)}</button>
    </div>
  </div>`;
}

/** One simple invitation per chapter to open the REAL passage. No new mechanic. */
function rewardDeeperCard(ui, ch) {
  const d = deeperFor(ch.id, isZh());
  if (!d) return "";
  return `<div class="go-deeper">
    <div class="go-deeper-mark">✦</div>
    <div class="eyebrow">${tx("Go deeper · open the Bible", "再走一步 · 打开圣经")}</div>
    <h3>${esc(d.ref)}</h3>
    <p class="small">${esc(d.hook)}</p>
    <p class="small serif gold" style="margin:8px 0 0">${esc(d.ask)}</p>
    <button class="btn btn-ghost btn-sm" style="margin-top:10px" data-action="open-scroll">${icon("scroll", 15)} ${tx("Open the scroll", "打开书卷")}</button>
  </div>`;
}

function outcomeHtml(ui) {
  const s = st(ui);
  const ch = chapter(ui);
  const r = s.result || {};
  if (s.phase === "reward") {
    const fruitNames = (ch.endFruits || []).map((id) => FRUITS.find((f) => f.id === id)).filter(Boolean);
    const relic = RELICS[ch.relic];
    const newSeals = r.newSeals || [];
    return `<div class="outcome"><div class="reward-burst" id="reward-burst"></div><div class="outcome-inner">
      <div class="seal">${ch.ending.seal}</div>
      <div class="center"><div class="eyebrow">${tx(`Chapter ${ch.roman} complete`, `第 ${ch.roman} 章完成`)}</div><h2 style="margin-top:4px">${esc(ch.ending.title)}</h2>
        <p class="small muted" style="margin-top:8px">${esc(ch.ending.text)}</p></div>
      <div class="card-quiet"><div class="eyebrow" style="margin-bottom:6px">${tx("What the story says", "故事在说什么")}</div>
        <p class="small serif" style="margin:0;color:var(--gold-light)">${esc(ch.ending.takeaway)}</p>
        <p class="tiny muted" style="margin:8px 0 0">${tx("Read the full account:", "阅读完整记载：")} ${esc(ch.ref)}</p></div>
      ${rewardDeeperCard(ui, ch)}
      <div class="eyebrow" style="margin-top:4px">${tx("Added to your journal", "已加入你的日志")}</div>
      <div class="reward-row">
        <div class="reward"><span class="ico">${relic.glyph}</span><strong>${esc(relic.name)}</strong><small>${tx("Relic", "圣物")} · ${tx(r.newRelic ? "new" : "already kept", r.newRelic ? "新获得" : "已收藏")}</small></div>
        ${fruitNames.map((f) => `<div class="reward"><span class="ico">${f.glyph}</span><strong>${esc(f.name)}</strong><small>${tx("Fruit of the Spirit", "圣灵的果子")}</small></div>`).join("")}
        <div class="reward"><span class="ico">✦</span><strong>+${r.xp || 0} ${tx("XP", "经验")}</strong><small>${r.levels ? tx(`Level up! Now level ${ui.state.level}`, `升级！现在是 ${ui.state.level} 级`) : `${ui.state.xp} / ${xpNeeded(ui.state.level)} ${tx("to next level", "距离下一级")}`}</small></div>
      </div>
      ${newSeals.length ? `<div class="card-quiet"><div class="eyebrow" style="margin-bottom:6px">${tx("New seals", "新印记")}</div>${newSeals.map((x) => `<span class="pill" style="margin:2px 4px 2px 0">${x.glyph} ${esc(x.name)}</span>`).join("")}</div>` : ""}
      <div class="stack" style="margin-top:6px">
        <button class="btn btn-primary" data-action="reflect">${icon("heart", 16)} ${tx("Take a moment to reflect", "花一点时间反思")}</button>
        <button class="btn btn-ghost btn-sm" data-action="finish-story">${tx("Return to the map", "返回地图")}</button>
      </div>
    </div></div>`;
  }
  if (s.phase === "reflect") {
    return `<div class="outcome"><div class="outcome-inner">
      <div class="center" style="margin-top:20px"><div class="eyebrow">${tx("A moment to reflect", "默想一刻")}</div>
        <div style="font-size:2.2rem;margin:12px 0 4px">✧</div></div>
      <p class="reflect-q center">${esc(ch.reflection.q)}</p>
      <p class="tiny muted center">${tx("There is no wrong answer here. Choose what is honest for you today.", "这里没有错答案。选一句今天对你最诚实的话。")}</p>
      <div class="stack" style="margin-top:10px">${ch.reflection.options.map((o, i) => `<button class="choice reflect-opt" data-action="reflect-answer" data-index="${i}">
        <span class="num">${i + 1}</span><span class="body"><span class="label">${esc(o.t)}</span></span></button>`).join("")}</div>
      <button class="btn btn-ghost btn-sm" style="margin-top:8px" data-action="finish-story">${tx("Skip for now", "暂时跳过")}</button>
    </div></div>`;
  }
  if (s.phase === "reflect-done") {
    const opt = ch.reflection.options[s.reflectionChoice];
    const allDone = countDone(ui.state) >= CHAPTER_COUNT;
    return `<div class="outcome"><div class="outcome-inner">
      <div class="center" style="margin-top:20px"><div style="font-size:2.4rem">✟</div>
        <div class="eyebrow" style="margin-top:10px">${tx("Carry this with you", "带着这句话走")}</div></div>
      <p class="verse center" style="margin-top:8px">${esc(opt.insight)}</p>
      <div class="card-quiet"><p class="small serif" style="margin:0">“${esc(ch.scroll.verse)}”</p>
        <p class="tiny gold" style="margin:8px 0 0">— ${esc(ch.scroll.ref)}</p></div>
      ${allDone ? `<div class="card-quiet center"><div class="eyebrow">${tx("All ten chapters walked", "十章全部走完")}</div><p class="small" style="margin:6px 0 0">${tx("You have seen courage, integrity, mercy, trust, grace, boldness, calling, kindness, repentance and welcome. The road continues in your own life.", "你看见了勇气、正直、怜悯、信靠、恩典、胆识、呼召、恩慈、悔改与接纳。这条路，要在你自己的生命里继续。")}</p></div>` : ""}
      <button class="btn btn-primary" style="margin-top:8px" data-action="finish-story">${icon("map", 16)} ${allDone ? tx("See your journey", "看看你的旅程") : tx("Return to the map", "返回地图")}</button>
    </div></div>`;
  }
  return "";
}

/* --------------------------------------------------- story moments (v0.7)
   Short tactile interactions embedded inside the dialogue. One shared engine,
   two per chapter, no new screens or resources. */

function startMomentPhase(ui, m) {
  const s = st(ui);
  s.moment = m;
  s.phase = "moment";
  sfx("unlock");
  bus.render();
}

function mountMoment(ui) {
  const s = st(ui);
  const host = document.getElementById("moment-stage");
  if (!host || !s.moment || s.momentController) return;
  s.momentController = startMoment(host, s.moment, (res) => finishMoment(ui, res));
}

function finishMoment(ui, res) {
  const s = st(ui);
  if (!s || s.phase !== "moment" || !s.moment) return;
  const m = s.moment;
  s.doneNodes[s.nodeId + ":moment"] = true;
  s.momentController = null;
  s.moment = null;
  if (res?.success) {
    addXp(ui.state, 6);
    addWay(ui.state, m.way, 1);
    sfx("good");
    toast(m.done, "✦");
  } else {
    sfx("tap");
    toast(tx("You move on.", "你继续往前走。"), "✧");
  }
  saveGame(ui.state);
  s.phase = "lines";
  afterLines(ui);
}

export function skipMoment(ui) {
  const s = st(ui);
  if (s?.phase !== "moment") return;
  if (s.momentController) s.momentController.skip();
  else finishMoment(ui, { success: false, skipped: true });
}

const MOMENT_KIND = {
  hold: B("HOLD", "按住"), tap: B("TAP", "轻点"), trace: B("TRACE", "描线"),
  balance: B("BALANCE", "平衡"), rhythm: B("RHYTHM", "节奏")
};
function B(en, zh) { return { en, zh }; }
function momentKindLabel(k, zh) { return (MOMENT_KIND[k] || B("INTERACT", "互动"))[zh ? "zh" : "en"]; }

function momentHtml(ui) {
  const s = st(ui);
  const ch = chapter(ui);
  const m = s.moment;
  const zh = isZh();
  return `<div class="screen story moment-screen">
    <div class="story-art" style="background-image:url('${ch.art}')">
      <div class="story-parallax" style="background-image:url('${ch.art}')"></div>
      <div class="story-top">
        <button class="icon-btn" data-action="ask-leave" aria-label="${tx("Leave chapter", "离开章节")}">${icon("back", 17)}</button>
        <div class="story-chapter">${esc(ch.title)}</div>
        <div class="story-top-actions">${musicButton()}<button class="icon-btn" data-action="open-scroll" aria-label="${tx("Open the scroll", "打开书卷")}">${icon("scroll", 17)}</button></div>
      </div>
      <div class="story-tag">${tx(`Chapter ${ch.roman}`, `第 ${ch.roman} 章`)} · ${esc(ch.ref)}</div>
      <div class="story-foreground"></div><div class="story-frame"></div>
      <div class="story-dust"><i></i><i></i><i></i><i></i><i></i></div>
    </div>
    <div class="story-body">
      <div class="story-art-echo" style="background-image:url('${ch.art}')"></div>
      ${hudRow(ui, ch)}
      <div class="moment-card">
        <div class="eyebrow">${tx("A moment in the story", "故事里的一刻")} · ${esc(momentKindLabel(m.kind, zh))}</div>
        <h2>${esc(m.title)}</h2>
        <p class="small muted">${esc(m.prompt)}</p>
        <div class="moment-stage" id="moment-stage" data-kind="${esc(m.kind)}"></div>
        <div class="moment-meter-track"><i id="moment-meter"></i></div>
        <div class="moment-feedback" id="moment-feedback"></div>
        <button class="btn btn-ghost btn-sm" data-action="moment-skip">${tx("Skip this moment", "跳过这一刻")}</button>
      </div>
    </div>
  </div>`;
}

export function storyHtml(ui) {
  const s = st(ui);
  const ch = chapter(ui);

  if (s.phase === "moment") return momentHtml(ui);
  if (s.phase === "action") return actionHtml(ui);
  if (s.phase === "action-result") return actionResultHtml(ui);
  if (s.phase === "hotspots" || s.phase === "hotspots-done") return hotspotsHtml(ui);

  const lines = currentLines(ui);
  const [who, text] = lines[Math.min(s.lineIndex, lines.length - 1)] || ["", ""];
  const typingPhase = s.phase === "lines" || s.phase === "reply";
  const shownText = typingPhase ? "" : esc(text);
  return `<div class="screen story">
    <div class="story-art" style="background-image:url('${ch.art}')">
      <div class="story-parallax" style="background-image:url('${ch.art}')"></div>
      <div class="story-top">
        <button class="icon-btn" data-action="ask-leave" aria-label="${tx("Leave chapter", "离开章节")}">${icon("back", 17)}</button>
        <div class="story-chapter">${esc(ch.title)}</div>
        <div class="story-top-actions">${musicButton()}<button class="icon-btn" data-action="open-scroll" aria-label="${tx("Open the scroll", "打开书卷")}">${icon("scroll", 17)}</button></div>
      </div>
      <div class="story-tag">${tx(`Chapter ${ch.roman}`, `第 ${ch.roman} 章`)} · ${esc(ch.ref)}</div>
      <div class="story-foreground"></div>
      <div class="story-frame"></div>
      <div class="story-figure has-art" data-who="${esc(who)}" style="background-image:url('${who ? portraitFor(who) : chapterPortrait(ch.id)}')"><span>${who ? esc(String(ch.cast[who]?.name || who).slice(0, 1)) : "✧"}</span></div>
      <div class="story-dust"><i></i><i></i><i></i><i></i><i></i></div>
      <div class="story-scene-title"><span>${esc(ch.roman)}</span><strong>${esc(ch.subtitle)}</strong></div>
    </div>
    <div class="story-body">
      <div class="story-art-echo" style="background-image:url('${ch.art}')"></div>
      ${hudRow(ui, ch)}
      <div class="dialogue" data-action="tap-story" id="dialogue">
        ${speakerMarkup(ch, who)}
        <p class="dialogue-text" id="dialogue-text">${shownText}</p>
        <span class="dialogue-caret"></span>
      </div>
      ${typingPhase ? `<div class="story-tapzone" data-action="tap-story"><span class="ornament">✧</span><small>${tx("Tap anywhere to continue", "点击任意处继续")}</small></div>` : ""}
      <div class="choice-area" id="choice-area">${choicesHtml(ui)}</div>
      ${s.phase === "choices" && !ui.state?.settings?.cleanMode ? `<div class="choice-aside"><span class="ornament">✧</span><p>${tx("Your choices shape you — the story stays true to Scripture.", "你的选择塑造你自己——故事始终忠于圣经。")}</p><small>${tx("Swipe or tap a choice", "滑动或点击选项")}</small></div>` : ""}
    </div>
    ${s.phase === "mini" ? miniHtml(ui) : ""}
    ${["reward", "reflect", "reflect-done"].includes(s.phase) ? outcomeHtml(ui) : ""}
  </div>`;
}
