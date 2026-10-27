import { esc, icon } from "../core/util.js";
import { FRUITS, RELICS, SEALS, PROMISES } from "../data/compendium.js";
import { isUnlocked } from "../core/state.js";
import { CHAPTERS, chapterById } from "../data/chapters.js";
import { tx, isZh } from "../core/i18n.js";

function wrap(inner) {
  return `<div class="modal-backdrop" id="modal-backdrop" data-action="close-modal">
    <div class="modal" data-action="noop">
      <div class="modal-grip"></div>
      ${inner}
    </div>
  </div>`;
}

function scrollInner(ch) {
  return `<div class="eyebrow">${tx(`The Scroll · Chapter ${ch.roman}`, `书卷 · 第 ${ch.roman} 章`)}</div>
    <h2>${esc(ch.title)}</h2>
    <p class="small muted">${esc(ch.subtitle)} · ${esc(ch.ref)}</p>
    <div class="divider"></div>
    <p class="verse">“${esc(ch.scroll.verse)}”</p>
    <p class="small gold" style="margin-top:-4px">— ${esc(ch.scroll.ref)}</p>
    <div class="divider"></div>
    <div class="card-quiet">
      <div class="eyebrow" style="margin-bottom:6px">${tx("Elias’ note", "以利亚斯的笔记")}</div>
      <p class="small" style="margin:0">${esc(ch.scroll.note)}</p>
    </div>
    <p class="tiny muted" style="margin-top:12px">${esc(ch.scroll.timeline)}</p>
    <p class="tiny muted">${tx("Scripture quotations: King James Version (public domain). Narrative dialogue is written for this game and is not scripture.", "经文引用：英王钦定本／中文和合本（公有领域）。叙事对白为本游戏创作，并非经文。")}</p>
    <button class="btn btn-ghost btn-sm" style="margin-top:8px" data-action="close-modal">${tx("Close the scroll", "合上书卷")}</button>`;
}

function itemInner(ui) {
  const { kind, id } = ui.modal;
  if (kind === "fruit") {
    const f = FRUITS.find((x) => x.id === id) || FRUITS[0];
    const got = ui.state.fruits.includes(id);
    return `<div class="center"><div style="font-size:2.6rem">${f.glyph}</div>
      <div class="eyebrow">${tx("Fruit of the Spirit", "圣灵的果子")}</div><h2>${esc(f.name)}</h2></div>
      <p class="verse center" style="margin-top:14px">${esc(f.note)}</p>
      <p class="small muted center">${tx(got ? "You gathered this on your journey." : "Not yet found. Certain choices in the chapters reveal it.", got ? "你在旅程中收集到了它。" : "尚未找到。章节中的某些选择会显明它。")}</p>
      <p class="tiny muted center">${isZh() ? "「圣灵所结的果子，就是仁爱、喜乐、和平、忍耐、恩慈、良善、信实、温柔、节制。」——加拉太书 5:22–23（和合本）" : "“The fruit of the Spirit is love, joy, peace, longsuffering, gentleness, goodness, faith, meekness, temperance.” — Galatians 5:22–23 (KJV)"}</p>`;
  }
  if (kind === "relic") {
    const r = RELICS[id];
    const got = ui.state.relics.includes(id);
    return `<div class="center"><div style="font-size:2.6rem">${r.glyph}</div>
      <div class="eyebrow">${tx("Relic", "圣物")}</div><h2>${esc(r.name)}</h2></div>
      <p class="small muted center">${tx("From", "来自")} ${esc(r.chapter)} · ${esc(r.ref)}</p>
      <div class="divider"></div>
      <p class="prose small">${got ? esc(r.desc) : tx("You have not found this relic yet. Finish its chapter to add it to your journal.", "你还没有找到这件圣物。完成对应章节，即可收入日志。")}</p>`;
  }
  if (kind === "seal") {
    const s = SEALS.find((x) => x.id === id) || SEALS[0];
    const got = ui.state.seals.includes(id);
    return `<div class="center"><div style="font-size:2.6rem">${s.glyph}</div>
      <div class="eyebrow">${tx("Seal", "印记")}</div><h2>${esc(s.name)}</h2></div>
      <p class="small muted center">${esc(s.desc)}</p>
      <p class="center" style="margin-top:14px">${got ? `<span class="pill">${tx("Earned", "已获得")}</span>` : `<span class="pill">${tx("Locked", "未解锁")}</span>`}</p>`;
  }
  if (kind === "verse") {
    const ch = chapterById(id);
    if (!ch) return "";
    return scrollInner(ch);
  }
  return "";
}

function howtoInner() {
  const en = !isZh();
  return `<div class="eyebrow">${tx("A short guide", "简短指南")}</div><h2>${tx("How the journey works", "这趟旅程怎么玩")}</h2>
    <div class="prose small" style="margin-top:12px">
      ${en ? `
      <p>You are a <strong>pilgrim with a scroll</strong>. The scroll carries you into six true stories from the Bible — you stand in the valley, sit in the boat, wait outside the lions’ den.</p>
      <h3>What your choices do</h3>
      <p>They shape <em>you</em>, not scripture. David still faces Goliath; the storm still stops. Your choices grow four virtues — <span class="gold">Courage, Wisdom, Compassion and Faith</span> — and unlock fruits, relics and seals.</p>
      <h3>What to tap — and play</h3>
      <ul>
        <li><strong>Tap the dialogue box</strong> to read the next line, or <strong>swipe a choice card</strong> to decide.</li>
        <li><strong>Action scenes</strong> put you IN the story: aim the sling, sneak past lions, steer the boat, run home. Drag, tap and hold — every chapter has one.</li>
        <li><strong>Hidden objects</strong> appear in the artwork. Tap the glowing spots for a bonus.</li>
        <li><strong>Hold the prayer button</strong> once per chapter for +1 Faith and a promise from the Psalms.</li>
        <li><strong>Drag your pilgrim</strong> along the map to visit a chapter.</li>
        <li><strong>Open the scroll</strong> (top right) any time to read the real passage, the historical note and the reference.</li>
      </ul>
      <h3>At the end of each chapter</h3>
      <p>You will receive a relic, a fruit of the Spirit, and one honest reflection question. There are no wrong answers — only different ones.</p>
      <p class="tiny muted">Progress saves automatically on your device. No account, no ads, no tracking.</p>
      ` : `
      <p>你是一位<strong>手执书卷的朝圣者</strong>。书卷会带你进入圣经中六个真实的故事——你站在山谷里，坐在船上，在狮子坑外等候。</p>
      <h3>你的选择有什么用</h3>
      <p>它们塑造的是<em>你</em>，不是经文。大卫仍然迎战歌利亚；风浪仍然止息。你的选择会增长四种品格——<span class="gold">勇气、智慧、怜悯、信心</span>——并解锁果子、圣物与印记。</p>
      <h3>该点哪里——该怎么玩</h3>
      <ul>
        <li><strong>点击对白框</strong>阅读下一句，或<strong>滑动选项卡片</strong>来做决定。</li>
        <li><strong>互动关卡</strong>让你真正进入故事：甩石、潜过狮子、掌舵、奔向父家。拖动、点击、按住——每章都有一个。</li>
        <li><strong>隐藏物品</strong>会出现在插画里。点击发光的地方可获得奖励。</li>
        <li><strong>按住祷告按钮</strong>，每章一次，获得 +1 信心和一句诗篇的应许。</li>
        <li><strong>拖动地图上的朝圣者</strong>走到某个章节。</li>
        <li><strong>打开书卷</strong>（右上角）随时查看真正的经文、历史注解与出处。</li>
      </ul>
      <h3>每章结束的时候</h3>
      <p>你会得到一件圣物、一个圣灵的果子，以及一道诚实的反思题。那道题没有错答案——只有不同的答案。</p>
      <p class="tiny muted">进度自动保存在你的设备上。没有账号、没有广告、没有追踪。</p>
      `}
    </div>
    <button class="btn btn-primary" style="margin-top:8px" data-action="close-modal">${tx("I’m ready", "我准备好了")}</button>`;
}

function prayInner(ch) {
  const idx = CHAPTERS.findIndex((c) => c.id === ch.id);
  const p = PROMISES[idx % PROMISES.length];
  return `<div class="center"><div style="font-size:2.4rem">✟</div>
    <div class="eyebrow">${tx("You paused to pray", "你停下来祷告")}</div><h2>${tx("+1 Faith", "+1 信心")}</h2></div>
    <p class="verse center" style="margin-top:16px">“${esc(p.text)}”</p>
    <p class="small center gold">— ${esc(p.ref)}</p>
    <p class="tiny muted center" style="margin-top:14px">${tx("Prayer is available once in each chapter. It grows Faith, which can open golden choices later in the story.", "每章可以祷告一次。它会增长信心，从而开启故事后面出现的金色选项。")}</p>
    <button class="btn btn-primary" style="margin-top:8px" data-action="close-modal">${tx("Amen", "阿们")}</button>`;
}

function leaveInner() {
  return `<div class="eyebrow">${tx("Leave the chapter?", "离开这一章？")}</div><h2>${tx("Your place is kept", "你的位置会保留")}</h2>
    <p class="small muted">${tx("Choices you already made are saved. Coming back will restart this chapter from the beginning, with the virtues you have gained.", "你已经做出的选择会被保存。回来时将从本章开头重新开始，但你获得的品格会保留。")}</p>
    <div class="stack" style="margin-top:16px">
      <button class="btn btn-primary" data-action="close-modal">${tx("Stay in the story", "留在故事里")}</button>
      <button class="btn btn-ghost" data-action="confirm-leave">${tx("Return to the map", "返回地图")}</button>
    </div>`;
}

function resetInner() {
  return `<div class="eyebrow">${tx("Start over?", "重新开始？")}</div><h2>${tx("Erase this journey", "清除这段旅程")}</h2>
    <p class="small muted">${tx("Your name, level, virtues, fruits, relics and seals will be deleted from this device. This cannot be undone.", "你的名字、等级、品格、果子、圣物与印记将从本机删除，且无法恢复。")}</p>
    <div class="stack" style="margin-top:16px">
      <button class="btn btn-primary" data-action="close-modal">${tx("Keep my journey", "保留我的旅程")}</button>
      <button class="btn btn-danger" data-action="confirm-reset">${tx("Yes, erase everything", "是的，全部清除")}</button>
    </div>`;
}

function chapterInner(ui) {
  const ch = chapterById(ui.modal.id);
  const unlocked = !!ui.state && isUnlocked(ui.state, ch);
  if (!unlocked) {
    return `<div class="center"><div style="font-size:2.4rem">${icon("lock", 42)}</div>
      <div class="eyebrow">${tx("Still ahead on the road", "还在前方路上")}</div><h2>${esc(ch.title)}</h2></div>
      <p class="small muted center" style="margin-top:12px">${tx("Finish the previous chapter to open this one. ", "先完成上一章才能解锁这一章。")}${esc(ch.intro)}</p>`;
  }
  return `<div class="center"><div style="font-size:2.4rem">✧</div>
      <div class="eyebrow">${tx(`Chapter ${ch.roman}`, `第 ${ch.roman} 章`)} · ${esc(ch.ref)}</div><h2>${esc(ch.title)}</h2>
      <p class="small muted">${esc(ch.subtitle)}</p></div>
    <p class="prose small center" style="margin:16px 0">${esc(ch.intro)}</p>
    <div class="card-quiet small"><strong class="gold">${tx("Theme:", "主题：")}</strong> ${esc(ch.theme)} &nbsp;·&nbsp; <strong class="gold">${tx("Length:", "长度：")}</strong> ${esc(ch.length)}</div>
    <button class="btn btn-primary" style="margin-top:14px" data-action="enter-chapter" data-id="${ch.id}">${icon("play", 16)} ${tx("Enter this story", "进入这个故事")}</button>
    <button class="btn btn-ghost btn-sm" style="margin-top:8px" data-action="close-modal">${tx("Not yet", "暂不")}</button>`;
}

export function modalHtml(ui) {
  const m = ui.modal;
  if (!m) return "";
  switch (m.type) {
    case "scroll": return wrap(scrollInner(chapterById(m.id)));
    case "item": return wrap(itemInner(ui));
    case "howto": return wrap(howtoInner());
    case "pray": return wrap(prayInner(chapterById(m.id)));
    case "leave": return wrap(leaveInner());
    case "reset": return wrap(resetInner());
    case "chapter": return wrap(chapterInner(ui));
    default: return "";
  }
}
