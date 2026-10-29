/* ============================================================================
   THE JOURNEY MIRROR — a Bible-linked reflection, NOT a personality test.

   Why this exists
   ---------------
   MBTI and similar typologies are (a) not biblically grounded, (b) weak on
   test–retest reliability, and (c) risk telling a player "you ARE this type",
   which is a claim Scripture reserves for God who searches the heart
   (1 Samuel 16:7; Jeremiah 17:9-10). So we do not measure personality here.

   What we actually do: report the player's OWN recorded behaviour in the game
   (which virtues grew, and four observable "ways of walking"), then hold it up
   beside people God chose to write about. Paul gives the warrant for exactly
   this: "all these things happened unto them for ensamples: and they are
   written for our admonition" (1 Corinthians 10:11), and "whatsoever things
   were written aforetime were written for our learning" (Romans 15:4).
   James supplies the image: the word is a mirror you look into and then act on
   (James 1:23-24).

   Every profile therefore includes the person's REAL failure as well as their
   strength, and ends with grace rather than self-improvement advice. "Let him
   that thinketh he standeth take heed lest he fall" (1 Corinthians 10:12).

   All Scripture here is KJV (English) / 中文和合本 (Chinese), public domain.
   ============================================================================ */

import { STAT_KEYS } from "./compendium.js";

const B = (en, zh) => ({ en, zh });

/* Four observable ways of walking. These are behaviours, not personality
   dimensions — they are counted from what the player actually did. */
export const WAYS = {
  step: {
    glyph: "⚔",
    name: B("You step forward", "迈步向前"),
    desc: B("You chose the hard option, entered the action scenes and opened locked doors.",
      "你选择困难的那条路，进入互动关卡，也打开了原本锁住的门。"),
    verse: B("Go, and do thou likewise.", "你去照样行吧。"),
    ref: B("Luke 10:37", "路加福音 10:37")
  },
  notice: {
    glyph: "✦",
    name: B("You notice", "留心观察"),
    desc: B("You searched the artwork, opened the scroll, revealed hints and sat with the reflection questions.",
      "你搜寻画面、打开书卷、显明提示，也认真回答了反思题。"),
    verse: B("I will now turn aside, and see this great sight.", "我过去要看这大异象。"),
    ref: B("Exodus 3:3", "出埃及记 3:3")
  },
  stay: {
    glyph: "♥",
    name: B("You stay", "陪伴留下"),
    desc: B("You chose the merciful answer, talked with the travellers and finished the camp tasks.",
      "你选择怜悯的回答，与营地旅人交谈，也完成了营地的任务。"),
    verse: B("whither thou goest, I will go", "你往哪里去，我也往那里去。"),
    ref: B("Ruth 1:16", "路得记 1:16")
  },
  wait: {
    glyph: "✟",
    name: B("You wait", "安静等候"),
    desc: B("You prayed, breathed at the campfire and chose trust before action.",
      "你祷告、在营火旁呼吸，也常在行动之前先选择信靠。"),
    verse: B("Be still, and know that I am God.", "你们要休息，要知道我是神。"),
    ref: B("Psalm 46:10", "诗篇 46:10")
  }
};
export const WAY_KEYS = Object.keys(WAYS);

/* The virtue that each way tends to grow. Used only as a fallback for old
   saves that predate behaviour tracking. */
const VIRTUE_FOR_WAY = { step: "courage", notice: "wisdom", stay: "compassion", wait: "faith" };
const WAY_FOR_VIRTUE = { courage: "step", wisdom: "notice", compassion: "stay", faith: "wait" };
export { WAY_FOR_VIRTUE };

/* ---------------------------------------------------------------- profiles
   Each profile is anchored to one of the ten chapters, so the mirror sends the
   player back into Scripture instead of into a personality label. */
export const PROFILES = [
  {
    id: "david", chapter: "elah", way: "step", virtue: "courage", glyph: "⚔",
    name: B("David", "大卫"),
    role: B("the shepherd who stepped forward", "迎上前去的牧羊人"),
    ref: B("1 Samuel 17 · 2 Samuel 11 · Psalm 51", "撒母耳记上 17 章 · 撒母耳记下 11 章 · 诗篇 51 篇"),
    verse: B("And all this assembly shall know that the LORD saveth not with sword and spear: for the battle is the LORD’S.",
      "又使这众人知道耶和华使人得胜，不是用刀用枪，因为争战的胜败全在乎耶和华。"),
    verseRef: B("1 Samuel 17:47", "撒母耳记上 17:47"),
    why: B("You kept choosing the front of the line. Like David, your instinct was to move toward the noise rather than away from it — and the game gave you Courage for it.",
      "你一次又一次选择走向最前面。像大卫一样，你的本能是朝巨响走过去，而不是往后退——所以这里记你一份勇气。"),
    shadow: B("David also wrote Psalm 51 after committing adultery and arranging Uriah’s death (2 Samuel 11). The brave man became a broken man. Scripture does not hide it.",
      "大卫在犯奸淫、设计杀害乌利亚之后，写了诗篇 51 篇（撒母耳记下 11 章）。勇敢的人后来成了破碎的人。圣经没有把这段藏起来。"),
    grace: B("God did not discard him. “A broken and a contrite heart, O God, thou wilt not despise” (Psalm 51:17). Courage is not the same as never falling.",
      "神没有丢弃他。「神所要的祭就是忧伤的灵；神啊，忧伤痛悔的心，你必不轻看。」（诗篇 51:17）勇敢，不等于永不跌倒。"),
    read: B("Read 1 Samuel 17, then 2 Samuel 11–12 and Psalm 51 in one sitting. Ask: where did David stop asking the LORD?",
      "连着读撒母耳记上 17 章、撒母耳记下 11–12 章、诗篇 51 篇。问：大卫是从哪里开始不再求问耶和华的？")
  },
  {
    id: "esther", chapter: "esther", way: "step", virtue: "wisdom", glyph: "✥",
    name: B("Esther", "以斯帖"),
    role: B("the queen who chose her moment", "选择时机的王后"),
    ref: B("Esther 3–8", "以斯帖记 3–8 章"),
    verse: B("and who knoweth whether thou art come to the kingdom for such a time as this?",
      "焉知你得了王后的位分不是为现今的机会吗？"),
    verseRef: B("Esther 4:14", "以斯帖记 4:14"),
    why: B("You planned, waited for the right moment, then moved. Esther did not rush the throne room; she fasted three days, and then she went in anyway.",
      "你会先盘算，等合适的时机，然后行动。以斯帖没有莽撞地冲进王宫；她禁食三天，然后仍然走了进去。"),
    shadow: B("Esther hid her Jewish identity until she had to reveal it, and the book never once names God. Faithfulness inside a hostile court is complicated — the Bible lets it stay complicated.",
      "以斯帖一直藏着自己的犹太人身分，直到不得不说；而这卷书一次也没有提到神的名。在敌对的宫廷里守住所信，本来就复杂——圣经没有把它讲简单。"),
    grace: B("Deliverance came anyway. God was at work in a book where His name is never spoken — which is precisely why the story is in the canon.",
      "拯救还是来了。神在一卷从没提过祂名字的书里工作——这正是这卷书留在圣经里的原因。"),
    read: B("Read Esther 3–8. Count how many “coincidences” the story stacks up before the decree is reversed.",
      "读以斯帖记 3–8 章。数一数，在谕令收回之前，故事里攒了多少个「巧合」。")
  },
  {
    id: "jonah", chapter: "jonah", way: "step", virtue: "faith", glyph: "◷",
    name: B("Jonah", "约拿"),
    role: B("the prophet who ran the other way", "往反方向跑的先知"),
    ref: B("Jonah 1–4", "约拿书 1–4 章"),
    verse: B("Salvation is of the LORD.", "救恩出于耶和华。"),
    verseRef: B("Jonah 2:9", "约拿书 2:9"),
    why: B("You act and you do believe — but sometimes you move in the wrong direction first. Jonah boarded a ship going the opposite way, yet prayed the truest prayer in the book from inside a fish.",
      "你会行动，也确实相信——只是有时会先朝错的方向走。约拿上了一条反方向的船，却在鱼腹里祷告了全书最真实的祷告。"),
    shadow: B("Jonah’s problem was never doubt; it was a small heart. In chapter 4 he is angry that God forgave Nineveh, and he quotes God’s mercy back at Him as a complaint (Jonah 4:2).",
      "约拿的问题从来不是怀疑，而是心胸狭小。第 4 章里，他因神赦免尼尼微而发怒，甚至把神的怜悯当作抱怨的理由引用出来（约拿书 4:2）。"),
    grace: B("God answered a prayer offered in the dark, then stayed to argue with the prophet’s grudge. Mercy pursued the reluctant one too.",
      "神垂听了黑暗中献上的祷告，又留下来与先知的怨气争辩。怜悯也追着那个不情愿的人。"),
    read: B("Read all four chapters of Jonah — it takes ten minutes. Sit with the unanswered question God asks in 4:11.",
      "把约拿书四章一次读完——只需要十分钟。然后停在 4:11 那个神没有回答的问题上。")
  },
  {
    id: "samaritan", chapter: "jericho", way: "stay", virtue: "compassion", glyph: "❀",
    name: B("The Samaritan", "撒玛利亚人"),
    role: B("the one who came near", "那位靠近伤者的人"),
    ref: B("Luke 10:25–37", "路加福音 10:25–37"),
    verse: B("Go, and do thou likewise.", "你去照样行吧。"),
    verseRef: B("Luke 10:37", "路加福音 10:37"),
    why: B("You kept stopping for the person at the edge of the scene. That is the whole shape of this parable: the one who helped was the one who came near.",
      "你总是为画面边缘的那个人停下来。这正是这个比喻的意思：肯伸出手的，是那个愿意靠近的人。"),
    shadow: B("Be honest about the category: this man is a character inside a parable Jesus told, not a named historical person. And the word “good” is never used of him — the lawyer can only answer “He that shewed mercy on him” (Luke 10:37).",
      "要诚实地看待这个类别：这人是耶稣比喻里的角色，不是有名字的历史人物。圣经也从未用「善良」形容他——律法师只能回答：「是怜悯他的。」（路加福音 10:37）"),
    grace: B("The point is not “be a hero”. It is that the mercy you received is the mercy you now owe (Luke 10:27–37). You are the wounded man in the ditch first.",
      "重点不是「成为英雄」，而是：你所领受的怜悯，如今成了你所欠的怜悯（路加福音 10:27–37）。你首先是躺在沟里的那个伤者。"),
    read: B("Read Luke 10:25–37. Notice how the question changes from “who is my neighbour?” to “who was neighbour?” — whose neighbour will you be?",
      "读路加福音 10:25–37。留意问题怎样从「谁是我的邻舍」变成「哪一个是邻舍」——那么，你愿意成为谁的邻舍？")
  },
  {
    id: "ruth", chapter: "ruth", way: "stay", virtue: "courage", glyph: "❧",
    name: B("Ruth", "路得"),
    role: B("the foreigner who stayed", "选择留下的外邦女子"),
    ref: B("Ruth 1–4", "路得记 1–4 章"),
    verse: B("whither thou goest, I will go … thy people shall be my people, and my God my God.",
      "你往哪里去，我也往那里去……你的国就是我的国，你的神就是我的神。"),
    verseRef: B("Ruth 1:16", "路得记 1:16"),
    why: B("You stayed. Not dramatically — you just kept showing up. Ruth’s faithfulness is one decision repeated every morning in a field that did not belong to her.",
      "你留下了。并不轰轰烈烈——只是一直出现。路得的忠心，是在一块不属于她的田里，每天早晨重复同一个决定。"),
    shadow: B("Ruth had no power at all: no husband, no land, no child, and she was a Moabite in Israel. Her story is not a triumph of strategy. She is rescued, not self-made.",
      "路得毫无能力：没有丈夫、没有土地、没有孩子，而且她是在以色列的摩押女子。她的故事不是策略的胜利。她是被救赎的，不是白手起家的。"),
    grace: B("Boaz notices her (Ruth 2:5–12). Her “reward” is a redeemer — and the genealogy at the end leads to David, and eventually to Jesus (Matthew 1:5).",
      "波阿斯留意到她（路得记 2:5–12）。她所得的「奖赏」是一位救赎者——而书末的家谱通向大卫，最终通向耶稣（马太福音 1:5）。"),
    read: B("Read Ruth 1–4 in one sitting. Count how often kindness is shown before anyone has earned it.",
      "一次读完路得记 1–4 章。数一数，有多少次恩慈是在人还不配得的时候就临到的。")
  },
  {
    id: "moses", chapter: "bush", way: "notice", virtue: "wisdom", glyph: "✦",
    name: B("Moses", "摩西"),
    role: B("the man who turned aside to look", "转过身去看的人"),
    ref: B("Exodus 3–4 · Numbers 20", "出埃及记 3–4 章 · 民数记 20 章"),
    verse: B("I will now turn aside, and see this great sight, why the bush is not burnt.",
      "我过去要看这大异象，为何荆棘被火烧着却没有烧毁呢？"),
    verseRef: B("Exodus 3:3", "出埃及记 3:3"),
    why: B("You are the one who looks twice — at the hidden detail, at the footnote, at the person in the background. Moses’ calling began with turning aside to look.",
      "你是那个会再看一眼的人——看见隐藏的细节、脚注，以及背景里的那个人。摩西的呼召，是从「转过身去看」开始的。"),
    shadow: B("He argued with the call five times (Exodus 3–4), and years later struck the rock instead of speaking to it (Numbers 20:11–12). Seeing clearly did not make him obedient.",
      "他五次与呼召争辩（出埃及记 3–4 章），多年后又用杖击打磐石，而不是吩咐磐石（民数记 20:11–12）。看得清楚，并没有使他顺服。"),
    grace: B("God answered none of Moses’ objections with “you are qualified” — only “Certainly I will be with thee” (Exodus 3:12).",
      "神没有用「你够资格」来回答摩西的任何一次推辞——祂只说：「我必与你同在。」（出埃及记 3:12）"),
    read: B("Read Exodus 3–4, then Numbers 20:1–13. Ask: what did Moses see correctly, and what did he stop trusting?",
      "读出埃及记 3–4 章，再读民数记 20:1–13。问：摩西看对了什么？又是在哪里停止了信靠？")
  },
  {
    id: "daniel", chapter: "lions", way: "wait", virtue: "faith", glyph: "✟",
    name: B("Daniel", "但以理"),
    role: B("the man who prayed anyway", "仍然祷告的人"),
    ref: B("Daniel 6 · Daniel 9", "但以理书 6 章 · 9 章"),
    verse: B("he kneeled upon his knees three times a day, and prayed … as he did aforetime.",
      "一日三次，双膝跪在他神面前，祷告感谢，与素常一样。"),
    verseRef: B("Daniel 6:10", "但以理书 6:10"),
    why: B("You pause before you move. Daniel’s courage was not a shout; it was a habit of prayer that did not change when the law did.",
      "你会在行动之前先停下来。但以理的勇气不是呐喊，而是一个在法律改变时也没有改变的祷告习惯。"),
    shadow: B("The Bible records no scandal about Daniel. But in Daniel 9:5 he prays “we have sinned” — including himself. The most disciplined person in the book still counted himself among the guilty.",
      "圣经没有记载但以理的丑闻。但在但以理书 9:5，他祷告说「我们犯罪作孽」——把自己也算在里面。全书最自律的人，仍把自己列在罪人之中。"),
    grace: B("God shut the lions’ mouths (Daniel 6:22) — not because Daniel was impressive, but because God was faithful.",
      "神封住了狮子的口（但以理书 6:22）——不是因为但以理很了不起，而是因为神信实。"),
    read: B("Read Daniel 6, then Daniel 9:1–19. Compare the man in the den with the man on his face in prayer.",
      "读但以理书 6 章，再读 9:1–19。比较狮子坑里的那个人，与俯伏祷告的那个人。")
  },
  {
    id: "father", chapter: "prodigal", way: "wait", virtue: "compassion", glyph: "◎",
    name: B("The father", "那位父亲"),
    role: B("the one who watched the road", "一直望着路口的人"),
    ref: B("Luke 15:11–32", "路加福音 15:11–32"),
    verse: B("when he was yet a great way off, his father saw him, and had compassion, and ran.",
      "相离还远，他父亲看见，就动了慈心，跑去抱着他的颈项。"),
    verseRef: B("Luke 15:20", "路加福音 15:20"),
    why: B("You often chose the gentle answer and let people come back. The father in this parable does not chase, bargain or lecture — he watches the road, and runs when he sees a figure.",
      "你常常选择温和的回答，也给人回头的余地。比喻里的父亲没有追赶、没有讲条件、没有说教——他只是望着那条路，看见人影就跑过去。"),
    shadow: B("This is a parable about God, not a parenting technique. And the elder brother is left outside in the final scene, unresolved (Luke 15:28–32). Mercy is offensive to the person who stayed.",
      "这个比喻讲的是神，不是一套教养孩子的方法。最后一幕，大儿子留在门外，故事没有交代结局（路加福音 15:28–32）。对一直守在身边的人，怜悯有时像一种冒犯。"),
    grace: B("Grace came before reformation: the son’s rehearsed speech is interrupted by the robe and the ring (Luke 15:21–24).",
      "恩典在改变之前临到：儿子准备好的认罪台词，被袍子和戒指打断了（路加福音 15:21–24）。"),
    read: B("Read Luke 15:11–32. Then read verse 28 again and ask which brother you actually are today.",
      "读路加福音 15:11–32。然后重读第 28 节，问自己：今天我其实是哪一个儿子？")
  },
  {
    id: "zacchaeus", chapter: "zacchaeus", way: "notice", virtue: "compassion", glyph: "◉",
    name: B("Zacchaeus", "撒该"),
    role: B("the man in the tree", "树上的那个人"),
    ref: B("Luke 19:1–10", "路加福音 19:1–10"),
    verse: B("Zacchaeus, make haste, and come down; for to day I must abide at thy house.",
      "撒该，快下来！今天我必住在你家里。"),
    verseRef: B("Luke 19:5", "路加福音 19:5"),
    why: B("You kept looking for the person at the edge of the crowd. Zacchaeus climbed a tree simply to see — and being seen changed everything.",
      "你总在人群边缘寻找那个人。撒该爬上树，只为了看一眼——而被看见，改变了一切。"),
    shadow: B("He was a chief tax collector who had grown rich by collaborating with Rome and overcharging his neighbours (Luke 19:2, 8). The crowd’s anger was not imaginary.",
      "他是税吏长，靠着与罗马合作、向邻人多收税款致富（路加福音 19:2、8）。群众的愤怒并不是凭空而来。"),
    grace: B("Jesus invited Himself to dinner before asking for anything. Zacchaeus’s fourfold repayment is a fruit of being welcomed, not the price of it (Luke 19:8–10).",
      "耶稣先邀请自己到他家，才开口要求任何事。撒该四倍偿还是「被接纳」所结的果子，不是换取接纳的代价（路加福音 19:8–10）。"),
    read: B("Read Luke 19:1–10. Ask why Jesus says “I must abide at thy house” — who needed whom?",
      "读路加福音 19:1–10。问：耶稣为什么说「今天我必住在你家里」——到底谁需要谁？")
  },
  {
    id: "disciples", chapter: "storm", way: "notice", virtue: "faith", glyph: "⌇",
    name: B("The disciples in the boat", "船上的门徒"),
    role: B("those who watched and slowly believed", "一边观看、一边慢慢相信的人"),
    ref: B("Mark 4:35–41 · Mark 6:45–52", "马可福音 4:35–41 · 6:45–52"),
    verse: B("Why are ye so fearful? how is it that ye have no faith?",
      "为什么胆怯？你们还没有信心吗？"),
    verseRef: B("Mark 4:40", "马可福音 4:40"),
    why: B("You watched closely and kept coming back to the question of trust. The disciples watched a storm and a sleeping teacher — and that watching became the beginning of faith.",
      "你看得很仔细，也不断回到「信靠」这个问题上。门徒看见了风浪和一位睡着的老师——而那次观看，成了信心的起点。"),
    shadow: B("They had seen the miracles and still panicked (Mark 4:38–40). Afterwards they were afraid in a different way: “What manner of man is this?” (Mark 4:41). Knowing more did not automatically make them braver.",
      "他们见过神迹，却仍然惊慌（马可福音 4:38–40）。之后他们以另一种方式害怕：「这人到底是谁？」（4:41）知道得更多，并不会自动让人更勇敢。"),
    grace: B("Jesus calmed the storm before He corrected them. Grace came first; the question came second.",
      "耶稣先平静风浪，然后才纠正他们。恩典先来，问题随后。"),
    read: B("Read Mark 4:35–41, then Mark 6:45–52. Same sea, same disciples, same lesson — what does that repetition tell you?",
      "读马可福音 4:35–41，再读 6:45–52。同一片海、同一群门徒、同一个功课——这种重复想告诉你什么？")
  }
];

/* ------------------------------------------------------------------ copy */
export const MIRROR_COPY = {
  eyebrow: B("Your journey mirror", "你的旅程之镜"),
  title: B("A story that rhymes with yours", "一段与你的路相似的故事"),
  intro: B("This is not a personality type. It is a record of what you actually did in ten stories, held up beside someone God chose to write about.",
    "这不是人格类型。它只是把你在十段故事里实际做过的事，摆在神选择写下来的一个人旁边。"),
  warrant: B("“For whatsoever things were written aforetime were written for our learning, that we through patience and comfort of the scriptures might have hope.”",
    "「从前所写的圣经都是为教训我们写的，叫我们因圣经所生的忍耐和安慰，可以得着盼望。」"),
  warrantRef: B("Romans 15:4 (KJV)", "罗马书 15:4（和合本）"),
  mirror: B("“For if any be a hearer of the word, and not a doer, he is like unto a man beholding his natural face in a glass.”",
    "「因为听道而不行道的，就像人对着镜子看自己本来的面目。」"),
  mirrorRef: B("James 1:23 (KJV)", "雅各书 1:23（和合本）"),
  caution: B("“Let him that thinketh he standeth take heed lest he fall.” — 1 Corinthians 10:12",
    "「所以，自己以为站得稳的，须要谨慎，免得跌倒。」——哥林多前书 10:12"),
  disclaimer: B("This is not a psychological test, not an MBTI type, not a prophecy over your life, and not a measure of your worth before God. It reports choices you made in a game. “Man looketh on the outward appearance, but the LORD looketh on the heart” (1 Samuel 16:7). Read it, test it against Scripture, and then close the game and open the Bible.",
    "这不是心理测验，不是 MBTI 类型，不是对你生命的预言，也不是衡量你在神面前价值的标准。它只是记录你在游戏里做过的选择。「人是看外貌，耶和华是看内心。」（撒母耳记上 16:7）读一读，用圣经分辨，然后关掉游戏，打开圣经。"),
  waysTitle: B("How you walked", "你走路的方式"),
  wayVerseTitle: B("Your strongest way", "你最明显的方式"),
  secondTitle: B("You also carry something of", "你身上也有"),
  whyTitle: B("Why this story rhymes with yours", "为什么这段故事与你相似"),
  shadowTitle: B("The honest part", "诚实的部分"),
  graceTitle: B("What God did", "神做了什么"),
  readTitle: B("Go and read", "去读这一段"),
  readButton: B("Open this story’s scroll", "打开这一章的书卷"),
  secondaryButton: B("Read their story too", "也读读他们的故事"),
  readingTitle: B("Your ten passages", "你的十段经文"),
  readingIntro: B("Every story you witnessed has a real address in the Bible. Here is the reading list — start anywhere.",
    "你在场的每一个故事，在圣经里都有真实的地址。这是你的阅读清单——从任何一处开始都可以。"),
  notFortune: B("A mirror, not a label", "一面镜子，不是一个标签"),
  hintsClean: B("You walked with the hints hidden. This mirror reflects choices you made without being told what they meant.",
    "你是在关掉提示的情况下走完的。这面镜子反映的，是没有人先告诉你含义时，你自己做出的选择。"),
  hintsSeen: B("You asked for help with hints {n} time(s). Those moments are counted separately — they are not scored as observation.",
    "你曾 {n} 次请求提示帮助。这些时刻被单独记录——不会被算作「观察」。")
};

/* --------------------------------------------------------------- analysis */

function normalise(source, keys) {
  const vals = keys.map((k) => Math.max(0, Number(source?.[k]) || 0));
  const total = vals.reduce((a, b) => a + b, 0);
  return Object.fromEntries(keys.map((k, i) => [k, total > 0 ? vals[i] / total : 1 / keys.length]));
}

/** Ways for old saves that predate tracking: mirror the virtue stats. */
export function journeyWays(s) {
  const a = s?.adventure || {};
  const w = a.ways || {};
  const tracked = WAY_KEYS.reduce((n, k) => n + (Number(w[k]) || 0), 0);
  if (tracked > 0) return Object.fromEntries(WAY_KEYS.map((k) => [k, Number(w[k]) || 0]));
  const stats = s?.stats || {};
  return Object.fromEntries(WAY_KEYS.map((k) => [k, Number(stats[VIRTUE_FOR_WAY[k]]) || 0]));
}

/** Pure, deterministic analysis. Never throws on an incomplete save. */
export function analyseJourney(s) {
  const stats = (s && s.stats) || {};
  const virtue = STAT_KEYS.reduce((best, k) => (Number(stats[k]) || 0) > (Number(stats[best]) || 0) ? k : best, STAT_KEYS[0]);
  const rawWays = journeyWays(s);
  const way = WAY_KEYS.reduce((best, k) => rawWays[k] > rawWays[best] ? k : best, WAY_KEYS[0]);
  const vShare = normalise(stats, STAT_KEYS);
  const wShare = normalise(rawWays, WAY_KEYS);
  const ranked = PROFILES
    .map((p, i) => ({
      profile: p,
      score: 2.6 * (wShare[p.way] || 0) + 2.0 * (vShare[p.virtue] || 0) + i * 0.0001
    }))
    .sort((a, b) => b.score - a.score);
  return {
    virtue, way, rawWays, vShare, wShare,
    primary: ranked[0].profile,
    secondary: ranked[1].profile,
    ranked
  };
}

export function pick(bilingual, zh) { return bilingual ? bilingual[zh ? "zh" : "en"] : ""; }
