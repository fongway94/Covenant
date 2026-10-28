#!/usr/bin/env node
/* Validates all story content + core state transitions. Run: npm run check */
import { CHAPTERS } from "../src/data/chapters.js";
import { FRUITS, RELICS, SEALS, STAT_KEYS, CALLINGS, PROMISES, countDone } from "../src/data/compendium.js";
import { newGame, addXp, completeChapter, grantFruit, isUnlocked, xpNeeded } from "../src/core/state.js";

const errors = [];
const warn = (m) => errors.push(m);
const fruitIds = new Set(FRUITS.map((f) => f.id));
let nodeCount = 0, choiceCount = 0, lineCount = 0, miniCount = 0;

const ids = new Set();
for (const ch of CHAPTERS) {
  const p = `[${ch.id}]`;
  if (ids.has(ch.id)) warn(`${p} duplicate chapter id`);
  ids.add(ch.id);
  for (const field of ["title", "subtitle", "ref", "art", "theme", "intro", "start", "relic", "roman"]) {
    if (!ch[field]) warn(`${p} missing ${field}`);
  }
  if (!ch.scroll?.verse || !ch.scroll?.ref || !ch.scroll?.note) warn(`${p} incomplete scroll`);
  for (const k of ["place", "who", "stake"]) {
    if (!ch.brief?.[k] || String(ch.brief[k]).length < 40) warn(`${p} incomplete background (${k})`);
  }
  if (!ch.ending?.title || !ch.ending?.text || !ch.ending?.takeaway) warn(`${p} incomplete ending`);
  if (!ch.reflection?.q || ch.reflection?.options?.length !== 3) warn(`${p} reflection must have 3 options`);
  for (const o of ch.reflection?.options || []) {
    if (!o.t || !o.insight || !o.stat) warn(`${p} incomplete reflection option`);
    for (const k of Object.keys(o.stat || {})) if (!STAT_KEYS.includes(k)) warn(`${p} bad stat key ${k}`);
  }
  if (!RELICS[ch.relic]) warn(`${p} unknown relic ${ch.relic}`);
  for (const f of ch.endFruits || []) if (!fruitIds.has(f)) warn(`${p} unknown endFruit ${f}`);
  if (!ch.nodes?.[ch.start]) warn(`${p} start node missing`);

  const nodeIds = new Set(Object.keys(ch.nodes || {}));
  nodeCount += nodeIds.size;
  for (const [nid, n] of Object.entries(ch.nodes || {})) {
    const np = `${p} node "${nid}"`;
    if (!Array.isArray(n.lines) || n.lines.length === 0) warn(`${np} has no lines`);
    for (const l of n.lines || []) {
      lineCount++;
      if (!Array.isArray(l) || l.length !== 2 || typeof l[1] !== "string" || !l[1].trim()) warn(`${np} malformed line`);
      if (l[0] && !ch.cast?.[l[0]]) warn(`${np} unknown speaker "${l[0]}"`);
    }
    if (n.next && !nodeIds.has(n.next)) warn(`${np} bad next -> ${n.next}`);
    if (n.mini) {
      miniCount++;
      if (!n.mini.next && !n.next) warn(`${np} minigame has no next`);
      if (!Array.isArray(n.mini.targets) || !n.mini.targets.length) warn(`${np} minigame has no targets`);
      if (!(n.mini.zone > 0) || !(n.mini.speed > 0)) warn(`${np} minigame needs zone & speed`);
      if (!n.mini.win?.stat) warn(`${np} minigame has no win reward`);
      if (n.mini.flag) {} // flags are arbitrary strings, fine
    }
    if (n.choices) {
      const ungated = n.choices.filter((c) => !c.require);
      if (!ungated.length) warn(`${np} all choices are gated — player could be stuck`);
      for (const [i, c] of n.choices.entries()) {
        choiceCount++;
        const cp = `${np} choice ${i + 1}`;
        if (!c.t) warn(`${cp} has no label`);
        if (!c.to || !nodeIds.has(c.to)) warn(`${cp} bad destination ${c.to}`);
        for (const k of Object.keys(c.stat || {})) if (!STAT_KEYS.includes(k)) warn(`${cp} bad stat ${k}`);
        for (const [k, v] of Object.entries(c.require || {})) {
          if (!STAT_KEYS.includes(k)) warn(`${cp} bad require stat ${k}`);
          if (v > 12) warn(`${cp} require ${k} ${v} exceeds STAT_MAX`);
        }
        if (c.give?.fruit && !fruitIds.has(c.give.fruit)) warn(`${cp} unknown fruit ${c.give.fruit}`);
        if (c.replyBy && !ch.cast?.[c.replyBy]) warn(`${cp} unknown replyBy ${c.replyBy}`);
      }
    }
    if (!n.choices && !n.next && !n.mini && !n.end) warn(`${np} is a dead end without end:true`);
  }

  /* Reachability from start. */
  const seen = new Set();
  const stack = [ch.start];
  while (stack.length) {
    const id = stack.pop();
    if (!id || seen.has(id) || !ch.nodes[id]) continue;
    seen.add(id);
    const n = ch.nodes[id];
    if (n.next) stack.push(n.next);
    if (n.mini?.next) stack.push(n.mini.next);
    for (const c of n.choices || []) stack.push(c.to);
  }
  for (const id of nodeIds) if (!seen.has(id)) warn(`${p} node "${id}" is unreachable`);
  const ends = [...nodeIds].filter((id) => ch.nodes[id].end);
  if (!ends.length) warn(`${p} has no end node`);
  for (const id of ends) if (!seen.has(id)) warn(`${p} end node "${id}" is unreachable`);
}

/* All nine fruits must be obtainable. */
const available = new Set(CHAPTERS.flatMap((c) => c.endFruits || []));
for (const f of FRUITS) if (!available.has(f.id)) warn(`fruit "${f.id}" cannot be earned`);
if (available.size !== FRUITS.length) warn(`expected ${FRUITS.length} endFruits, found ${available.size}`);
if (Object.keys(RELICS).length !== CHAPTERS.length) warn("relic count != chapter count");
if (PROMISES.length < CHAPTERS.length) warn("not enough prayer promises");

/* Core state smoke test. */
const s = newGame("Tester", "intercessor");
if (s.level !== 1) warn("newGame should start at level 1");
if (s.stats.faith !== 4) warn("calling bonus not applied");
if (!isUnlocked(s, CHAPTERS[0])) warn("chapter 1 should be unlocked");
if (isUnlocked(s, CHAPTERS[1])) warn("chapter 2 should be locked at start");
addXp(s, xpNeeded(1));
if (s.level !== 2) warn("level-up did not occur");
for (const ch of CHAPTERS) completeChapter(s, ch);
if (s.fruits.length !== FRUITS.length) warn(`completing all chapters gave ${s.fruits.length}/${FRUITS.length} fruits`);
if (s.relics.length !== Object.keys(RELICS).length) warn("not all relics granted");
if (countDone(s) !== CHAPTERS.length) warn("countDone mismatch");
if (!s.seals.includes("pilgrim")) warn("pilgrim seal not awarded");
if (!s.seals.includes("nine_fruits")) warn("full harvest seal not awarded");

console.log(`Chapters: ${CHAPTERS.length} · Nodes: ${nodeCount} · Lines: ${lineCount} · Choices: ${choiceCount} · Minigames: ${miniCount}`);
console.log(`Callings: ${CALLINGS.length} · Fruits: ${FRUITS.length} · Relics: ${Object.keys(RELICS).length} · Seals: ${SEALS.length}`);
if (errors.length) {
  console.error(`\n${errors.length} problem(s):`);
  for (const e of errors) console.error("  ✗ " + e);
  process.exit(1);
}
console.log("\n✓ All story content and state transitions are valid.");
