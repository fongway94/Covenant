#!/usr/bin/env node
/* Theological integrity guard: no invented words in the mouth of Jesus or the
   divine Voice. Any line attributed to "jesus" or "voice" must be an exact,
   approved KJV / 中文和合本 quotation (truncation with an ellipsis is allowed
   only where the allowlist explicitly contains it).

   Run: npm run check:redletter */

const store = new Map();
globalThis.localStorage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)) };

const i18n = await import("../src/core/i18n.js");
const { CHAPTERS } = await import("../src/data/chapters.js");

/* Each entry: [exact text as it appears in the game, passage]. */
const ALLOWED = {
  en: [
    ["A certain man went down from Jerusalem to Jericho, and fell among thieves…", "Luke 10:30"],
    ["Which now of these three, thinkest thou, was neighbour unto him that fell among the thieves?", "Luke 10:36"],
    ["Go, and do thou likewise.", "Luke 10:37"],
    ["Let us pass over unto the other side.", "Mark 4:35"],
    ["Peace, be still.", "Mark 4:39"],
    ["Why are ye so fearful? how is it that ye have no faith?", "Mark 4:40"],
    ["I am the God of thy father, the God of Abraham, the God of Isaac, and the God of Jacob.", "Exodus 3:6"],
    ["I have surely seen the affliction of my people … and I am come down to deliver them. Come now therefore, and I will send thee unto Pharaoh.", "Exodus 3:7–10"],
    ["Zacchaeus, make haste, and come down; for to day I must abide at thy house.", "Luke 19:5"],
    ["“For the Son of man is come to seek and to save that which was lost.”", "Luke 19:10"]
  ],
  zh: [
    ["「有一个人从耶路撒冷下耶利哥去，落在强盗手中……」", "路加福音 10:30"],
    ["「你想，这三个人哪一个是落在强盗手中的邻舍呢？」", "路加福音 10:36"],
    ["「你去照样行吧。」", "路加福音 10:37"],
    ["「我们渡到那边去吧。」", "马可福音 4:35"],
    ["「住了吧！静了吧！」", "马可福音 4:39"],
    ["「为什么胆怯？你们还没有信心吗？」", "马可福音 4:40"],
    ["我是你父亲的神，是亚伯拉罕的神、以撒的神、雅各的神。", "出埃及记 3:6"],
    ["我实在看见我百姓的困苦了……我下来是要救他们。故此，我要打发你去见法老。", "出埃及记 3:7–10"],
    ["撒该，快下来！今天我必住在你家里。", "路加福音 19:5"],
    ["「人子来，为要寻找拯救失丧的人。」", "路加福音 19:10"]
  ]
};

let checked = 0;
let failed = false;

for (const lang of ["en", "zh"]) {
  i18n.setLang(lang);
  const map = new Map(ALLOWED[lang]);
  const found = new Set();
  for (const ch of CHAPTERS) {
    for (const [id, n] of Object.entries(ch.nodes)) {
      for (const line of (n.lines || [])) {
        if (!["jesus", "voice"].includes(line[0])) continue;
        checked++;
        found.add(line[1]);
        if (!map.has(line[1])) {
          console.error(`  ✗ ${lang} ${ch.id}/${id} [${line[0]}]: NOT SCRIPTURE — ${JSON.stringify(line[1])}`);
          failed = true;
        }
      }
      for (const c of (n.choices || [])) {
        if (!c.reply || !["jesus", "voice"].includes(c.replyBy)) continue;
        checked++;
        found.add(c.reply);
        if (!map.has(c.reply)) {
          console.error(`  ✗ ${lang} ${ch.id}/${id} REPLY [${c.replyBy}]: NOT SCRIPTURE — ${JSON.stringify(c.reply)}`);
          failed = true;
        }
      }
    }
  }
  for (const [text] of ALLOWED[lang]) {
    if (!found.has(text)) console.log(`  · ${lang}: approved line currently unused — ${text.slice(0, 46)}…`);
  }
  console.log(`  ${lang}: ${found.size} distinct quotations, all in the KJV / 和合本 allowlist`);
}

/* Guard the framing rule too: the mirror must never claim to be MBTI. */
const { MIRROR_COPY } = await import("../src/data/mirror.js");
const disclaimer = MIRROR_COPY.disclaimer.en + MIRROR_COPY.disclaimer.zh;
if (!/not an MBTI type|不是 MBTI/.test(disclaimer)) {
  console.error("  ✗ mirror disclaimer must explicitly reject personality typing");
  failed = true;
}
for (const needed of ["1 Samuel 16:7", "撒母耳记上 16:7"]) {
  if (!disclaimer.includes(needed)) { console.error("  ✗ mirror disclaimer missing " + needed); failed = true; }
}

if (failed) process.exit(1);
console.log(`\n✓ Red-letter rule holds in both languages (${checked} attributed lines checked).`);
