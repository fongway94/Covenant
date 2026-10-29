/* The travellers' camp — a real overworld hub between chapters.
   Day cycle, three NPCs, a quest board, a satchel, and a breathing prayer. */

import { esc, icon } from "../core/util.js";
import { CHAPTERS } from "../data/chapters.js";
import { QUESTS, CAMP_NPCS } from "../data/quests.js";
import { RELICS, FRUITS, SEALS, STATS, STAT_KEYS, STAT_MAX, countDone } from "../data/compendium.js";
import { questState, campDay, dayPhase, adventure, breatheAtCamp } from "../core/state.js";
import { tx, isZh } from "../core/i18n.js";
import { analyseJourney, MIRROR_COPY, WAYS, WAY_KEYS, pick } from "../data/mirror.js";
import { deeperFor } from "../data/deeper.js";
import { hudHtml, tabsHtml } from "./world.js";

const BREATH_STEPS = 3;      // inhale · hold · exhale
const BREATH_CYCLES = 3;     // nine taps for a full prayer

export function breathPhase(ui) {
  const b = ui.breathe || { step: 0, cycle: 0 };
  return b;
}

export function startBreath(ui) {
  ui.breathe = { step: 0, cycle: 0, done: false };
  ui.modal = { type: "breathe" };
}

export function tapBreath(ui) {
  const b = ui.breathe;
  if (!b || b.done) return null;
  b.step++;
  if (b.step >= BREATH_STEPS) { b.step = 0; b.cycle++; }
  if (b.cycle >= BREATH_CYCLES) {
    b.done = true;
    const reward = breatheAtCamp(ui.state);
    ui.modal = null;
    if (!reward) return { already: true };
    return { ...reward, done: true };
  }
  return { ...b };
}

export function breathLabel(step) {
  return [tx("Breathe in", "吸气"), tx("Hold", "停住"), tx("Breathe out", "呼气")][step % 3];
}

/* ------------------------------------------------------------------- camp */

function npcButtons(ui) {
  const a = adventure(ui.state);
  return CAMP_NPCS.map((n, i) => {
    const met = a.npcMet.includes(n.id);
    return `<button class="camp-npc ${met ? "met" : ""}" style="left:${[17, 50, 82][i]}%" data-action="camp-npc" data-id="${n.id}" aria-label="${tx(`Talk to ${n.nameEn}`, `与${n.nameZh}交谈`)}">
      <span class="npc-aura"></span><span class="npc-glyph">${n.glyph}</span>
      <span class="npc-name">${esc(isZh() ? n.nameZh : n.nameEn)}</span>
      ${met ? "" : '<span class="npc-dot">✧</span>'}
    </button>`;
  }).join("");
}

function questBoard(ui) {
  const s = ui.state;
  const claimed = adventure(s).quests || {};
  const allDone = QUESTS.every((q) => claimed[q.id]);
  return `<section class="camp-section">
    <div class="camp-section-head">
      <div><div class="eyebrow">${tx("Ada's board", "艾达的木板")}</div>
        <h3>${tx("Three small tasks", "三件小事")}</h3></div>
      <span class="pill ${allDone ? "gold" : ""}">${QUESTS.filter((q) => claimed[q.id]).length}/${QUESTS.length}</span>
    </div>
    <p class="tiny muted" style="margin:0 0 10px">${tx("These are not tests. They simply notice what you have already done.", "这些不是考试。它们只是让你留意自己已经做过的事。")}</p>
    <div class="quest-list">${QUESTS.map((q) => {
      const st = questState(s, q);
      const pct = Math.round((st.value / st.goal) * 100);
      return `<div class="quest ${st.claimed ? "claimed" : st.ready ? "ready" : ""}">
        <div class="quest-glyph">${st.claimed ? icon("check", 18) : q.glyph}</div>
        <div class="quest-main">
          <div class="quest-top"><strong>${esc(isZh() ? q.titleZh : q.titleEn)}</strong>
            <span class="tiny gold">+${q.reward.guidance} ${tx("Guidance", "引导")}</span></div>
          <p class="tiny muted" style="margin:3px 0 6px">${esc(isZh() ? q.descZh : q.descEn)}</p>
          <div class="quest-track"><i style="width:${pct}%"></i></div>
          <div class="quest-foot"><span class="tiny muted">${st.value} / ${st.goal}</span>
            ${st.claimed
              ? `<span class="pill">${tx("Received", "已领取")}</span>`
              : st.ready
                ? `<button class="btn btn-primary btn-xs" data-action="claim-quest" data-id="${q.id}">${tx("Receive", "领取")}</button>`
                : `<span class="tiny muted">${tx("In progress", "进行中")}</span>`}
          </div>
        </div>
      </div>`;
    }).join("")}</div>
    ${allDone ? `<p class="small serif gold center" style="margin:12px 0 0">${tx("Ada has carved your name into the camp post.", "艾达已把你的名字刻在营地木桩上。")}</p>` : ""}
  </section>`;
}

function satchel(ui) {
  const s = ui.state;
  const relics = Object.entries(RELICS);
  return `<section class="camp-section">
    <div class="camp-section-head"><div><div class="eyebrow">${tx("Your satchel", "你的行囊")}</div>
      <h3>${tx("What you carry", "你所携带的")}</h3></div></div>
    <div class="satchel-row">
      <div class="satchel-item"><span class="ico">✧</span><strong>${s.relics.length}/${relics.length}</strong><small>${tx("Relics", "圣物")}</small></div>
      <div class="satchel-item"><span class="ico">❀</span><strong>${s.fruits.length}/${FRUITS.length}</strong><small>${tx("Fruits", "果子")}</small></div>
      <div class="satchel-item"><span class="ico">✦</span><strong>${s.seals.length}/${SEALS.length}</strong><small>${tx("Seals", "印记")}</small></div>
      <div class="satchel-item guidance"><span class="ico">✟</span><strong>${adventure(s).guidance || 0}</strong><small>${tx("Guidance", "引导")}</small></div>
    </div>
    <div class="relic-strip">${relics.map(([id, r]) => `<span class="relic-chip ${s.relics.includes(id) ? "got" : ""}" title="${esc(r.name)}">${r.glyph}</span>`).join("")}</div>
    <div class="card-quiet" style="margin-top:12px">
      <div class="eyebrow" style="margin-bottom:5px">${tx("What is Guidance?", "什么是「引导」？")}</div>
      <p class="tiny muted" style="margin:0">${tx("Guidance is stored by praying and by breathing at the campfire. Immersive / no-tips mode is on by default, so you can spend 1 Guidance to reveal the hidden hints around a choice, or 2 Guidance to open a golden choice your virtues have not yet reached. The story's outcome never changes — only how clearly you see the door.", "「引导」来自祷告，也来自营火旁的呼吸祷告。沉浸／无提示模式默认开启，所以你可以花 1 点引导，让选项旁边那些被藏起来的提示显出来；也可以花 2 点，去开一个品格还没到位的金色选项。结局永远不会变——变的只是你看那扇门，看得清不清楚。")}</p>
    </div>
  </section>`;
}

export function campHtml(ui) {
  const s = ui.state;
  const day = campDay(s);
  const phase = dayPhase(s);
  const a = adventure(s);
  const breathed = a.lastBreathDay === day;
  const done = countDone(s);
  const next = CHAPTERS.find((c) => !s.chapters[c.id]?.completed);

  return `<div class="screen camp-screen">
    ${hudHtml(ui)}
    <div class="scroll camp-scroll safe-bottom">
      <div class="camp-hero" style="background-image:url('assets/art/camp.jpg')">
          <div class="camp-tint" style="background:${phase.tint}"></div>
        <div class="camp-stars"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div>
        <div class="camp-hero-top">
          <div class="camp-day"><div class="eyebrow">${tx(`Day ${day} of ${CHAPTERS.length}`, `第 ${day} / ${CHAPTERS.length} 天`)} · ${esc(isZh() ? phase.zh : phase.en)}</div>
            <h2>${esc(s.name)}</h2>
            <p class="tiny">${done}/${CHAPTERS.length} ${tx("chapters walked", "章已走过")}</p></div>
          <button class="guidance-chip" data-action="camp-guidance-info" aria-label="${tx("About Guidance", "关于引导")}"><span>✟</span><b>${a.guidance || 0}</b><small>${tx("Guidance", "引导")}</small></button>
        </div>
        <div class="camp-npcs">${npcButtons(ui)}</div>
        <button class="camp-fire ${breathed ? "spent" : ""}" data-action="breathe-open" aria-label="${tx("Breathe at the campfire", "在营火旁呼吸祷告")}">
          <span class="fire-flame">✦</span>
          <span class="camp-fire-label">${breathed ? tx("You have breathed today", "今天已呼吸祷告") : tx("Breathe & pray", "呼吸与祷告")}</span>
        </button>
      </div>

      <div class="camp-body">
        <div class="camp-cta card">
          <div><div class="eyebrow">${tx("The road ahead", "前方的路")}</div>
            <h3 style="margin:4px 0">${next ? esc(next.title) : tx("All roads walked", "所有的路都已走过")}</h3>
            <p class="tiny muted" style="margin:0">${next
              ? tx("Step back into the story. Your choices shape you, never the Scripture.", "重新走进故事。你的选择塑造你自己，绝不改写经文。")
              : tx("Visit the finale to see the person you became.", "前往终章，看看你成为了怎样的人。")}</p></div>
          <button class="btn btn-primary btn-sm" data-action="go" data-view="map">${icon("map", 16)} ${tx("Open the map", "打开地图")}</button>
        </div>
        ${done >= CHAPTERS.length ? `<button class="btn btn-ghost btn-sm" style="width:100%;margin-top:8px" data-action="go" data-view="finale">${icon("compass", 16)} ${tx("See your finale", "查看终章")}</button>` : ""}
        ${questBoard(ui)}
        ${satchel(ui)}
        <div class="camp-section">
          <div class="card-quiet">
            <div class="eyebrow" style="margin-bottom:6px">${tx("A note from the road", "路上的一段笔记")}</div>
            <p class="small serif" style="margin:0;color:var(--gold-light)">${isZh()
              ? "「你要专心仰赖耶和华，不可倚靠自己的聪明。在你一切所行的事上，都要认定他，他必指引你的路。」"
              : "“Trust in the LORD with all thine heart; and lean not unto thine own understanding. In all thy ways acknowledge him, and he shall direct thy paths.”"}</p>
            <p class="tiny gold" style="margin:8px 0 0">— ${tx("Proverbs 3:5–6 (KJV)", "箴言 3:5–6（和合本）")}</p>
          </div>
        </div>
      </div>
    </div>
    ${tabsHtml(ui, "camp")}
  </div>`;
}

/* ---------------------------------------------------------------- finale */

function dominantVirtue(s) {
  let best = STAT_KEYS[0];
  for (const k of STAT_KEYS) if (s.stats[k] > s.stats[best]) best = k;
  return best;
}

const MIRROR_EN = {
  courage: "You met fear more often than you expected — and kept walking. Courage was not loud in you; it was simply the next step, taken anyway.",
  wisdom: "You kept stopping to look closer. While others rushed, you read the moment, and the road opened a little at a time.",
  compassion: "You kept noticing the person at the edge of the story. Mercy was your habit before it was your decision.",
  faith: "You paused more than most. In the stopping, you learned that God is present before He is understood."
};
const MIRROR_ZH = {
  courage: "你比自己预想的更常遇见恐惧——却还是继续走。你的勇气不是喊出来的，是一步一步走出来的。",
  wisdom: "你总是停下来仔细看。别人只顾赶路，你会停下来把眼前这一处看清楚；路也就一点一点向你打开。",
  compassion: "你不断留意故事边缘的那个人。怜悯在成为你的决定之前，就已经是你的习惯。",
  faith: "你比多数人更常停下来。在停歇里，你学会：神在你理解祂以前，就已经在这里了。"
};

/* ==================================================================
   The Journey Mirror. Behaviour in -> Bible story out.
   Deliberately NOT a personality type: see src/data/mirror.js for the
   theological warrant (Romans 15:4, 1 Cor 10:11-12, James 1:23, 1 Sam 16:7).
   ================================================================== */

function mirrorFigureHtml(p, zh, primary) {
  const C = MIRROR_COPY;
  const block = (label, text, cls = "") => `<div class="mirror-block ${cls}">
    <div class="eyebrow">${esc(pick(label, zh))}</div><p>${esc(pick(text, zh))}</p></div>`;
  return `<div class="mirror-figure ${primary ? "primary" : "secondary-figure"}">
    <div class="mirror-figure-head">
      <div class="mirror-figure-glyph">${esc(p.glyph)}</div>
      <div><div class="eyebrow">${esc(pick(C.eyebrow, zh))}</div>
        <h3>${esc(pick(p.name, zh))}</h3>
        <p class="tiny muted" style="margin:0">${esc(pick(p.role, zh))} · ${esc(pick(p.ref, zh))}</p></div>
    </div>
    <p class="verse" style="margin:12px 0 2px">“${esc(pick(p.verse, zh))}”</p>
    <p class="tiny gold" style="margin:0 0 12px">— ${esc(pick(p.verseRef, zh))}</p>
    ${block(C.whyTitle, p.why, "why")}
    ${block(C.shadowTitle, p.shadow, "shadow")}
    ${block(C.graceTitle, p.grace, "grace")}
    ${block(C.readTitle, p.read, "read")}
    <button class="btn btn-ghost btn-sm" style="margin-top:12px" data-action="mirror-scroll" data-id="${esc(p.chapter)}">${icon("scroll", 15)} ${esc(pick(C.readButton, zh))}</button>
  </div>`;
}

function mirrorHtml(s) {
  const zh = isZh();
  const C = MIRROR_COPY;
  const a = analyseJourney(s);
  const P = (b) => esc(pick(b, zh));
  const wayRows = WAY_KEYS.map((k) => {
    const w = WAYS[k];
    const pct = Math.round((a.wShare[k] || 0) * 100);
    const strong = k === a.way;
    return `<div class="mirror-way ${strong ? "strong" : ""}">
      <span class="mirror-way-glyph">${esc(w.glyph)}</span>
      <div class="mirror-way-body"><strong>${esc(pick(w.name, zh))}</strong>
        <div class="mirror-way-bar"><i style="width:${Math.max(4, pct)}%"></i></div>
        <small>${esc(pick(w.desc, zh))}</small></div>
      <b>${pct}%</b></div>`;
  }).join("");
  const strongest = WAYS[a.way];

  return `<div class="journey-mirror">
    <div class="mirror-head">
      <div class="mirror-seal">✦</div>
      <div class="eyebrow">${P(C.eyebrow)} · ${P(C.notFortune)}</div>
      <h2>${P(C.title)}</h2>
      <p class="small muted" style="margin:6px 0 0">${P(C.intro)}</p>
    </div>

    <div class="mirror-panel">
      <div class="eyebrow" style="margin-bottom:8px">${P(C.waysTitle)}</div>
      ${wayRows}
      <p class="mirror-way-verse">“${esc(pick(strongest.verse, zh))}” <span>— ${esc(pick(strongest.ref, zh))}</span></p>
      <p class="mirror-hint-note">${esc((s.adventure?.hintsUsed || 0) === 0
        ? pick(C.hintsClean, zh)
        : pick(C.hintsSeen, zh).replace("{n}", String(s.adventure.hintsUsed)))}</p>
    </div>

    ${mirrorFigureHtml(a.primary, zh, true)}

    <div class="mirror-second">
      <div><div class="eyebrow">${P(C.secondTitle)}</div>
        <strong>${esc(a.secondary.glyph)} ${esc(pick(a.secondary.name, zh))}</strong></div>
      <button class="btn btn-ghost btn-sm" data-action="mirror-scroll" data-id="${esc(a.secondary.chapter)}">${P(C.secondaryButton)}</button>
    </div>

    <div class="mirror-warrant">
      <p class="verse">${P(C.warrant)}</p><p class="tiny gold">— ${P(C.warrantRef)}</p>
      <p class="verse" style="margin-top:10px">${P(C.mirror)}</p><p class="tiny gold">— ${P(C.mirrorRef)}</p>
      <p class="tiny muted" style="margin:10px 0 0">${P(C.caution)}</p>
      <div class="mirror-disclaimer"><p>${P(C.disclaimer)}</p></div>
    </div>
  </div>`;
}

function readingListHtml(s) {
  const zh = isZh();
  const C = MIRROR_COPY;
  return `<div class="reading-list">
    <div class="eyebrow" style="margin-bottom:6px">${esc(pick(C.readingTitle, zh))}</div>
    <p class="tiny muted" style="margin:0 0 10px">${esc(pick(C.readingIntro, zh))}</p>
    ${CHAPTERS.map((ch, i) => {
      const d = deeperFor(ch.id, zh);
      const done = !!s.chapters?.[ch.id]?.completed;
      return `<button class="reading-row" data-action="mirror-scroll" data-id="${esc(ch.id)}">
        <span class="reading-num ${done ? "done" : ""}">${done ? "✓" : i + 1}</span>
        <span class="reading-body"><strong>${esc(d?.ref || ch.ref)}</strong><small>${esc(d?.ask || "")}</small></span>
        <span class="reading-arrow">›</span></button>`;
    }).join("")}
  </div>`;
}

export function finaleHtml(ui) {
  const s = ui.state;
  const done = countDone(s);
  const key = dominantVirtue(s);
  const stat = STATS[key];
  const call = { shepherd: tx("Shepherd", "牧人"), scribe: tx("Scribe", "文士"), guardian: tx("Guardian", "守护者"), intercessor: tx("Intercessor", "代祷者") }[s.calling] || tx("Pilgrim", "朝圣者");
  const clean = s.settings.cleanMode;
  const questsDone = QUESTS.filter((q) => s.adventure?.quests?.[q.id]).length;
  const reflections = (s.reflections || []).length;
  const finishedDates = Object.values(s.chapters || {}).map((c) => c.finishedAt).filter(Boolean);
  const sealedOn = finishedDates.length ? new Date(Math.max(...finishedDates)) : new Date();
  const dateText = sealedOn.getFullYear() + "." + String(sealedOn.getMonth() + 1).padStart(2, "0") + "." + String(sealedOn.getDate()).padStart(2, "0");
  const virtueTitle = {
    courage: tx("the Courageous", "勇敢的人"),
    wisdom: tx("the Wise", "有智慧的人"),
    compassion: tx("the Compassionate", "有怜悯的人"),
    faith: tx("the Faithful", "有信心的人")
  }[key];

  return `<div class="screen finale-screen">
    <div class="finale-art" style="background-image:url('assets/art/camp.jpg')">
      <div class="finale-glow"></div>
      <div class="finale-art-text"><div class="eyebrow">${tx("The end of the road", "路的尽头")}</div>
        <h1>${tx("Well walked", "你走过了")}</h1></div>
    </div>
    <div class="scroll pad safe-bottom finale-body">
      <p class="verse center" style="margin-top:4px">${isZh()
        ? "「耶和华说：我知道我向你们所怀的意念，是赐平安的意念，不是降灾祸的意念，要叫你们末后有指望。」"
        : "“For I know the thoughts that I think toward you, saith the LORD, thoughts of peace, and not of evil, to give you an expected end.”"}</p>
      <p class="tiny gold center" style="margin:0 0 16px">— ${tx("Jeremiah 29:11 (KJV)", "耶利米书 29:11（和合本）")}</p>

      <div class="completion-seal">
        <div class="completion-seal-mark">✦</div>
        <div class="eyebrow">${tx("Covenant · the ten journeys", "Covenant · 十段旅程")}</div>
        <h2>${tx("Journey complete", "朝圣完成")}</h2>
        <p class="small serif">${esc(s.name)} · ${esc(virtueTitle)}</p>
        <div class="completion-seal-foot"><span>${done} / ${CHAPTERS.length} ${tx("stories witnessed", "段故事，你在场")}</span><span>${dateText}</span></div>
      </div>

      <div class="card-quiet" style="margin-top:14px">
        <div class="eyebrow" style="margin-bottom:6px">${tx("What you achieved", "你完成了什么")}</div>
        <p class="small serif" style="margin:0;color:var(--gold-light)">${tx(
          "You did not beat the Bible and you did not rewrite it. You walked into ten true stories as a witness — and let them shape a person. You leave with four grown virtues, ten stories you can now tell, and a habit of stopping to pray before you choose. Nothing here is a score of your worth. It is a portrait of who you practised being.",
          "你没有「通关」圣经，也没有改写它。你以见证者的身份走进十个真实的故事——并让它们塑造了一个人。你带走四种成长的品格、十段你能讲述的故事，以及「先停下祷告，再做选择」的习惯。这里没有衡量你价值的分数；只有一幅「你练习成为怎样的人」的画像。"
        )}</p>
        <p class="tiny muted" style="margin:10px 0 0">${tx("The achievement is not on this screen. It is the courage, wisdom, compassion and faith you carry into tomorrow.", "真正的成就不在这个画面上，而在你带进明天的勇气、智慧、怜悯与信心里。")}</p>
      </div>

      <div class="finale-card">
        <div class="finale-avatar">${esc(s.name.slice(0, 1).toUpperCase())}</div>
        <div><div class="eyebrow">${tx("The pilgrim", "这位朝圣者")}</div>
          <h2 style="margin:2px 0">${esc(s.name)}</h2>
          <p class="tiny muted" style="margin:0">${esc(call)} · ${tx(`Level ${s.level}`, `等级 ${s.level}`)} · ${done}/${CHAPTERS.length} ${tx("chapters", "章")}</p></div>
      </div>

      <div class="finale-stats">${STAT_KEYS.map((k) => `<div class="finale-stat">
        <span>${STATS[k].glyph} ${esc(STATS[k].name)}</span>
        <div class="bar"><i style="width:${Math.round((s.stats[k] / STAT_MAX) * 100)}%;background:${STATS[k].color}"></i></div>
        <b>${s.stats[k]}</b></div>`).join("")}</div>

      <div class="finale-grid">
        <div><span class="ico">✧</span><strong>${s.relics.length}</strong><small>${tx("Relics carried", "携带的圣物")}</small></div>
        <div><span class="ico">❀</span><strong>${s.fruits.length}</strong><small>${tx("Fruits gathered", "收集的果子")}</small></div>
        <div><span class="ico">✦</span><strong>${s.seals.length}</strong><small>${tx("Seals earned", "获得的印记")}</small></div>
        <div><span class="ico">✟</span><strong>${s.prayedIn.length}</strong><small>${tx("Times you prayed", "祷告的次数")}</small></div>
      </div>

      <div class="card-quiet" style="margin-top:14px">
        <div class="eyebrow" style="margin-bottom:8px">${tx("Your completed journey", "你走完的旅程")}</div>
        <div class="completion-list">
          <div><span>✓</span><p>${tx(`Witnessed ${done} of ${CHAPTERS.length} biblical stories — without changing their outcome`, `十段圣经故事，你在场 ${done} 段——结局一点没改`)}</p></div>
          <div><span>✓</span><p>${tx(`Grew Courage, Wisdom, Compassion and Faith to level ${s.level}`, `把勇气、智慧、怜悯、信心一路养大，现在是 ${s.level} 级`)}</p></div>
          <div><span>✓</span><p>${tx(`Gathered ${s.relics.length} relics, ${s.fruits.length} fruits and ${s.seals.length} seals`, `收集了 ${s.relics.length} 件圣物、${s.fruits.length} 个果子、${s.seals.length} 枚印记`)}</p></div>
          <div><span>✓</span><p>${tx(`Prayed ${s.prayedIn.length} times and answered ${reflections} honest reflections`, `祷告 ${s.prayedIn.length} 次，回答了 ${reflections} 道诚实的反思题`)}</p></div>
          <div><span>✓</span><p>${tx(`Completed ${questsDone} of ${QUESTS.length} camp quests; ${s.adventure?.guidance || 0} Guidance still in hand`, `营地任务完成 ${questsDone} / ${QUESTS.length}；手上还留着 ${s.adventure?.guidance || 0} 点「引导」`)}</p></div>
          <div><span>✓</span><p>${tx("Reached a hint-free ending — a mirror, not a scoreboard", `走到一个没有提示的结局——一面镜子，不是计分板`)}</p></div>
        </div>
      </div>

      ${mirrorHtml(s)}

      <div class="card-quiet" style="margin-top:14px">
        <div class="eyebrow" style="margin-bottom:6px">${tx("A mirror, not a scoreboard", "一面镜子，不是计分板")}</div>
        <p class="small serif" style="margin:0;color:var(--gold-light)">${esc(isZh() ? MIRROR_ZH[key] : MIRROR_EN[key])}</p>
        <p class="tiny muted" style="margin:10px 0 0">${tx("Your dominant virtue:", "你最显著的品格：")} <span style="color:${stat.color}">${esc(stat.name)}</span></p>
      </div>

      <div class="card-quiet" style="margin-top:12px">
        <div class="eyebrow" style="margin-bottom:6px">${tx("Immersive mode · no tips", "沉浸模式 · 没有提示")}</div>
        <p class="tiny muted" style="margin:0">${clean
          ? tx("You walked with the hints hidden — that is the default way to play. No checklist at the end, no circle telling you what to feel. Ten stories happened exactly as Scripture records them, and you were there. What you carry out is yours to decide.", "你是在关掉提示的情况下走完的——这本来就是游戏的默认方式。终点没有清单，也没有圆圈告诉你该有什么感受。十个故事完全按圣经记载发生，而你在场。你要带走什么，由你自己决定。")
          : tx("You chose to see the hint circles. You can turn Immersive mode back on in Settings at any time: the hints disappear, but the ending does not change. The finale is a mirror, not a checklist — it shows what your choices formed, and then it stops talking.", "你选择了看见提示圆圈。你随时可以在设置里重新开启沉浸模式：提示会消失，但结局不会改变。终章是一面镜子，不是清单——它显明你的选择塑造了什么，然后就安静下来。")}</p>
      </div>

      <div class="card-quiet" style="margin-top:12px; padding:14px">
        ${readingListHtml(s)}
      </div>

      <div class="card-quiet" style="margin-top:12px">
        <div class="eyebrow" style="margin-bottom:6px">${tx("Carry it outside", "把它带到游戏之外")}</div>
        <p class="tiny muted" style="margin:0">${tx(
          "This is where the game stops and your life begins. Retell one of the ten stories to somebody this week. When you face a decision, pause and breathe before you choose — the same way you did at the campfire. Open the book of Jeremiah and read chapter 29 in full. And notice which of the four virtues is hardest for you: that is the road still ahead.",
          "游戏在这里停下，你的生活从这里开始。这一周，把十段故事中的一段讲给一个人听；面对选择时，先停下来呼吸，再决定——就像你在营火旁做的那样；翻开耶利米书，把第 29 章完整读一遍；然后留意四种品格里哪一种对你最难——那就是你接下来要走的路。"
        )}</p>
      </div>

      <div class="stack" style="margin-top:16px">
        <button class="btn btn-primary" data-action="go" data-view="camp">${icon("heart", 16)} ${tx("Return to the camp", "回到营地")}</button>
        <button class="btn btn-ghost btn-sm" data-action="go" data-view="journal">${icon("book", 16)} ${tx("Read your journal", "翻看你的日志")}</button>
      </div>
      <p class="tiny muted center" style="margin-top:20px">${tx("The road continues outside the game.", "这条路，在游戏之外继续。")}</p>
    </div>
    ${tabsHtml(ui, "finale")}
  </div>`;
}
