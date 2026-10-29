#!/usr/bin/env node
/* Two-way Chinese copy review tool.

   node tools/zh-review.js export [dir]   → writes zf-story.tsv and zf-ui.tsv
   node tools/zh-review.js apply  file.tsv

   The export has a stable ID for every Chinese line, with the English original
   beside it. Send it out, get better Chinese back, change only the lines you
   want, and run `apply` — it finds the old string, swaps in the new one, and
   refuses if the old string is ambiguous. Nothing else in the repo is touched. */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { CHAPTERS } from "../src/data/chapters.js";
import { EXTRA_CHAPTERS, buildChapter } from "../src/data/chapters-extra.js";
import { ZH_STORY } from "../src/data/zh-story.js";
import { ZH_UI } from "../src/data/zh-ui.js";

const ROOT = new URL("../", import.meta.url).pathname;
const FILES = ["src/data/zh-story.js", "src/data/chapters-extra.js", "src/data/zh-ui.js"];
const clean = (s) => String(s ?? "").replace(/\t/g, " ").replace(/\n/g, " ").trim();

/* ---- one flat table of every story line, keyed by where it lives ---- */
function storyEntries() {
  const rows = [];
  const add = (id, who, en, zh) => { if (zh) rows.push({ id, who: who || "", en: clean(en), zh: clean(zh) }); };

  for (const ch of CHAPTERS) {
    const zh = ZH_STORY[ch.id];
    if (!zh) continue;
    const p = `ch.${ch.id}`;
    add(`${p}.title`, "", ch.title, zh.title);
    add(`${p}.subtitle`, "", ch.subtitle, zh.subtitle);
    add(`${p}.intro`, "", ch.intro, zh.intro);
    add(`${p}.brief.place`, "", ch.brief.place, zh.brief.place);
    add(`${p}.brief.who`, "", ch.brief.who, zh.brief.who);
    add(`${p}.brief.stake`, "", ch.brief.stake, zh.brief.stake);
    add(`${p}.scroll.note`, "", ch.scroll.note, zh.scroll.note);
    add(`${p}.ending.text`, "", ch.ending.text, zh.ending.text);
    add(`${p}.ending.takeaway`, "", ch.ending.takeaway, zh.ending.takeaway);
    add(`${p}.reflection.q`, "", ch.reflection.q, zh.reflection.q);
    (ch.reflection.options || []).forEach((o, i) => {
      const z = zh.reflection.options[i] || {};
      add(`${p}.reflection.${i}.t`, "", o.t, z.t);
      add(`${p}.reflection.${i}.insight`, "", o.insight, z.insight);
    });
    if (ch.game) add(`${p}.game.prompt`, "", ch.game.prompt, zh.game && zh.game.prompt);
    for (const [nid, node] of Object.entries(ch.nodes || {})) {
      const zn = (zh.nodes || {})[nid];
      if (!zn) continue;
      (node.lines || []).forEach((ln, i) => {
        add(`${p}.${nid}.L${i}`, Array.isArray(ln) ? ln[0] : "", Array.isArray(ln) ? ln[1] : ln, (zn.l || [])[i]);
      });
      (node.choices || []).forEach((c, i) => {
        add(`${p}.${nid}.C${i}`, "", c.t, (zn.c || [])[i]);
        if (c.reply) add(`${p}.${nid}.R${i}`, c.replyBy || "", c.reply, (zn.r || [])[i]);
      });
    }
  }

  for (const spec of EXTRA_CHAPTERS) {
    const en = buildChapter(spec, "en");
    const zh = buildChapter(spec, "zh");
    const p = `ch.${en.id}`;
    add(`${p}.title`, "", en.title, zh.title);
    add(`${p}.subtitle`, "", en.subtitle, zh.subtitle);
    add(`${p}.intro`, "", en.intro, zh.intro);
    add(`${p}.brief.place`, "", en.brief.place, zh.brief.place);
    add(`${p}.brief.who`, "", en.brief.who, zh.brief.who);
    add(`${p}.brief.stake`, "", en.brief.stake, zh.brief.stake);
    add(`${p}.scroll.note`, "", en.scroll.note, zh.scroll.note);
    add(`${p}.ending.text`, "", en.ending.text, zh.ending.text);
    add(`${p}.ending.takeaway`, "", en.ending.takeaway, zh.ending.takeaway);
    add(`${p}.reflection.q`, "", en.reflection.q, zh.reflection.q);
    en.reflection.options.forEach((o, i) => {
      const z = zh.reflection.options[i] || {};
      add(`${p}.reflection.${i}.t`, "", o.t, z.t);
      add(`${p}.reflection.${i}.insight`, "", o.insight, z.insight);
    });
    if (en.game) add(`${p}.game.prompt`, "", en.game.prompt, zh.game.prompt);
    for (const [nid, node] of Object.entries(en.nodes)) {
      const zn = zh.nodes[nid];
      node.lines.forEach((ln, i) => add(`${p}.${nid}.L${i}`, ln[0], ln[1], zn.lines[i][1]));
      (node.choices || []).forEach((c, i) => {
        const zc = zn.choices[i];
        add(`${p}.${nid}.C${i}`, "", c.t, zc.t);
        if (c.reply) add(`${p}.${nid}.R${i}`, c.replyBy || "", c.reply, zc.reply);
      });
    }
  }
  return rows;
}

function uiEntries() {
  return Object.entries(ZH_UI)
    .filter(([k, v]) => typeof v === "string" && /[\u4e00-\u9fff]/.test(v))
    .map(([k, v]) => ({ id: `ui.${k}`, who: "", en: clean(k), zh: clean(v) }));
}

const cmd = process.argv[2];

if (cmd === "export") {
  const dir = process.argv[3] || ".";
  mkdirSync(dir, { recursive: true });
  const story = storyEntries();
  const ui = uiEntries();
  const head = "ID\tSPEAKER\tENGLISH\tCHINESE (rewrite this column, keep the ID)\n";
  writeFileSync(join(dir, "zh-story.tsv"), head + story.map((r) => [r.id, r.who, r.en, r.zh].join("\t")).join("\n") + "\n");
  writeFileSync(join(dir, "zh-ui.tsv"), head + ui.map((r) => [r.id, r.who, r.en, r.zh].join("\t")).join("\n") + "\n");
  console.log(`zh-story.tsv  ${story.length} lines`);
  console.log(`zh-ui.tsv     ${ui.length} lines`);
} else if (cmd === "apply") {
  const file = process.argv[3];
  if (!file) { console.error("usage: apply <file.tsv>"); process.exit(1); }
  const rows = readFileSync(file, "utf8").split("\n").filter((l) => l.trim() && !l.startsWith("ID\t"));
  const known = new Map([...storyEntries(), ...uiEntries()].map((r) => [r.id, r.zh]));
  const sources = new Map(FILES.map((f) => [f, readFileSync(join(ROOT, f), "utf8")]));
  let changed = 0, skipped = 0, bad = [];

  for (const line of rows) {
    const [id, , , ...rest] = line.split("\t");
    const next = rest.join("\t").trim();
    if (!id || !next) continue;
    const prev = known.get(id);
    if (prev === undefined) { bad.push(`${id}  (unknown ID)`); continue; }
    if (prev === next) { skipped++; continue; }
    const hits = [...sources.entries()].filter(([, text]) => text.includes(prev));
    if (hits.length !== 1) { bad.push(`${id}  (old string not unique: ${hits.length} file(s))`); continue; }
    const [f, text] = hits[0];
    sources.set(f, text.replace(prev, next));
    changed++;
  }

  for (const [f, text] of sources) writeFileSync(join(ROOT, f), text);
  console.log(`applied ${changed}, unchanged ${skipped}, refused ${bad.length}`);
  bad.forEach((b) => console.log("  ✗ " + b));
  if (bad.length) process.exitCode = 1;
} else {
  console.log("usage: node tools/zh-review.js export [dir] | apply <file.tsv>");
}
