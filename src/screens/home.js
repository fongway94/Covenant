import { esc, icon } from "../core/util.js";
import { CALLINGS, STATS } from "../data/compendium.js";
import { tx, isZh } from "../core/i18n.js";

export function langButton() {
  return `<button class="lang-btn" data-action="toggle-lang" aria-label="${tx("Switch to English", "切换为中文")}"><span class="lang-ico">文</span><span>${isZh() ? "EN" : "中"}</span></button>`;
}

export function titleHtml(ui) {
  const hasSave = !!ui.state;
  return `<div class="screen title-screen">
    <div class="title-art" style="background-image:url('assets/art/title.jpg')">
      <div class="sky-glow"></div>
      <div class="starfield"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div>
      <div class="drifting-clouds"></div>
      <div class="title-dust"><i></i><i></i><i></i><i></i><i></i><i></i></div>
    </div>
    <div class="title-lang">${langButton()}</div>
    <div class="title-content">
      <div class="title-mark">
        <div class="cross">✟</div>
        <h1>COVENANT</h1>
        <div class="sub">${tx("Journeys Through the Word", "行走在神话语之中")}</div>
        <p class="tagline">${tx("Step inside the stories that shaped the world.", "走进那些塑造了世界的故事。")}</p>
        ${isZh() ? `<p class="cn-name">圣约 · 圣经故事之旅</p>` : ""}
      </div>
      <div class="title-actions">
        ${hasSave ? `<button class="btn btn-primary" data-action="continue">${icon("play", 16)} ${tx("Continue the journey", "继续旅程")}</button>` : ""}
        <button class="btn ${hasSave ? "btn-ghost" : "btn-primary"}" data-action="new-game">${icon("spark", 16)} ${tx("Begin a new journey", "开始新的旅程")}</button>
        <div class="btn-row">
          <button class="btn btn-ghost" data-action="howto">${icon("help", 16)} ${tx("How to play", "玩法说明")}</button>
          <button class="btn btn-ghost" data-action="go" data-view="about">${icon("scroll", 16)} ${tx("About", "关于")}</button>
        </div>
      </div>
      <div class="title-footer">${tx("An interactive Bible story RPG · prototype v0.1", "互动圣经故事角色扮演游戏 · v0.1 原型")}</div>
    </div>
  </div>`;
}

export function createHtml(ui) {
  const selected = ui.createCall || "shepherd";
  return `<div class="screen create-screen">
    <div class="create-top">
      <div class="eyebrow">${tx("The beginning of the road", "路的起点")}</div>
      <h1 style="font-size:1.9rem;margin-top:6px">${tx("Who is walking?", "是谁在路上？")}</h1>
      <p class="small muted" style="margin-top:8px">${tx("You are a pilgrim carrying a scroll that opens into the stories of Scripture. Your choices will shape the person you become.", "你是一位手执书卷的朝圣者。书卷会把你带进圣经的故事里。你的选择，将塑造你成为怎样的人。")}</p>
      <div class="create-lang">${langButton()}</div>
    </div>
    <div class="scroll pad safe-bottom">
      <div class="field">
        <label for="pilgrim-name">${tx("Your name", "你的名字")}</label>
        <input id="pilgrim-name" type="text" maxlength="22" autocomplete="off" autocapitalize="words" spellcheck="false" placeholder="${tx("Pilgrim", "朝圣者")}" value="${esc(ui.createName || "")}">
      </div>
      <div class="field" style="margin-bottom:10px">
        <label>${tx("Choose a calling", "选择你的呼召")}</label>
        <p class="tiny muted" style="margin:-4px 0 10px">${tx("This is where your virtues begin — you can grow all of them later.", "这是你的品格起点——之后每一项都可以继续成长。")}</p>
      </div>
      <div class="calling-grid">
        ${CALLINGS.map((c) => `<button class="calling ${selected === c.id ? "selected" : ""}" data-action="select-calling" data-calling="${c.id}">
          <span class="glyph">${c.glyph}</span>
          <strong>${esc(c.name)}</strong>
          <small>${esc(c.blurb)}</small>
          <span class="bonus">${Object.entries(c.bonus).map(([k, v]) => `+${v} ${esc(STATS[k]?.name || k)}`).join(" · ")}</span>
        </button>`).join("")}
      </div>
      <div class="card-quiet" style="margin-top:14px">
        <div class="eyebrow" style="margin-bottom:5px">${tx("Your gift", "你的恩赐")}</div>
        <p class="small serif" style="margin:0;color:var(--gold-light)">“${esc(CALLINGS.find((c) => c.id === selected)?.gift)}”</p>
      </div>
      <button class="btn btn-primary" style="margin-top:18px" data-action="start-game">${icon("compass", 18)} ${tx("Begin the journey", "启程")}</button>
      <button class="btn btn-ghost btn-sm" style="margin-top:9px" data-action="go" data-view="title">${tx("Back", "返回")}</button>
    </div>
  </div>`;
}

export function aboutHtml(ui) {
  const en = !isZh();
  return `<div class="screen">
    <div class="page-head" style="display:flex;align-items:center;gap:10px">
      <button class="icon-btn" data-action="go" data-view="title">${icon("back", 17)}</button>
      <div><div class="eyebrow">${tx("About", "关于")}</div><h2>Covenant</h2></div>
      <div style="margin-left:auto">${langButton()}</div>
    </div>
    <div class="scroll pad safe-bottom prose small">
      ${en ? `
      <p class="verse">“Thy word is a lamp unto my feet, and a light unto my path.” <span style="font-style:normal;font-size:.8em;color:var(--muted)">— Psalm 119:105</span></p>
      <p>Covenant is an interactive role-playing game built around real stories from the Bible. Instead of reading <em>about</em> David, Daniel or Esther, you stand beside them — and the choices you make shape your own character: Courage, Wisdom, Compassion and Faith.</p>
      <h3>Why we built it this way</h3>
      <p>A generation that grew up with games does not only want to be told a story; it wants to <strong>be inside it</strong>. Modern Bible translations are more accessible than ever, yet many people have never encountered the narrative arc of Scripture. A well-made game can open that door — especially for teenagers and young adults.</p>
      <h3>How we stay faithful to the text</h3>
      <ul>
        <li>The player is a <strong>witness</strong>, never the hero who rewrites the outcome. David still faces Goliath; the storm still stops.</li>
        <li>Every chapter shows its scripture reference, a historical note from your companion Elias, and the passage behind the story.</li>
        <li>Scripture quotations use the <strong>King James Version</strong> (public domain). Other dialogue is clearly written for the game and is not presented as scripture.</li>
        <li>Reflection questions have no “wrong” answer. This is a game about formation, not a quiz about facts.</li>
      </ul>
      <h3>What is in this prototype</h3>
      <p>Six playable chapters, branching dialogue, four virtues, nine fruits of the Spirit (Galatians 5:22–23), six relics, seven seals, six controllable action scenes, hidden-object moments, offline play, and automatic save to your device.</p>
      <h3>Under the hood</h3>
      <p>Plain HTML, CSS and JavaScript — no build step, no tracking, no ads. It runs in any mobile browser, installs to the home screen as a PWA, and can be packaged for the iOS App Store and Google Play with <code>Capacitor</code>. See <code>docs/MOBILE_DEPLOY.md</code>.</p>
      <h3>For churches &amp; ministries</h3>
      <p>Before publishing, have your content reviewed by your own pastors or theological advisors. Translation choice, denominational distinctives and age-appropriateness are decisions best made by your community. See <code>docs/GAME_DESIGN.md</code> for the content guidelines and a chapter template.</p>
      <div class="divider"></div>
      <p class="tiny muted center">Artwork generated for this project · interface and story text written for Covenant · v0.2 prototype</p>
      ` : `
      <p class="verse">「你的话是我脚前的灯，是我路上的光。」 <span style="font-style:normal;font-size:.8em;color:var(--muted)">— 诗篇 119:105</span></p>
      <p>《Covenant／圣约》是一款以圣经真实故事为核心的互动角色扮演游戏。你不是去阅读<em>关于</em>大卫、但以理或以斯帖的故事，而是站在他们身旁——你的选择会塑造你自己的品格：勇气、智慧、怜悯与信心。</p>
      <h3>为什么这样设计</h3>
      <p>在游戏里长大的一代人，不只想要听一个故事，他们想要<strong>身在故事之中</strong>。现代圣经译本比以往都容易取得，但许多人从未真正读过圣经的故事脉络。一款用心制作的游戏，可以打开这扇门——特别是对青少年和年轻人。</p>
      <h3>我们怎样忠于经文</h3>
      <ul>
        <li>玩家是一位<strong>见证者</strong>，绝不是改写结局的英雄。大卫仍然迎战歌利亚；风浪仍然止息。</li>
        <li>每一章都会标明经文出处、同伴以利亚斯的历史注解，以及故事背后的经文。</li>
        <li>经文引用采用<strong>英王钦定本／中文和合本</strong>（公有领域）。其余对白是本游戏创作内容，不代表经文。</li>
        <li>反思题没有「标准答案」。这是一场关于生命塑造的游戏，不是事实测验。</li>
      </ul>
      <h3>这个原型里有什么</h3>
      <p>六个可玩章节、分支对话、四种品格、圣灵九果（加拉太书 5:22–23）、六件圣物、七枚印记、六个可操控的互动关卡、隐藏物品环节、离线游玩，以及自动保存在本机。</p>
      <h3>技术实现</h3>
      <p>纯 HTML、CSS 与 JavaScript——无需编译，没有追踪，没有广告。它可在任何手机浏览器中运行，可作为 PWA 安装到主屏幕，也可用 <code>Capacitor</code> 打包上架 iOS App Store 与 Google Play。详见 <code>docs/MOBILE_DEPLOY.md</code>。</p>
      <h3>给教会与事工团队</h3>
      <p>正式发布前，请让你们的牧者或神学顾问审阅内容。译本选择、宗派特色与适龄程度，最好由你们的群体决定。参见 <code>docs/GAME_DESIGN.md</code> 中的内容规范与章节模板。</p>
      <div class="divider"></div>
      <p class="tiny muted center">插画为本项目生成 · 界面与故事文本为 Covenant 创作 · v0.2 原型</p>
      `}
      <button class="btn btn-ghost btn-sm" style="margin-top:14px" data-action="go" data-view="title">${tx("Back to the title", "返回首页")}</button>
    </div>
  </div>`;
}
