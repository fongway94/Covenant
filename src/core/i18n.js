/* Covenant i18n — Chinese (default) / English.
   Strategy: keep the English source as the single structural truth, then swap
   text in place when the language changes. All modules import the SAME array /
   object references, so mutating them updates every screen instantly. */

import { ZH_UI, ZH_PATTERNS, ZH_COMPENDIUM, ZH_META } from "../data/zh-ui.js";
import { ZH_STORY } from "../data/zh-story.js";
import { CHAPTERS } from "../data/chapters.js";
import { EXTRA_CHAPTERS, buildChapter } from "../data/chapters-extra.js";
import { STATS, CALLINGS, FRUITS, RELICS, SEALS, PROMISES } from "../data/compendium.js";

const EXTRA_IDS = new Set(EXTRA_CHAPTERS.map((s) => s.id));
const KEY = "covenant.lang.v1";
let lang = null;
let EN = null;

export function getLang() {
  if (lang) return lang;
  try { lang = localStorage.getItem(KEY) || "zh"; } catch { lang = "zh"; }
  if (lang !== "en" && lang !== "zh") lang = "zh";
  return lang;
}
export function isZh() { return getLang() === "zh"; }
export function setLang(l) {
  lang = l === "en" ? "en" : "zh";
  try { localStorage.setItem(KEY, lang); } catch { /* private mode */ }
  applyDataLanguage();
  initI18n();
}
/** Inline dual-language helper for code written after the i18n layer. */
export function tx(en, zh) { return isZh() ? zh : en; }

/* ------------------------------------------------------------- translation */

const EXACT = Object.fromEntries(Object.entries(ZH_UI).filter(([k]) => !k.startsWith("~")));

/** Translate a plain string (exact match → regex patterns → unchanged). */
export function t(s) {
  if (!isZh() || typeof s !== "string" || !s) return s;
  const trimmed = s.trim();
  if (!trimmed || !/[A-Za-z]/.test(trimmed)) return s;
  if (EXACT[trimmed]) return s.replace(trimmed, EXACT[trimmed]);
  for (const [re, rep] of ZH_PATTERNS) {
    if (re.test(trimmed)) return s.replace(trimmed, trimmed.replace(re, rep));
  }
  return s;
}

/** Translate all visible text inside a rendered subtree (screens stay simple). */
export function translateDOM(root) {
  if (!isZh() || !root || typeof document === "undefined") return;
  const NF = (typeof NodeFilter !== "undefined") ? NodeFilter
    : (typeof window !== "undefined" && window.NodeFilter) ? window.NodeFilter
    : { SHOW_TEXT: 4, FILTER_REJECT: 2, FILTER_ACCEPT: 1 };
  const walker = document.createTreeWalker(root, NF.SHOW_TEXT, {
    acceptNode(n) {
      if (!n.nodeValue || !/[A-Za-z]{2}/.test(n.nodeValue)) return NF.FILTER_REJECT;
      const p = n.parentElement;
      if (!p) return NF.FILTER_REJECT;
      if (/^(SCRIPT|STYLE|TEXTAREA|CODE|PRE)$/.test(p.tagName)) return NF.FILTER_REJECT;
      if (p.closest("[data-no-i18n]")) return NF.FILTER_REJECT;
      return NF.FILTER_ACCEPT;
    }
  });
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  for (const n of nodes) {
    const v = t(n.nodeValue);
    if (v !== n.nodeValue) n.nodeValue = v;
  }
  if (root.querySelectorAll) {
    root.querySelectorAll("[placeholder],[title],[aria-label],[alt]").forEach((el) => {
      for (const a of ["placeholder", "title", "aria-label", "alt"]) {
        if (el.hasAttribute(a)) {
          const v = t(el.getAttribute(a));
          if (v !== el.getAttribute(a)) el.setAttribute(a, v);
        }
      }
    });
  }
}

/* ------------------------------------------------------------- data swap */

function snapshot() {
  EN = {
    chapters: JSON.parse(JSON.stringify(CHAPTERS)),
    stats: Object.fromEntries(Object.entries(STATS).map(([k, v]) => [k, { ...v }])),
    callings: CALLINGS.map((c) => ({ ...c, bonus: { ...c.bonus } })),
    fruits: FRUITS.map((f) => ({ ...f })),
    relics: Object.fromEntries(Object.entries(RELICS).map(([k, v]) => [k, { ...v }])),
    seals: SEALS.map((s) => ({ name: s.name, desc: s.desc })),
    promises: PROMISES.map((p) => ({ ...p }))
  };
}

function pick(zh, en, zhValue, enValue) { return zh ? (zhValue ?? t(enValue)) : enValue; }

export function applyDataLanguage() {
  if (!EN) snapshot();
  const zh = isZh();

  /* ---- chapters ---- */
  CHAPTERS.forEach((ch, ci) => {
    if (EXTRA_IDS.has(ch.id)) return; // rebuilt below from the bilingual spec
    const e = EN.chapters[ci];
    const z = ZH_STORY[ch.id] || {};
    ch.title = zh ? (z.title ?? t(e.title)) : e.title;
    ch.subtitle = zh ? (z.subtitle ?? t(e.subtitle)) : e.subtitle;
    ch.ref = zh ? (z.ref ?? e.ref) : e.ref;
    ch.theme = zh ? (z.theme ?? t(e.theme)) : e.theme;
    ch.length = zh ? (z.length ?? t(e.length)) : e.length;
    ch.intro = zh ? (z.intro ?? t(e.intro)) : e.intro;
    ch.scroll.verse = zh ? (z.scroll?.verse ?? t(e.scroll.verse)) : e.scroll.verse;
    ch.scroll.ref = zh ? (z.scroll?.ref ?? e.scroll.ref) : e.scroll.ref;
    ch.scroll.note = zh ? (z.scroll?.note ?? t(e.scroll.note)) : e.scroll.note;
    ch.scroll.timeline = zh ? (z.scroll?.timeline ?? t(e.scroll.timeline)) : e.scroll.timeline;

    for (const key of Object.keys(ch.cast)) {
      ch.cast[key].name = zh ? (z.cast?.[key]?.[0] ?? t(e.cast[key].name)) : e.cast[key].name;
      ch.cast[key].role = zh ? (z.cast?.[key]?.[1] ?? t(e.cast[key].role)) : e.cast[key].role;
    }
    for (const id of Object.keys(ch.nodes)) {
      const n = ch.nodes[id], en = e.nodes[id], zn = z.nodes?.[id] || {};
      n.lines = en.lines.map((line, i) => [line[0], zh ? (zn.l?.[i] ?? t(line[1])) : line[1]]);
      if (Object.prototype.hasOwnProperty.call(en, "choices")) {
        n.choices = (en.choices || []).map((c, i) => ({
          ...c,
          t: zh ? (zn.c?.[i] ?? t(c.t)) : c.t,
          reply: zh ? (zn.r?.[i] ?? (c.reply ? t(c.reply) : null)) : c.reply,
          hint: c.hint ? t(c.hint) : c.hint,
          tag: c.tag ? t(c.tag) : c.tag
        }));
      } else {
        delete n.choices;
      }
      if (n.mini) {
        const m = n.mini, em = en.mini || {};
        m.title = zh ? (z.game?.title ?? t(em.title)) : em.title;
        m.prompt = zh ? (z.game?.prompt ?? t(em.prompt)) : em.prompt;
        m.hitText = zh ? t(em.hitText) : em.hitText;
        m.missText = zh ? t(em.missText) : em.missText;
      }
    }
    const enEnd = e.ending, zEnd = z.ending || {};
    ch.ending.title = zh ? (zEnd.title ?? t(enEnd.title)) : enEnd.title;
    ch.ending.text = zh ? (zEnd.text ?? t(enEnd.text)) : enEnd.text;
    ch.ending.takeaway = zh ? (zEnd.takeaway ?? t(enEnd.takeaway)) : enEnd.takeaway;
    const enR = e.reflection, zR = z.reflection || {};
    ch.reflection.q = zh ? (zR.q ?? t(enR.q)) : enR.q;
    ch.reflection.options = enR.options.map((o, i) => ({
      ...o,
      t: zh ? (zR.options?.[i]?.t ?? t(o.t)) : o.t,
      insight: zh ? (zR.options?.[i]?.insight ?? t(o.insight)) : o.insight
    }));
  });

  /* ---- compendium ---- */
  for (const k of Object.keys(STATS)) STATS[k].name = zh ? (ZH_COMPENDIUM.stats[k] ?? EN.stats[k].name) : EN.stats[k].name;
  CALLINGS.forEach((c, i) => {
    c.name = zh ? ZH_COMPENDIUM.callings[c.id].name : EN.callings[i].name;
    c.blurb = zh ? ZH_COMPENDIUM.callings[c.id].blurb : EN.callings[i].blurb;
    c.gift = zh ? ZH_COMPENDIUM.callings[c.id].gift : EN.callings[i].gift;
  });
  FRUITS.forEach((f, i) => {
    f.name = zh ? ZH_COMPENDIUM.fruits[f.id].name : EN.fruits[i].name;
    f.note = zh ? ZH_COMPENDIUM.fruits[f.id].note : EN.fruits[i].note;
  });
  for (const [k, v] of Object.entries(RELICS)) {
    const z = ZH_COMPENDIUM.relics[k], e = EN.relics[k];
    v.name = zh ? z.name : e.name;
    v.chapter = zh ? z.chapter : e.chapter;
    v.desc = zh ? z.desc : e.desc;
    v.ref = zh ? z.ref : e.ref;
  }
  SEALS.forEach((s, i) => {
    s.name = zh ? ZH_COMPENDIUM.seals[s.id].name : EN.seals[i].name;
    s.desc = zh ? ZH_COMPENDIUM.seals[s.id].desc : EN.seals[i].desc;
  });
  PROMISES.forEach((p, i) => {
    p.text = zh ? (ZH_COMPENDIUM.promises[i]?.text ?? EN.promises[i].text) : EN.promises[i].text;
    p.ref = zh ? (ZH_COMPENDIUM.promises[i]?.ref ?? EN.promises[i].ref) : EN.promises[i].ref;
  });

  /* Chapters 7–10: rebuild in place from the bilingual spec so references stay valid. */
  const L = zh ? "zh" : "en";
  for (const spec of EXTRA_CHAPTERS) {
    const target = CHAPTERS.find((c) => c.id === spec.id);
    if (!target) continue;
    const built = buildChapter(spec, L);
    for (const k of Object.keys(target)) delete target[k];
    Object.assign(target, built);
  }
}

/* ------------------------------------------------------------- document */

export function initI18n() {
  if (typeof document === "undefined") return;
  const zh = isZh();
  document.documentElement.lang = zh ? "zh-CN" : "en";
  document.title = zh ? ZH_META.title : "Covenant — Journeys Through the Word";
  const desc = document.querySelector('meta[name="description"]');
  if (desc) desc.setAttribute("content", zh ? ZH_META.description : "Covenant — an interactive Bible story RPG. Walk through the Scriptures, make choices, and grow in faith.");
  const apple = document.querySelector('meta[name="apple-mobile-web-app-title"]');
  if (apple) apple.setAttribute("content", zh ? ZH_META.appleTitle : "Covenant");
  document.body?.classList.toggle("lang-zh", zh);
  document.body?.classList.toggle("lang-en", !zh);
}

applyDataLanguage();
initI18n();
