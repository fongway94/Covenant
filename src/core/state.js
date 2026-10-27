/* Persistent game state. localStorage in the browser; safe no-op fallback elsewhere. */

import { CALLINGS, STAT_KEYS, STAT_MAX, FRUITS, RELICS, SEALS, countDone } from "../data/compendium.js";
import { CHAPTERS } from "../data/chapters.js";

const KEY = "covenant.save.v1";
let memory = null;

export const DEFAULT_SETTINGS = { sound: true, textSize: "normal", showAll: false };

export function newGame(name, callingId) {
  const calling = CALLINGS.find((c) => c.id === callingId) || CALLINGS[0];
  const stats = { courage: 1, wisdom: 1, compassion: 1, faith: 1 };
  for (const [k, v] of Object.entries(calling.bonus)) stats[k] = Math.min(STAT_MAX, stats[k] + v);
  return {
    version: 1,
    createdAt: Date.now(),
    name: (String(name || "Pilgrim").trim() || "Pilgrim").slice(0, 22),
    calling: calling.id,
    level: 1, xp: 0,
    stats,
    chapters: {},          // id -> { completed, best, snapshot, finishedAt }
    fruits: [],
    relics: [],
    seals: [],
    prayedIn: [],
    reflections: [],       // chapter ids where reflection was answered
    flags: {},
    settings: { ...DEFAULT_SETTINGS }
  };
}

export function loadGame() {
  try {
    const raw = (typeof localStorage !== "undefined" && localStorage.getItem(KEY)) || memory;
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (!s || s.version !== 1 || !s.stats) return null;
    s.settings = { ...DEFAULT_SETTINGS, ...(s.settings || {}) };
    for (const k of STAT_KEYS) s.stats[k] = s.stats[k] ?? 1;
    for (const arr of ["fruits", "relics", "seals", "prayedIn", "reflections"]) if (!Array.isArray(s[arr])) s[arr] = [];
    if (!s.chapters) s.chapters = {};
    if (!s.flags) s.flags = {};
    return s;
  } catch { return null; }
}

export function saveGame(s) {
  if (!s) return;
  const raw = JSON.stringify(s);
  memory = raw;
  try { if (typeof localStorage !== "undefined") localStorage.setItem(KEY, raw); } catch { /* private mode */ }
}

export function clearGame() {
  memory = null;
  try { if (typeof localStorage !== "undefined") localStorage.removeItem(KEY); } catch { /* noop */ }
}

export function xpNeeded(level) { return 60 + (level - 1) * 45; }

export function addXp(s, n) {
  s.xp += Math.max(0, Math.round(n || 0));
  let levels = 0;
  while (s.xp >= xpNeeded(s.level)) {
    s.xp -= xpNeeded(s.level);
    s.level += 1;
    levels += 1;
  }
  return levels;
}

export function addStat(s, key, n) {
  if (!STAT_KEYS.includes(key)) return 0;
  const before = s.stats[key];
  s.stats[key] = Math.min(STAT_MAX, Math.max(0, before + n));
  return s.stats[key] - before;
}

export function grantFruit(s, id) {
  if (!FRUITS.some((f) => f.id === id) || s.fruits.includes(id)) return false;
  s.fruits.push(id);
  return true;
}

export function grantRelic(s, id) {
  if (!RELICS[id] || s.relics.includes(id)) return false;
  s.relics.push(id);
  return true;
}

export function checkSeals(s) {
  const fresh = [];
  for (const seal of SEALS) {
    if (!s.seals.includes(seal.id) && seal.check(s)) { s.seals.push(seal.id); fresh.push(seal); }
  }
  return fresh;
}

export function hasPrayed(s, chapterId) { return s.prayedIn.includes(chapterId); }

export function pray(s, chapterId) {
  if (hasPrayed(s, chapterId)) return false;
  s.prayedIn.push(chapterId);
  addStat(s, "faith", 1);
  addXp(s, 4);
  checkSeals(s);
  saveGame(s);
  return true;
}

export function isUnlocked(s, chapter) {
  if (!s) return false;
  if (s.settings.showAll) return true;
  const i = CHAPTERS.findIndex((c) => c.id === chapter.id);
  if (i <= 0) return true;
  return !!s.chapters[CHAPTERS[i - 1].id]?.completed;
}

export function isCompleted(s, chapterId) { return !!s.chapters[chapterId]?.completed; }

/** Finish a chapter. Idempotent for collectibles; replays award reduced XP. */
export function completeChapter(s, chapter) {
  const prior = s.chapters[chapter.id];
  const replay = !!prior?.completed;
  const newFruits = [];
  const newRelic = grantRelic(s, chapter.relic) ? chapter.relic : null;
  for (const f of chapter.endFruits || []) if (grantFruit(s, f)) newFruits.push(f);

  s.chapters[chapter.id] = {
    completed: true,
    finishedAt: Date.now(),
    plays: (prior?.plays || 0) + 1,
    snapshot: { ...s.stats },
    level: s.level
  };
  const levels = addXp(s, replay ? 12 : 32);
  const newSeals = checkSeals(s);
  saveGame(s);
  return { replay, newFruits, newRelic, newSeals, levels, xp: replay ? 12 : 32, totalDone: countDone(s) };
}

export function recordReflection(s, chapterId, stat) {
  if (!s.reflections.includes(chapterId)) s.reflections.push(chapterId);
  addXp(s, 10);
  if (stat) for (const [k, v] of Object.entries(stat)) addStat(s, k, v);
  const levels = addXp(s, 0);
  const newSeals = checkSeals(s);
  saveGame(s);
  return { newSeals, levels };
}

export function progress(s, chapterId) {
  const c = s.chapters[chapterId];
  return c ? { done: c.completed, level: c.level, plays: c.plays } : null;
}
