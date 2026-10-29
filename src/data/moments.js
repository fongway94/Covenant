/* ============================================================================
   STORY MOMENTS — small tactile interactions embedded INSIDE the story.

   Design rule: no new screens, no new resources, no new buttons to learn.
   Each moment is a 6–14 second physical action that belongs to the scene:
   hold, tap, trace, balance, rhythm. Two per chapter = 20 extra playable
   moments on top of the 10 multi-act action scenes and the lantern searches.

   They are NOT scripture and they never change the biblical outcome. They are
   embodied attention: you steady your breath, you bind a wound, you hold a
   rope. Small XP and a "way of walking" tally feed the Journey Mirror.

   Kept outside CHAPTERS because i18n rebuilds chapter objects in place.
   ============================================================================ */

const B = (en, zh) => [en, zh];

/* at = node id the moment appears after · kind = interaction · subject = which
   painting the moment is drawn as · way = mirror axis */
const M = (at, kind, subject, plate, fx, fy, title, prompt, done, way, opts = {}) =>
  ({ at, kind, subject, plate, fx, fy, way, title, prompt, done, ...opts });

export const MOMENT_WAY_FALLBACK = {
  hold: "wait", tap: "step", trace: "notice", balance: "stay", rhythm: "wait"
};

export const MOMENTS = {
  elah: [
    M("start2", "hold", "ground",
      "elah", 0.46, 0.68,
      B("Hold your ground", "站稳"),
      B("The giant's shout rolls over the valley. Press and hold until your breathing steadies.", "按住不放，等圆圈填满。巨人的喊声正从山谷滚过来。"),
      B("You did not run. That is what courage looked like from the inside.", "你没有跑。勇敢是什么滋味，大概就是这样。"), "wait", { span: 0.40 }),
    M("arrival", "balance", "provision",
      "elah-field", 0.44, 0.68,
      B("Carry the provisions", "稳住供给"),
      B("A pole across your shoulders, bread on one end and cheese on the other. Drag left and right to keep the bubble in its notch while the ridge tips underfoot.", "左右拖动，让气泡停在中间的缺口里，别让它滑出来。扁担压在肩上，一头是饼，一头是奶酪，山路一直斜着。"),
      B("You reach the top without dropping anything. Nobody noticed you arrive.", "你一样东西也没掉，爬到了山顶。没有人注意到你来了。"), "stay", { span: 0.46 })
  ],
  lions: [
    /* The decree is the open scroll on the mat in this painting: the nodes
       are the lines of it, in plate fractions, so the ink surfaces on the
       scroll and never in mid-air. */
    M("decree", "tap", "lines",
      "window", 0.55, 0.78,
      B("Read the sealed decree", "读那盖印的禁令"),
      B("Tap each line as it surfaces. The law is already written — you can only witness it.", "每一行字浮起来，就点它一下。律法已经写好，你只能看着它落下来。"),
      B("Thirty days. No prayer. The ink is still wet.", "三十天。不许祷告。墨迹还没干。"), "notice",
      { spots: [[0.515, 0.856], [0.545, 0.868], [0.575, 0.858], [0.605, 0.870], [0.565, 0.882], [0.632, 0.858]] }),
    M("upstairs", "hold", "shutter",
      "lions", 0.55, 0.60,
      B("Keep the window open", "让窗户敞着"),
      B("Hold to keep the shutters open toward Jerusalem while the city goes quiet.", "按住不放，把朝耶路撒冷的那扇窗一直撑着，直到全城静下来。"),
      B("Three times a day. The same as yesterday. The same as always.", "一日三次。和昨天一样。和往常一样。"), "wait")
  ],
  jericho: [
    /* The wounds are placed on the painting's own forearm — these are plate
       fractions along the arm he is lying on, not screen positions. */
    M("wounded", "tap", "wound",
      "tend", 0.42, 0.62,
      B("Bind the wounds", "包扎伤口"),
      B("Tap each wound to clean it with oil and wine. Be gentle — he is barely conscious.", "伤口亮起来就点一下，先用油和酒冲干净。他已经快没有意识，所以一下一下慢慢来。"),
      B("Oil, wine, bandages. Mercy has a cost and it is counted in linen.", "油、酒、绷带。怜悯是要付代价的，代价都记在这些布上。"), "stay",
      { spots: [[0.26, 0.685], [0.31, 0.655], [0.375, 0.665], [0.44, 0.598], [0.485, 0.572], [0.52, 0.545]] }),
    M("passers", "rhythm", "foot",
      "jericho", 0.50, 0.64,
      B("Listen for footsteps", "听脚步声"),
      B("Two people pass on the road. Tap when each footstep reaches the golden mark.", "光点走进金色那一段时点一下。路那头有脚步声，有人正经过。"),
      B("They saw him. They crossed to the other side. The road is very quiet again.", "他们看见了他，却从另一边绕了过去。路上又安静下来。"), "notice")
  ],
  storm: [
    M("evening", "balance", "jars",
      "storm", 0.55, 0.55,
      B("Ballast the boat", "稳住船身"),
      B("A pole of water jars on your shoulders while the deck heaves. Drag left and right to keep the bubble in its notch.", "左右拖动，让气泡停进缺口里，别让它滑出去。甲板一直在晃。"),
      B("Everything is stowed. It will not be enough.", "一切都绑好了。但这还不够。"), "stay"),
    M("storm", "hold", "rope",
      "storm", 0.50, 0.50,
      B("Hold the rope", "抓住绳索"),
      B("Hold on. The wave is coming over the bow and the rope is all you have.", "按住别松手。浪正翻过船头，你手里只剩这根绳子。"),
      B("The rope held. So did you.", "绳子没有断。你也没有。"), "wait")
  ],
  prodigal: [
    M("famine", "trace", "road",
      "prodigal", 0.58, 0.50,
      B("Trace the road home", "描出回家的路"),
      B("Drag along the road from the pigsty back to the father's house.", "从下往上，沿着那条路慢慢拖。那是从猪圈回家的路。"),
      B("The road is longer than you remember. He has been watching it the whole time.", "这条路比你记忆中更长。而他一直望着这条路。"), "notice"),
    M("road", "tap", "step",
      "title", 0.48, 0.55,
      B("Run to him", "跑向他"),
      B("Tap each step. He is running too — which is not what you expected.", "他每跑一步，你就点一下。他也朝你跑过来了——这跟你预想的不一样。"),
      B("The robe arrives before the apology is finished.", "袍子先到，认罪的话还没说完。"), "step")
  ],
  esther: [
    M("fast", "hold", "lamp",
      "esther", 0.40, 0.76,
      B("Three days of fasting", "禁食三日"),
      B("Hold through the fast. Nothing happens. That is the point — you are waiting.", "按住不放，把这三天的禁食撑完。什么也不会发生——你就是在等。"),
      B("Three days. Then she will go in, though it is against the law.", "三天。然后她要进去，虽然这是违反禁令的。"), "wait"),
    M("throne", "rhythm", "light",
      "hall", 0.46, 0.52,
      B("Approach the throne", "走到宝座前"),
      B("Each step must land in the narrow moment of favour. Tap when the light reaches the mark.", "光点走进金色那一段时点一下。她一步一步走向宝座。"),
      B("The scepter is extended. The decree is not yet reversed.", "金杖伸了出来。但那道谕令还没有收回。"), "step")
  ],
  bush: [
    M("stray", "trace", "slope",
      "bush", 0.50, 0.55,
      B("Follow the stray lamb", "循着迷羊的踪迹"),
      B("Trace the wandering path up the slope. The flock is behind you.", "从下往上，沿着那条弯弯的小路拖。羊群跟在你后面。"),
      B("A lamb wandered. A bush is burning. Neither was on your schedule.", "一只羊走迷了。一丛荆棘烧着了。两件事都不在你的计划里。"), "notice"),
    M("bush", "hold", "bush",
      "flame", 0.50, 0.55,
      B("Turn aside and look", "转过身去看"),
      B("Hold still and look. The bush burns, but it is not consumed.", "按住屏幕别松手，就这么看着。荆棘在烧，却没有烧掉。"),
      B("Moses hid his face. There is no smoke and no hurry.", "摩西蒙住了脸。没有烟，也没有丝毫匆忙。"), "notice")
  ],
  ruth: [
    M("field", "tap", "barley",
      "ruth", 0.38, 0.72,
      B("Gather the fallen barley", "拾取掉落的麦穗"),
      B("Tap each stalk left behind at the edges of the field. Leave nothing for pride.", "麦穗掉下来就点它一下，一根都别落下。弯下腰，别嫌麻烦。"),
      B("A handful of barley. Boaz told the reapers to drop more on purpose.", "一把麦穗。是波阿斯吩咐收割的人故意多留的。"), "notice",
      { spawn: [0.14, 0.46, 0.86, 0.82] }),
    M("kindness", "balance", "sheaf",
      "ruth", 0.40, 0.70,
      B("Carry the sheaf", "扛着麦捆"),
      B("The sheaf rides a pole on your shoulder all the way to Naomi. Drag left and right to keep the bubble in its notch.", "左右拖动，让气泡停进缺口里。一捆麦子压在肩上，要一路扛回拿俄米那里。"),
      B("She asks who noticed you. You say a man called Boaz.", "她问是谁留意了你。你说，是一个叫波阿斯的人。"), "stay")
  ],
  jonah: [
    M("deep", "hold", "dark",
      "belly", 0.50, 0.55,
      B("Three days in the dark", "黑暗中的三天"),
      B("Hold through the dark. There is nothing to do here but wait and pray.", "按住屏幕别松手，在黑暗里等着。除了等候和祷告，这里没有别的事可做。"),
      B("Salvation is of the LORD. The fish has not moved yet.", "救恩出于耶和华。大鱼还没有动。"), "wait"),
    M("nineveh", "rhythm", "sun",
      "cry", 0.50, 0.55,
      B("Walk through the city", "走遍那城"),
      B("One day's walk into Nineveh. Tap each step when the light reaches the mark.", "光点走进金色那一段时点一下。你一天走遍尼尼微。"),
      B("Forty days, he says. The whole city stops to listen.", "他说，再等四十天。全城都停下来听。"), "step")
  ],
  zacchaeus: [
    M("tree", "trace", "branch",
      "branches", 0.55, 0.35,
      B("Climb the sycamore", "爬上桑树"),
      B("Drag up the winding branches. You are short and the crowd is tall.", "从下往上，沿着树枝慢慢拖。他个子矮，人群又高。"),
      B("You only wanted to see. Being seen was not part of the plan.", "你只是想看一眼。被看见并不在你的计划里。"), "step"),
    M("house", "tap", "coin",
      "zacchaeus", 0.50, 0.62,
      B("Count out four coins", "数出四倍的钱"),
      B("Tap each coin as he counts. Fourfold — more than the Law required.", "他数一枚，你点一下。四倍——远远超过律法的要求。"),
      B("Nobody asked him to. That is what grace does when it is welcomed.", "没有人要求他这样做。恩典被接住了，就是这样。"), "stay",
      { spawn: [0.18, 0.58, 0.82, 0.84] })
  ]
};

/** Localised spec for a chapter node, or null. `done` is the doneNodes map. */
export function momentFor(chapterId, nodeId, zh, done = {}) {
  const list = MOMENTS[chapterId] || [];
  const m = list.find((x) => x.at === nodeId);
  if (!m || done[nodeId + ":moment"]) return null;
  const L = (b) => b[zh ? 1 : 0];
  return {
    kind: m.kind, subject: m.subject, plate: m.plate, fx: m.fx, fy: m.fy, span: m.span,
    spots: m.spots, spawn: m.spawn,
    way: m.way || MOMENT_WAY_FALLBACK[m.kind],
    title: L(m.title), prompt: L(m.prompt), done: L(m.done),
    at: m.at, chapterId
  };
}

export function momentCount() {
  return Object.values(MOMENTS).reduce((n, list) => n + list.length, 0);
}
