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
  [/看它怎么动|看手怎么/, "看它怎么动", "说清看的是什么：先看一遍示范"],
  [/认错(三|两|一)?次/, "认错三次", "“认错”是承认过错；这里写“看错三次”"],
  [/任由它保持/, "任由它保持", "别照搬英文从句，直接说结果"],
  [/像[^，。；：]{0,8}的样子/, "像……的样子", "「looks like」照搬成了「样子」；直接说这个人怎么样：腿不勇敢、手在抖"],
  [/(腿|脚|胳膊|手臂)(还是|就)?把(你|他|她)/, "身体部位当主语", "中文不让腿、脚、胳膊替人做事；写成「你还是往前走了」"],
  [/一个(确信|把握)/, "「a certainty」的量词", "确信、把握用「一份」，或者干脆不用量词（「一个感觉」是口语，可以）"],
  [/像(一下)?停了呼吸/, "像停了呼吸", "呼吸是「屏住」的：整座山谷屏住了呼吸"],
  [/就是这样落地的/, "就是这样落地的", "「lands」别直译；说「就是这样实实在在的」"],
  [/从里面看/, "从里面看", "「from the inside」别直译；说「人在勇敢的那一刻，往往自己并不觉得」"],
  [/比喻的形状/, "比喻的形状", "「the shape of the parable」别直译；说「这个比喻的意思」"],
  [/一位同在者/, "一位同在者", "「a presence」译成了名词；说「一位一直与你同在的神」"],
  [/王晓谕/, "王晓谕", "「王」和「晓谕」连读像人名；写「王又向天下各国颁布谕旨」"],
  [/他不在了/, "他不在了", "中文里这是「去世」的意思；写「坑里已经没有声音了」"],
  [/一种远方/, "一种远方", "「its own kind of far country」的比喻译不过来；把意思说出来：人还在家里，心也会走远"],
  [/不是一种心情/, "不是一种心情", "「not a feeling」别直译；说「不只是心里难受一下」"],
  [/你的地址/, "你的地址", "「your address」别直译；说「你现在站的地方」"],
  [/整个人/, "整个人", "「整个人」当副词是英文腔；说清是谁做了什么动作"],
  [/就会这样回应/, "就会这样回应", "「回应」太空；说「人自己就会想这样做」"],
];

/* Lines the player has read and approved. If a future pass makes one of these
   trip a rule above, the rule is wrong — not the line. Recorded 2026-10-29. */
const KEEP = [
  "成了信心的起点",
  "爱是一个方向",
  "法律改变时也没有改变的祷告习惯",
  "重复同一个决定",
  "从一个很小的「不肯」开始的",
  "合在一个问题上，而不是一个答案上",
  "都有真实的地址",
  "看见恩典的人，都是这样",
  "在那样一个时刻",
  "成了这段爱情的开头",
  "是因为他先被接纳了",
  "心里怕，可你没有跑",
  "还要算上一笔代价",
];

/* Punctuation is never a matter of taste — these apply even to kept lines. */
const ALWAYS = [
  [/。。|，，|、、/, "重复标点", "删掉重复的标点"],
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
    const kept = KEEP.some((k) => line.includes(k));
    for (const [re, label, fix] of (kept ? ALWAYS : BANNED)) {
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
