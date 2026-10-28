#!/usr/bin/env node
/* Validates the Journey Mirror: data completeness, biblical references,
   determinism, reachability of profiles, and the "no personality typing" rule.
   Run: npm run check:mirror */

const { PROFILES, WAYS, WAY_KEYS, MIRROR_COPY, analyseJourney, journeyWays, pick } =
  await import("../src/data/mirror.js");
const { STAT_KEYS } = await import("../src/data/compendium.js");
const { CHAPTERS } = await import("../src/data/chapters.js");
const { DEEPER, deeperFor } = await import("../src/data/deeper.js");

const errs = [];
const fail = (m) => errs.push(m);
const zhRe = /[\u4e00-\u9fff]/;

if (PROFILES.length !== 10) fail(`expected 10 profiles, got ${PROFILES.length}`);
if (new Set(PROFILES.map((p) => p.id)).size !== PROFILES.length) fail("duplicate profile ids");

const chapterIds = new Set(CHAPTERS.map((c) => c.id));
const fields = ["name", "role", "ref", "verse", "verseRef", "why", "shadow", "grace", "read"];
for (const p of PROFILES) {
  if (!chapterIds.has(p.chapter)) fail(`${p.id}: unknown chapter ${p.chapter}`);
  if (!WAY_KEYS.includes(p.way)) fail(`${p.id}: bad way ${p.way}`);
  if (!STAT_KEYS.includes(p.virtue)) fail(`${p.id}: bad virtue ${p.virtue}`);
  for (const f of fields) {
    const v = p[f];
    if (!v || !v.en || !v.zh) { fail(`${p.id}.${f}: missing a language`); continue; }
    if (!zhRe.test(v.zh)) fail(`${p.id}.${f}: Chinese field has no Chinese characters`);
    if (/MBTI|personality type|人格类型/i.test(v.en + v.zh)) fail(`${p.id}.${f}: personality-type language`);
  }
  if (!p.shadow.en.length) fail(`${p.id}: shadow is empty`);
  if (!p.grace.en.length) fail(`${p.id}: grace is empty`);
  if (!p.read.en.length) fail(`${p.id}: read invitation is empty`);
}
for (const k of WAY_KEYS) {
  const w = WAYS[k];
  for (const f of ["name", "desc", "verse", "ref"]) {
    if (!w[f]?.en || !w[f]?.zh || !zhRe.test(w[f].zh)) fail(`WAYS.${k}.${f}: incomplete`);
  }
}
for (const [k, v] of Object.entries(MIRROR_COPY)) {
  if (!v?.en || !v?.zh || !zhRe.test(v.zh)) fail(`MIRROR_COPY.${k}: incomplete`);
}

/* Reading invitations must exist for all ten chapters in both languages. */
for (const ch of CHAPTERS) {
  for (const zh of [false, true]) {
    const d = deeperFor(ch.id, zh);
    if (!d) { fail(`DEEPER missing for ${ch.id}`); continue; }
    for (const f of ["ref", "hook", "ask"]) if (!d[f]) fail(`DEEPER.${ch.id}.${f} empty (${zh ? "zh" : "en"})`);
    if (zh && !zhRe.test(d.hook + d.ask)) fail(`DEEPER.${ch.id}: Chinese hook has no Chinese`);
  }
}
if (Object.keys(DEEPER).length !== CHAPTERS.length) fail("DEEPER and CHAPTERS differ in length");

/* Analytic guarantees. */
const base = () => ({
  stats: { courage: 1, wisdom: 1, compassion: 1, faith: 1 },
  adventure: { ways: { step: 0, notice: 0, stay: 0, wait: 0 } },
  chapters: {}
});
const reached = new Set();
for (const way of WAY_KEYS) {
  for (const virtue of STAT_KEYS) {
    const s = base();
    s.adventure.ways[way] = 30;
    s.stats[virtue] = 12;
    const a = analyseJourney(s);
    if (!a.primary || !a.secondary) fail(`no profile for ${way}/${virtue}`);
    if (a.primary === a.secondary) fail(`primary === secondary for ${way}/${virtue}`);
    if (a.way !== way || a.virtue !== virtue) fail(`axis misread for ${way}/${virtue}`);
    reached.add(a.primary.id);
    const again = analyseJourney(s);
    if (again.primary.id !== a.primary.id) fail(`not deterministic for ${way}/${virtue}`);
    const sumW = Object.values(a.wShare).reduce((x, y) => x + y, 0);
    const sumV = Object.values(a.vShare).reduce((x, y) => x + y, 0);
    if (Math.abs(sumW - 1) > 1e-6 || Math.abs(sumV - 1) > 1e-6) fail(`shares not normalised for ${way}/${virtue}`);
  }
}
/* Not all 10 need to win, but a mirror that always says "David" is broken. */
if (reached.size < 4) fail(`only ${reached.size} distinct profiles reachable across 16 axis combinations`);
console.log(`  reachable profiles across 16 axis combinations: ${[...reached].join(", ")}`);

/* Old saves with no `ways` must still produce a sane mirror. */
const legacy = base(); delete legacy.adventure.ways;
if (analyseJourney(legacy).primary.id !== analyseJourney(legacy).primary.id) fail("legacy save not stable");
if (Object.values(journeyWays(legacy)).some((n) => !Number.isFinite(n))) fail("legacy fallback produced NaN");
const empty = { stats: {}, adventure: {}, chapters: {} };
if (!analyseJourney(empty).primary) fail("empty save crashed the mirror");
if (pick(MIRROR_COPY.title, true) === pick(MIRROR_COPY.title, false)) fail("language pick is broken");

if (errs.length) { errs.forEach((e) => console.error("  ✗ " + e)); process.exit(1); }
console.log(`\n✓ Journey Mirror: ${PROFILES.length} Bible profiles, ${WAY_KEYS.length} ways, ` +
  `${Object.keys(DEEPER).length} reading invitations, both languages, deterministic and label-free.`);
