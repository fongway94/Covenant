import { esc, icon } from "../core/util.js";
import { STATS, STAT_KEYS, FRUITS, RELICS, countDone } from "../data/compendium.js";
import { chapterById } from "../data/chapters.js";
import { addStat, addXp, grantFruit, checkSeals, completeChapter, recordReflection, hasPrayed, pray as prayState, saveGame, xpNeeded } from "../core/state.js";
import { sfx } from "../core/audio.js";
import { bus } from "../core/bus.js";
import { tx } from "../core/i18n.js";
import { startScene, gameInfo } from "../engine/scene.js";

const CHAPTER_COUNT = 6;

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
  if (!who) return `<div class="speaker narrator" id="speaker"><span class="portrait narrator-pop">✧</span>${tx("The Story", "旁白")}</div>`;
  const c = ch.cast[who] || { name: who, role: "" };
  const letter = String(c.name || "?").trim().slice(0, 1);
  return `<div class="speaker" id="speaker"><span class="portrait">${esc(letter)}</span><span class="who">${esc(c.name)}${c.role ? `<span class="role">${esc(c.role)}</span>` : ""}</span></div>`;
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
    doneNodes: {}, game: null, hotspots: null
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
  else if (p === "reward") burstReward(ui);
}

/* ------------------------------------------------------------------ choices */

function applyEffects(ui, choice, label = "Choice") {
  const s = ui.state;
  const bump = {};
  for (const [k, v] of Object.entries(choice.stat || {})) bump[k] = addStat(s, k, v);
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

export function chooseOption(ui, index) {
  const s = st(ui);
  if (s.phase !== "choices") return;
  const choice = node(ui).choices[index];
  if (!choice) return;
  if (!meets(ui, choice.require)) {
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
  toast(tx("+1 Faith · a promise for the road", "+1 信心 · 一句路上的应许"), "✟");
  return true;
}

export function openScroll(ui) {
  ui.modal = { type: "scroll", id: st(ui).chapterId };
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
  if (!s?.game || s.game.controller) return;
  const canvas = document.getElementById("action-canvas");
  if (!canvas) return;
  s.game.controller = startScene(canvas, s.game.key, (res) => finishAction(ui, res));
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
    sfx("good");
  }
  s.game.result = { ...result, success };
  s.phase = "action-result";
  bus.render();
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

const HOTSPOT_LAYOUT = {
  3: [[26, 34], [70, 46], [44, 72]],
  5: [[22, 26], [70, 24], [46, 44], [76, 66], [20, 70]]
};

function startHotspots(ui, cfg) {
  const s = st(ui);
  s.hotspots = { cfg, found: [], pos: (HOTSPOT_LAYOUT[cfg.count] || HOTSPOT_LAYOUT[3]).slice(0, cfg.count) };
  s.phase = "hotspots";
  sfx("tap");
  bus.render();
}

export function hotspotTap(ui, index) {
  const s = st(ui);
  if (s.phase !== "hotspots" || !s.hotspots) return;
  const h = s.hotspots;
  if (h.found.includes(index)) return;
  h.found.push(index);
  sfx("good");
  if (h.found.length >= h.cfg.count) {
    s.doneNodes[s.nodeId + ":hot"] = true;
    applyEffects(ui, { stat: h.cfg.stat || {}, xp: h.cfg.xp || 8 }, "Discovery");
    s.phase = "hotspots-done";
  }
  bus.render();
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
  s.doneNodes[s.nodeId + ":hot"] = true;
  s.phase = "lines";
  afterLines(ui);
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
  ui.view = "map";
  bus.render();
}

export function finishStory(ui) {
  stopScene(ui);
  cleanupStory(ui);
  const allDone = countDone(ui.state) >= CHAPTER_COUNT;
  ui.story = null;
  ui.modal = null;
  ui.view = allDone ? "character" : "map";
  sfx("choose");
  bus.render();
  if (allDone) toast(tx("You have walked every chapter. Well done, pilgrim.", "你走完了每一章。做得好，朝圣者。"), "✺");
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
    <button class="pray-btn" id="pray-btn" data-hold="pray" data-action="pray-now" ${prayed ? "disabled" : ""} aria-label="${tx("Hold to pray", "按住祷告")}"><span class="pray-ring"></span>${icon("pray", 13)} <span>${prayed ? tx("Prayed", "已祷告") : tx("Pray", "祷告")}</span></button>
  </div>`;
}

function choicesHtml(ui) {
  const s = st(ui);
  const n = node(ui);
  if (s.phase === "choices") {
    return n.choices.map((c, i) => {
      const locked = !meets(ui, c.require);
      const need = c.require ? Object.entries(c.require).map(([k, v]) => `${STATS[k].name} ${v}`).join(" & ") : "";
      const cls = ["choice", locked ? "locked" : "", c.faith && !locked ? "faith" : ""].filter(Boolean).join(" ");
      const hint = locked
        ? tx(`Requires ${need} — pray once this chapter, or keep growing.`, `需要 ${need}——可在本章祷告一次，或继续成长。`)
        : (c.hint || "");
      return `<button class="${cls}" style="animation-delay:${i * 55}ms" data-action="${locked ? "locked-choice" : "choose"}" data-index="${i}">
        <span class="num">${locked ? icon("lock", 12) : i + 1}</span>
        <span class="body"><span class="label">${esc(c.t)}</span>${hint ? `<span class="hint">${esc(hint)}</span>` : ""}</span>
        ${c.tag ? `<span class="tag">${esc(c.tag)}</span>` : ""}
        <span class="swipe-hint">›</span>
      </button>`;
    }).join("");
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
      <button class="action-skip" data-action="game-skip">${tx("Skip", "跳过")} →</button>
      <div class="eyebrow">${tx("ACTION SCENE", "互动关卡")} · ${esc(ch.title)}</div>
      <h2>${esc(info.title)}</h2>
      <p class="small">${esc(info.prompt)}</p>
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

function hotspotsHtml(ui) {
  const s = st(ui);
  const h = s.hotspots;
  if (!h) return "";
  const cfg = h.cfg;
  const done = s.phase === "hotspots-done";
  const title = tx(cfg.title, cfg.titleZh);
  const prompt = tx(cfg.prompt, cfg.promptZh);
  const dots = h.pos.map((p, i) => `<button class="hotspot ${h.found.includes(i) ? "found" : ""}" style="left:${p[0]}%;top:${p[1]}%;animation-delay:${i * 0.16}s" data-action="hotspot-tap" data-index="${i}" ${done ? "disabled" : ""} aria-label="hotspot ${i + 1}">${h.found.includes(i) ? "✓" : cfg.glyph}</button>`).join("");
  return `<div class="screen hotspot-screen" style="background-image:url('${chapter(ui).art}')">
    <div class="hotspot-head">
      <div class="eyebrow">${tx("Find the hidden items", "找出隐藏的物品")}</div>
      <h2>${esc(title)}</h2>
      <p class="small">${esc(prompt)}</p>
      <div class="hotspot-count">${tx("Found", "已找到")} ${h.found.length} / ${cfg.count}</div>
    </div>
    <div class="hotspot-field">${dots}<div class="dust d1"></div><div class="dust d2"></div><div class="dust d3"></div></div>
    ${done
      ? `<div class="hotspot-done"><div class="result-icon">✦</div><h3>${tx("Well done!", "做得好！")}</h3><p class="small muted">${tx("Bonus earned", "获得奖励")} · +${cfg.xp || 8} ${tx("XP", "经验")}</p>
         <button class="btn btn-primary" data-action="hotspot-done">${tx("Keep going", "继续")} ${icon("forward", 16)}</button></div>`
      : `<button class="btn btn-ghost btn-sm hotspot-skip" data-action="hotspot-skip">${tx("Skip — no bonus", "跳过——没有奖励")}</button>`}
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
      ${allDone ? `<div class="card-quiet center"><div class="eyebrow">${tx("All six chapters walked", "六章全部走完")}</div><p class="small" style="margin:6px 0 0">${tx("You have seen courage, integrity, mercy, trust, grace and boldness. The road continues in your own life.", "你看见了勇气、正直、怜悯、信靠、恩典与胆识。这条路，要在你自己的生命里继续。")}</p></div>` : ""}
      <button class="btn btn-primary" style="margin-top:8px" data-action="finish-story">${icon("map", 16)} ${allDone ? tx("See your journey", "看看你的旅程") : tx("Return to the map", "返回地图")}</button>
    </div></div>`;
  }
  return "";
}

export function storyHtml(ui) {
  const s = st(ui);
  const ch = chapter(ui);

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
        <button class="icon-btn" data-action="open-scroll" aria-label="${tx("Open the scroll", "打开书卷")}">${icon("scroll", 17)}</button>
      </div>
      <div class="story-tag">${tx(`Chapter ${ch.roman}`, `第 ${ch.roman} 章`)} · ${esc(ch.ref)}</div>
      <div class="story-figure" data-who="${esc(who)}"><span>${who ? esc(String(ch.cast[who]?.name || who).slice(0, 1)) : "✧"}</span></div>
      <div class="story-dust"><i></i><i></i><i></i><i></i><i></i></div>
    </div>
    <div class="story-body">
      ${hudRow(ui, ch)}
      <div class="dialogue" data-action="tap-story" id="dialogue">
        ${speakerMarkup(ch, who)}
        <p class="dialogue-text" id="dialogue-text">${shownText}</p>
        <span class="dialogue-caret"></span>
      </div>
      ${typingPhase ? `<div class="story-tapzone" data-action="tap-story"><span class="ornament">✧</span><small>${tx("Tap anywhere to continue", "点击任意处继续")}</small></div>` : ""}
      <div class="choice-area" id="choice-area">${choicesHtml(ui)}</div>
      ${s.phase === "choices" ? `<div class="choice-aside"><span class="ornament">✧</span><p>${tx("Your choices shape you — the story stays true to Scripture.", "你的选择塑造你自己——故事始终忠于圣经。")}</p><small>${tx("Swipe or tap a choice", "滑动或点击选项")}</small></div>` : ""}
    </div>
    ${s.phase === "mini" ? miniHtml(ui) : ""}
    ${["reward", "reflect", "reflect-done"].includes(s.phase) ? outcomeHtml(ui) : ""}
  </div>`;
}
