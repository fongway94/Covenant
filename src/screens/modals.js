import { esc, icon } from "../core/util.js";
import { FRUITS, RELICS, SEALS, PROMISES } from "../data/compendium.js";
import { isUnlocked } from "../core/state.js";
import { CHAPTERS, chapterById } from "../data/chapters.js";

function wrap(inner) {
  return `<div class="modal-backdrop" id="modal-backdrop" data-action="close-modal">
    <div class="modal" data-action="noop">
      <div class="modal-grip"></div>
      ${inner}
    </div>
  </div>`;
}

function scrollInner(ch) {
  return `<div class="eyebrow">The Scroll · Chapter ${ch.roman}</div>
    <h2>${esc(ch.title)}</h2>
    <p class="small muted">${esc(ch.subtitle)} · ${esc(ch.ref)}</p>
    <div class="divider"></div>
    <p class="verse">“${esc(ch.scroll.verse)}”</p>
    <p class="small gold" style="margin-top:-4px">— ${esc(ch.scroll.ref)}</p>
    <div class="divider"></div>
    <div class="card-quiet">
      <div class="eyebrow" style="margin-bottom:6px">Elias’ note</div>
      <p class="small" style="margin:0">${esc(ch.scroll.note)}</p>
    </div>
    <p class="tiny muted" style="margin-top:12px">${esc(ch.scroll.timeline)}</p>
    <p class="tiny muted">Scripture quotations: King James Version (public domain). Narrative dialogue is written for this game and is not scripture.</p>
    <button class="btn btn-ghost btn-sm" style="margin-top:8px" data-action="close-modal">Close the scroll</button>`;
}

function itemInner(ui) {
  const { kind, id } = ui.modal;
  if (kind === "fruit") {
    const f = FRUITS.find((x) => x.id === id) || FRUITS[0];
    const got = ui.state.fruits.includes(id);
    return `<div class="center"><div style="font-size:2.6rem">${f.glyph}</div>
      <div class="eyebrow">Fruit of the Spirit</div><h2>${esc(f.name)}</h2></div>
      <p class="verse center" style="margin-top:14px">${esc(f.note)}</p>
      <p class="small muted center">${got ? "You gathered this on your journey." : "Not yet found. Certain choices in the chapters reveal it."}</p>
      <p class="tiny muted center">“The fruit of the Spirit is love, joy, peace, longsuffering, gentleness, goodness, faith, meekness, temperance.” — Galatians 5:22–23 (KJV)</p>`;
  }
  if (kind === "relic") {
    const r = RELICS[id];
    const got = ui.state.relics.includes(id);
    return `<div class="center"><div style="font-size:2.6rem">${r.glyph}</div>
      <div class="eyebrow">Relic</div><h2>${esc(r.name)}</h2></div>
      <p class="small muted center">From ${esc(r.chapter)} · ${esc(r.ref)}</p>
      <div class="divider"></div>
      <p class="prose small">${got ? esc(r.desc) : "You have not found this relic yet. Finish its chapter to add it to your journal."}</p>`;
  }
  if (kind === "seal") {
    const s = SEALS.find((x) => x.id === id) || SEALS[0];
    const got = ui.state.seals.includes(id);
    return `<div class="center"><div style="font-size:2.6rem">${s.glyph}</div>
      <div class="eyebrow">Seal</div><h2>${esc(s.name)}</h2></div>
      <p class="small muted center">${esc(s.desc)}</p>
      <p class="center" style="margin-top:14px">${got ? '<span class="pill">Earned</span>' : '<span class="pill">Locked</span>'}</p>`;
  }
  if (kind === "verse") {
    const ch = chapterById(id);
    if (!ch) return "";
    return scrollInner(ch);
  }
  return "";
}

function howtoInner() {
  return `<div class="eyebrow">A short guide</div><h2>How the journey works</h2>
    <div class="prose small" style="margin-top:12px">
      <p>You are a <strong>pilgrim with a scroll</strong>. The scroll carries you into six true stories from the Bible — you stand in the valley, sit in the boat, wait outside the lions’ den.</p>
      <h3>What your choices do</h3>
      <p>They shape <em>you</em>, not scripture. David still faces Goliath; the storm still stops. Your choices grow four virtues — <span class="gold">Courage, Wisdom, Compassion and Faith</span> — and unlock fruits, relics and seals.</p>
      <h3>What to tap</h3>
      <ul>
        <li><strong>Tap the dialogue box</strong> to read the next line.</li>
        <li><strong>Choose a reply</strong> when the story pauses. Some need a minimum virtue — the golden choices are faith paths.</li>
        <li><strong>Pray</strong> once per chapter for +1 Faith and a promise from the Psalms.</li>
        <li><strong>Open the scroll</strong> (top right) any time to read the real passage, the historical note and the reference.</li>
      </ul>
      <h3>At the end of each chapter</h3>
      <p>You will receive a relic, a fruit of the Spirit, and one honest reflection question. There are no wrong answers to that question — only different ones.</p>
      <p class="tiny muted">Progress saves automatically on your device. No account, no ads, no tracking.</p>
    </div>
    <button class="btn btn-primary" style="margin-top:8px" data-action="close-modal">I’m ready</button>`;
}

function prayInner(ch) {
  const idx = CHAPTERS.findIndex((c) => c.id === ch.id);
  const p = PROMISES[idx % PROMISES.length];
  return `<div class="center"><div style="font-size:2.4rem">✟</div>
    <div class="eyebrow">You paused to pray</div><h2>+1 Faith</h2></div>
    <p class="verse center" style="margin-top:16px">“${esc(p.text)}”</p>
    <p class="small center gold">— ${esc(p.ref)}</p>
    <p class="tiny muted center" style="margin-top:14px">Prayer is available once in each chapter. It grows Faith, which can open golden choices later in the story.</p>
    <button class="btn btn-primary" style="margin-top:8px" data-action="close-modal">Amen</button>`;
}

function leaveInner() {
  return `<div class="eyebrow">Leave the chapter?</div><h2>Your place is kept</h2>
    <p class="small muted">Choices you already made are saved. Coming back will restart this chapter from the beginning, with the virtues you have gained.</p>
    <div class="stack" style="margin-top:16px">
      <button class="btn btn-primary" data-action="close-modal">Stay in the story</button>
      <button class="btn btn-ghost" data-action="confirm-leave">Return to the map</button>
    </div>`;
}

function resetInner() {
  return `<div class="eyebrow">Start over?</div><h2>Erase this journey</h2>
    <p class="small muted">Your name, level, virtues, fruits, relics and seals will be deleted from this device. This cannot be undone.</p>
    <div class="stack" style="margin-top:16px">
      <button class="btn btn-primary" data-action="close-modal">Keep my journey</button>
      <button class="btn btn-danger" data-action="confirm-reset">Yes, erase everything</button>
    </div>`;
}

function chapterInner(ui) {
  const ch = chapterById(ui.modal.id);
  const unlocked = !!ui.state && isUnlocked(ui.state, ch);
  if (!unlocked) {
    return `<div class="center"><div style="font-size:2.4rem">${icon("lock", 42)}</div>
      <div class="eyebrow">Still ahead on the road</div><h2>${esc(ch.title)}</h2></div>
      <p class="small muted center" style="margin-top:12px">Finish the previous chapter to open this one. ${esc(ch.intro)}</p>`;
  }
  return `<div class="center"><div style="font-size:2.4rem">✧</div>
      <div class="eyebrow">Chapter ${ch.roman} · ${esc(ch.ref)}</div><h2>${esc(ch.title)}</h2>
      <p class="small muted">${esc(ch.subtitle)}</p></div>
    <p class="prose small center" style="margin:16px 0">${esc(ch.intro)}</p>
    <div class="card-quiet small"><strong class="gold">Theme:</strong> ${esc(ch.theme)} &nbsp;·&nbsp; <strong class="gold">Length:</strong> ${esc(ch.length)}</div>
    <button class="btn btn-primary" style="margin-top:14px" data-action="enter-chapter" data-id="${ch.id}">${icon("play", 16)} Enter this story</button>
    <button class="btn btn-ghost btn-sm" style="margin-top:8px" data-action="close-modal">Not yet</button>`;
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
