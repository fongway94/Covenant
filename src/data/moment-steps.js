/* Step-by-step instructions for the five kinds of story moment.

   These are the first interactions a new player ever meets — they arrive in the
   middle of a conversation, with no canvas and no obvious affordance — so one
   sentence ("press and hold") was not enough. Every kind gets three lines:
   what the hand does, what the screen shows back while you do it, and what
   finishes it. Written from the real mechanics in engine/moments.js.

   Kept as plain data so `npm run check:moments` can prove all five kinds have
   three lines in both languages. `momentHow()` in screens/story.js localises. */

const S = (en, zh) => ({ en, zh });

export const MOMENT_STEPS = {
  hold: S([
    "Press anywhere on the picture and keep your finger down. The gold ring fills for as long as you hold.",
    "Lift your finger and the ring drains back. Nothing is lost — you just press again.",
    "Hold until the ring has closed all the way round, then let go."
  ], [
    "手指按在画面上，按住别松。金色的圆圈会跟着你慢慢填满。",
    "手一抬，圈里的光就退回去。不算失败，重新按住就行。",
    "等这一圈合拢了，再把手抬起来。"
  ]),

  tap: S([
    "A mark ✧ lights up somewhere on the scene. That is the only thing to touch.",
    "Tap the mark once. Tapping the empty picture does nothing at all.",
    "Five marks, one at a time — each one you take lights the next."
  ], [
    "画面里会亮起一个记号 ✧，只点这个记号。",
    "在记号上点一下。点画面空处没有用。",
    "一共五个，一个一个来；点掉一个，才亮下一个。"
  ]),

  trace: S([
    "Start at the bottom of the dotted line and put your finger on the line itself.",
    "Drag upward along it, slowly. Wander more than a thumb off the line and the light stops following you.",
    "Follow the line to its top — the path brightens behind your finger, and that is the moment complete."
  ], [
    "从虚线最下面开始，手指落在线上。",
    "顺着线往上慢慢拖；离得太远，光就不跟着走了。",
    "一路拖到最上面，走过的地方会亮起来，这一刻就完成了。"
  ]),

  balance: S([
    "Press and drag left and right. The ground keeps tipping on its own, so the bubble will not settle by itself.",
    "Bring the small bubble into the notch in the middle of the bar.",
    "Keep it in the notch for three seconds in all. Slipping out starts the count again; nothing else is lost."
  ], [
    "按住画面左右拖。脚下的地会自己晃，气泡不会自己稳住。",
    "把那个小气泡拖到横杆中间那道凹槽里。",
    "在槽里一共稳住三秒；滑出去就重新攒，别的不会少。"
  ]),

  rhythm: S([
    "A mark sweeps back and forth along the bar, and one band on it is gold.",
    "Tap once at the moment the mark is inside the gold band.",
    "Four hits. The band moves after each one, so watch it rather than counting."
  ], [
    "指针在横杆上来回走，杆上有一段是金色的。",
    "指针走进金色那一段时，点一下。",
    "点中四次就成。每中一次金段会挪位子，看清了再点。"
  ]),

  /* Anything new that has no bespoke steps yet still gets three honest lines,
     so the briefing never falls back to a single vague sentence. */
  default: S([
    "Slide your finger across the picture and follow whatever is moving.",
    "The bar underneath shows how far you have come.",
    "Carry it to the end and the moment closes."
  ], [
    "手指在画面上滑动，跟着动的地方走。",
    "下面的那条进度会跟着往前走。",
    "一直跟到底，这一刻就结束了。"
  ])
};

/** The three lines for a kind, already in each language: { en: [...], zh: [...] }. */
export function momentSteps(kind) {
  return MOMENT_STEPS[kind] || MOMENT_STEPS.default;
}
