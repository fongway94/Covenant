import { esc, icon, initial } from "../core/util.js";
import { CHAPTERS } from "../data/chapters.js";
import { STATS, STAT_KEYS, STAT_MAX, FRUITS, RELICS, SEALS, CALLINGS, countDone } from "../data/compendium.js";
import { xpNeeded, isUnlocked, isCompleted } from "../core/state.js";
import { tx, isZh } from "../core/i18n.js";
import { langButton, musicButton } from "./home.js";
import { isMusicEnabled } from "../core/audio.js";

export function tabsHtml(ui, active) {
  const items = [
    { view: "camp", label: tx("Camp", "营地"), ico: "heart" },
    { view: "map", label: tx("Map", "地图"), ico: "map" },
    { view: "journal", label: tx("Journal", "日志"), ico: "book" },
    { view: "character", label: tx("Pilgrim", "朝圣者"), ico: "person" },
    { view: "about", label: tx("Guide", "指引"), ico: "compass" }
  ];
  return `<nav class="tabbar">${items.map((t) => `<button class="tab ${active === t.view ? "active" : ""}" data-action="go" data-view="${t.view}">${icon(t.ico)}<span>${t.label}</span></button>`).join("")}</nav>`;
}

export function hudHtml(ui) {
  const s = ui.state;
  const need = xpNeeded(s.level);
  const pct = Math.min(100, Math.round((s.xp / need) * 100));
  return `<header class="hud">
    <div class="avatar">${esc(initial(s.name))}</div>
    <div class="hud-main">
      <div class="hud-row">
        <span class="hud-name">${esc(s.name)}</span>
        <span class="hud-lv">${tx(`Level ${s.level}`, `等级 ${s.level}`)}</span>
      </div>
      <div class="xp-track"><i class="xp-fill" style="width:${pct}%"></i></div>
      <div class="tiny muted" style="margin-top:3px">${esc(CALLINGS.find((c) => c.id === s.calling)?.name)} · ${countDone(s)}/${CHAPTERS.length} ${tx("chapters", "章")}</div>
    </div>
    <div class="hud-side">
      ${musicButton()}
      ${langButton()}
      <button class="icon-btn" data-action="howto" aria-label="${tx("How to play", "玩法说明")}">${icon("help", 16)}</button>
    </div>
  </header>`;
}

export function mapHtml(ui) {
  const s = ui.state;
  const currentId = CHAPTERS.find((c) => isUnlocked(s, c) && !isCompleted(s, c.id))?.id;
  const points = [[26, 1], ...CHAPTERS.map((c) => [c.pos[0], c.pos[1] * 1.5]), [68, 149]]
    .map(([x, y]) => `${x},${y}`).join(" ");
  const current = CHAPTERS.find((c) => c.id === currentId) || CHAPTERS[0];
  if (!ui.mapPos) ui.mapPos = { x: current.pos[0], y: Math.max(2, current.pos[1] - 6) };

  const nodes = CHAPTERS.map((ch) => {
    const unlocked = isUnlocked(s, ch);
    const done = isCompleted(s, ch.id);
    const cur = currentId === ch.id && !done;
    const cls = !unlocked ? "locked" : done ? "done" : cur ? "current" : "";
    return `<button class="map-node ${cls}" style="left:${ch.pos[0]}%;top:${ch.pos[1]}%" data-action="chapter-detail" data-id="${ch.id}" aria-label="${tx(`Chapter ${ch.num}: ${ch.title}`, `第 ${ch.num} 章：${ch.title}`)}">
      <div class="medal">
        <span class="roman">${done ? icon("check", 20) : !unlocked ? icon("lock", 18) : ch.roman}</span>
        ${done ? '<span class="status">✓</span>' : ""}
      </div>
      <div class="map-label">
        <strong>${esc(ch.title)}</strong>
        <small>${done ? tx("Completed", "已完成") : !unlocked ? tx("Locked", "未解锁") : esc(ch.theme)}</small>
      </div>
    </button>`;
  }).join("");

  return `<div class="screen map-screen">
    ${hudHtml(ui)}
    <div class="scroll map-scroll">
      <div class="map-canvas">
        <svg class="map-path" viewBox="0 0 100 150" preserveAspectRatio="none"><polyline points="${points}"/></svg>
        ${nodes}
        <div class="map-token" style="left:${ui.mapPos.x}%;top:${ui.mapPos.y}%" data-x="${ui.mapPos.x}" title="${tx("Drag your pilgrim along the path", "沿路拖动你的朝圣者")}"><span>✟</span></div>
        <div class="map-token-hint">${tx("Walk the road", "拖动朝圣者走这条路")}</div>
        <div class="map-quote">${isZh() ? "「你的话是我脚前的灯，是我路上的光。」" : "“Thy word is a lamp unto my feet, and a light unto my path.”"}<br><span style="font-size:.72rem">${tx("Psalm 119:105", "诗篇 119:105")}</span></div>
      </div>
    </div>
    ${tabsHtml(ui, "map")}
  </div>`;
}

export function journalHtml(ui) {
  const s = ui.state;
  const tab = ui.journalTab || "scrolls";
  const tabs = [
    { id: "scrolls", label: tx("Scrolls", "书卷") },
    { id: "relics", label: tx("Relics", "圣物") },
    { id: "fruits", label: tx("Fruits", "果子") },
    { id: "seals", label: tx("Seals", "印记") }
  ];
  let body = "";

  if (tab === "scrolls") {
    body = `<p class="small muted" style="margin:0 0 12px">${tx("The passage behind each story. Complete a chapter to keep its scroll.", "每个故事背后的经文。完成章节即可收藏该书卷。")}</p>
      <div class="codex-list">${CHAPTERS.map((ch) => {
        const got = isCompleted(s, ch.id);
        return `<button class="codex-item ${got ? "" : "locked"}" data-action="open-item" data-kind="verse" data-id="${ch.id}">
          <div class="med">${got ? "✧" : icon("lock", 18)}</div>
          <div class="txt"><strong>${esc(ch.title)}</strong><small>${got ? esc(ch.scroll.ref) : tx("Not yet read · ", "尚未阅读 · ") + esc(ch.ref)}</small></div>
          ${icon("forward", 16)}
        </button>`;
      }).join("")}</div>`;
  } else if (tab === "relics") {
    body = `<p class="small muted" style="margin:0 0 12px">${tx("Something you carried out of each story.", "你从每个故事里带出来的东西。")} ${s.relics.length}/${Object.keys(RELICS).length} ${tx("found.", "件已找到。")}</p>
      <div class="codex-list">${Object.entries(RELICS).map(([id, r]) => {
        const got = s.relics.includes(id);
        return `<button class="codex-item ${got ? "" : "locked"}" data-action="open-item" data-kind="relic" data-id="${id}">
          <div class="med">${got ? r.glyph : icon("lock", 18)}</div>
          <div class="txt"><strong>${got ? esc(r.name) : tx("An unknown relic", "一件未知的圣物")}</strong><small>${got ? esc(r.ref) + " · " + esc(r.chapter) : tx("Finish its chapter", "完成对应章节")}</small></div>
          ${icon("forward", 16)}
        </button>`;
      }).join("")}</div>`;
  } else if (tab === "fruits") {
    body = `<p class="small muted" style="margin:0 0 12px">${tx("Nine virtues from Galatians 5:22–23. Gather them all to earn the", "加拉太书 5:22–23 的九种品格。全部收集可获得")} <em>${tx("Full Harvest", "丰收")}</em> ${tx("seal.", "印记。")} ${s.fruits.length}/${FRUITS.length} ${tx("gathered.", "已收集。")}</p>
      <div class="fruit-grid">${FRUITS.map((f) => {
        const got = s.fruits.includes(f.id);
        return `<button class="fruit ${got ? "got" : ""}" data-action="open-item" data-kind="fruit" data-id="${f.id}">
          <span class="ico">${f.glyph}</span><span>${esc(f.name)}</span>
        </button>`;
      }).join("")}</div>
      <div class="card-quiet" style="margin-top:14px"><p class="verse small" style="margin:0">${isZh() ? "「圣灵所结的果子，就是仁爱、喜乐、和平、忍耐、恩慈、良善、信实、温柔、节制；这样的事，没有律法禁止。」" : "“But the fruit of the Spirit is love, joy, peace, longsuffering, gentleness, goodness, faith, meekness, temperance: against such there is no law.”"}</p><p class="tiny gold" style="margin:6px 0 0">— ${tx("Galatians 5:22–23 (KJV)", "加拉太书 5:22–23（和合本）")}</p></div>`;
  } else {
    body = `<p class="small muted" style="margin:0 0 12px">${tx("Seals are earned by the way you walk the road.", "印记不是发下来的奖励，是你一路上走出来的。")} ${s.seals.length}/${SEALS.length} ${tx("earned.", "枚已获得。")}</p>
      <div class="codex-list">${SEALS.map((seal) => {
        const got = s.seals.includes(seal.id);
        return `<button class="codex-item ${got ? "" : "locked"}" data-action="open-item" data-kind="seal" data-id="${seal.id}">
          <div class="med">${got ? seal.glyph : icon("lock", 18)}</div>
          <div class="txt"><strong>${esc(seal.name)}</strong><small>${esc(seal.desc)}</small></div>
          ${got ? icon("check", 16) : icon("forward", 16)}
        </button>`;
      }).join("")}</div>`;
  }

  return `<div class="screen">
    ${hudHtml(ui)}
    <div class="page-head"><div class="eyebrow">${tx("Your journal", "你的日志")}</div><h2>${tx("Things you have gathered", "你收集的一切")}</h2></div>
    <div class="tabs">${tabs.map((t) => `<button class="${tab === t.id ? "active" : ""}" data-action="journal-tab" data-tab="${t.id}">${t.label}</button>`).join("")}</div>
    <div class="scroll pad safe-bottom">${body}</div>
    ${tabsHtml(ui, "journal")}
  </div>`;
}

export function characterHtml(ui) {
  const s = ui.state;
  const calling = CALLINGS.find((c) => c.id === s.calling) || CALLINGS[0];
  const need = xpNeeded(s.level);
  const done = countDone(s);

  const statRows = STAT_KEYS.map((k) => {
    const st = STATS[k];
    const v = s.stats[k];
    return `<div class="stat-row">
      <div class="name">${st.glyph} ${esc(st.name)}</div>
      <div class="bar"><i style="width:${Math.round((v / STAT_MAX) * 100)}%;background:${st.color}"></i></div>
      <div class="val">${v}<span class="muted" style="font-size:.7rem">/${STAT_MAX}</span></div>
    </div>`;
  }).join("");

  return `<div class="screen">
    ${hudHtml(ui)}
    <div class="page-head"><div class="eyebrow">${tx("Character sheet", "角色卡")}</div><h2>${tx("The pilgrim", "朝圣者")}</h2></div>
    <div class="scroll pad safe-bottom">
      <div class="card">
        <div class="char-hero">
          <div class="avatar">${esc(initial(s.name))}</div>
          <div><h3>${esc(s.name)}</h3><p class="small muted" style="margin:2px 0 0">${esc(calling.name)} · ${tx(`Level ${s.level}`, `等级 ${s.level}`)}</p></div>
        </div>
        <div class="divider"></div>
        <p class="verse small" style="margin:0">“${esc(calling.gift)}”</p>
      </div>

      <div class="card" style="margin-top:12px">
        <div class="eyebrow" style="margin-bottom:6px">${tx("Virtues", "品格")}</div>
        ${statRows}
        <p class="tiny muted" style="margin:10px 0 0">${tx("Golden choices in a story may ask for a higher virtue. Praying once per chapter grows Faith.", "故事中的金色选项需要更高的品格。每章祷告一次可以增长信心。")}</p>
      </div>

      <div class="card" style="margin-top:12px">
        <div class="eyebrow" style="margin-bottom:8px">${tx("Journey progress", "旅程进度")}</div>
        <div class="reward-row">
          <div class="reward"><span class="ico">✧</span><strong>${done} / ${CHAPTERS.length}</strong><small>${tx("Chapters complete", "章节完成")}</small></div>
          <div class="reward"><span class="ico">✺</span><strong>${s.fruits.length} / ${FRUITS.length}</strong><small>${tx("Fruits gathered", "果子已收集")}</small></div>
          <div class="reward"><span class="ico">◍</span><strong>${s.relics.length} / ${Object.keys(RELICS).length}</strong><small>${tx("Relics found", "圣物已找到")}</small></div>
          <div class="reward"><span class="ico">✦</span><strong>${s.xp} / ${need} ${tx("XP", "经验")}</strong><small>${tx(`To level ${s.level + 1}`, `距 ${s.level + 1} 级`)}</small></div>
        </div>
      </div>

      <div class="card" style="margin-top:12px">
        <div class="eyebrow" style="margin-bottom:6px">${tx("Settings", "设置")}</div>
        <div class="setting-row">
          <div class="lbl">${tx("Sound effects", "音效")}<small>${tx("Short tones for choices and rewards", "选择与奖励的简短提示音")}</small></div>
          <button class="toggle ${s.settings.sound ? "on" : ""}" data-action="toggle-sound" aria-label="${tx("Toggle sound", "切换音效")}"><i></i></button>
        </div>
        <div class="setting-row">
          <div class="lbl">${tx("Ambient music", "环境音乐")}<small>${tx("A living procedural score — a low drone, a bowed pad moving through old modal chords, a plucked oud, a reed melody and a soft frame drum — with wind, water or crowd ambience for each chapter", "活的程序配乐——低音持续音、缓缓推移的老调式和弦、拨弦的乌德琴、芦苇笛般的旋律与轻柔的手鼓——每一章还有风声、水声或人群环境音")}</small></div>
          <button class="toggle ${isMusicEnabled() ? "on" : ""}" data-action="toggle-music" aria-label="${tx("Toggle ambient music", "切换环境音乐")}"><i></i></button>
        </div>
        <div class="setting-row">
          <div class="lbl">${tx("Text size", "字号")}<small>${tx("Standard · comfortable · large — this also enlarges the instructions inside a scene", "标准 · 舒适 · 大——游戏里的操作说明也会一起变大")}</small></div>
          <div class="seg">
            <button class="${s.settings.textSize === "small" ? "active" : ""}" data-action="set-text" data-size="small" style="font-size:.9em" aria-label="${tx("Standard", "标准")}">A</button>
            <button class="${s.settings.textSize === "normal" ? "active" : ""}" data-action="set-text" data-size="normal" style="font-size:1.05em" aria-label="${tx("Comfortable", "舒适")}">A</button>
            <button class="${s.settings.textSize === "large" ? "active" : ""}" data-action="set-text" data-size="large" style="font-size:1.42em" aria-label="${tx("Large", "大")}">A</button>
          </div>
        </div>
        <p class="tiny muted" style="margin:-2px 0 10px;font-family:var(--serif)">${tx("“The LORD is my shepherd; I shall not want.” — Psalm 23:1", "「耶和华是我的牧者，我必不至缺乏。」——诗篇 23:1")}</p>
        <div class="setting-row">
          <div class="lbl">${tx("Language", "语言")}<small>${tx("中文 / EN", "中文 / English")}</small></div>
          <button class="btn btn-ghost btn-sm" data-action="toggle-lang">${isZh() ? "English" : "中文"}</button>
        </div>
        <div class="setting-row">
          <div class="lbl">${tx("Preview all chapters", "预览全部章节")}<small>${tx("Opens the whole map — useful for demos", "打开整张地图——适合演示")}</small></div>
          <button class="toggle ${s.settings.showAll ? "on" : ""}" data-action="toggle-demo" aria-label="${tx("Toggle all chapters", "切换全部章节")}"><i></i></button>
        </div>
        <div class="setting-row">
          <div class="lbl">${tx("Immersive / no tips (default)", "沉浸／无提示（默认）")}<small>${tx("On by default: hides the circling hints, virtue gates and reward previews. Switch off to see tips again.", "默认开启：隐藏选项周围的提示圈、品格门槛和奖励预览。关掉就能重新看到提示。")}</small></div>
          <button class="toggle ${s.settings.cleanMode ? "on" : ""}" data-action="toggle-clean" aria-label="${tx("Toggle clean mode", "切换沉浸模式")}"><i></i></button>
        </div>
        <div class="card-quiet" style="margin-top:10px"><p class="tiny muted" style="margin:0">${tx("What prayer is for: pausing grows Faith and stores Guidance. What the circles mean: hints, virtue gates and reward previews. Immersive mode is ON by default, so those circles are hidden — the ending still comes, but it is a mirror rather than a checklist. Turn the toggle off if you want the tips back.", "祷告有什么用：停下来祷告，信心会增长，也会存下「引导」。那些圆圈是什么：提示、品格门槛和奖励预览。沉浸模式默认开启，所以它们都是隐藏的——结局照样会来，只是它更像一面镜子，不像一张待勾的清单。想重新看到提示，把这个开关关掉就好。")}</p></div>
        <div class="setting-row">
          <div class="lbl">${tx("How to play", "玩法说明")}<small>${tx("A two-minute guide", "两分钟看懂玩法")}</small></div>
          <button class="btn btn-ghost btn-sm" data-action="howto">${tx("Read", "阅读")}</button>
        </div>
      </div>

      <button class="btn btn-danger btn-sm" style="margin-top:14px" data-action="ask-reset">${icon("refresh", 15)} ${tx("Erase this journey", "清除这段旅程")}</button>
      <p class="tiny muted center" style="margin-top:16px">${tx("Covenant v0.9.33 · Everything is saved only on this device.", "Covenant v0.9.33 · 所有进度仅保存在本机。")}</p>
    </div>
    ${tabsHtml(ui, "character")}
  </div>`;
}
