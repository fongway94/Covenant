import { esc, icon, initial } from "../core/util.js";
import { CHAPTERS } from "../data/chapters.js";
import { STATS, STAT_KEYS, STAT_MAX, FRUITS, RELICS, SEALS, CALLINGS, countDone } from "../data/compendium.js";
import { xpNeeded, isUnlocked, isCompleted } from "../core/state.js";

export function tabsHtml(ui, active) {
  const items = [
    { view: "map", label: "Map", ico: "map" },
    { view: "journal", label: "Journal", ico: "book" },
    { view: "character", label: "Pilgrim", ico: "person" },
    { view: "about", label: "Guide", ico: "compass" }
  ];
  return `<nav class="tabbar">${items.map((t) => `<button class="tab ${active === t.view ? "active" : ""}" data-action="go" data-view="${t.view}">${icon(t.ico)}<span>${t.label}</span></button>`).join("")}</nav>`;
}

function hudHtml(ui) {
  const s = ui.state;
  const need = xpNeeded(s.level);
  const pct = Math.min(100, Math.round((s.xp / need) * 100));
  return `<header class="hud">
    <div class="avatar">${esc(initial(s.name))}</div>
    <div class="hud-main">
      <div class="hud-row">
        <span class="hud-name">${esc(s.name)}</span>
        <span class="hud-lv">Level ${s.level}</span>
      </div>
      <div class="xp-track"><i class="xp-fill" style="width:${pct}%"></i></div>
      <div class="tiny muted" style="margin-top:3px">${esc(CALLINGS.find((c) => c.id === s.calling)?.name)} · ${countDone(s)}/${CHAPTERS.length} chapters</div>
    </div>
    <div class="hud-side">
      <button class="icon-btn" data-action="howto" aria-label="How to play">${icon("help", 16)}</button>
    </div>
  </header>`;
}

export function mapHtml(ui) {
  const s = ui.state;
  const currentId = CHAPTERS.find((c) => isUnlocked(s, c) && !isCompleted(s, c.id))?.id;
  const points = [[26, 1], ...CHAPTERS.map((c) => [c.pos[0], c.pos[1] * 1.5]), [68, 149]]
    .map(([x, y]) => `${x},${y}`).join(" ");

  const nodes = CHAPTERS.map((ch) => {
    const unlocked = isUnlocked(s, ch);
    const done = isCompleted(s, ch.id);
    const current = currentId === ch.id && !done;
    const cls = !unlocked ? "locked" : done ? "done" : current ? "current" : "";
    return `<button class="map-node ${cls}" style="left:${ch.pos[0]}%;top:${ch.pos[1]}%" data-action="chapter-detail" data-id="${ch.id}" aria-label="Chapter ${ch.num}: ${esc(ch.title)}">
      <div class="medal">
        <span class="roman">${done ? icon("check", 20) : !unlocked ? icon("lock", 18) : ch.roman}</span>
        ${done ? '<span class="status">✓</span>' : ""}
      </div>
      <div class="map-label">
        <strong>${esc(ch.title)}</strong>
        <small>${done ? "Completed" : !unlocked ? "Locked" : esc(ch.theme)}</small>
      </div>
    </button>`;
  }).join("");

  return `<div class="screen map-screen">
    ${hudHtml(ui)}
    <div class="scroll map-scroll">
      <div class="map-canvas">
        <svg class="map-path" viewBox="0 0 100 150" preserveAspectRatio="none"><polyline points="${points}"/></svg>
        ${nodes}
        <div class="map-quote">“Thy word is a lamp unto my feet, and a light unto my path.”<br><span style="font-size:.72rem">Psalm 119:105</span></div>
      </div>
    </div>
    ${tabsHtml(ui, "map")}
  </div>`;
}

export function journalHtml(ui) {
  const s = ui.state;
  const tab = ui.journalTab || "scrolls";
  const tabs = [
    { id: "scrolls", label: "Scrolls" },
    { id: "relics", label: "Relics" },
    { id: "fruits", label: "Fruits" },
    { id: "seals", label: "Seals" }
  ];
  let body = "";

  if (tab === "scrolls") {
    body = `<p class="small muted" style="margin:0 0 12px">The passage behind each story. Complete a chapter to keep its scroll.</p>
      <div class="codex-list">${CHAPTERS.map((ch) => {
        const got = isCompleted(s, ch.id);
        return `<button class="codex-item ${got ? "" : "locked"}" data-action="open-item" data-kind="verse" data-id="${ch.id}">
          <div class="med">${got ? "✧" : icon("lock", 18)}</div>
          <div class="txt"><strong>${esc(ch.title)}</strong><small>${got ? esc(ch.scroll.ref) : "Not yet read · " + esc(ch.ref)}</small></div>
          ${icon("forward", 16)}
        </button>`;
      }).join("")}</div>`;
  } else if (tab === "relics") {
    body = `<p class="small muted" style="margin:0 0 12px">Something you carried out of each story. ${s.relics.length}/${Object.keys(RELICS).length} found.</p>
      <div class="codex-list">${Object.entries(RELICS).map(([id, r]) => {
        const got = s.relics.includes(id);
        return `<button class="codex-item ${got ? "" : "locked"}" data-action="open-item" data-kind="relic" data-id="${id}">
          <div class="med">${got ? r.glyph : icon("lock", 18)}</div>
          <div class="txt"><strong>${got ? esc(r.name) : "An unknown relic"}</strong><small>${got ? esc(r.ref) + " · " + esc(r.chapter) : "Finish its chapter"}</small></div>
          ${icon("forward", 16)}
        </button>`;
      }).join("")}</div>`;
  } else if (tab === "fruits") {
    body = `<p class="small muted" style="margin:0 0 12px">Nine virtues from Galatians 5:22–23. Gather them all to earn the <em>Full Harvest</em> seal. ${s.fruits.length}/${FRUITS.length} gathered.</p>
      <div class="fruit-grid">${FRUITS.map((f) => {
        const got = s.fruits.includes(f.id);
        return `<button class="fruit ${got ? "got" : ""}" data-action="open-item" data-kind="fruit" data-id="${f.id}">
          <span class="ico">${f.glyph}</span><span>${esc(f.name)}</span>
        </button>`;
      }).join("")}</div>
      <div class="card-quiet" style="margin-top:14px"><p class="verse small" style="margin:0">“But the fruit of the Spirit is love, joy, peace, longsuffering, gentleness, goodness, faith, meekness, temperance: against such there is no law.”</p><p class="tiny gold" style="margin:6px 0 0">— Galatians 5:22–23 (KJV)</p></div>`;
  } else {
    body = `<p class="small muted" style="margin:0 0 12px">Seals are earned by the way you walk the road. ${s.seals.length}/${SEALS.length} earned.</p>
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
    <div class="page-head"><div class="eyebrow">Your journal</div><h2>Things you have gathered</h2></div>
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
    <div class="page-head"><div class="eyebrow">Character sheet</div><h2>The pilgrim</h2></div>
    <div class="scroll pad safe-bottom">
      <div class="card">
        <div class="char-hero">
          <div class="avatar">${esc(initial(s.name))}</div>
          <div><h3>${esc(s.name)}</h3><p class="small muted" style="margin:2px 0 0">${esc(calling.name)} · Level ${s.level}</p></div>
        </div>
        <div class="divider"></div>
        <p class="verse small" style="margin:0">“${esc(calling.gift)}”</p>
      </div>

      <div class="card" style="margin-top:12px">
        <div class="eyebrow" style="margin-bottom:6px">Virtues</div>
        ${statRows}
        <p class="tiny muted" style="margin:10px 0 0">Golden choices in a story may ask for a higher virtue. Praying once per chapter grows Faith.</p>
      </div>

      <div class="card" style="margin-top:12px">
        <div class="eyebrow" style="margin-bottom:8px">Journey progress</div>
        <div class="reward-row">
          <div class="reward"><span class="ico">✧</span><strong>${done} / ${CHAPTERS.length}</strong><small>Chapters complete</small></div>
          <div class="reward"><span class="ico">✺</span><strong>${s.fruits.length} / ${FRUITS.length}</strong><small>Fruits gathered</small></div>
          <div class="reward"><span class="ico">◍</span><strong>${s.relics.length} / ${Object.keys(RELICS).length}</strong><small>Relics found</small></div>
          <div class="reward"><span class="ico">✦</span><strong>${s.xp} / ${need} XP</strong><small>To level ${s.level + 1}</small></div>
        </div>
      </div>

      <div class="card" style="margin-top:12px">
        <div class="eyebrow" style="margin-bottom:6px">Settings</div>
        <div class="setting-row">
          <div class="lbl">Sound effects<small>Short tones for choices and rewards</small></div>
          <button class="toggle ${s.settings.sound ? "on" : ""}" data-action="toggle-sound" aria-label="Toggle sound"><i></i></button>
        </div>
        <div class="setting-row">
          <div class="lbl">Text size<small>For reading comfort</small></div>
          <div class="seg">
            <button class="${s.settings.textSize === "small" ? "active" : ""}" data-action="set-text" data-size="small">A</button>
            <button class="${s.settings.textSize === "normal" ? "active" : ""}" data-action="set-text" data-size="normal">A</button>
            <button class="${s.settings.textSize === "large" ? "active" : ""}" data-action="set-text" data-size="large">A</button>
          </div>
        </div>
        <div class="setting-row">
          <div class="lbl">Preview all chapters<small>Opens the whole map — useful for demos</small></div>
          <button class="toggle ${s.settings.showAll ? "on" : ""}" data-action="toggle-demo" aria-label="Toggle all chapters"><i></i></button>
        </div>
        <div class="setting-row">
          <div class="lbl">How to play<small>A two-minute guide</small></div>
          <button class="btn btn-ghost btn-sm" data-action="howto">Read</button>
        </div>
      </div>

      <button class="btn btn-danger btn-sm" style="margin-top:14px" data-action="ask-reset">${icon("refresh", 15)} Erase this journey</button>
      <p class="tiny muted center" style="margin-top:16px">Covenant v0.1 · Everything is saved only on this device.</p>
    </div>
    ${tabsHtml(ui, "character")}
  </div>`;
}
