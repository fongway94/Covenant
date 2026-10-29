#!/usr/bin/env node
/* Chinese copy lint.
   The Chinese in this game is written, not translated. This tool reads every
   source file and fails on the phrasings that have actually read badly to
   players — literal renderings of English grammar that leave a Chinese
   sentence with no subject, or that turn "no clock" into a rule about losing."
   Run: npm run check:copy */

import { readFileSync } from "node:fs";
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = new URL("../", import.meta.url).pathname;
const CJK = /[\u4e00-\u9fff]/;

/* Each entry: what it is, the pattern, and what to write instead. */
const BANNED = [
  [/手怎么动/, "手怎么动", "说清是谁在动：手指在画面上拖，画面停在这里等你"],
  [/不会动/, "不会动", "补出主语或改说“停在这里”“才开始”"],
  [/不会输/, "不会输", "不解释输赢，只说“不着急”"],
  [/没有倒计时/, "没有倒计时", "不解释计时规则，只说“不着急”"],
  [/点得动/, "点得动", "金色选项“需要更高的品格”，不是“才点得动”"],
  [/不给分(?!数)/, "不给分", "跳过按钮写“不拿奖励”"],
  [/你的手[:：]/, "你的手：", "直接写这一句要做什么"],
  [/按住以$/, "按住以（悬空的动词）", "写成完整的一句"],
  [/。。|，，|、、/, "重复标点", "删掉重复的标点"],
  [/的的|地地的/, "叠字", "改掉"],
  [/对于.{0,12}来说/, "对于……来说", "中文一般直接说“对……”，或换个说法"],
  [/进行.{0,6}(操作|选择|互动)/, "进行……操作", "直接用动词：拖动、选择、点一下"],
];

function files(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) { files(p, out); continue; }
    if (name.endsWith(".js") || name.endsWith(".css")) out.push(p);
  }
  return out;
}

const problems = [];
let checked = 0;

for (const file of files(join(ROOT, "src"))) {
  const text = readFileSync(file, "utf8");
  const rel = file.slice(ROOT.length);
  text.split("\n").forEach((line, i) => {
    if (!CJK.test(line)) return;
    checked++;
    for (const [re, label, fix] of BANNED) {
      if (re.test(line)) problems.push({ rel, line: i + 1, label, fix, text: line.trim().slice(0, 96) });
    }
  });
}

if (problems.length) {
  console.error(`✗ ${problems.length} Chinese copy problem(s):\n`);
  for (const p of problems) {
    console.error(`  ${p.rel}:${p.line}  [${p.label}]\n    ${p.text}\n    → ${p.fix}\n`);
  }
  process.exit(1);
}

console.log(`✓ ${checked} Chinese lines read clean — no literal-English phrasing, no repeated punctuation.`);
