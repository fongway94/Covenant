/* "Go deeper" — one concrete invitation per chapter to open the actual Bible.
   Kept outside CHAPTERS because i18n rebuilds chapter 1–6 objects in place;
   a keyed module is language-safe and never drifts out of sync.

   These are observations and questions, NOT extra doctrine. Each ref points to
   the real passage (KJV / 中文和合本, public domain). */

const B = (en, zh) => ({ en, zh });

export const DEEPER = {
  elah: {
    ref: B("1 Samuel 17", "撒母耳记上 17 章"),
    hook: B("Count how many people try to stop David before he reaches the valley — his brother, Saul, Goliath, and his own equipment.",
      "数一数，在大卫走到山谷之前，有多少人试图拦住他——他的哥哥、扫罗、歌利亚，还有那副盔甲。"),
    ask: B("What armour are you wearing that God never gave you?", "你身上穿着哪些神从未给你的盔甲？")
  },
  lions: {
    ref: B("Daniel 6", "但以理书 6 章"),
    hook: B("Notice that Daniel’s enemies cannot find a single fault in him, so they have to invent a law about prayer.",
      "留意：但以理的仇敌找不出他任何把柄，只好发明一条关于祷告的禁令。"),
    ask: B("What habit would your opponents be able to predict about you?", "你的「对头」能预测你哪一个习惯？")
  },
  jericho: {
    ref: B("Luke 10:25–37", "路加福音 10:25–37"),
    hook: B("Jesus never says the Samaritan was a good person. He only says the man “shewed mercy” — and then turns the question back on the lawyer.",
      "耶稣从未说撒玛利亚人是个好人。祂只说那人「动了慈心」——然后把问题抛回给律法师。"),
    ask: B("Whose neighbour would cost you something to be?", "成为谁的邻舍，会让你付出代价？")
  },
  storm: {
    ref: B("Mark 4:35–41", "马可福音 4:35–41"),
    hook: B("The storm arrives after the disciples obey Jesus’ instruction to cross the lake. Obedience did not prevent the storm.",
      "风浪是在门徒顺服耶稣「渡到那边去」之后才来的。顺服并没有阻止风浪。"),
    ask: B("When has doing the right thing made the weather worse?", "什么时候，做对的事反而让风浪更大？")
  },
  prodigal: {
    ref: B("Luke 15:11–32", "路加福音 15:11–32"),
    hook: B("The father interrupts his son’s rehearsed apology with a robe and a ring. The story ends with the elder brother still outside, unanswered.",
      "父亲用袍子和戒指打断了儿子背好的认罪词。故事的结尾，大儿子还在门外，没有答案。"),
    ask: B("Which brother are you in this chapter today?", "在这一章里，今天的你是哪一个儿子？")
  },
  esther: {
    ref: B("Esther 3–8", "以斯帖记 3–8 章"),
    hook: B("God is never mentioned by name in the whole book. The story is built out of timing, an insomnia and a banquet.",
      "整卷以斯帖记一次也没有提到神的名字。这个故事是一点一点串起来的：一次失眠，两场筵席，一个刚刚好的时机。"),
    ask: B("Where have you seen God’s work in a story that never says His name?", "有没有哪件事，从头到尾没提神的名字，你却看见祂在工作？")
  },
  bush: {
    ref: B("Exodus 3–4", "出埃及记 3–4 章"),
    hook: B("Moses argues with the call five times. God never once answers “you are qualified” — only “I will be with thee.”",
      "摩西五次推辞呼召。神一次也没有回答「你够资格」，只说「我必与你同在」。"),
    ask: B("Which of Moses’ five objections is yours?", "摩西的五个推辞里，哪一个属于你？")
  },
  ruth: {
    ref: B("Ruth 1–4", "路得记 1–4 章"),
    hook: B("Boaz leaves extra grain on purpose (Ruth 2:16). The book ends with a genealogy that leads to David — and later to Jesus.",
      "波阿斯故意多留下麦穗（路得记 2:16）。全书以一份家谱结束，通向大卫——后来通向耶稣。"),
    ask: B("Who is allowed to gather from the corners of your field?", "谁可以到你田角去拾麦穗？")
  },
  jonah: {
    ref: B("Jonah 1–4", "约拿书 1–4 章"),
    hook: B("The book ends with God asking Jonah a question about a plant and a city — and never records the answer.",
      "这卷书以神问约拿一个关于一棵蓖麻和一座城的问题结束——而且没有记下答案。"),
    ask: B("What would you answer God at the end of Jonah 4?", "在约拿书第 4 章结尾，你会怎样回答神？")
  },
  zacchaeus: {
    ref: B("Luke 19:1–10", "路加福音 19:1–10"),
    hook: B("Zacchaeus offers fourfold repayment before Jesus says anything about his money. Grace arrived before the bill.",
      "耶稣还没有提到钱，撒该就主动提出四倍偿还。恩典先到，偿还随后就跟了上来。"),
    ask: B("What would you change if you were welcomed first?", "如果你先被接纳，你会主动改变什么？")
  }
};

export function deeperFor(id, zh) {
  const d = DEEPER[id];
  if (!d) return null;
  return {
    ref: d.ref[zh ? "zh" : "en"],
    hook: d.hook[zh ? "zh" : "en"],
    ask: d.ask[zh ? "zh" : "en"]
  };
}
