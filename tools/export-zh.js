#!/usr/bin/env node
/* Export every Chinese line next to its English original, with a stable ID, so a
   human (or a language model) can rewrite the Chinese and hand the file back to
   tools/import-zh.js without anything needing to be re-typed or re-found.

   Run: node tools/export-zh.js [outfile]   (default: zh-review.tsv) */
import { writeFileSync } from "node:fs";
import { CHAPTERS } from "../src/data/chapters.js";
import { EXTRA_CHAPTERS, buildChapter } from "../src/data/chapters-extra.js";
import { ZH_STORY } from "../src/data/zh-story.js";

const SPECS = {};
for (const s of EXTRA_CHAPTERS) SPECS[s.id] = s;

const out = [];
const push = (id, who, en, zh) => {
  if (!zh) return;
  out.push([id, who || "", clean(en || ""), clean(zh)].join("\t"));
};
const clean = (s) => String(s).replace(/\t/g, " ").replace(/\n/g, " ").trim();

const enChapters = CHAPTERS;
const zhIds = Object.keys(ZH_STORY);

for (const ch of enChapters) {
  const zh = ZH_STORY[ch.id];
  if (!zh) continue;
  const p = `ch.${ch.id}`;
  push(`${p}.title`, "", ch.title, zh.title);
  push(`${p}.subtitle`, "", ch.subtitle, zh.subtitle);
  push(`${p}.intro`, "", ch.intro, zh.intro);
  push(`${p}.brief.place`, "", ch.brief.place, zh.brief.place);
  push(`${p}.brief.who`, "", ch.brief.who, zh.brief.who);
  push(`${p}.brief.stake`, "", ch.brief.stake, zh.brief.stake);
  push(`${p}.scroll.note`, "", ch.scroll.note, zh.scroll.note);
  push(`${p}.ending.text`, "", ch.ending.text, zh.ending.text);
  push(`${p}.ending.takeaway`, "", ch.ending.takeaway, zh.ending.takeaway);
  push(`${p}.reflection.q`, "", ch.reflection.q, zh.reflection.q);
  (ch.reflection.options || []).forEach((o, i) => {
    const z = zh.reflection.options[i] || {};
    push(`${p}.reflection.${i}.t`, "", o.t, z.t);
    push(`${p}.reflection.${i}.insight`, "", o.insight, z.insight);
  });
  if (ch.game) push(`${p}.game.prompt`, "", ch.game.prompt, zh.game && zh.game.prompt);
  for (const [nid, node] of Object.entries(ch.nodes || {})) {
    const zn = (zh.nodes || {})[nid];
    if (!zn) continue;
    (node.lines || []).forEach((ln, i) => {
      const who = Array.isArray(ln) ? ln[0] : "";
      const en = Array.isArray(ln) ? ln[1] : ln;
      push(`${p}.${nid}.L${i}`, who, en, (zn.l || [])[i]);
    });
    (node.choices || []).forEach((c, i) => {
      const zc = (zn.c || [])[i];
      push(`${p}.${nid}.C${i}`, "", c.t, zc);
      if (c.reply) push(`${p}.${nid}.R${i}`, c.replyBy || "", c.reply, (zn.r || [])[i]);
    });
  }
}

for (const spec of EXTRA_CHAPTERS) {
  const en = buildChapter(spec, "en");
  const zh = buildChapter(spec, "zh");
  const p = `ch.${en.id}`;
  push(`${p}.title`, "", en.title, zh.title);
  push(`${p}.subtitle`, "", en.subtitle, zh.subtitle);
  push(`${p}.intro`, "", en.intro, zh.intro);
  push(`${p}.brief.place`, "", en.brief.place, zh.brief.place);
  push(`${p}.brief.who`, "", en.brief.who, zh.brief.who);
  push(`${p}.brief.stake`, "", en.brief.stake, zh.brief.stake);
  push(`${p}.scroll.note`, "", en.scroll.note, zh.scroll.note);
  push(`${p}.ending.text`, "", en.ending.text, zh.ending.text);
  push(`${p}.ending.takeaway`, "", en.ending.takeaway, zh.ending.takeaway);
  push(`${p}.reflection.q`, "", en.reflection.q, zh.reflection.q);
  en.reflection.options.forEach((o, i) => {
    const z = zh.reflection.options[i] || {};
    push(`${p}.reflection.${i}.t`, "", o.t, z.t);
    push(`${p}.reflection.${i}.insight`, "", o.insight, z.insight);
  });
  if (en.game) push(`${p}.game.prompt`, "", en.game.prompt, zh.game.prompt);
  for (const [nid, node] of Object.entries(en.nodes)) {
    const zn = zh.nodes[nid];
    node.lines.forEach((ln, i) => push(`${p}.${nid}.L${i}`, ln[0], ln[1], zn.lines[i][1]));
    (node.choices || []).forEach((c, i) => {
      const zc = zn.choices[i];
      push(`${p}.${nid}.C${i}`, "", c.t, zc.t);
      if (c.reply) push(`${p}.${nid}.R${i}`, c.replyBy || "", c.reply, zc.reply);
    });
  }
}

const file = process.argv[2] || "zh-review.tsv";
writeFileSync(file, "ID\tSPEAKER\tENGLISH ORIGINAL\tCURRENT CHINESE\n" + out.join("\n") + "\n", "utf8");
console.log(`${out.length} lines → ${file}`);
