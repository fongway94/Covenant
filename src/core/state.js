/* Persistent game state. localStorage in the browser; safe no-op fallback elsewhere. */

import { CALLINGS, STAT_KEYS, STAT_MAX, FRUITS, RELICS, SEALS, countDone } from "../data/compendium.js";
import { CHAPTERS } from "../data/chapters.js";
import { QUESTS, DAY_PHASES } from "../data/quests.js";

const KEY = "covenant.save.v1";
let memory = null;

/* v2: immersive mode ("no tips") became the default. Saves from v1 may have
   explicitly stored cleanMode:false; migrate them once, then always respect
   whatever the player chooses afterwards. */
const SETTINGS_VERSION = 2;

export const DEFAULT_SETTINGS = {
  sound: true, music: true, textSize: "normal", showAll: false,
  cleanMode: true,          // immersive / no-tips is the normal experience
  settingsVersion: SETTINGS_VERSION
};

/* The four "ways of walking" for the Journey Mirror. These are counted from
   real behaviour (choices, prayer, searching, NPCs, quests) — never from a
   questionnaire. Old saves fall back to the virtue stats in mirror.js. */
export const WAY_KEYS = ["step", "notice", "stay", "wait"];
const DEFAULT_WAYS = { step: 0, notice: 0, stay: 0, wait: 0 };

const DEFAULT_ADVENTURE = {
  cycles: 0, guidance: 2, quests: {}, day: 1, npcMet: [], breaths: 0,
  lastBreathDay: 0, ways: { ...DEFAULT_WAYS }
};

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
    adventure: { ...DEFAULT_ADVENTURE },
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
    const old = s.settings || {};
    const needsImmersiveMigration = !old.settingsVersion || old.settingsVersion < SETTINGS_VERSION;
    s.settings = { ...DEFAULT_SETTINGS, ...old };
    if (needsImmersiveMigration) {
      s.settings.cleanMode = true;      // one-time switch for older saves
      s.settings.settingsVersion = SETTINGS_VERSION;
      s.flags = s.flags || {};
      s.flags.immersiveMigration = true;
      saveGame(s);                     // persist so the choice is only forced once
    }
    s.settings.settingsVersion = Math.max(SETTINGS_VERSION, Number(s.settings.settingsVersion) || SETTINGS_VERSION);
    for (const k of STAT_KEYS) s.stats[k] = s.stats[k] ?? 1;
    for (const arr of ["fruits", "relics", "seals", "prayedIn", "reflections"]) if (!Array.isArray(s[arr])) s[arr] = [];
    if (!s.chapters) s.chapters = {};
    if (!s.flags) s.flags = {};
    s.adventure = { ...DEFAULT_ADVENTURE, ...(s.adventure || {}) };
    if (!s.adventure.quests || Array.isArray(s.adventure.quests)) s.adventure.quests = {};
    if (!Array.isArray(s.adventure.npcMet)) s.adventure.npcMet = [];
    s.adventure.ways = { ...DEFAULT_WAYS, ...(s.adventure.ways || {}) };
    for (const k of WAY_KEYS) s.adventure.ways[k] = Math.max(0, Number(s.adventure.ways[k]) || 0);
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
  addGuidance(s, 1);       // prayer also stores a little Guidance for the road
  addWay(s, "wait", 3);    // pausing to pray is the clearest "wait" signal
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
  addWay(s, "notice", 2);  // sitting with the question is an act of attention
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


/* ------------------------------------------------------ camp / adventure */

export function adventure(s) {
  if (!s.adventure) s.adventure = { ...DEFAULT_ADVENTURE };
  return s.adventure;
}

export function addGuidance(s, n) {
  const a = adventure(s);
  a.guidance = Math.max(0, Math.min(99, (a.guidance || 0) + (n || 0)));
  return a.guidance;
}

/** Record an observable behaviour for the Journey Mirror. No UI, no quiz. */
export function addWay(s, key, n = 1) {
  if (!WAY_KEYS.includes(key)) return 0;
  const a = adventure(s);
  if (!a.ways) a.ways = { ...DEFAULT_WAYS };
  a.ways[key] = Math.max(0, Math.min(999, (Number(a.ways[key]) || 0) + n));
  return a.ways[key];
}

/** Virtue gained on a choice also reveals a way of walking. */
export function addWaysFromStats(s, stats) {
  const map = { courage: "step", wisdom: "notice", compassion: "stay", faith: "wait" };
  for (const [k, v] of Object.entries(stats || {})) {
    if (map[k] && v) addWay(s, map[k], Math.min(3, Math.abs(v)));
  }
}

export function spendGuidance(s, n = 1) {
  const a = adventure(s);
  if ((a.guidance || 0) < n) return false;
  a.guidance -= n;
  saveGame(s);
  return true;
}

/** Current camp day, 1..10, driven by how many chapters have been walked. */
export function campDay(s) {
  const a = adventure(s);
  a.day = Math.max(1, Math.min(CHAPTERS.length, countDoneLocal(s) + 1));
  return a.day;
}

function countDoneLocal(s) { return Object.values(s.chapters || {}).filter((c) => c.completed).length; }

export function dayPhase(s) { return DAY_PHASES[(campDay(s) - 1) % DAY_PHASES.length]; }

export function questState(s, quest) {
  const a = adventure(s);
  const value = Math.min(quest.goal, quest.progress(s));
  return { value, goal: quest.goal, ready: value >= quest.goal, claimed: !!a.quests[quest.id] };
}

/** Claim a finished camp quest. Returns the reward or null. */
export function claimQuest(s, id) {
  const q = QUESTS.find((x) => x.id === id);
  if (!q) return null;
  const a = adventure(s);
  if (a.quests[id] || q.progress(s) < q.goal) return null;
  a.quests[id] = Date.now();
  addWay(s, "stay", 1);
  addGuidance(s, q.reward.guidance || 0);
  for (const [k, v] of Object.entries(q.reward)) if (k !== "guidance") addStat(s, k, v);
  addXp(s, 15);
  if (QUESTS.every((x) => a.quests[x.id])) a.cycles = Math.max(1, a.cycles || 0);
  const newSeals = checkSeals(s);
  saveGame(s);
  return { quest: q, reward: q.reward, newSeals };
}

/** One breathing prayer at the campfire. Once per camp day. */
export function breatheAtCamp(s) {
  const a = adventure(s);
  const day = campDay(s);
  if (a.lastBreathDay === day) return null;
  a.lastBreathDay = day;
  a.breaths = (a.breaths || 0) + 1;
  addWay(s, "wait", 2);
  addGuidance(s, 2);
  addStat(s, "faith", 1);
  addXp(s, 6);
  const newSeals = checkSeals(s);
  saveGame(s);
  return { guidance: 2, newSeals };
}

export function metNpc(s, id) {
  const a = adventure(s);
  if (!a.npcMet.includes(id)) { a.npcMet.push(id); addWay(s, "stay", 2); saveGame(s); }
}

export function markFinale(s) {
  s.flags.finaleSeen = true;
  const newSeals = checkSeals(s);
  saveGame(s);
  return { newSeals };
}
