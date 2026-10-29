/* Small, persistent quests for the travellers' camp hub.
   They never gate the biblical story — they only reward attention and prayer. */

import { countDone } from "./compendium.js";

export const QUESTS = [
  {
    id: "fire", glyph: "✟",
    titleEn: "Keep the fire lit", titleZh: "守住篝火",
    descEn: "Pause to pray in three different chapters. The fire is fed by stopping, not by running.",
    descZh: "在三个不同的章节里停下来祷告。篝火靠的是坐下来歇一歇，不是一路跑。",
    goal: 3,
    progress: (s) => (s.prayedIn || []).length,
    reward: { guidance: 2, faith: 1 }
  },
  {
    id: "keepsakes", glyph: "◍",
    titleEn: "Fill the satchel", titleZh: "装满行囊",
    descEn: "Bring back four relics from the stories. Each one is a reminder you can hold.",
    descZh: "从故事里带回四件圣物。每一件都是你能握在手里的提醒。",
    goal: 4,
    progress: (s) => (s.relics || []).length,
    reward: { guidance: 2, wisdom: 1 }
  },
  {
    id: "roads", glyph: "⌁",
    titleEn: "Walk five roads", titleZh: "走过五条路",
    descEn: "Complete five chapters. The road is learned by walking it.",
    descZh: "完成五个章节。路是一步一步走出来的。",
    goal: 5,
    progress: (s) => countDone(s),
    reward: { guidance: 3, courage: 1 }
  }
];

/* The three people you can talk to at the camp. Lines change as you progress. */
export const CAMP_NPCS = [
  {
    id: "elias", glyph: "✦", nameEn: "Corin", nameZh: "柯林",
    roleEn: "the scribe", roleZh: "文士",
    linesEn: [
      "I keep the scrolls. Whatever happens on this road I write down, so that later you can see what you were becoming while you were busy becoming it.",
      "When you hold the prayer button, you are not buying a reward. You are stopping long enough to notice God is already there.",
      "The circles around a choice are hints — virtue gates, reward previews, little lights on the path. Turn on Clean Mode in Settings and they disappear."
    ],
    linesZh: [
      "我管书卷。这条路上发生的事我都记下来——过上些日子你回头看，才看得见自己一路在变成什么样的人。",
      "按住祷告按钮，不是在换取奖励，而是停下来，久到足以察觉神早已在那里。",
      "选项周围的圆圈是提示——品格门槛、奖励预览、路上的小灯。在设置里开启「沉浸模式」，它们就会消失。"
    ]
  },
  {
    id: "miriam", glyph: "❀", nameEn: "Ada", nameZh: "艾达",
    roleEn: "keeper of the camp", roleZh: "营地守护者",
    linesEn: [
      "Everyone arrives here with empty hands. Stay a while and the hands fill up.",
      "The quest board is not a test. It is a way of noticing what you have already done.",
      "If you finish all three, I will carve your name into the camp post."
    ],
    linesZh: [
      "每个人到这里时都两手空空。待一会儿，慢慢就会有东西攒下来。",
      "任务板不是考试。它只是让你留意自己已经做过的事。",
      "若三件事都完成，我就把你的名字刻在营地的木桩上。"
    ]
  },
  {
    id: "caleb", glyph: "⌁", nameEn: "Tobin", nameZh: "托宾",
    roleEn: "a fellow traveller", roleZh: "同行的旅人",
    linesEn: [
      "I have walked ten roads. The strange thing is, they all end at the same question: what kind of person are you becoming?",
      "In the action scenes, your hands matter — drag, tap, hold. Reading about a storm is not the same as steering through one.",
      "At the end there is no scoreboard and no hint circle. Just a mirror, and a road that keeps going outside the game."
    ],
    linesZh: [
      "我走过十条路。奇怪的是，它们都通向同一个问题：你正在成为怎样的人？",
      "在互动关卡里，你的手很重要——拖动、点一下、按住不放。读一场风浪，和掌住船舵穿过去，是两件事。",
      "走到最后没有计分板，也没有提示圈。只有一面镜子，和一条出了游戏还接着往前去的路。"
    ]
  }
];

/* Camp day cycle — the sky changes as the story advances. */
export const DAY_PHASES = [
  { key: "dawn",   en: "Dawn",   zh: "黎明", tint: "rgba(255,178,110,.30)", orb: "#ffe3a8" },
  { key: "morning",en: "Morning",zh: "清晨", tint: "rgba(255,225,170,.12)", orb: "#fff3cf" },
  { key: "noon",   en: "Noon",   zh: "正午", tint: "rgba(255,246,214,.06)", orb: "#fffbe9" },
  { key: "dusk",   en: "Dusk",   zh: "黄昏", tint: "rgba(214,120,86,.28)", orb: "#ffbf83" },
  { key: "night",  en: "Night",  zh: "夜晚", tint: "rgba(20,38,72,.46)", orb: "#dbe6ff" }
];
