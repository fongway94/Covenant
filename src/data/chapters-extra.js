/* Chapters 7–10. A compact bilingual spec: every [en, zh] pair is stored together
   so the two languages can never drift apart. buildChapter() expands it into the
   canonical chapter shape used by the rest of the game. */

const L = (...pairs) => pairs;          // lines: [who, en, zh]
const C = (t, to, opts = {}) => ({ t, to, ...opts });   // choice

const pick = (v, lang) => Array.isArray(v) ? v[lang === "zh" ? 1 : 0] : v;

export function buildChapter(spec, lang) {
  const P = (v) => pick(v, lang);
  const nodes = {};
  for (const [id, n] of Object.entries(spec.nodes)) {
    const node = {
      lines: n.lines.map(([who, en, zh]) => [who, lang === "zh" ? zh : en])
    };
    if (n.choices) node.choices = n.choices.map((c) => {
      const out = { ...c, t: P(c.t), to: c.to };
      for (const k of ["reply", "tag", "hint"]) if (c[k]) out[k] = P(c[k]);
      return out;
    });
    if (n.next) node.next = n.next;
    if (n.end) node.end = true;
    if (n.game) node.game = n.game;
    if (n.hotspots) node.hotspots = {
      ...n.hotspots,
      title: P(n.hotspots.title), prompt: P(n.hotspots.prompt)
    };
    nodes[id] = node;
  }
  const cast = {};
  for (const [k, v] of Object.entries(spec.cast)) cast[k] = { name: P(v[0]), role: P(v[1]) };
  return {
    id: spec.id, num: spec.num, roman: spec.roman,
    title: P(spec.title), subtitle: P(spec.subtitle), ref: P(spec.ref),
    theme: P(spec.theme), art: spec.art, pos: spec.pos, length: P(spec.length),
    intro: P(spec.intro),
    brief: { place: P(spec.brief.place), who: P(spec.brief.who), stake: P(spec.brief.stake) },
    scroll: {
      verse: P(spec.scroll.verse), ref: P(spec.scroll.ref),
      note: P(spec.scroll.note), timeline: P(spec.scroll.timeline)
    },
    cast, start: spec.start, endFruits: spec.endFruits, relic: spec.relic,
    nodes,
    ending: {
      seal: spec.ending.seal, title: P(spec.ending.title),
      text: P(spec.ending.text), takeaway: P(spec.ending.takeaway)
    },
    reflection: {
      q: P(spec.reflection.q),
      options: spec.reflection.options.map((o) => ({ t: P(o.t), stat: o.stat, insight: P(o.insight) }))
    },
    game: spec.game ? { title: P(spec.game.title), prompt: P(spec.game.prompt) } : undefined
  };
}

export const EXTRA_CHAPTERS = [
  /* ================================================================ 7 */
  {
    id: "bush", num: 7, roman: "VII", art: "assets/art/bush.jpg", pos: [26, 54],
    title: ["The Burning Bush", "燃烧的荆棘"], subtitle: ["Moses at Horeb", "摩西在何烈山"],
    ref: ["Exodus 3", "出埃及记 3 章"], theme: ["Calling", "呼召"], length: ["10–12 min", "10–12 分钟"],
    intro: ["A shepherd follows one stray sheep up a mountain — and finds a fire that does not burn out.", "一个牧人为了一只走失的羊上山——却遇见一团烧不尽的火焰。"],
    brief: {
      place: ["c. 1440 BC, in Midian, on the far side of the desert. Moses has lived here forty years, shepherding the flock of his father-in-law Jethro.", "约公元前 1440 年，米甸，旷野的那一边。摩西在这里住了四十年，替岳父叶忒罗放羊。"],
      who: ["Moses was raised as a prince in Egypt, then fled after killing an Egyptian. He is a shepherd now, married, with a family — and God has been silent for forty years.", "摩西在埃及王宫长大，后来杀了人，逃到旷野。如今他是牧人，有妻子有孩子，而神已经四十年没有出声。"],
      stake: ["Israel is enslaved in Egypt, and God is about to speak. The bush that burns without burning up is not the point — the point is what God says about Himself, and what He asks Moses to do.", "以色列人还在埃及做奴隶，神就要开口了。烧不坏的荆棘不是重点；重点是神怎样介绍自己，以及祂要摩西去做什么。"]
    },
    scroll: {
      verse: ["And he said, I am the God of thy father, the God of Abraham, the God of Isaac, and the God of Jacob. And Moses hid his face; for he was afraid to look upon God.", "又说：「我是你父亲的神，是亚伯拉罕的神、以撒的神、雅各的神。」摩西蒙了脸，不敢看神。"],
      ref: ["Exodus 3:6 (KJV)", "出埃及记 3:6（和合本）"],
      note: ["Moses had been in Midian for forty years. The call comes not in a palace but on an ordinary workday, while he is chasing a lost sheep. God's first words are not a command but a self-introduction: I am the God of your father.", "摩西在米甸已经四十年。呼召不是发生在王宫，而是在一个平凡的工作日——他正在追赶一只走失的羊。神开口第一句不是命令，而是自我介绍：「我是你父亲的神。」"],
      timeline: ["c. 1440 BC · Mount Horeb / Sinai", "约公元前 1440 年 · 何烈山／西奈山"]
    },
    cast: {
      elias: [["Corin", "柯林"], ["Your companion", "你的同伴"]],
      moses: [["Moses", "摩西"], ["A shepherd in Midian", "米甸的牧人"]],
      voice: [["The Voice", "那声音"], ["From the flame", "从火焰中"]],
      shepherd: [["A Midianite shepherd", "米甸牧人"], [""]]
    },
    start: "start", relic: "sandals", endFruits: ["patience", "faithfulness"],
    game: { title: ["Follow the flock", "跟随羊群"], prompt: ["Drag across the dunes to gather the three scattered sheep before the sandstorm reaches the burning bush.", "拖过沙丘，在沙暴抵达荆棘之前找回三只走散的羊。"] },
    nodes: {
      start: {
        lines: L(
          ["", "The scroll opens on dry wind and the smell of dust. Red mountains rise on every side, and a small flock of sheep picks its way across the stones.", "书卷在干燥的风里展开，满是尘土的气味。红色的山从四面围上来，一小群羊在石头之间挑着路走。"],
          ["elias", "Moses has been here forty years. He was a prince once. Now he counts sheep for his father-in-law.", "摩西在这片旷野已经四十年了。他从前是埃及的王子，如今替岳父数羊。"],
          ["moses", "One is missing. It always goes toward the high ground.", "少了一只。它总往高处跑。"],
          ["elias", "Then we go after it. Watch your footing — the wind is getting up.", "那就去追。脚下留神，风起来了。"]
        ),
        choices: [
          C(["Go after the stray sheep yourself", "自己去追那只走失的羊"], "stray", { stat: { compassion: 2 }, xp: 7, reply: ["You scramble up the scree, hands scraped raw, and find a lamb trembling behind a boulder.", "你爬上碎石坡，手掌磨破，在一块巨石后发现一只发抖的小羊。"], replyBy: "" }),
          C(["Ask Corin why God waited forty years", "问柯林，神为何等了四十年"], "stray", { stat: { wisdom: 2 }, xp: 7, reply: ["“Perhaps,” he says, “because a prince had to become a shepherd before he could lead shepherds.”", "「也许，」他说，「因为一个王子得先学会当牧人，才带得动牧人。」"], replyBy: "elias" }),
          C(["Pray for the lost one before climbing", "上山之前为那只迷失的羊祷告"], "stray", { stat: { faith: 2 }, xp: 7, faith: true, tag: ["Faith", "信心"], reply: ["The prayer is small and ordinary. That, you will learn, is how most of them start.", "这个祷告又小又普通。后来你会知道，大多数祷告都是这样开始的。"], replyBy: "" })
        ]
      },
      stray: {
        game: "desert",
        lines: L(
          ["", "The sandstorm rolls across the valley like a wall. And there, ahead of it — a shrub on fire, blazing gold against the red rock.", "沙暴像一堵墙压过山谷。就在它前面，一丛灌木正烧着，在红色岩石上闪出金光。"],
          ["moses", "It is burning. But the leaves are still green.", "它在烧。可叶子还是绿的。"],
          ["elias", "Take off your sandals. This ground has just become different from every other ground you have stood on.", "把鞋脱下来。你脚下这块地，跟你站过的任何地方都不一样了。"]
        ),
        choices: [
          C(["Take off your sandals", "把鞋脱下来"], "bush", { stat: { faith: 2 }, xp: 9, faith: true, tag: ["Faith", "信心"], reply: ["Your bare feet feel the hot stone. It is the most honest thing you have done all day.", "赤脚踩在滚烫的石头上。这是你今天做过最诚实的一件事。"], replyBy: "" }),
          C(["Ask Moses to cover his face", "叫摩西蒙住脸"], "bush", { stat: { wisdom: 2 }, xp: 8, reply: ["He does — and then he looks anyway, because he cannot help it. Awe and curiosity are not enemies.", "他蒙住脸——又忍不住从指缝里看。敬畏和好奇，本来就不打架。"], replyBy: "" }),
          C(["Stand back and watch the flame", "退后，静静看着那团火焰"], "bush", { stat: { courage: 1, compassion: 1 }, xp: 8, reply: ["You count your breaths. The fire does not flicker. It has all the time in the world.", "你数着自己的呼吸。火焰一动不动，好像有的是时间。"], replyBy: "" })
        ]
      },
      bush: {
        /* The old version asked the player to hunt three glowing marks on the
           painting. The scene is now the command itself: do not come too close,
           and do not hurry. See GAMES.flame. */
        game: "flame",
        lines: L(
          ["voice", "I am the God of thy father, the God of Abraham, the God of Isaac, and the God of Jacob.", "我是你父亲的神，是亚伯拉罕的神、以撒的神、雅各的神。"],
          ["", "Moses hides his face. The bush keeps burning. No smoke, no ash, no hurry.", "摩西蒙住脸。荆棘继续烧着。没有烟，没有灰，一点也不着急。"],
          ["elias", "Listen. He does not begin with a task. He begins with a relationship — I am the God your father knew.", "听。祂不是从任务开始，而是从关系开始——我是你父亲所认识的神。"]
        ),
        choices: [
          C(["Whisper: “Here am I”", "轻声说：「我在这里」"], "call", { stat: { faith: 2 }, xp: 9, reply: ["It is the same answer Abraham gave. Some sentences are handed down like a family trade.", "这也是亚伯拉罕当年的回答。有些话，就这么一代一代传下来了。"], replyBy: "elias" }),
          C(["Ask what His name is", "问祂的名字是什么"], "call", { stat: { wisdom: 2 }, xp: 9, reply: ["The answer comes slowly: “I AM THAT I AM” (Exodus 3:14). Not a label to hold — a presence that simply is.", "答案慢慢来：「我是我所是」（出埃及记 3:14）。这不是一个能攥在手里的名号，而是一位一直都在的神。"], replyBy: "" }),
          C(["Say nothing, and stay on your knees", "什么也不说，只是跪着"], "call", { stat: { compassion: 2, faith: 1 }, xp: 9, reply: ["Silence is also an answer. The flame waits for you.", "沉默也是一种回答。火焰等着你。"], replyBy: "" })
        ]
      },
      call: {
        lines: L(
          ["voice", "I have surely seen the affliction of my people … and I am come down to deliver them. Come now therefore, and I will send thee unto Pharaoh.", "我实在看见我百姓的困苦了……我下来是要救他们。故此，我要打发你去见法老。"],
          ["moses", "Who am I, that I should go unto Pharaoh?", "我算什么，竟能去见法老呢？"],
          ["elias", "Notice: God does not answer “you are qualified.” He answers “I will be with you.”", "留意：神没有回答「你够资格」，祂回答的是「我必与你同在」。"],
          ["", "The mountain is very quiet. The sandstorm has moved on. Somewhere below, a lamb bleats.", "山上非常安静。沙暴已经过去。山下某处，一只小羊在叫。"]
        ),
        choices: [
          C(["Go with him toward Egypt", "陪他往埃及去"], "end", { stat: { courage: 2 }, xp: 12, require: { courage: 5 }, tag: ["Courage 5", "勇气 5"], reply: ["You do not feel brave. You go anyway. That is usually what brave looks like from the inside.", "你并不觉得勇敢。但你还是去了。从里面看，勇敢通常就是这个样子。"], replyBy: "" }),
          C(["Give him your staff for the road", "把你的手杖送给他上路"], "end", { stat: { compassion: 2 }, xp: 10, reply: ["He takes it, testing its weight. A stick is not much — but it is something to hold.", "他接过去，掂了掂分量。一根杖算不了什么——可上路的人手里总得有点什么。"], replyBy: "" }),
          C(["Ask him to remember this mountain", "请他记住这座山"], "end", { stat: { wisdom: 2, faith: 1 }, xp: 10, reply: ["“I will,” he says. “Especially on the days I would rather forget.”", "「我会的，」他说，「特别是在那些我宁愿忘掉的日子里。」"], replyBy: "moses" })
        ]
      },
      end: {
        end: true,
        lines: L(
          ["elias", "The call did not make Moses fearless. It made him accompanied. That is the whole difference.", "呼召并没有让摩西不再惧怕，而是让他不再孤单。这就是全部的区别。"],
          ["", "You look back once. The bush is still burning — quietly, patiently, with no audience at all.", "你回头看了一眼。荆棘仍在燃烧——安静、耐心，完全没有观众。"],
          ["", "The scroll turns. Egypt is a long way off.", "书卷翻页。埃及还很远。"]
        )
      }
    },
    ending: {
      seal: "✦", title: ["I AM THAT I AM", "我是我所是"],
      text: ["You did not receive a task. You received a presence.", "你领受的不是一项任务，而是一位同在者。"],
      takeaway: ["God's call often begins with who He is, not with what you can do. Moses argued, hesitated and bargained — and God stayed. Courage is not confidence in yourself; it is trust in the One who says 'I will be with you.'", "神的呼召往往先讲祂是谁，而不是你能做什么。摩西争辩、迟疑、讨价还价——神仍然在。勇气不是对自己有信心，而是信靠那位说「我必与你同在」的主。"]
    },
    reflection: {
      q: ["What “burning bush” has God put in front of you lately — an ordinary moment that felt strangely holy?", "最近神把什么「燃烧的荆棘」放在你面前——一个平凡却异常神圣的时刻？"],
      options: [
        { t: ["An ordinary day that suddenly mattered", "一个忽然变得重要的平凡日子"], stat: { wisdom: 2 }, insight: ["Moses was doing his job when the bush burned. Watch your ordinary Tuesdays. Exodus 3:1", "摩西是在上班时看见荆棘燃烧的。留意你平凡的星期二。出埃及记 3:1"] },
        { t: ["Something I am afraid to say yes to", "一件我不敢答应的事"], stat: { courage: 2 }, insight: ["God's answer to inadequacy is never 'try harder' — it is 'I will be with thee.' Exodus 3:12", "「我不配」这句话，神从来不回答「再努力一点」。祂只说：「我必与你同在。」出埃及记 3:12"] },
        { t: ["I am not sure I would notice", "我不确定自己会留意到"], stat: { faith: 2 }, insight: ["The bush burned for a while before Moses turned aside. Ask for the grace to turn aside. Exodus 3:3", "摩西转过去看之前，荆棘已经烧了一会儿。求恩典让你愿意转身。出埃及记 3:3"] }
      ]
    }
  },

  /* ================================================================ 8 */
  {
    id: "ruth", num: 8, roman: "VIII", art: "assets/art/ruth.jpg", pos: [74, 62],
    title: ["The Gleaning Field", "拾穗的麦田"], subtitle: ["Ruth and Naomi", "路得与拿俄米"],
    ref: ["Ruth 1–2", "路得记 1–2 章"], theme: ["Loyalty", "忠诚"], length: ["10–12 min", "10–12 分钟"],
    intro: ["Two widows walk home with nothing. One of them refuses to leave the other.", "两个寡妇空着手走回家。其中一个怎么也不肯离开另一个。"],
    brief: {
      place: ["c. 1100 BC, in Bethlehem at the start of the barley harvest. A famine has just broken; the fields are full and the town is full of talk.", "约公元前 1100 年，伯利恒，大麦刚开镰。饥荒刚过去，田里满是庄稼，城里满是闲话。"],
      who: ["Naomi came back from Moab with nothing — no husband, no sons, and a foreign daughter-in-law, Ruth, who refused to stay behind. Ruth is a Moabite, and Moabites are not welcome here.", "拿俄米从摩押回来时一无所有：丈夫没了，两个儿子也没了，只剩下一个外族媳妇路得，怎么劝都不肯走。路得是摩押人，而摩押人在伯利恒不受欢迎。"],
      stake: ["Both women have no income and no protector. The Law allowed the poor to follow the harvesters and pick up what fell — that is where Ruth goes to find food, and where the owner of the field first sees her.", "两个寡妇没有收入，也没有男人可以依靠。律法允许穷人在收割的人后面捡拾掉落的麦穗——路得就是去那里找吃的，而田主第一次看见她，也在那里。"]
    },
    scroll: {
      verse: ["And Ruth said, Intreat me not to leave thee … for whither thou goest, I will go; and where thou lodgest, I will lodge: thy people shall be my people, and my God my God.", "路得说：「不要催我回去不跟随你。你往哪里去，我也往那里去；你在哪里住宿，我也在那里住宿；你的国就是我的国，你的神就是我的神。」"],
      ref: ["Ruth 1:16 (KJV)", "路得记 1:16（和合本）"],
      note: ["Ruth was a Moabite — an outsider with no status in Bethlehem. Gleaning was the ancient safety net: the poor could follow the reapers and pick up what was dropped. Boaz's generosity turns a survival mechanism into a love story.", "路得是摩押人——在伯利恒抬不起头的外乡人。拾穗是古时给穷人的活路：跟在收割的人后面，捡掉在地上的麦穗。波阿斯的慷慨，把一条活路写成了一段爱情。"],
      timeline: ["c. 1100 BC · Bethlehem, harvest season", "约公元前 1100 年 · 伯利恒，收割季节"]
    },
    cast: {
      elias: [["Corin", "柯林"], ["Your companion", "你的同伴"]],
      ruth: [["Ruth", "路得"], ["A Moabite widow", "摩押寡妇"]],
      naomi: [["Naomi", "拿俄米"], ["Her mother-in-law", "她的婆婆"]],
      boaz: [["Boaz", "波阿斯"], ["Owner of the field", "田主"]],
      reaper: [["A reaper", "收割的仆人"], [""]]
    },
    start: "start", relic: "grain", endFruits: ["kindness", "love"],
    game: { title: ["Glean before sunset", "日落前拾穗"], prompt: ["Drag to gather 12 sheaves while the sun sets. Keep away from the swinging sickles.", "拖动收集 12 捆麦穗，在日落之前完成。避开挥舞的镰刀。"] },
    nodes: {
      start: {
        lines: L(
          ["", "The road from Moab is long and dusty. Two women walk it with empty hands and one shared water skin.", "从摩押回来的路又长又灰。两个女人空着手，共用一个水袋，一步一步往回走。"],
          ["naomi", "Go back, my daughters. I have nothing left to give you.", "我的女儿们，回去吧。我已经没有什么可以给你们了。"],
          ["elias", "Orpah turns back. That is not the cruel choice — it is the reasonable one. Watch Ruth.", "另一个媳妇俄珥巴哭着回去了。这不算狠心，是人之常情。留意路得。"],
          ["ruth", "Whither thou goest, I will go. Thy people shall be my people, and my God my God.", "你往哪里去，我也往那里去。你的国就是我的国，你的神就是我的神。"]
        ),
        choices: [
          C(["Walk behind them, carrying the bundle", "跟在她们后面，替她们背包袱"], "field", { stat: { compassion: 2 }, xp: 8, reply: ["The bundle is not heavy. The silence between the two women is.", "行李不重。两个女人之间的沉默才重。"], replyBy: "" }),
          C(["Ask Corin why Ruth would choose hardship", "问柯林，路得为何选择吃苦"], "field", { stat: { wisdom: 2 }, xp: 8, reply: ["“Because love is not a calculation,” he says. “It is a direction. She has picked hers.”", "「因为爱不是计算，」他说，「爱是一个方向。她已经选好了。」"], replyBy: "elias" }),
          C(["Pray that Bethlehem receives them", "祷告伯利恒能接纳她们"], "field", { stat: { faith: 2 }, xp: 8, faith: true, tag: ["Faith", "信心"], reply: ["You have no idea how literally that prayer will be answered.", "你还不知道，这个祷告会怎样一字不差地应验。"], replyBy: "" })
        ]
      },
      field: {
        game: "glean",
        lines: L(
          ["", "Barley harvest. The reapers cut, the stalks fall, and behind them the poor gather what is dropped.", "大麦开镰了。收割的人割下麦子，麦穗落在地上，穷人就跟在后面捡。"],
          ["ruth", "Let me glean, I pray you, after him in whose sight I shall find grace.", "求你容我跟着收割的人，拾取打捆剩下的麦穗。"],
          ["elias", "This is not charity as a spectacle. It is a law written into the edges of a field — leave something for the person who has nothing. Leviticus 19:9", "这不是做给人看的施舍。这是写进田角的律法：给一无所有的人留一点。利未记 19:9"]
        ),
        choices: [
          C(["Glean beside her all afternoon", "陪她拾一整个下午的麦穗"], "kindness", { stat: { compassion: 2 }, xp: 9, reply: ["Your back aches, your hands are scratched, and by evening the basket is full. It is a good ache.", "你的后背发酸，手被划破，到傍晚篮子满了。这种酸疼，值得。"], replyBy: "" }),
          C(["Ask the reapers to leave extra behind", "请收割的人多留一些麦穗"], "kindness", { stat: { wisdom: 2 }, xp: 9, reply: ["They shrug, then grin, and suddenly a whole corner of the field is 'accidentally' uncut.", "他们耸耸肩，咧嘴一笑——忽然间，整块田角都「不小心」没割到。"], replyBy: "reaper" }),
          C(["Sit with Naomi at the edge of the field", "陪拿俄米坐在田边"], "kindness", { stat: { faith: 1, compassion: 1 }, xp: 9, reply: ["She watches Ruth work and says only: “She has not stopped. Not once.”", "她看着路得干活，只说了一句：「她一直没停。一次都没有。」"], replyBy: "naomi" })
        ]
      },
      kindness: {
        lines: L(
          ["boaz", "Let her glean even among the sheaves, and reproach her not. And let fall also some of the handfuls of purpose for her.", "容她在捆中拾取麦穗，不可羞辱她。并要从捆里抽出些来，留在地下任她拾取。"],
          ["", "Boaz does not make a speech about kindness. He gives an instruction to the men with sickles. That is what makes it real.", "波阿斯没有讲一篇关于仁慈的大道理，只是吩咐拿镰刀的人一句话。真正的仁慈，就是这样落地的。"],
          ["elias", "Notice the pattern: a foreign widow, a field owner, a handful of dropped grain. Nobody calls it a miracle. It is the family line of David — and later, of Jesus.", "留意这条线：一个外邦寡妇，一块田，几把故意落下的麦穗。没有人称它为神迹，可这就是大卫的家谱——后来也是耶稣的家谱。"]
        ),
        choices: [
          C(["Thank Boaz on Ruth’s behalf", "替路得向波阿斯道谢"], "end", { stat: { compassion: 2 }, xp: 10, reply: ["He waves it away. “She did the hard part,” he says. “I only told my men to look the other way.”", "他摆摆手：「难的那部分是她自己做的。我只是叫工人别看得那么紧。」"], replyBy: "boaz" }),
          C(["Tell Naomi what happened in the field", "把田里发生的事告诉拿俄米"], "end", { stat: { wisdom: 2, faith: 1 }, xp: 10, reply: ["Her face changes. For the first time since Moab, she says the word “hope” out loud.", "她的脸色变了。从摩押回来以后，她第一次把「盼望」这两个字说出了口。"], replyBy: "" }),
          C(["Stay silent. Some kindness is shy.", "什么也不说。有些善意不必说出口。"], "end", { stat: { faith: 2 }, xp: 10, reply: ["You say nothing. Ruth never learns your name. That is also a kind of love.", "你什么也没说。路得始终不知道你的名字。那也是一种爱。"], replyBy: "" })
        ]
      },
      end: {
        end: true,
        lines: L(
          ["elias", "Ruth did not save Israel. She simply refused to leave one person. Great stories are usually built out of small refusals.", "路得没有拯救以色列，她只是不肯离开一个人。许多伟大的故事，就是从一个很小的「不肯」开始的。"],
          ["", "The sun goes down over the barley. Naomi carries the basket home; Ruth carries Naomi’s hand.", "太阳落在大麦田上。拿俄米抱着篮子回家；路得牵着拿俄米的手。"],
          ["", "The scroll turns, smelling faintly of cut grain.", "书卷翻页，带着淡淡的麦香。"]
        )
      }
    },
    ending: {
      seal: "❀", title: ["Under His Wings", "在祂的翅膀下"],
      text: ["Loyalty is love that has kept walking after the feeling fades.", "忠诚，是感觉淡了以后还继续走下去的爱。"],
      takeaway: ["Ruth's famous words are not a vow of romance — they are a daughter-in-law's promise to an old, grieving woman. God honoured a small, stubborn kindness by weaving it into the lineage of the Messiah.", "路得那段著名的话，其实不是情话，而是一个儿媳对一位年老伤心的婆婆许下的承诺。神看重这份微小又固执的善良，把它编进了弥赛亚的家谱。"]
    },
    reflection: {
      q: ["Who is the person you would “go with” even when it costs you?", "谁是你愿意「一同前往」的人，即使要付代价？"],
      options: [
        { t: ["An ageing parent or grandparent", "年迈的父母或祖父母"], stat: { compassion: 2 }, insight: ["Ruth's choice was towards the person with the least to offer her. Ruth 1:16–17", "路得选择的，是那个最无法回报她的人。路得记 1:16–17"] },
        { t: ["A friend who is struggling", "一位正在挣扎的朋友"], stat: { faith: 2 }, insight: ["Presence is the rarest gift because it cannot be sent from a distance. Ruth 1:16", "陪伴是最难得的礼物，因为它没法隔空送过去。路得记 1:16"] },
        { t: ["I am not sure I have anyone yet", "我还不确定有没有这样的人"], stat: { wisdom: 2 }, insight: ["Then start small: show up once, and then again. Loyalty is built one Tuesday at a time. Ruth 1:16", "那就从小事开始：这一次在场，下一次也在场。忠诚就是这么一天一天攒出来的。路得记 1:16"] }
      ]
    }
  },

  /* ================================================================ 9 */
  {
    id: "jonah", num: 9, roman: "IX", art: "assets/art/jonah.jpg", pos: [26, 70],
    title: ["The Great Fish", "大鱼腹中"], subtitle: ["Jonah and Nineveh", "约拿与尼尼微"],
    ref: ["Jonah 1–3", "约拿书 1–3 章"], theme: ["Mercy", "怜悯"], length: ["10–12 min", "10–12 分钟"],
    intro: ["A prophet runs the wrong way, a storm follows him, and mercy waits at the bottom of the sea.", "一位先知往反方向跑，风暴追着他，而怜悯在海底等着他。"],
    brief: {
      place: ["c. 780 BC. Nineveh is the capital of Assyria, the most feared empire of the age — a city so large the Bible says it takes three days to walk across.", "约公元前 780 年。尼尼微是亚述的京城，当时最令人生畏的帝国——大到圣经说走遍全城要三天。"],
      who: ["God tells the prophet Jonah to go to Nineveh and call it to repent. Instead Jonah buys a ticket on a ship sailing the opposite way, to Tarshish.", "神叫先知约拿到尼尼微去，向那座城宣告审判，好让他们回转。约拿却买了船票，往相反方向的他施去。"],
      stake: ["A storm hits the ship. The sailors will do anything to stay alive. And the reason for the storm is asleep down in the hold — a prophet running from the one errand he cannot avoid.", "海上起了风暴。水手们为了活命什么都肯做，而这场风暴的起因，正睡在船舱里——一个想逃掉唯一躲不掉的差事的先知。"]
    },
    scroll: {
      verse: ["And Jonah was in the belly of the fish three days and three nights. Then Jonah prayed unto the LORD his God out of the fish’s belly.", "约拿在鱼腹中三日三夜。约拿在鱼腹中祷告耶和华他的神。"],
      ref: ["Jonah 1:17, 2:1 (KJV)", "约拿书 1:17, 2:1（和合本）"],
      note: ["Jonah is the reluctant prophet: he runs because he suspects God will be merciful to Nineveh — and he would rather they were judged. The book ends with God asking a question He does not answer, leaving the reader to examine their own reluctance to forgive.", "约拿是不情愿的先知：他逃跑，是因为他猜到神会怜悯尼尼微——而他宁愿他们被审判。这卷书以神一个没有回答的问题作结，让读者审视自己不愿饶恕的心。"],
      timeline: ["c. 780 BC · Mediterranean Sea and Nineveh", "约公元前 780 年 · 地中海与尼尼微"]
    },
    cast: {
      elias: [["Corin", "柯林"], ["Your companion", "你的同伴"]],
      jonah: [["Jonah", "约拿"], ["A prophet running away", "逃跑的先知"]],
      captain: [["The ship’s captain", "船长"], [""]],
      sailor: [["A sailor", "水手"], [""]],
      king: [["The king of Nineveh", "尼尼微王"], [""]]
    },
    start: "start", relic: "fishsign", endFruits: ["peace", "goodness"],
    game: { title: ["Into the deep", "潜入深海"], prompt: ["Drag up and down to swim through the dark water. Avoid drifting rocks and jellyfish; gather three prayer bubbles.", "上下拖动在黑暗的海水中游动。避开漂浮的岩石和水母，收集三个祷告气泡。"] },
    nodes: {
      start: {
        lines: L(
          ["", "Joppa harbour. A ship is loading for Tarshish — which is, notably, in the opposite direction from Nineveh.", "约帕港。一艘船正装货开往他施——巧的是，他施正好在尼尼微的反方向。"],
          ["captain", "What meanest thou, O sleeper? Arise, call upon thy God!", "你这沉睡的人哪，为何这样呢？起来，求告你的神！"],
          ["elias", "The storm is not random. Jonah knows it. Watch what he tells the sailors to do.", "这场风暴不是偶然的。约拿知道。留意他叫水手做什么。"],
          ["jonah", "Take me up, and cast me forth into the sea; so shall the sea be calm unto you.", "你们将我抬起来，抛在海中，海就平静了。"]
        ),
        choices: [
          C(["Beg the sailors not to throw him over", "求水手不要把他抛下海"], "deep", { stat: { compassion: 2 }, xp: 8, reply: ["They hesitate — and the waves climb higher. Sometimes the kind thing is not the safe thing.", "他们犹豫了，浪又高一尺。善良和稳妥，有时候不是一回事。"], replyBy: "" }),
          C(["Stand with Jonah and pray", "和约拿站在一起祷告"], "deep", { stat: { faith: 2 }, xp: 8, faith: true, tag: ["Faith", "信心"], reply: ["He will not look at you. Shame makes people want to be alone.", "他不肯看你。羞愧会让人想一个人待着。"], replyBy: "" }),
          C(["Ask Corin why Jonah is running", "问柯林，约拿为何逃跑"], "deep", { stat: { wisdom: 2 }, xp: 8, reply: ["“Because he is afraid God will forgive them,” Corin says. “It is the strangest reason anyone has ever run.”", "「因为他怕神真的饶恕他们，」柯林说，「这大概是最奇怪的一个逃跑理由。」"], replyBy: "elias" })
        ]
      },
      deep: {
        game: "deep",
        lines: L(
          ["", "The water closes over him. It is very cold, very dark, and very quiet — and then the great fish comes.", "海水在他头上合拢。又冷、又黑、又静——然后大鱼来了。"],
          ["jonah", "I cried by reason of mine affliction unto the LORD, and he heard me; out of the belly of hell cried I.", "我遭遇患难求告耶和华，他就应允我；从阴间的腹中呼求。"],
          ["elias", "Three days. Not a punishment cell — a quiet room. Some people only stop running when they cannot run any more.", "三天。这不是牢房，是一间安静的屋子。有些人非要跑到跑不动，才肯停下来。"]
        ),
        choices: [
          C(["Pray with him in the dark", "在黑暗中和他一同祷告"], "nineveh", { stat: { faith: 2 }, xp: 9, reply: ["The prayer is mostly silence. That is enough. The fish keeps swimming.", "祷告大半是沉默。那也够了。大鱼继续往前游。"], replyBy: "" }),
          C(["Ask him what he is most afraid of", "问他最害怕的是什么"], "nineveh", { stat: { wisdom: 2 }, xp: 9, reply: ["“That they will change,” he says at last. “And that God will be glad.”", "「怕他们真的会改，」他终于开口，「也怕神会为这个高兴。」"], replyBy: "jonah" }),
          C(["Count the days and wait", "数着日子等候"], "nineveh", { stat: { compassion: 1, faith: 1 }, xp: 9, reply: ["On the third day, the fish is sick of him. Mercy sometimes arrives as being spat out.", "第三天，大鱼把他吐出来，他摔在沙滩上。有些路，得先被吐出来，才走得回去。"], replyBy: "" })
        ]
      },
      nineveh: {
        /* A lantern walk through Nineveh becomes what Jonah actually did:
           carry one sentence through a city three days wide, and stop where
           people are listening. See GAMES.cry. */
        game: "cry",
        lines: L(
          ["", "Nineveh is enormous — three days’ walk across. Jonah walks one day into it and shouts a single sentence.", "尼尼微大得走三天也走不完。约拿只走了一天，就喊出一句话。"],
          ["jonah", "Yet forty days, and Nineveh shall be overthrown!", "再等四十日，尼尼微必倾覆了！"],
          ["king", "Let man and beast be covered with sackcloth, and cry mightily unto God … who can tell if God will turn and repent?", "人和牲畜都当披上麻布，人要切切求告神……或者神转意后悔，也不灭绝我们，也未可知。"],
          ["elias", "The whole city stops. Even the animals, says the king. And God does turn. Jonah is furious.", "全城都停了下来，连牲畜也披上麻布——这是王的命令。神果然回心转意。约拿气得不行。"]
        ),
        choices: [
          C(["Sit with Jonah outside the city", "陪约拿坐在城外"], "end", { stat: { compassion: 2 }, xp: 11, reply: ["He is sitting in the dust, furious that mercy won. You sit down too. It is an honest place to sit.", "他坐在尘土里生闷气——气的是神居然饶了他们。你也在旁边坐下。这个位置不体面，但诚实。"], replyBy: "" }),
          C(["Remind him of the fish", "提醒他关于那条大鱼的事"], "end", { stat: { wisdom: 2 }, xp: 10, reply: ["“You were given mercy when you deserved none,” you say. He has no answer for that.", "「你自己得怜悯的时候，也不比他们配。」你说。他没有话可答。"], replyBy: "" }),
          C(["Ask God why He cares about Nineveh", "问神为何在乎尼尼微"], "end", { stat: { faith: 2 }, xp: 11, faith: true, tag: ["Faith", "信心"], reply: ["The answer is a question about a plant, a worm, and a hundred and twenty thousand people who do not know their right hand from their left.", "答案不是一个说法，是一个问题——关于一棵一夜长起来的植物、一条虫，和十二万个连左右手都分不清的人。"], replyBy: "elias" })
        ]
      },
      end: {
        end: true,
        lines: L(
          ["elias", "The book ends with God’s question hanging in the air. He does not answer it. He wants Jonah — and us — to answer it.", "这卷书停在一个悬在半空的问题上。神没有回答，祂要约拿——也要我们——自己回答。"],
          ["", "Should I not spare Nineveh? The wind moves over the fields. Somewhere a worm eats a plant.", "我岂能不爱惜尼尼微呢？风吹过田野。不知哪里，一条虫正在啃一棵植物。"],
          ["", "The scroll closes on the question, not the answer.", "书卷合上了，合在一个问题上，不是答案上。"]
        )
      }
    },
    ending: {
      seal: "✧", title: ["Should I Not Spare?", "我岂能不爱惜？"],
      text: ["Mercy is hardest when it is given to people you dislike.", "怜悯落到你讨厌的人身上时，最难接受。"],
      takeaway: ["Jonah is the only prophet who succeeds spectacularly and resents it. God's final question is not about Nineveh's worthiness but about Jonah's heart — a mirror held up to every one of us who would rather see justice than grace.", "约拿是唯一一位大获成功却因此愤愤不平的先知。神最后的问题不是关于尼尼微配不配，而是关于约拿的心——它是一面镜子，照出我们这些宁愿看见公义、不愿看见恩典的人。"]
    },
    reflection: {
      q: ["Who is your Nineveh — the person or group you would rather God did not forgive?", "谁是你的尼尼微——那个你不太希望神饶恕的人或群体？"],
      options: [
        { t: ["Someone who hurt me", "伤害过我的人"], stat: { compassion: 2 }, insight: ["God's question to Jonah is not 'do they deserve it?' but 'should I not spare?' Jonah 4:11", "神问约拿的不是「他们配不配」，而是「我岂能不爱惜」。约拿书 4:11"] },
        { t: ["People whose views I cannot stand", "我无法认同其观点的人"], stat: { wisdom: 2 }, insight: ["Jonah preferred a storm to their repentance. Check which storm you are standing in. Jonah 1:12", "约拿宁愿要一场风暴，也不愿他们悔改。看看你正站在哪一场风暴里。约拿书 1:12"] },
        { t: ["Honestly? Sometimes myself.", "老实说？有时候是我自己。"], stat: { faith: 2 }, insight: ["The fish was a quiet room, not a punishment cell. Mercy starts at home. Jonah 2:1–2", "鱼腹是一间安静的屋子，不是牢房。怜悯从自己开始。约拿书 2:1–2"] }
      ]
    }
  },

  /* ================================================================ 10 */
  {
    id: "zacchaeus", num: 10, roman: "X", art: "assets/art/zacchaeus.jpg", pos: [74, 78],
    title: ["Up A Sycamore Tree", "爬上桑树"], subtitle: ["Zacchaeus of Jericho", "耶利哥的撒该"],
    ref: ["Luke 19:1–10", "路加福音 19:1–10"], theme: ["Change", "改变"], length: ["10–12 min", "10–12 分钟"],
    intro: ["A short, rich, lonely man climbs a tree just to see — and comes down carrying a different life.", "一个矮小、富有、孤独的人为了看一眼而爬上树——下来时，带着一个不一样的人生。"],
    brief: {
      place: ["c. AD 30, in Jericho — a rich trade town on the main road east, with a customs post and a Roman garrison.", "约公元 30 年，耶利哥。这是大道上的富庶商镇，有关卡，也驻着罗马兵。"],
      who: ["Zacchaeus is the chief tax collector: he has bought the right to collect Rome's taxes and takes extra for himself. He is rich, hated, and short enough that he cannot see over the crowd.", "撒该是税吏长：他买下了替罗马收税的权利，还从中多收。他有钱，被人恨，个子又矮，站在人群后面什么也看不见。"],
      stake: ["Jesus is passing through town, and the crowd will not make room for a collaborator. So Zacchaeus climbs a sycamore. What happens next is not a reward for good behaviour — it is an invitation given before he has changed anything.", "耶稣正从城里经过，人群不会给一个替罗马办事的人让路。撒该只好爬上桑树。接下来发生的事，不是好行为的奖赏，而是一份在他还没改变之前就先给出的邀请。"]
    },
    scroll: {
      verse: ["And Jesus said unto him, This day is salvation come to this house, forsomuch as he also is a son of Abraham. For the Son of man is come to seek and to save that which was lost.", "耶稣说：「今天救恩到了这家，因为他也是亚伯拉罕的子孙。人子来，为要寻找拯救失丧的人。」"],
      ref: ["Luke 19:9–10 (KJV)", "路加福音 19:9–10（和合本）"],
      note: ["Zacchaeus was a chief tax collector — wealthy, collaborating with Rome, and despised by his own town. His offer to repay fourfold goes beyond what the Law required. Jesus does not demand it first; He simply invites Himself to dinner. Grace comes before reformation.", "撒该是税吏长——富有、与罗马合作、被本城人藐视。他愿意四倍偿还，远超律法的要求。但耶稣并没有先要求他这样做，祂只是邀请自己到他家吃饭。恩典在改变之前。"],
      timeline: ["c. AD 30 · Jericho", "约公元 30 年 · 耶利哥"]
    },
    cast: {
      elias: [["Corin", "柯林"], ["Your companion", "你的同伴"]],
      zacchaeus: [["Zacchaeus", "撒该"], ["A chief tax collector", "税吏长"]],
      jesus: [["Jesus", "耶稣"], [""]],
      crowd: [["Someone in the crowd", "人群中的一人"], [""]],
      servant: [["A servant", "仆人"], [""]]
    },
    start: "start", relic: "coin4", endFruits: ["joy", "gentleness"],
    game: { title: ["Climb the sycamore", "爬上桑树"], prompt: ["Tap left and right branches in turn to climb before Jesus passes. Miss twice and you slip.", "交替点击左右树枝向上爬，在耶稣经过之前到达树顶。失误两次就会滑落。"] },
    nodes: {
      start: {
        lines: L(
          ["", "Jericho is packed. Palm branches, dust, shouting, and the particular noise of a crowd that already knows who it dislikes.", "耶利哥挤满了人。棕树枝、尘土、喊声，还有那种人群特有的吵闹——他们早就知道自己讨厌谁。"],
          ["crowd", "He is a sinner. A collaborator. He stole from us.", "他是个罪人，是替罗马卖命的。他坑过我们的钱。"],
          ["elias", "There he is — Zacchaeus. Short enough that the crowd is a wall. Watch what he does.", "他就在那儿——撒该。个子太矮，人群对他来说就是一堵墙。看他怎么做。"],
          ["zacchaeus", "I only want to see Him. Just once. That is all.", "我只想看祂一眼。就一眼。就这样。"]
        ),
        choices: [
          C(["Make a gap in the crowd for him", "在人群中为他让出一条缝"], "tree", { stat: { compassion: 2 }, xp: 8, reply: ["Two people move. Then three. The gap lasts about four seconds before it closes again.", "先有两个人让开，接着又是三个。缝隙撑了大约四秒，又合上了。"], replyBy: "" }),
          C(["Point to the sycamore tree ahead", "指向前面那棵桑树"], "tree", { stat: { wisdom: 2 }, xp: 8, reply: ["He follows your finger, and his whole face changes. It is not dignified. It is perfect.", "他顺着你的手看过去，整张脸都亮了。说不上体面，却刚刚好。"], replyBy: "" }),
          C(["Ask the crowd why they hate him", "问人群为什么恨他"], "tree", { stat: { faith: 1, wisdom: 1 }, xp: 8, reply: ["They list his sins in detail. Nobody mentions his name without spitting first.", "他们一条一条数他的罪。没有一个人提起他的名字时不先啐一口。"], replyBy: "crowd" })
        ]
      },
      tree: {
        game: "climb",
        lines: L(
          ["", "A rich man, a chief tax collector, is sitting in a tree like a child. The crowd laughs. He does not care.", "一个财主、一个税吏长，像小孩一样坐在树上。人群在笑。他不在乎。"],
          ["jesus", "Zacchaeus, make haste, and come down; for to day I must abide at thy house.", "撒该，快下来！今天我必住在你家里。"],
          ["elias", "Jesus does not say “repay what you stole and then I will come.” He invites Himself first. That order matters.", "耶稣没有说「先把钱还清，我再进你家」。祂先开口要住进去。这个顺序很要紧。"]
        ),
        choices: [
          C(["Help him down from the branch", "扶他从树枝上下来"], "house", { stat: { compassion: 2 }, xp: 9, reply: ["His hands are shaking. He has not been touched kindly in a very long time.", "他的手在抖。他已经很久没被人这样碰过了。"], replyBy: "" }),
          C(["Whisper: “He knows your name”", "轻声说：「祂知道你的名字」"], "house", { stat: { faith: 2 }, xp: 9, faith: true, tag: ["Faith", "信心"], reply: ["He climbs down faster than he climbed up. Being known is a powerful thing.", "他下树比上树还快。被人认出来，是件很有力量的事。"], replyBy: "" }),
          C(["Look at the crowd’s faces instead", "转头看人群的表情"], "house", { stat: { wisdom: 2 }, xp: 9, reply: ["They are furious. Grace to the wrong person always looks like injustice to somebody.", "他们气得脸都变了。恩典落到「不该得的人」身上，在某些人眼里总像是不公平。"], replyBy: "elias" })
        ]
      },
      house: {
        lines: L(
          ["zacchaeus", "Behold, Lord, the half of my goods I give to the poor; and if I have taken any thing from any man by false accusation, I restore him fourfold.", "主啊，我把所有的一半给穷人；我若讹诈了谁，就还他四倍。"],
          ["", "Fourfold. The Law asked for one-fifth extra. Nobody asked him for this. Nobody had to.", "四倍。律法只要求多加五分之一。没有人要求他这样做，也没有人逼他。"],
          ["elias", "This is what grace does when it is received rather than resisted. It makes a generous person out of a greedy one — without a single instruction.", "这就是人接受恩典之后会发生的事：一个贪心的人变得慷慨，没有人下过一道命令。"],
          ["servant", "He has never once opened that storeroom before.", "这间库房，他从来没打开过。"]
        ),
        choices: [
          C(["Help him carry the coins to the door", "帮他把钱币搬到门口"], "end", { stat: { compassion: 2 }, xp: 11, reply: ["The bags are heavy. He carries the heaviest one himself.", "袋子很沉。最重的那袋，他自己扛。"], replyBy: "" }),
          C(["Tell the crowd what he just did", "把刚才的事告诉人群"], "end", { stat: { courage: 2 }, xp: 10, reply: ["Some of them do not believe you. A few go quiet. One woman starts to cry.", "有些人根本不信。有几个人不说话了。一个女人开始哭。"], replyBy: "" }),
          C(["Ask Jesus why He chose this house", "问耶稣为何选这一家"], "end", { stat: { faith: 2 }, xp: 11, faith: true, tag: ["Faith", "信心"], reply: ["“For the Son of man is come to seek and to save that which was lost.”", "「人子来，为要寻找拯救失丧的人。」"], replyBy: "jesus" })
        ]
      },
      end: {
        end: true,
        lines: L(
          ["elias", "Ten chapters. Ten different ways God walks into an ordinary day and refuses to leave it ordinary.", "十章了。十次不同的经过——神走进平凡的一天，不容它继续平凡下去。"],
          ["", "The dust of Jericho settles. Somewhere, a very short man is counting out coins and smiling.", "耶利哥的尘土落定。某个地方，一个很矮的人正在数钱，一边数一边笑。"],
          ["", "The scroll grows warm in your hands. The road, somehow, is still going.", "书卷在你手里发热。这条路，不知怎么，还在往前。"]
        )
      }
    },
    ending: {
      seal: "◎", title: ["Today Salvation Has Come", "今天救恩到了这家"],
      text: ["Grace arrived first. Change followed it out of the door.", "恩典先到，改变是跟着它出门的。"],
      takeaway: ["Zacchaeus was not asked to clean up before Jesus came to dinner. Being welcomed made him generous. The story insists that real change is a fruit of grace, not a price paid to earn it.", "耶稣去吃饭之前，并没有要求撒该先把自己收拾干净。被接纳，反倒让他慷慨起来。这个故事要说的正是：真正的改变是恩典结的果子，不是用来换恩典的价钱。"]
    },
    reflection: {
      q: ["What would “restoring fourfold” look like in your own life?", "在你自己的生命里，「四倍偿还」会是什么样子？"],
      options: [
        { t: ["Returning something I took wrongly", "归还我不该拿的东西"], stat: { courage: 2 }, insight: ["Zacchaeus did not just feel sorry, he counted it out. Luke 19:8", "撒该不只是觉得抱歉，他真把钱一笔一笔数了出来。路加福音 19:8"] },
        { t: ["Giving more than is expected of me", "给出超过别人期望的"], stat: { compassion: 2 }, insight: ["Fourfold was beyond the Law. Grace makes people unreasonable in the best way. Luke 19:8", "四倍远超过律法的要求。恩典让人「不合常理」——而且是最好看的那种不合常理。路加福音 19:8"] },
        { t: ["Welcoming someone nobody else welcomes", "接纳一个没有人接纳的人"], stat: { faith: 2 }, insight: ["Jesus ate in the wrong house on purpose. Who is at your table? Luke 19:5", "耶稣故意进错了家门。今天谁在你的桌旁？路加福音 19:5"] }
      ]
    }
  }
];
