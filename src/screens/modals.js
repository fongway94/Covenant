import { esc, icon } from "../core/util.js";
import { FRUITS, RELICS, SEALS, PROMISES, STATS } from "../data/compendium.js";
import { isUnlocked, adventure } from "../core/state.js";
import { CAMP_NPCS } from "../data/quests.js";
import { deeperFor } from "../data/deeper.js";
import { breathLabel } from "./camp.js";
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

function scrollDeeper(ch) {
  const d = deeperFor(ch.id, isZh());
  if (!d) return "";
  return `<div class="card-quiet go-deeper" style="margin-top:12px">
    <div class="eyebrow" style="margin-bottom:6px">${tx("Go deeper · open the Bible", "再走一步 · 打开圣经")}</div>
    <p class="small" style="margin:0 0 6px">${esc(d.hook)}</p>
    <p class="small serif gold" style="margin:0">${esc(d.ask)}</p>
    <p class="tiny muted" style="margin:8px 0 0">${tx("Read the whole passage:", "阅读整段经文：")} ${esc(d.ref)}</p>
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
      <div class="eyebrow" style="margin-bottom:6px">${tx("Corin’s note", "柯林的笔记")}</div>
      <p class="small" style="margin:0">${esc(ch.scroll.note)}</p>
    </div>
    ${ch.brief ? `<div class="card-quiet" style="margin-top:12px">
      <div class="eyebrow" style="margin-bottom:6px">${tx("Background · before this scene", "背景 · 这一幕之前")}</div>
      <p class="small" style="margin:0 0 8px"><strong class="gold">${tx("When and where", "时间与地点")}</strong> ${esc(ch.brief.place)}</p>
      <p class="small" style="margin:0 0 8px"><strong class="gold">${tx("Who is here", "这里有谁")}</strong> ${esc(ch.brief.who)}</p>
      <p class="small" style="margin:0"><strong class="gold">${tx("What is at stake", "要紧的是")}</strong> ${esc(ch.brief.stake)}</p>
    </div>` : ""}
    <p class="tiny muted" style="margin-top:12px">${esc(ch.scroll.timeline)}</p>
    ${scrollDeeper(ch)}
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
      <p class="small muted center">${isZh() ? "来自" : "From "}${esc(r.chapter)} · ${esc(r.ref)}</p>
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
      <p>You are a <strong>pilgrim with a scroll</strong>. The scroll carries you into ten true stories from the Bible — you stand in the valley, sit in the boat, wait outside the lions’ den.</p>
      <h3>What your choices do</h3>
      <p>They shape <em>you</em>, not scripture. David still faces Goliath; the storm still stops. Your choices grow four virtues — <span class="gold">Courage, Wisdom, Compassion and Faith</span> — and unlock fruits, relics and seals.</p>
      <h3>What to tap — and play</h3>
      <ul>
        <li><strong>Tap the dialogue box</strong> to read the next line, or <strong>swipe a choice card</strong> to decide.</li>
        <li><strong>Action scenes</strong> put you IN the story: aim the sling, sneak past lions, steer the boat, run home. Drag, tap and hold — every chapter has one.</li>
        <li><strong>Hidden objects</strong> appear in the artwork. Tap the glowing spots for a bonus.</li>
        <li><strong>Hold the prayer button</strong> once per chapter for +1 Faith, +1 Guidance and a promise from the Psalms.</li>
        <li><strong>Drag your pilgrim</strong> along the map to visit a chapter.</li>
        <li><strong>Rest at the camp</strong> between chapters: talk to three travellers, claim three quests, and breathe at the fire for Guidance.</li>
        <li><strong>Immersive / no-tips mode is ON by default.</strong> Every hint circle, virtue gate and reward preview is hidden so the story feels like a story. Turn it off in Settings if you want the tips back; spend Guidance to reveal one at a time.</li>
        <li><strong>Open the scroll</strong> (top right) any time to read the real passage, the historical note and the reference.</li>
        <li><strong>Ambient music</strong> plays a living procedural score — moving chords, harp phrases and soft drums — with wind, water or crowd sounds that change per chapter. Toggle it with the ♪ button or in Settings.</li>
      </ul>
      <h3>At the end of each chapter</h3>
      <p>You will receive a relic, a fruit of the Spirit, and one honest reflection question. There are no wrong answers — only different ones.</p>
      <h3>Go deeper into the real Bible</h3>
      <p>At the end of every chapter there is a <strong>Go deeper</strong> card: the exact passage, one detail to look for, and one honest question. Open the scroll any time to read the real verse, Corin’s historical note and the timeline. The finale collects all ten passages into a reading list you can tap.</p>
      <h3>What you achieve by finishing</h3>
      <p>You will have witnessed all ten biblical stories without changing their outcome, grown Courage, Wisdom, Compassion and Faith, gathered up to 9 fruits, 10 relics and 9 seals, and practised pausing to pray before choosing. The finale gives you a completion seal and a <strong>Journey Mirror</strong> — your four virtues, four ways of walking, and one biblical person whose story rhymes with yours, their real failure included, plus the passage to read. It is a portrait of the person your choices formed, not a personality type or a score of your worth. What you do with it happens outside the game.</p>
      <p class="tiny muted">Progress saves automatically on your device. No account, no ads, no tracking.</p>
      ` : `
      <p>你是一位<strong>手执书卷的朝圣者</strong>。书卷会带你进入圣经中十个真实的故事——你站在山谷里，坐在船上，在狮子坑外等候。</p>
      <h3>你的选择有什么用</h3>
      <p>它们塑造的是<em>你</em>，从来不是经文。大卫仍然迎战歌利亚；风浪仍然止息。你的选择会增长四种品格——<span class="gold">勇气、智慧、怜悯、信心</span>——并解锁果子、圣物与印记。</p>
      <h3>怎么玩</h3>
      <ul>
        <li><strong>点一下对白框</strong>，读下一句；要决定了，就<strong>滑动选项卡片</strong>。</li>
        <li><strong>互动关卡</strong>让你真正走进故事：甩石、潜过狮子、掌住船舵、一路跑回家。拖动、点按、按住——每章都有一关。</li>
        <li><strong>插画里还藏着东西</strong>。点一下发亮的地方，有额外奖励。</li>
        <li><strong>按住祷告键</strong>（每章一次）：＋1 信心、＋1 引导，还会给你一句诗篇。</li>
        <li><strong>在地图上拖动朝圣者</strong>，挑一章走进去。</li>
        <li><strong>在营地歇脚</strong>：和三位旅人说话，接下三件事，再到营火旁做一次呼吸祷告，能得「引导」。</li>
        <li><strong>沉浸／无提示模式默认开启。</strong>提示圆圈、品格门槛、奖励预览一概不显示，故事就是故事。想找回提示，把沉浸模式关掉就行；也可以用「引导」，一次显明一处。</li>
        <li><strong>打开书卷</strong>（右上角）随时查看真正的经文、历史注解与出处。</li>
        <li><strong>环境音乐</strong>是一套活的程序配乐——流动的和弦、竖琴乐句与轻柔鼓点——并随章节切换风声、水声或人群声。可用 ♪ 按钮或在设置中开关。</li>
      </ul>
      <h3>每章结束</h3>
      <p>你会得到一件圣物、一颗圣灵的果子，还有一道要你诚实回答的问题。那题没有标准答案，只有你自己的答案。</p>
      <h3>再走一步：读真正的圣经</h3>
      <p>每章结束都有一张<strong>「再走一步」</strong>卡：准确的经文地址、一个值得留意的细节，以及一道诚实的问题。随时打开书卷，可阅读真正的经文、柯林的历史注解与年代表。终章会把十段经文整理成一份可点击的阅读清单。</p>
      <h3>玩完全程，你会得到什么</h3>
      <p>你会在不改变经文结局的前提下，见证十段圣经故事；培养勇气、智慧、怜悯与信心；最多收集 9 个果子、10 件圣物、9 枚印记；并练习「先祷告，再选择」。终章会给你一枚完成印记和一面<strong>「旅程之镜」</strong>——四种品格、四种走路方式，以及一位与你相似的圣经人物（包括他真实的失败）和一段你可以去读的经文。这是「你的选择塑造了怎样的人」的画像，不是人格类型，也不是衡量你价值的分数。真正的后续，发生在游戏之外。</p>
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
    <p class="tiny muted center" style="margin-top:14px">${tx("Prayer is available once in each chapter. It grows Faith and stores 1 Guidance. Faith can open golden choices later; Guidance can reveal hidden hints in Clean Mode or open a door you have not yet earned.", "每章可以祷告一次。它会增长信心并储存 1 点「引导」。信心能开启后面的金色选项；「引导」能在沉浸模式里显明隐藏的提示，或打开一扇你还没走到的门。")}</p>
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

/* ------------------------------------------------------- camp hub modals */

function breatheInner(ui) {
  const b = ui.breathe || { step: 0, cycle: 0 };
  return `<div class="center"><div class="eyebrow">${tx("A breathing prayer", "呼吸祷告")}</div>
    <h2>${tx("Be still, and know", "你们要休息，要知道")}</h2></div>
    <p class="tiny muted center" style="margin:8px 0 0">${tx("Tap the circle slowly. Inhale · hold · exhale. Three times.", "慢慢点击圆圈。吸气 · 停住 · 呼气。共三次。")}</p>
    <button class="breathe-ring s${b.step}" data-action="breath-tap" aria-label="${tx("Breathe", "呼吸")}">
      <span class="breathe-core"></span>
      <span class="breathe-word">${esc(breathLabel(b.step))}</span>
    </button>
    <div class="breathe-dots">${[0, 1, 2].map((i) => `<i class="${i < b.cycle ? "on" : ""}"></i>`).join("")}</div>
    <p class="small serif center gold" style="margin:12px 0 0">${isZh() ? "「你们要休息，要知道我是神！」" : "“Be still, and know that I am God.”"}</p>
    <p class="tiny muted center" style="margin:4px 0 0">— ${tx("Psalm 46:10 (KJV)", "诗篇 46:10（和合本）")}</p>
    <p class="tiny muted center" style="margin:12px 0 0">${tx("Finish the three breaths for +2 Guidance and +1 Faith, once each camp day.", "做完三次呼吸，可得 +2 引导、+1 信心；每天在营地领一次。")}</p>
    <button class="btn btn-ghost btn-sm" style="margin-top:10px" data-action="close-modal">${tx("Not now", "暂不")}</button>`;
}

function campNpcInner(ui) {
  const n = CAMP_NPCS.find((x) => x.id === ui.modal.id) || CAMP_NPCS[0];
  const name = isZh() ? n.nameZh : n.nameEn;
  const role = isZh() ? n.roleZh : n.roleEn;
  const lines = isZh() ? n.linesZh : n.linesEn;
  return `<div class="center"><div style="font-size:2.4rem">${n.glyph}</div>
    <div class="eyebrow">${esc(role)}</div><h2>${esc(name)}</h2>
    <p class="tiny muted" style="margin:6px 0 0">${tx("One of this camp's own travellers — not a figure from the Bible.", "营地里的旅人，不是圣经中的人物。")}</p></div>
    <div class="npc-lines">${lines.map((l, i) => `<p class="small serif"><span class="gold">${i + 1}.</span> ${esc(l)}</p>`).join("")}</div>
    <button class="btn btn-primary" style="margin-top:10px" data-action="close-modal">${tx("Thank you", "谢谢你")}</button>`;
}

function guidanceInner(ui) {
  const s = ui.state;
  const a = adventure(s);
  return `<div class="center"><div style="font-size:2.4rem">✟</div>
    <div class="eyebrow">${tx("Three questions", "三个问题")}</div><h2>${tx("What the game is showing you", "游戏想告诉你什么")}</h2></div>
    <div class="prose small" style="margin-top:12px">
      <h3>${tx("1 · What is the prayer button for?", "1 · 祷告按钮是做什么的？")}</h3>
      <p>${tx("It is a pause, not a purchase. Holding it once per chapter grows Faith by 1, adds 4 XP and stores 1 Guidance. Breathing at the campfire adds 2 more Guidance once per day. Faith opens golden choices; Guidance lets you reveal hidden hints in Clean Mode or step through a virtue gate you have not reached yet.", "它是一次停顿，不是一次购买。每章按住一次，会增长 1 点信心、4 点经验，并储存 1 点「引导」。每天在营火旁呼吸祷告，可再得 2 点。信心用来开启金色选项；「引导」可以在沉浸模式中显明隐藏提示，或让你跨过还没走到的品格门槛。")}</p>
      <h3>${tx("2 · What are the circling tips around options?", "2 · 选项旁边那些圆圈是什么？")}</h3>
      <p>${tx("They are hints: a numbered circle is simply the option order; a gold circle marks a faith-shaped choice; a teal tag previews the virtue or reward; a dashed circle with a lock shows a virtue gate you have not met yet. The animation on the prayer button is a hold-to-fill ring — it tells you to press and hold, not tap.", "它们是提示：数字圆圈只是选项序号；金色圆圈标示「信心」相关的选项；青色标签预览品格或奖励；带锁的虚线圆圈表示你尚未达到的品格门槛。祷告按钮上的动画是「按住填充」环——它在告诉你：请按住，而不是轻点。")}</p>
      <h3>${tx("3 · What happens if the tips are removed?", "3 · 如果去掉提示，会发生什么？")}</h3>
      <p>${tx("Nothing breaks — and that is now the default. Immersive / no-tips mode is ON from the start: hints, tags, gates and the little advice card are all hidden. Locked choices still exist but say only “Some doors open later”. You can spend 1 Guidance to reveal one page of hints, or 2 to open a locked choice, and you can switch tips back on in Settings. Scripture's outcome is identical either way — David still faces Goliath, the storm still stops.", "什么都不会坏——这已经是默认设置。「沉浸／无提示模式」从一开始就开启：提示、标签、门槛和那张小建议卡都被隐藏。被锁的选项依然存在，但只写着「有些门要到后来才开」。你可以花 1 点引导显明一页提示，或花 2 点开启一个被锁的选项；也可以在设置里重新打开提示。两种模式下，经文的结局完全一样——大卫仍然迎战歌利亚，风浪仍然止息。")}</p>
      <h3>${tx("And at the very end?", "那到了最后呢？")}</h3>
      <p>${tx("After ten chapters you reach a finale with a completion seal. It gives no hints and no score: it lists what you completed — ten stories witnessed, four virtues grown, up to 9 fruits, 10 relics and 9 seals gathered, prayers and reflections — then gives one honest paragraph about the person your choices formed, and a verse. You finish as a witness, not a winner: the achievement is the character you carry out, and the road continues outside the game.", "走完十章后，你会带着一枚完成印记来到终章。它不给提示，也不给分数：它列出你完成的事——在场见证十段故事、培养四种品格、最多收集 9 个果子、10 件圣物、9 枚印记、以及你的祷告与反思——然后给出一段关于「你的选择塑造了怎样的人」的诚实文字，和一节经文。走完的时候，你是个见证人，不是个赢家；真正的成就，是你带走的品格。这条路，在游戏之外继续。")}</p>
      <h3>${tx("4 · Is the ending a personality test?", "4 · 结局是人格测验吗？")}</h3>
      <p>${tx("No — and deliberately so. It is not MBTI, not a psychological assessment and not a prophecy. The “Journey Mirror” simply reports what you DID: the four virtues your choices grew, and four ways of walking recorded from your behaviour (stepping forward, noticing, staying, waiting). It then holds that beside a person God chose to write about — including their real failure — and sends you to the passage. Paul says these stories were “written for our learning” (Romans 15:4) and are “ensamples” for us (1 Corinthians 10:11); James compares the word to a mirror (James 1:23). Only the LORD looks on the heart (1 Samuel 16:7), so the game refuses to label you.", "不是——而且这是刻意的选择。它不是 MBTI，不是心理测评，也不是预言。「旅程之镜」只报告你做过的事：你的选择培养出哪四种品格，以及从你的行为记录下来的四种走路方式（迈步、观察、留下、等候）。然后把这些摆在神选择写下来的一个人旁边——包括他真实的失败——并送你去读那段经文。保罗说这些事「都是为教训我们写的」（罗马书 15:4），是「我们的鉴戒」（哥林多前书 10:11）；雅各把道比作镜子（雅各书 1:23）。唯有耶和华看内心（撒母耳记上 16:7），所以游戏拒绝给你贴标签。")}</p>
    </div>
    <p class="tiny muted center" style="margin:12px 0 0">${tx("You currently hold", "你目前拥有")} <strong class="gold">${a.guidance || 0}</strong> ${tx("Guidance.", "点引导。")}</p>
    <button class="btn btn-primary" style="margin-top:10px" data-action="close-modal">${tx("I understand", "我明白了")}</button>`;
}

function questRewardInner(ui) {
  const q = ui.modal.quest;
  return `<div class="center"><div style="font-size:2.4rem">${q.glyph}</div>
    <div class="eyebrow">${tx("Quest complete", "任务完成")}</div><h2>${esc(isZh() ? q.titleZh : q.titleEn)}</h2></div>
    <div class="reward-row" style="margin-top:16px">
      <div class="reward"><span class="ico">✟</span><strong>+${q.reward.guidance} ${tx("Guidance", "引导")}</strong><small>${tx("For the road", "为前路预备")}</small></div>
      ${Object.entries(q.reward).filter(([k]) => k !== "guidance").map(([k, v]) => `<div class="reward"><span class="ico">✦</span><strong>+${v} ${esc(STATS[k]?.name || k)}</strong><small>${tx("Virtue", "品格")}</small></div>`).join("")}
    </div>
    <button class="btn btn-primary" style="margin-top:14px" data-action="close-modal">${tx("Receive", "收下")}</button>`;
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
    case "breathe": return wrap(breatheInner(ui));
    case "camp-npc": return wrap(campNpcInner(ui));
    case "guidance": return wrap(guidanceInner(ui));
    case "quest-reward": return wrap(questRewardInner(ui));
    default: return "";
  }
}
