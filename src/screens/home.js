import { esc, icon } from "../core/util.js";
import { CALLINGS } from "../data/compendium.js";

export function titleHtml(ui) {
  const hasSave = !!ui.state;
  return `<div class="screen title-screen">
    <div class="title-art" style="background-image:url('assets/art/title.jpg')"></div>
    <div class="title-content">
      <div class="title-mark">
        <div class="cross">✟</div>
        <h1>COVENANT</h1>
        <div class="sub">Journeys Through the Word</div>
        <p class="tagline">Step inside the stories that shaped the world.</p>
      </div>
      <div class="title-actions">
        ${hasSave ? `<button class="btn btn-primary" data-action="continue">${icon("play", 16)} Continue the journey</button>` : ""}
        <button class="btn ${hasSave ? "btn-ghost" : "btn-primary"}" data-action="new-game">${icon("spark", 16)} Begin a new journey</button>
        <div class="btn-row">
          <button class="btn btn-ghost" data-action="howto">${icon("help", 16)} How to play</button>
          <button class="btn btn-ghost" data-action="go" data-view="about">${icon("scroll", 16)} About</button>
        </div>
      </div>
      <div class="title-footer">An interactive Bible story RPG · prototype v0.1</div>
    </div>
  </div>`;
}

export function createHtml(ui) {
  const selected = ui.createCall || "shepherd";
  return `<div class="screen create-screen">
    <div class="create-top">
      <div class="eyebrow">The beginning of the road</div>
      <h1 style="font-size:1.9rem;margin-top:6px">Who is walking?</h1>
      <p class="small muted" style="margin-top:8px">You are a pilgrim carrying a scroll that opens into the stories of Scripture. Your choices will shape the person you become.</p>
    </div>
    <div class="scroll pad safe-bottom">
      <div class="field">
        <label for="pilgrim-name">Your name</label>
        <input id="pilgrim-name" type="text" maxlength="22" autocomplete="off" autocapitalize="words" spellcheck="false" placeholder="Pilgrim" value="${esc(ui.createName || "")}">
      </div>
      <div class="field" style="margin-bottom:10px">
        <label>Choose a calling</label>
        <p class="tiny muted" style="margin:-4px 0 10px">This is where your virtues begin — you can grow all of them later.</p>
      </div>
      <div class="calling-grid">
        ${CALLINGS.map((c) => `<button class="calling ${selected === c.id ? "selected" : ""}" data-action="select-calling" data-calling="${c.id}">
          <span class="glyph">${c.glyph}</span>
          <strong>${esc(c.name)}</strong>
          <small>${esc(c.blurb)}</small>
          <span class="bonus">${Object.entries(c.bonus).map(([k, v]) => `+${v} ${k}`).join(" · ")}</span>
        </button>`).join("")}
      </div>
      <div class="card-quiet" style="margin-top:14px">
        <div class="eyebrow" style="margin-bottom:5px">Your gift</div>
        <p class="small serif" style="margin:0;color:var(--gold-light)">“${esc(CALLINGS.find((c) => c.id === selected)?.gift)}”</p>
      </div>
      <button class="btn btn-primary" style="margin-top:18px" data-action="start-game">${icon("compass", 18)} Begin the journey</button>
      <button class="btn btn-ghost btn-sm" style="margin-top:9px" data-action="go" data-view="title">Back</button>
    </div>
  </div>`;
}

export function aboutHtml(ui) {
  return `<div class="screen">
    <div class="page-head" style="display:flex;align-items:center;gap:10px">
      <button class="icon-btn" data-action="go" data-view="title">${icon("back", 17)}</button>
      <div><div class="eyebrow">About</div><h2>Covenant</h2></div>
    </div>
    <div class="scroll pad safe-bottom prose small">
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
      <p>Six playable chapters, branching dialogue, four virtues, nine fruits of the Spirit (Galatians 5:22–23), six relics, seven seals, two timing mini-games, offline play, and automatic save to your device.</p>

      <h3>Under the hood</h3>
      <p>Plain HTML, CSS and JavaScript — no build step, no tracking, no ads. It runs in any mobile browser, installs to the home screen as a PWA, and can be packaged for the iOS App Store and Google Play with <code>Capacitor</code>. See <code>docs/MOBILE_DEPLOY.md</code>.</p>

      <h3>For churches &amp; ministries</h3>
      <p>Before publishing, have your content reviewed by your own pastors or theological advisors. Translation choice, denominational distinctives and age-appropriateness are decisions best made by your community. See <code>docs/GAME_DESIGN.md</code> for the content guidelines and a chapter template.</p>

      <div class="divider"></div>
      <p class="tiny muted center">Artwork generated for this project · interface and story text written for Covenant · v0.1 prototype</p>
      <button class="btn btn-ghost btn-sm" style="margin-top:14px" data-action="go" data-view="title">Back to the title</button>
    </div>
  </div>`;
}
