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

/* at = node id the moment appears after · kind = interaction · way = mirror axis */
const M = (at, kind, title, prompt, done, way) => ({ at, kind, way, title, prompt, done });

export const MOMENT_WAY_FALLBACK = {
  hold: "wait", tap: "step", trace: "notice", balance: "stay", rhythm: "wait"
};

export const MOMENTS = {
  elah: [
    M("start2", "hold",
      B("Hold your ground", "站稳"),
      B("The giant's shout rolls over the valley. Press and hold until your breathing steadies.", "巨人的喊声滚过山谷。按住不放，直到你的呼吸稳下来。"),
      B("You did not run. That is what courage looked like from the inside.", "你没有跑。从里面看，勇敢就是这个样子。"), "wait"),
    M("arrival", "balance",
      B("Carry the provisions", "稳住供给"),
      B("Bread, cheese, a staff. Drag to keep the load level as you climb the ridge.", "饼、奶饼、一根杖。拖动保持平衡，把东西扛上山脊。"),
      B("You reach the top without dropping anything. Nobody noticed you arrive.", "你一样东西也没掉地爬到了山顶。没有人注意到你来了。"), "stay")
  ],
  lions: [
    M("decree", "tap",
      B("Read the sealed decree", "读那盖印的禁令"),
      B("Tap each line as it surfaces. The law is already written — you can only witness it.", "每一行浮起时轻点它。律法已经写好——你只能见证。"),
      B("Thirty days. No prayer. The ink is still wet.", "三十天。不许祷告。墨迹还没干。"), "notice"),
    M("upstairs", "hold",
      B("Keep the window open", "让窗户敞着"),
      B("Hold to keep the shutters open toward Jerusalem while the city goes quiet.", "按住，让朝向耶路撒冷的窗扇一直敞着，直到全城安静。"),
      B("Three times a day. The same as yesterday. The same as always.", "一日三次。和昨天一样。和往常一样。"), "wait")
  ],
  jericho: [
    M("wounded", "tap",
      B("Bind the wounds", "包扎伤口"),
      B("Tap each wound to clean it with oil and wine. Be gentle — he is barely conscious.", "轻点每处伤口，用油和酒清洗。轻一点——他几乎失去意识。"),
      B("Oil, wine, bandages. Mercy has a cost and it is counted in linen.", "油、酒、绷带。怜悯是有代价的，代价是用布来数的。"), "stay"),
    M("passers", "rhythm",
      B("Listen for footsteps", "听脚步声"),
      B("Two people pass on the road. Tap when each footstep reaches the golden mark.", "有两个人从路上经过。每一步踏到金色记号时轻点。"),
      B("They saw him. They crossed to the other side. The road is very quiet again.", "他们看见了他，却从那边绕过去了。路上又安静下来。"), "notice")
  ],
  storm: [
    M("evening", "balance",
      B("Ballast the boat", "稳住船身"),
      B("Drag the net and water jars to keep the boat level as the wind rises.", "拖动渔网和水罐，在风起时让船保持平稳。"),
      B("Everything is stowed. It will not be enough.", "一切都绑好了。但这还不够。"), "stay"),
    M("storm", "hold",
      B("Hold the rope", "抓住绳索"),
      B("Hold on. The wave is coming over the bow and the rope is all you have.", "抓紧。浪头正越过船头，你只剩这根绳子。"),
      B("The rope held. So did you.", "绳子没有断。你也没有。"), "wait")
  ],
  prodigal: [
    M("famine", "trace",
      B("Trace the road home", "描出回家的路"),
      B("Drag along the road from the pigsty back to the father's house.", "沿着从猪圈回到父家的那条路拖动。"),
      B("The road is longer than you remember. He has been watching it the whole time.", "这条路比你记忆中更长。而他一直望着这条路。"), "notice"),
    M("road", "tap",
      B("Run to him", "跑向他"),
      B("Tap each step. He is running too — which is not what you expected.", "轻点每一步。他也在跑——这和你预想的不一样。"),
      B("The robe arrives before the apology is finished.", "袍子先到，认罪的话还没说完。"), "step")
  ],
  esther: [
    M("fast", "hold",
      B("Three days of fasting", "禁食三日"),
      B("Hold through the fast. Nothing happens. That is the point — you are waiting.", "按住，撑过禁食。什么也没有发生。这正是重点——你在等候。"),
      B("Three days. Then she will go in, though it is against the law.", "三天。然后她要进去，虽然这是违反禁令的。"), "wait"),
    M("throne", "rhythm",
      B("Approach the throne", "走到宝座前"),
      B("Each step must land in the narrow moment of favour. Tap when the light reaches the mark.", "每一步都要踩在恩宠的那一刻。光芒到达记号时轻点。"),
      B("The scepter is extended. The decree is not yet reversed.", "金杖伸了出来。但谕令还没有被翻转。"), "step")
  ],
  bush: [
    M("stray", "trace",
      B("Follow the stray lamb", "循着迷羊的踪迹"),
      B("Trace the wandering path up the slope. The flock is behind you.", "沿着上坡那条弯弯曲曲的小径拖动。羊群在你身后。"),
      B("A lamb wandered. A bush is burning. Neither was on your schedule.", "一只羊走迷了。一丛荆棘烧着了。两件事都不在你的计划里。"), "notice"),
    M("bush", "hold",
      B("Turn aside and look", "转过身去看"),
      B("Hold still and look. The bush burns, but it is not consumed.", "按住不动，仔细看。荆棘在烧，却没有烧毁。"),
      B("Moses hid his face. There is no smoke and no hurry.", "摩西蒙住了脸。没有烟，也没有丝毫匆忙。"), "notice")
  ],
  ruth: [
    M("field", "tap",
      B("Gather the fallen barley", "拾取掉落的麦穗"),
      B("Tap each stalk left behind at the edges of the field. Leave nothing for pride.", "轻点田边掉落的每一根麦穗。别让骄傲使你留下任何一根。"),
      B("A handful of barley. Boaz told the reapers to drop more on purpose.", "一把麦穗。是波阿斯吩咐收割的人故意多留的。"), "notice"),
    M("kindness", "balance",
      B("Carry the sheaf", "扛着麦捆"),
      B("Keep the sheaf balanced on your shoulder all the way back to Naomi.", "一路把麦捆稳稳扛在肩上，回到拿俄米那里。"),
      B("She asks who noticed you. You say a man called Boaz.", "她问是谁留意了你。你说，是一个叫波阿斯的人。"), "stay")
  ],
  jonah: [
    M("deep", "hold",
      B("Three days in the dark", "黑暗中的三天"),
      B("Hold through the dark. There is nothing to do here but wait and pray.", "在黑暗中按住不放。这里除了等候和祷告，无事可做。"),
      B("Salvation is of the LORD. The fish has not moved yet.", "救恩出于耶和华。大鱼还没有动。"), "wait"),
    M("nineveh", "rhythm",
      B("Walk through the city", "走遍那城"),
      B("One day's walk into Nineveh. Tap each step when the light reaches the mark.", "往尼尼微走一日。每步在光到达记号时轻点。"),
      B("Forty days, he says. The whole city stops to listen.", "他说，再等四十天。全城都停下来听。"), "step")
  ],
  zacchaeus: [
    M("tree", "trace",
      B("Climb the sycamore", "爬上桑树"),
      B("Drag up the winding branches. You are short and the crowd is tall.", "沿着弯曲的树枝向上拖动。你个子矮，人群又高。"),
      B("You only wanted to see. Being seen was not part of the plan.", "你只是想看一眼。被看见并不在你的计划里。"), "step"),
    M("house", "tap",
      B("Count out four coins", "数出四倍的钱"),
      B("Tap each coin as he counts. Fourfold — more than the Law required.", "他一枚一枚地数，你也跟着轻点。四倍——远超律法的要求。"),
      B("Nobody asked him to. That is what grace does when it is welcomed.", "没有人要求他这样做。这就是恩典被接纳之后所做的事。"), "stay")
  ]
};

/** Localised spec for a chapter node, or null. `done` is the doneNodes map. */
export function momentFor(chapterId, nodeId, zh, done = {}) {
  const list = MOMENTS[chapterId] || [];
  const m = list.find((x) => x.at === nodeId);
  if (!m || done[nodeId + ":moment"]) return null;
  const L = (b) => b[zh ? 1 : 0];
  return {
    kind: m.kind, way: m.way || MOMENT_WAY_FALLBACK[m.kind],
    title: L(m.title), prompt: L(m.prompt), done: L(m.done),
    at: m.at, chapterId
  };
}

export function momentCount() {
  return Object.values(MOMENTS).reduce((n, list) => n + list.length, 0);
}
