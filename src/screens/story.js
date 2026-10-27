import { esc, icon } from "../core/util.js";
import { STATS, STAT_KEYS, FRUITS, RELICS, countDone } from "../data/compendium.js";
import { chapterById } from "../data/chapters.js";
import { addStat, addXp, grantFruit, checkSeals, completeChapter, recordReflection, hasPrayed, pray as prayState, saveGame, xpNeeded } from "../core/state.js";
import { sfx } from "../core/audio.js";
import { bus } from "../core/bus.js";

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
  if (!who) return `<div class="speaker narrator" id="speaker">✧ The Story</div>`;
  const c = ch.cast[who] || { name: who, role: "" };
  return `<div class="speaker" id="speaker">${esc(c.name)}${c.role ? `<span class="role">${esc(c.role)}</span>` : ""}</div>`;
}

function toast(msg, ico = "✧") { bus.toast(msg, ico); }

/* ------------------------------------------------------------------ lifecycle */

export function startChapter(ui, id) {
  const ch = chapterById(id);
  if (!ch) return;
  ui.modal = null;
  ui.story = {
    chapterId: id, nodeId: ch.start, phase: "lines", lineIndex: 0,
    reply: null, mini: null, result: null, bump: {}, typing: false,
    timer: null, miniRaf: null, reflectionChoice: null
  };
  ui.view = "story";
  sfx("choose");
  bus.render();
}

export function cleanupStory(ui) {
  const s = ui.story;
  if (!s) return;
  if (s.timer) { clearInterval(s.timer); s.timer = null; }
  if (s.miniRaf && typeof cancelAnimationFrame === "function") { cancelAnimationFrame(s.miniRaf); s.miniRaf = null; }
  s.typing = false;
  if (s.mini) s.mini.last = 0;
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
  const tx = document.getElementById("dialogue-text");
  if (!sp || !tx) return;
  sp.outerHTML = speakerMarkup(ch, who);
  tx.innerHTML = "";
  s.fullText = text;
  s.typing = true;
  let i = 0;
  const step = Math.max(1, Math.ceil(text.length / 90));
  if (s.timer) clearInterval(s.timer);
  s.timer = setInterval(() => {
    i += step;
    tx.innerHTML = esc(text.slice(0, i));
    if (i >= text.length) finishTyping(ui);
  }, 16);
  sfx("tap");
}

export function mountStory(ui) {
  if (!ui.story) return;
  if (ui.story.phase === "lines" || ui.story.phase === "reply") renderLineDOM(ui);
  else if (ui.story.phase === "mini") startMiniLoop(ui);
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
  if (choice.xp) parts.push(`+${choice.xp} XP`);
  for (const f of gained) {
    const fruit = FRUITS.find((x) => x.id === f);
    parts.push(`${fruit.glyph} ${fruit.name}`);
  }
  if (parts.length) toast(parts.join(" · "), "✦");
  for (const seal of newSeals) toast(`Seal earned: ${seal.name}`, seal.glyph);
  if (levels > 0) { sfx("level"); toast(`Level up! You are now level ${s.level}`, "✦"); }
  return { gained, newSeals };
}

export function chooseOption(ui, index) {
  const s = st(ui);
  if (s.phase !== "choices") return;
  const choice = node(ui).choices[index];
  if (!choice) return;
  if (!meets(ui, choice.require)) {
    const need = Object.entries(choice.require || {}).map(([k, v]) => `${STATS[k].name} ${v}`).join(" & ");
    toast(`Not yet — this needs ${need}. Pray or keep walking.`, "✟");
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
  const s = st(ui);
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
  if (n.mini) {
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
  if (hasPrayed(ui.state, ch.id)) { toast("You have already prayed in this chapter.", "✟"); return; }
  prayState(ui.state, ch.id);
  sfx("pray");
  ui.modal = { type: "pray", id: ch.id };
  bus.render();
  toast("+1 Faith · a promise for the road", "✟");
}

export function openScroll(ui) {
  ui.modal = { type: "scroll", id: st(ui).chapterId };
  sfx("tap");
  bus.render();
}

/* ------------------------------------------------------------------ minigame */

function initMini(cfg) {
  return { cfg, round: 0, pos: 0, dir: 1, results: [], done: false, feedback: cfg.prompt, last: 0 };
}

function miniLoop(ui, ts) {
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
  dots.forEach((d, i) => {
    d.className = "mg-dot" + (i < m.results.length ? (m.results[i] ? " hit" : " miss") : "");
  });
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
    toast(`${hits}/${total} — ${m.cfg.hitText} Bonus earned.`, "◎");
  } else {
    toast(`${hits}/${total} — ${m.cfg.missText} The story goes on.`, "⌇");
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
  for (const seal of res.newSeals) toast(`Seal earned: ${seal.name}`, seal.glyph);
  bus.render();
}

export function goToReflection(ui) { st(ui).phase = "reflect"; sfx("tap"); bus.render(); }

export function leaveStory(ui) {
  ui.story = null;
  ui.modal = null;
  ui.view = "map";
  bus.render();
}

export function finishStory(ui) {
  const allDone = countDone(ui.state) >= CHAPTER_COUNT;
  ui.story = null;
  ui.modal = null;
  ui.view = allDone ? "character" : "map";
  sfx("choose");
  bus.render();
  if (allDone) toast("You have walked every chapter. Well done, pilgrim.", "✺");
}

/* ------------------------------------------------------------------ rendering */

function hudRow(ui, ch) {
  const s = ui.state;
  const bump = st(ui).bump || {};
  const chips = STAT_KEYS.map((k) => `<div class="chip ${bump[k] ? "up" : ""}"><b>${s.stats[k]}</b>${esc(STATS[k].name)}</div>`).join("");
  const prayed = hasPrayed(s, ch.id);
  return `<div class="story-hud">
    <div class="stat-chips">${chips}</div>
    <button class="pray-btn" data-action="pray-now" ${prayed ? "disabled" : ""}>${icon("pray", 13)} ${prayed ? "Prayed" : "Pray"}</button>
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
      const hint = locked ? `Requires ${need} — pray once this chapter, or keep growing.` : (c.hint || "");
      return `<button class="${cls}" style="animation-delay:${i * 55}ms" data-action="${locked ? "locked-choice" : "choose"}" data-index="${i}">
        <span class="num">${locked ? icon("lock", 12) : i + 1}</span>
        <span class="body"><span class="label">${esc(c.t)}</span>${hint ? `<span class="hint">${esc(hint)}</span>` : ""}</span>
        ${c.tag ? `<span class="tag">${esc(c.tag)}</span>` : ""}
      </button>`;
    }).join("");
  }
  if (s.phase === "next") {
    return `<button class="btn btn-primary continue-btn" data-action="story-continue">Continue ${icon("forward", 16)}</button>`;
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
    <div class="eyebrow">A moment to focus</div>
    <h2>${esc(cfg.title)}</h2>
    <p class="small muted" style="max-width:300px;margin:-6px auto 0">${esc(cfg.prompt)}</p>
    <div class="mg-track">
      <div class="mg-zone" id="mg-zone" style="left:${target - cfg.zone / 2}%;width:${cfg.zone}%"></div>
      <div class="mg-marker" id="mg-marker" style="left:calc(${m.pos}% - 2.5px)"></div>
    </div>
    <div class="mg-rounds">${dots}</div>
    <div class="mg-feedback" id="mg-feedback">${esc(m.feedback)}</div>
    <button class="btn btn-primary" data-action="mini-tap" style="max-width:300px">Tap when the light reaches the mark</button>
    <button class="btn btn-ghost btn-sm" data-action="mini-skip" style="max-width:300px">Skip — no bonus</button>
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
    return `<div class="outcome"><div class="outcome-inner">
      <div class="seal">${ch.ending.seal}</div>
      <div class="center"><div class="eyebrow">Chapter ${ch.roman} complete</div><h2 style="margin-top:4px">${esc(ch.ending.title)}</h2>
        <p class="small muted" style="margin-top:8px">${esc(ch.ending.text)}</p></div>
      <div class="card-quiet"><div class="eyebrow" style="margin-bottom:6px">What the story says</div>
        <p class="small serif" style="margin:0;color:var(--gold-light)">${esc(ch.ending.takeaway)}</p>
        <p class="tiny muted" style="margin:8px 0 0">Read the full account: ${esc(ch.ref)}</p></div>
      <div class="eyebrow" style="margin-top:4px">Added to your journal</div>
      <div class="reward-row">
        <div class="reward"><span class="ico">${relic.glyph}</span><strong>${esc(relic.name)}</strong><small>Relic · ${r.newRelic ? "new" : "already kept"}</small></div>
        ${fruitNames.map((f) => `<div class="reward"><span class="ico">${f.glyph}</span><strong>${esc(f.name)}</strong><small>Fruit of the Spirit</small></div>`).join("")}
        <div class="reward"><span class="ico">✦</span><strong>+${r.xp || 0} XP</strong><small>${r.levels ? `Level up! Now level ${ui.state.level}` : `${ui.state.xp} / ${xpNeeded(ui.state.level)} to next level`}</small></div>
      </div>
      ${newSeals.length ? `<div class="card-quiet"><div class="eyebrow" style="margin-bottom:6px">New seals</div>${newSeals.map((x) => `<span class="pill" style="margin:2px 4px 2px 0">${x.glyph} ${esc(x.name)}</span>`).join("")}</div>` : ""}
      <div class="stack" style="margin-top:6px">
        <button class="btn btn-primary" data-action="reflect">${icon("heart", 16)} Take a moment to reflect</button>
        <button class="btn btn-ghost btn-sm" data-action="finish-story">Return to the map</button>
      </div>
    </div></div>`;
  }
  if (s.phase === "reflect") {
    return `<div class="outcome"><div class="outcome-inner">
      <div class="center" style="margin-top:20px"><div class="eyebrow">A moment to reflect</div>
        <div style="font-size:2.2rem;margin:12px 0 4px">✧</div></div>
      <p class="reflect-q center">${esc(ch.reflection.q)}</p>
      <p class="tiny muted center">There is no wrong answer here. Choose what is honest for you today.</p>
      <div class="stack" style="margin-top:10px">${ch.reflection.options.map((o, i) => `<button class="choice reflect-opt" data-action="reflect-answer" data-index="${i}">
        <span class="num">${i + 1}</span><span class="body"><span class="label">${esc(o.t)}</span></span></button>`).join("")}</div>
      <button class="btn btn-ghost btn-sm" style="margin-top:8px" data-action="finish-story">Skip for now</button>
    </div></div>`;
  }
  if (s.phase === "reflect-done") {
    const opt = ch.reflection.options[s.reflectionChoice];
    const allDone = countDone(ui.state) >= CHAPTER_COUNT;
    return `<div class="outcome"><div class="outcome-inner">
      <div class="center" style="margin-top:20px"><div style="font-size:2.4rem">✟</div>
        <div class="eyebrow" style="margin-top:10px">Carry this with you</div></div>
      <p class="verse center" style="margin-top:8px">${esc(opt.insight)}</p>
      <div class="card-quiet"><p class="small serif" style="margin:0">“${esc(ch.scroll.verse)}”</p>
        <p class="tiny gold" style="margin:8px 0 0">— ${esc(ch.scroll.ref)}</p></div>
      ${allDone ? `<div class="card-quiet center"><div class="eyebrow">All six chapters walked</div><p class="small" style="margin:6px 0 0">You have seen courage, integrity, mercy, trust, grace and boldness. The road continues in your own life.</p></div>` : ""}
      <button class="btn btn-primary" style="margin-top:8px" data-action="finish-story">${icon("map", 16)} ${allDone ? "See your journey" : "Return to the map"}</button>
    </div></div>`;
  }
  return "";
}

export function storyHtml(ui) {
  const s = st(ui);
  const ch = chapter(ui);
  const lines = currentLines(ui);
  const [who, text] = lines[Math.min(s.lineIndex, lines.length - 1)] || ["", ""];
  const typingPhase = s.phase === "lines" || s.phase === "reply";
  const shownText = typingPhase ? "" : esc(text);
  return `<div class="screen story">
    <div class="story-art" style="background-image:url('${ch.art}')">
      <div class="story-top">
        <button class="icon-btn" data-action="ask-leave" aria-label="Leave chapter">${icon("back", 17)}</button>
        <div class="story-chapter">${esc(ch.title)}</div>
        <button class="icon-btn" data-action="open-scroll" aria-label="Open the scroll">${icon("scroll", 17)}</button>
      </div>
      <div class="story-tag">Chapter ${ch.roman} · ${esc(ch.ref)}</div>
    </div>
    <div class="story-body">
      ${hudRow(ui, ch)}
      <div class="dialogue" data-action="tap-story" id="dialogue">
        ${speakerMarkup(ch, who)}
        <p class="dialogue-text" id="dialogue-text">${shownText}</p>
      </div>
      ${typingPhase ? `<div class="story-tapzone" data-action="tap-story"><span class="ornament">✧</span><small>Tap anywhere to continue</small></div>` : ""}
      <div class="choice-area" id="choice-area">${choicesHtml(ui)}</div>
      ${s.phase === "choices" ? `<div class="choice-aside"><span class="ornament">✧</span><p>Your choices shape you — the story stays true to Scripture.</p></div>` : ""}
    </div>
    ${s.phase === "mini" ? miniHtml(ui) : ""}
    ${["reward", "reflect", "reflect-done"].includes(s.phase) ? outcomeHtml(ui) : ""}
  </div>`;
}
