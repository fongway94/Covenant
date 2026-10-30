/* Chapter I, as a place you can walk.

   The map is generated from a small set of stamps — cliffs, a brook with a
   ford, a road climbing out of the camp — so it is deterministic, and so a
   test can prove the road from the camp to the giant is open.

   Everything a player meets here is content, not code: four people who each
   hand you one line of Scripture (those four lines become your four moves in
   the fight), five stones at the brook, and the giant at the top of the road. */

export const TILE = 44;
export const W = 26;
export const H = 54;

export const T = {
  CLIFF: "#", GRASS: ".", PATH: ",", WATER: "~", FORD: "=",
  TENT: "T", TREE: "o", ROCK: "r", FLOWER: "f", DRY: "d", WHEAT: "g"
};

const BLOCKING = new Set([T.CLIFF, T.WATER, T.TENT, T.TREE, T.ROCK]);

/** Build the tile grid. Returns rows of single characters, north at the top. */
export function buildGrid() {
  const g = [];
  for (let y = 0; y < H; y++) g.push(new Array(W).fill(T.CLIFF));

  const set = (x, y, t) => { if (x > 0 && x < W - 1 && y > 0 && y < H - 1) g[y][x] = t; };
  const rect = (x0, y0, x1, y1, t) => {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) set(x, y, t);
  };

  /* 1. the valley floor: dry earth on the Philistine side, grass at home */
  rect(1, 1, W - 2, H - 2, T.GRASS);
  rect(1, 1, W - 2, 9, T.DRY);

  /* 2. the road: one climb from the camp to the challenge line */
  rect(12, 8, 14, 51, T.PATH);
  rect(9, 6, 17, 9, T.DRY);          // the flat ground where he waits

  /* 3. the brook, and the shallow ford you cross it at */
  rect(1, 27, W - 2, 28, T.WATER);
  rect(10, 25, 15, 30, T.FORD);

  /* 4. the Israelite camp: six tents, the road running between them */
  for (const [x, y] of [[5, 43], [7, 40], [17, 42], [19, 45], [6, 47], [18, 48]]) {
    rect(x, y, x + 1, y + 1, T.TENT);
  }

  /* 5. olives on the slope, boulders in the valley, wheat along the camp path.
     Placed by hand: a scatter would sooner or later seal the road. */
  for (const [x, y] of [[3, 34], [4, 37], [21, 33], [22, 36], [3, 45], [22, 47],
    [2, 31], [23, 30], [8, 32], [19, 31], [2, 12], [23, 14]]) set(x, y, T.TREE);
  for (const [x, y] of [[4, 14], [20, 17], [6, 22], [18, 21], [3, 20], [22, 24],
    [7, 11], [19, 10], [10, 16], [16, 16]]) set(x, y, T.ROCK);
  for (const [x, y] of [[9, 44], [16, 46], [10, 49], [15, 50], [8, 51], [17, 39]]) set(x, y, T.WHEAT);

  /* 6. flowers, only where nothing else wants to be */
  const spots = [[2, 38], [23, 41], [4, 25], [21, 27], [2, 8], [23, 7], [8, 35],
    [17, 34], [11, 34], [15, 24], [6, 18], [20, 19], [9, 13], [16, 12]];
  for (const [x, y] of spots) if (g[y][x] === T.GRASS) set(x, y, T.FLOWER);

  return g;
}

export function blockedAt(grid, tx, ty) {
  if (ty < 0 || ty >= H || tx < 0 || tx >= W) return true;
  return BLOCKING.has(grid[ty][tx]);
}

/** Breadth-first reachability, used by the smoke test and by the field itself
    when it wants to place something the player must be able to reach. */
export function reachable(grid, from, to) {
  const seen = new Set([`${from[0]},${from[1]}`]);
  const q = [from];
  while (q.length) {
    const [x, y] = q.shift();
    if (x === to[0] && y === to[1]) return true;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy, k = `${nx},${ny}`;
      if (seen.has(k) || blockedAt(grid, nx, ny)) continue;
      seen.add(k);
      q.push([nx, ny]);
    }
  }
  return false;
}

/* ------------------------------------------------------------- the people
   Each of the four hands you one verse. Those verses are the four moves in
   the fight: the game does not give you a weapon the walk did not earn. */

export const WORDS = [
  {
    id: "fear", kind: "threat", ref: "出埃及记 14:13",
    text: { en: "“Fear not, stand still, and see the salvation of the LORD.”", zh: "「不要惧怕，只管站住，看耶和华今天向你们所要施行的救恩。」" },
    why: { en: "A word for the shout that tries to make you small.", zh: "给那想把你喊小的声音。" }
  },
  {
    id: "name", kind: "mock", ref: "撒母耳记上 17:45",
    text: { en: "“Thou comest to me with a sword, and with a spear: but I come to thee in the name of the LORD.”", zh: "「你来攻击我，是靠着刀枪和铜戟；我来攻击你，是靠着万军之耶和华的名。」" },
    why: { en: "A word for the laugh that counts your weapons.", zh: "给那数你有几件兵器的人。" }
  },
  {
    id: "look", kind: "contempt", ref: "撒母耳记上 16:7",
    text: { en: "“Man looketh on the outward appearance, but the LORD looketh on the heart.”", zh: "「耶和华不像人看人：人是看外貌，耶和华是看内心。」" },
    why: { en: "A word for being written off for how young you look.", zh: "给那句「你太年轻」。" }
  },
  {
    id: "shepherd", kind: "doubt", ref: "诗篇 23:1",
    text: { en: "“The LORD is my shepherd; I shall not want.”", zh: "「耶和华是我的牧者，我必不致缺乏。」" },
    why: { en: "A word for the forty days of silence.", zh: "给那四十天的沉默。" }
  }
];

export const SHOUTS = [
  {
    kind: "threat",
    line: { en: "“Choose you a man, and let him come down to me!”", zh: "「你们叫一个人出来，与我交战吧！」" },
    tell: { en: "He is shouting for the whole valley to hear. He wants you to count the distance.", zh: "他喊得整条山谷都听见，他要你先数一数自己离他有多远。" }
  },
  {
    kind: "mock",
    line: { en: "“Am I a dog, that thou comest to me with staves?”", zh: "「你拿杖到我这里来，我岂是狗呢？」" },
    tell: { en: "He is looking at your hands, and finding them empty.", zh: "他在看你的手，觉得你手里什么也没有。" }
  },
  {
    kind: "contempt",
    line: { en: "“Whose son is this youth? He is but a boy.”", zh: "「这少年人是谁的儿子？他不过是个孩子。」" },
    tell: { en: "He has stopped talking to you and started talking about you.", zh: "他不再对你说话，开始对别人说你。" }
  },
  {
    kind: "doubt",
    line: { en: "“Forty days, and thy God has sent no one. Will he save thee?”", zh: "「四十天了，你的神没有派一个人来。他真能救你吗？」" },
    tell: { en: "This one is quiet. It is the one that has been working all along.", zh: "这一句很轻。它已经在你心里响了四十天。" }
  }
];

export const NPCS = [
  {
    id: "corin", actor: "corin", at: [13, 47], name: { en: "Corin", zh: "柯林" },
    word: "name",
    lines: [
      { who: { en: "Corin", zh: "柯林" }, text: { en: "“You came.” He closes the scroll and tucks it into his sleeve. “The valley is just up this road. That voice has been shouting morning and evening for forty days.”", zh: "「你来了。」他把书卷合上，收进袖子里，「山谷就在这条路上去。那声音早晚各喊一次，已经喊了四十天。」" } },
      { who: { en: "Corin", zh: "柯林" }, text: { en: "“You have no armour and no sword. What you have is a hand and a mouth.” He taps your chest. “When the moment comes, those are the only two things that will answer for you.”", zh: "「你身上没有铠甲，也没有刀。」他指了指你的手，又指了指你的嘴，「到那一刻，能替你答话的只有这两样。」" } },
      { who: { en: "Corin", zh: "柯林" }, text: { en: "“Keep this one. You will need it at the top of the road.”", zh: "「这一句你收好。走到路口的时候，你会用得上。」" } }
    ],
    after: [
      { who: { en: "Corin", zh: "柯林" }, text: { en: "“Talk to the others before you go up. A man who goes up alone goes up with only his own voice.”", zh: "「上去之前，先和另外几个人说说话。一个人上去，身上就只有自己那一句话。」" } }
    ]
  },
  {
    id: "boy", actor: "soldier", at: [9, 45], name: { en: "A young soldier", zh: "少年兵" },
    word: "fear",
    lines: [
      { who: { en: "A young soldier", zh: "少年兵" }, text: { en: "He is holding his spear with both hands. “They say he is three metres tall. I cannot tell. I have never been close enough to look.”", zh: "他两只手抱着矛。「他们说他有三米高。我看不清，我从来没有走近过。」" } },
      { who: { en: "A young soldier", zh: "少年兵" }, text: { en: "“My mother said, do not be afraid, when I left. Then she cried anyway.” He looks at you. “I keep thinking about that. She was afraid too, and she still said it.”", zh: "「我出门的时候，我妈说不要怕。说完她还是哭了。」他看着你，「我一直在想这件事。她自己也在怕，可她还是说了那句话。」" } },
      { who: { en: "A young soldier", zh: "少年兵" }, text: { en: "“Take it with you. Somebody said it to a whole nation once, standing at the water. It is not mine to keep.”", zh: "「你带着走吧。这句话从前有人站在水边，对着一整个国家说过。它不是我一个人的。」" } }
    ],
    after: [
      { who: { en: "A young soldier", zh: "少年兵" }, text: { en: "“If you are going up, go up. I will be here when you come back down.”", zh: "「你要是上去，就上去吧。你下来的时候，我还在这里。」" } }
    ]
  },
  {
    id: "woman", actor: "woman", at: [17, 44], name: { en: "A woman at the tent", zh: "帐前的妇人" },
    word: "shepherd",
    lines: [
      { who: { en: "A woman at the tent", zh: "帐前的妇人" }, text: { en: "She is dividing bread and does not look up. “You are going up too, then. My husband went up. He has not come back down.”", zh: "她低着头分饼。「你也要上去。我男人上去了，还没下来。」" } },
      { who: { en: "A woman at the tent", zh: "帐前的妇人" }, text: { en: "“I do not pray that he wins,” she says. “I pray that he does not lose himself up there.”", zh: "「我不祷告他打赢。」她说，「我祷告他别把自己丢在上面。」" } },
      { who: { en: "A woman at the tent", zh: "帐前的妇人" }, text: { en: "“Here. Bread, and a psalm. The bread will not last the road. The psalm might.”", zh: "「拿着。饼，还有一句诗。饼走不了多远，这句话也许能陪你走得远一点。」" } }
    ],
    after: [
      { who: { en: "A woman at the tent", zh: "帐前的妇人" }, text: { en: "“Eat something before you go. Nobody fights well hungry.”", zh: "「上去之前吃点东西。饿着的人打不好仗。」" } }
    ]
  },
  {
    id: "elder", actor: "elder", at: [15, 33], name: { en: "An old soldier", zh: "老兵" },
    word: "look",
    lines: [
      { who: { en: "An old soldier", zh: "老兵" }, text: { en: "An old man is sitting on a stone by the road, mending a strap. “They will not let you through, you know. The king himself has said it: you are too young, and he has been a fighting man since he was a boy.”", zh: "一个老人坐在路边的石头上修皮带。「他们不会让你过去的。连王都说了：你年纪太轻，他从小就打仗。」" } },
      { who: { en: "An old soldier", zh: "老兵" }, text: { en: "“He is not wrong about the years.” The old man pulls the strap tight. “He is only wrong about what they are for.”", zh: "「他说你年轻，这话没错。」老人把皮带拉紧，「他错在以为年轻就没有用。」" } },
      { who: { en: "An old soldier", zh: "老兵" }, text: { en: "“I have been looked at my whole life, son. Take the word that answers it.”", zh: "「我这一辈子都在被人打量。」他说，「把能回这句话的那一句带上。」" } }
    ],
    after: [
      { who: { en: "An old soldier", zh: "老兵" }, text: { en: "“The stones are at the brook, past the tents. Five is what he took. Not six.”", zh: "「石子在下游的溪边，过了帐篷就是。他当时捡了五块。不是六块。」" } }
    ]
  }
];

/* Five stones. The giant has five pips of bluster; the walk supplies exactly
   five throws, and no more. */
export const STONES = [
  { id: "s1", at: [11, 30] },
  { id: "s2", at: [15, 29] },
  { id: "s3", at: [12, 26] },
  { id: "s4", at: [10, 25] },
  { id: "s5", at: [13, 31] }
];

export const ELAH = {
  id: "elah",
  name: { en: "The Valley of Elah", zh: "以拉谷" },
  sub: { en: "1 Samuel 17", zh: "撒母耳记上 17" },
  grid: buildGrid(),
  start: [13, 50],
  goliath: [13, 8],
  challengeRow: 11,          /* crossing this row upwards starts the fight */
  returnTo: [13, 51]
};
