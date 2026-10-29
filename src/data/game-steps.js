/* Step-by-step instructions for every interactive scene.

   One sentence of "how it works" is not enough to pick up a phone and play:
   a player needs to know what to do with the hand, what the game will show
   them when they are in the right place, and what finishes it. Each card gets
   three numbered steps — the gesture, the signal to watch for, and what
   completes the act — written from the actual mechanic in engine/games.js and
   engine/stages.js.

   Kept out of games.js on purpose: that file is drawing and physics, this one
   is the only place the instructions live, so `npm run check:games` can prove
   every act of every scene has them in both languages. */

const S = (en, zh) => ({ en, zh });

export const GAME_STEPS = {
  /* ---------------------------------------------------- 1. Elah · stones */
  stones: {
    main: S([
      "Drag one finger slowly through the water. A hurried hand stirs up silt, and the brook goes blind.",
      "When a stone lights up under your finger with a ring of light, that is one you can take.",
      "Stop and hold still until the ring fills, and it is yours. Five smooth stones — the jagged ones slip away."
    ], [
      "一根手指在溪水里慢慢拖。手一急，泥沙就翻起来，什么都看不见了。",
      "手指下面有石子会亮起来，外面浮起一圈光——那就是能捡的石子。",
      "停在那儿别动，等那圈光填满，就捡到一块。要五块光滑的；有棱角的会滑走。"
    ])
  },

  /* ------------------------------------------------------ 2. Elah · sling */
  sling: {
    prelude: S([
      "The stones are in the bag. Press near David's fist and drag your finger in full circles round it.",
      "Keep circling the same way — the sling sings louder the longer you wind it, and changing direction loses it.",
      "Lift your finger while the circle is still full. Three clean throws before you step onto the field."
    ], [
      "石子已经装进袋里。按住大卫拳头旁边，手指绕着它画整圈。",
      "一直朝同一个方向转——转得越久，风声越响；半路换方向就白转了。",
      "趁那一圈还是满的时候抬手，石子就飞出去。上阵前甩出三次干净的。"
    ]),
    main: S([
      "The valley is open in front of you. Goliath throws two kinds of spear as David walks to the line.",
      "If the spear skims the dust, tap anywhere once and David leaps over it.",
      "If it comes at his chest, press and drag down and he drops under it. Four hits and he is driven back to the start of the valley — nothing is lost, you walk it again."
    ], [
      "山谷在你面前铺开。大卫往阵前走的时候，歌利亚会一直投枪，一共两种。",
      "枪贴着地皮飞来时，点一下屏幕，大卫就跳过去。",
      "枪冲着他胸口来时，按住往下拖，他蹲下去躲过。被击中四次就退回谷口重新走一遍，不扣分。"
    ])
  },

  /* ----------------------------------------------------- 3. Lions · window */
  window: {
    main: S([
      "Daniel's window faces Jerusalem, and the shutters are held by an iron latch on the left.",
      "Press on the latch and drag it upward — the bar lifts, and the shutters come loose.",
      "Then push each shutter outward until both are open. He prays this way three times a day; nothing is going to change that."
    ], [
      "但以理的窗朝着耶路撒冷，两扇窗被左边一根铁闩扣着。",
      "按住铁闩往上拖——横闩抬起来，窗扇就松了。",
      "再把两扇窗分别往外推，直到都敞开。他一天三次这样祷告，一道禁令改不了这件事。"
    ])
  },

  /* ------------------------------------------------------ 4. Lions · den */
  lions: {
    prelude: S([
      "A guard walks his round with a torch. Watch the light travel along the wall.",
      "When the torch comes near a prayer lamp, press your finger on that lamp and hold it.",
      "Keep holding until the torch has passed. Three lamps sheltered before the den is sealed."
    ], [
      "守卫举着火把一圈一圈地巡。看着那团光沿着墙走。",
      "光快照到哪盏祷告的灯，就用手指按住那盏灯。",
      "按住别松，等光走过去再抬手。封坑之前，三盏都要守住。"
    ]),
    main: S([
      "Drag to walk the pilgrim forward through the den. Let go and he stops where he is.",
      "Stopped, he is hidden — the lions look past him. Moving in the open is what they notice.",
      "Work your way right, past the eyes, into the light at the far side."
    ], [
      "拖着往前走，让朝圣者一步步穿过狮子坑。一松手，他就停在原地。",
      "停住就藏住了，狮子的目光会越过他；在空地上走动才会被盯上。",
      "就这样一点一点往右边挪，穿过那些眼睛，走进最右边那道亮光里。"
    ])
  },

  /* --------------------------------------------------- 5. Jericho · road */
  jericho: {
    prelude: S([
      "The donkey is loaded and the road climbs in switchbacks from here.",
      "Keep one finger down on the road itself and drag along it — the moment you leave the path, the donkey stumbles.",
      "Do not lift and jump ahead. Follow the road all the way to the top of the ridge."
    ], [
      "驴已经驮好了，路从这里开始一圈一圈往上盘。",
      "一根手指按在路面上，顺着路拖——手指一离开路，驴就踩空。",
      "不要抬手跳到前面，贴着路一直拖到山脊顶上。"
    ]),
    main: S([
      "He cannot help you at all. Put your whole hand under him and drag upward to lift him onto the donkey.",
      "A ring fills while you lift — keep your finger down until it closes, or he slips back to the ground.",
      "Then keep your palm on him as the donkey walks the turn. Lift your hand and he slides off."
    ], [
      "他一点力气也使不上。整只手掌托在他身下，往上拖，把他抬到驴背上。",
      "抬的时候会有一圈光在填，手指别松，填满才算托稳；松早了人又滑回地上。",
      "上了驴，手掌也别离开他，跟着驴走完这段路——手一抬，他就滑下来。"
    ])
  },

  /* --------------------------------------------------- 5b. Jericho · tend */
  tend: {
    main: S([
      "The wound is open. Press down and move your finger back and forth across it — only the part under your finger gets washed.",
      "Work along the whole wound, not one spot: the oil and wine run where you drag, and the blood comes away with it.",
      "Once it is clean, circle round the arm over and over to wind the linen on. Slowly — hurrying makes him flinch."
    ], [
      "伤口敞着。手指按下去，在伤口上来回移动——只有手指底下那一段会被冲到。",
      "要一段一段走，别停在一点：手指拖到哪儿，油和酒就流到哪儿，血也跟着冲掉。",
      "冲干净以后，绕着胳膊一圈一圈拖，把麻布缠上去。慢慢来，一急他就疼得缩。"
    ])
  },

  /* --------------------------------------------------- 6. Storm · rope */
  storm: {
    prelude: S([
      "The rope is soaked and the yard will not rise on its own.",
      "Press at the top and drag straight down to the end of your reach — that is one haul.",
      "Lift your finger, take a new hold higher up, and do it again. Three full hauls before the squall."
    ], [
      "缆绳全湿透了，帆不会自己升上去。",
      "按在上面，一路往下拖到底，这算一把。",
      "抬手，往上再抓一把，接着拖。风起来之前要拉满三把。"
    ]),
    main: S([
      "Take the wheel. Dragging left and right turns the bow — you want it facing into the waves, not the side.",
      "When water collects in the hull, tap the bail button to throw it back out.",
      "Steer and bail until the wind drops. The sea is loud, but nothing here is timed."
    ], [
      "握住船舵。左右拖，船头跟着转——要让船头顶着浪走，不能侧着挨。",
      "舱里积了水，就点一下「舀水」，把水泼出去。",
      "一边把舵，一边舀水，撑到风停下来。海很大声，但这里没有限时。"
    ])
  },

  /* ------------------------------------------------ 7. Prodigal · road */
  prodigal: {
    prelude: S([
      "The road home runs uphill from the pig fields.",
      "Keep your finger on the path and drag — the moment it leaves the road, he loses his step.",
      "One slow drag to the top. The father is already coming down to meet you."
    ], [
      "回家的路从猪圈那里一路往上。",
      "手指贴住路面往下拖——一离开路，脚步就乱了。",
      "一口气慢慢拖到路那头。父亲已经在下山迎你了。"
    ]),
    main: S([
      "He is kneeling, and there is nothing left on him but rags.",
      "Drag the robe onto his shoulders, then the ring onto his hand, then the shoes onto his feet — one at a time.",
      "Each gift has to land on him, not near him. The father does not wait for the apology to finish."
    ], [
      "他跪在地上，身上只剩破布。",
      "先把袍子拖到他肩上，再把戒指拖到他手上，最后把鞋拖到他脚上——一件一件来。",
      "每件礼物都要落在他身上，不是落在旁边。父亲没等他把话说完就动手了。"
    ])
  },

  /* -------------------------------------------------- 8. Esther · seals */
  esther: {
    prelude: S([
      "The herald reads the decree, and each royal seal is pressed into the wax as it is read.",
      "Watch the order the seals light up. Do not press anything yet — just follow it with your eyes.",
      "Then press the same seals in the same order — one finger, one seal, lifting between presses. Two readings, the second one longer."
    ], [
      "传令官念谕旨，念到哪一处，王印就盖到哪一处。",
      "先看清王印亮起的顺序，不要急着按，只用眼睛跟着走。",
      "看清了，再照同样的顺序按一遍。一根手指按一个印，按完抬手再按下一个。会念两遍，第二遍更长。"
    ]),
    main: S([
      "Esther walks toward the throne, and one wrong step is enough.",
      "Drag upward to take a single step up the carpet — then stop, breathe, and take the next.",
      "At the edge of the carpet, kneel and wait. The sceptre is his to extend, not yours to take."
    ], [
      "以斯帖朝宝座走过去，走错一步就够了。",
      "往上拖一步，停下来，缓一缓，再拖下一步。",
      "走到毯边就跪下等着。金杖要他伸出来，不能自己去拿。"
    ])
  },

  /* ---------------------------------------------------- 9. Bush · wadi */
  desert: {
    prelude: S([
      "Three sheep are lost in the wadi and the sand is already blowing.",
      "Drag across the sand to sweep it away, and keep moving — the wind fills in what you leave.",
      "When you uncover a sheep, tap it once to gather it. Pale empty shadows are decoys; leave them."
    ], [
      "三只羊丢在旱谷里，沙已经吹起来了。",
      "在沙上拖着扫开浮土，别停在一个地方——你扫过的地方风又会盖回去。",
      "看见羊就点它一下，把它收拢过来。那些发白、空空的影子是假的，别碰。"
    ]),
    main: S([
      "Drag to walk Moses through the wadi; the flock follows wherever he goes.",
      "Walk close to each stray sheep and it joins the flock — there are three.",
      "Then lead the whole flock to the burning thornbush before the sandstorm closes."
    ], [
      "拖着走，让摩西在旱谷里穿行，羊群会跟着他。",
      "走近每一只走散的羊，它就归队——一共三只。",
      "三只都找齐了，趁沙暴还没合拢，把羊群带到那丛烧着的荆棘前。"
    ])
  },

  /* ------------------------------------------------ 10. Ruth · gleaning */
  glean: {
    prelude: S([
      "The reapers are working ahead of you, and the sheaves fall from their arms.",
      "When a sheaf drops, slide your finger under it and keep it there as it lands.",
      "Catch three before the light goes. Gleaning means walking behind them, never in front."
    ], [
      "收割的人在你前面干活，麦穗从他们臂弯里一把一把掉下来。",
      "麦穗往下掉的时候，把手指伸到它下面，等它落进手里再抬。",
      "天黑之前接住三次。拾穗是跟在后面，不是抢在前面。"
    ]),
    main: S([
      "Twelve sheaves are on the ground and the sickles are still swinging.",
      "Drag to move Ruth around the field; when a sickle flashes, get out of its arc.",
      "Pick up a sheaf by dragging over it. Gather twelve and the field is yours for the day."
    ], [
      "地上有十二捆麦穗，镰刀还在挥。",
      "拖着让路得在田里移动；看见镰刀闪光，就避开它挥过来的那一片。",
      "从麦穗上拖过去就拾起一捆。拾满十二捆，这一天的田就算走完了。"
    ])
  },

  /* --------------------------------------------------- 11. Jonah · sea */
  deep: {
    prelude: S([
      "The water closes over you. Press and hold to dive.",
      "Watch the light narrow as you go down — that is your air running out.",
      "Lift your finger before the dark closes in and surface. Three clean dives before the fish comes."
    ], [
      "水合上来了。按住屏幕就是往下潜。",
      "往下走的时候，四周的光会一点点收窄——那就是气快用完了。",
      "趁黑暗合起来之前松手，浮上来。大鱼来之前要潜三次干净的。"
    ]),
    main: S([
      "You are inside the fish, and the kelp is wound round your arm.",
      "Drag across the kelp strands to pull them off — but only while the belly is loose.",
      "When the belly tightens, lift your finger and hold completely still. Moving then loses the strand you had."
    ], [
      "你在鱼腹里，海草缠在手臂上。",
      "在缠住的海草上拖，一根根扯下来——但只能在鱼腹松开的时候扯。",
      "鱼腹一收紧，就抬手，完全别动。这时候一动，刚扯松的那根又缠回去。"
    ])
  },

  /* -------------------------------------------------- 12. Jonah · street */
  cry: {
    main: S([
      "Nineveh is a long street and the message is one sentence.",
      "Drag to walk Jonah along it. When you reach a doorway where people are standing, stop there.",
      "Tap once to cry the words out. Three doorways will listen."
    ], [
      "尼尼微是一条长街，要说的话只有一句。",
      "拖着让约拿往前走。走到有人的门口，就停在那儿。",
      "点一下，把话喊出去。会有三处门口肯听。"
    ])
  },

  /* -------------------------------------------------- 13. Bush · flame */
  flame: {
    main: S([
      "The bush burns and is not consumed. Do not reach for it — draw near, a little at a time.",
      "Drag slowly upward in short strokes; a quick, jumpy drag makes the flame flare and you begin again.",
      "Hold still when it steadies. Three times it settles, and then it speaks."
    ], [
      "荆棘在烧，却烧不掉。别伸手去抓，只能一点一点靠近。",
      "手指一点点往上短促地拖；拖得太急，火就窜起来，得从头再来。",
      "它稳下来的时候就别动。稳住三次，它才开口。"
    ])
  },

  /* ----------------------------------------------- 14. Zacchaeus · tree */
  climb: {
    prelude: S([
      "The crowd is pointing you up the tree, one bough at a time.",
      "Watch which bough lights up, in order — do not tap yet.",
      "Then take those same boughs in that same order. Two climbs before Jesus passes this way."
    ], [
      "人群一根一根地指你往树上去。",
      "先看清是哪几根枝子依次亮起来，不要急着点。",
      "然后照同样的顺序爬上去。耶稣经过之前，要爬两趟。"
    ]),
    main: S([
      "Both hands on the branches, and only one side of the tree is lit at a time.",
      "Drag upward on whichever side is glowing — that is the branch that will hold.",
      "Pull eight times and you are above the crowd. Pull on a dark branch and it slips out of your hand."
    ], [
      "两只手抓住树枝，树上每次只有一侧是亮的。",
      "哪一侧发光，就从哪一侧往上拖——那根才承得住。",
      "拉够八次，你就高过人群了。拉到暗的那一边，枝子会脱手。"
    ])
  }
};

/** Steps for one act of one scene, or null when the scene has no card copy. */
export function stepsFor(key, act = 0) {
  const e = GAME_STEPS[key];
  if (!e) return null;
  if (e.prelude && act === 0) return e.prelude;
  return e.main || null;
}
