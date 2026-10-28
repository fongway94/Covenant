/* ============================================================================
   The ten playable chapters.

   DESIGN RULE: the player is a WITNESS inside the biblical account. Choices
   shape the player's own character (stats, fruits, relics) — they never change
   the scriptural outcome. That keeps the game faithful and still interactive.

   Node shape:
     lines:   [ [speakerKey, text], ... ]   // '' = narrator
     choices: [ { t, to, stat, xp, require, give, tag, faith, reply, replyBy } ]
     next:    'nodeId'                      // linear continue
     mini:    { ... }                       // timing minigame, then `next`
     end:     true                          // chapter end -> rewards + reflection

   All scripture quotations are from the King James Version (public domain)
   or lightly paraphrased with the reference shown. See docs/GAME_DESIGN.md.
   ============================================================================ */

export const CHAPTERS = [
  /* ------------------------------------------------------------------ 1 */
  {
    id: "elah",
    num: 1, roman: "I",
    title: "The Valley of Elah",
    subtitle: "David & Goliath",
    ref: "1 Samuel 17",
    theme: "Courage",
    art: "assets/art/elah.jpg",
    pos: [26, 9],
    length: "8–10 min",
    intro: "A shepherd boy walks into a valley where an entire army has been silent for forty days.",
    scroll: {
      verse: "And all this assembly shall know that the LORD saveth not with sword and spear: for the battle is the LORD’S, and he will give you into our hands.",
      ref: "1 Samuel 17:47 (KJV)",
      note: "David refuses Saul’s armour, takes five smooth stones from the brook, and faces Goliath with a sling. The point of the story is not that a small person can be brave — it is that the battle belongs to the LORD.",
      timeline: "c. 1020 BC · Valley of Elah, between Socoh and Azekah"
    },
    cast: {
      elias:   { name: "Elias", role: "Your companion" },
      david:   { name: "David", role: "A shepherd from Bethlehem" },
      goliath: { name: "Goliath", role: "Champion of the Philistines" },
      soldier: { name: "An Israelite soldier", role: "" },
      saul:    { name: "King Saul", role: "" }
    },
    start: "start",
    endFruits: ["faithfulness"],
    relic: "stones",
    nodes: {
      start: {
        lines: [
          ["", "The scroll grows warm in your hands. The ink shifts, campfires flicker into being, and the smell of dust and sheep fills the air."],
          ["", "A man in a travel-stained scribe’s robe steps beside you. This is Elias, your companion on the road."],
          ["elias", "The Valley of Elah, around 1020 BC. Hear me clearly: we are witnesses. We cannot rewrite what God has written. But we can choose what kind of people we become while we watch."],
          ["soldier", "Forty days. Forty mornings that giant has shouted at us, and not one man has answered."],
          ["goliath", "Choose a man for yourselves, and let him come down to me! If he be able to fight with me and kill me, then will we be your servants — but if I prevail, then shall ye be our servants!"],
          ["", "The whole line of Israel shifts backward. Elias looks at you. So — where will you stand?"],
          ["elias", "Every choice here will leave a mark on you, not on the story. That is how the road works."]
        ],
        choices: [
          { t: "Walk to the front line and face the shouting", to: "start2", stat: { courage: 2 }, xp: 6, tag: "Courage", reply: "Your legs do not feel brave, but they carry you forward. The giant’s voice fills your chest — and you stay." },
          { t: "Ask Elias what the Law says about fear", to: "start2", stat: { wisdom: 2 }, xp: 6, tag: "Wisdom", reply: "Elias opens his scroll. “The officers shall say to the people: let not your hearts faint, fear not — for the LORD your God goeth with you.” You had heard it before. Today you need it.", replyBy: "elias" },
          { t: "Find the soldiers who are shaking and sit with them", to: "start2", stat: { compassion: 2 }, xp: 6, tag: "Compassion", reply: "You sit in the dust beside a boy no older than sixteen. He stops trembling long enough to share his bread. Courage is easier when you are not alone." }
        ]
      },
      start2: {
        lines: [
          ["", "A young man comes up the ridge from the baggage train, leading a donkey loaded with bread and cheese. He is small, sun-browned, and entirely unnoticed."],
          ["elias", "That is David, the youngest son of Jesse. He has been sent to bring food to his brothers. He was not invited to the battle."],
          ["goliath", "I defy the armies of Israel this day! Give me a man, that we may fight together!"],
          ["", "David stops. His head tilts. He is listening — not to the size of the giant, but to what the giant is saying about God."]
        ],
        choices: [
          { t: "Tell David the king has offered a great reward", to: "arrival", stat: { wisdom: 1 }, xp: 5, reply: "David nods, but you can tell the reward is not what has caught him. He keeps looking at the giant.", replyBy: "david", hint: "A practical answer" },
          { t: "Warn him that the whole army is afraid", to: "arrival", stat: { compassion: 1 }, xp: 5, reply: "You tell him plainly. David looks down the line of frightened men. “I see,” he says. He does not step back.", replyBy: "david" },
          { t: "Ask him about the lion and the bear", to: "arrival", stat: { faith: 2 }, xp: 8, faith: true, tag: "Faith", reply: "His whole face changes. “The LORD that delivered me out of the paw of the lion and out of the paw of the bear — he will deliver me out of the hand of this Philistine.”", replyBy: "david" }
        ]
      },
      arrival: {
        lines: [
          ["", "Word travels fast through a bored army. Within the hour David is standing in the tent of King Saul."],
          ["saul", "Thou art not able to go against this Philistine to fight with him: for thou art but a youth, and he a man of war from his youth."],
          ["david", "Thy servant kept his father’s sheep, and there came a lion and a bear, and took a lamb out of the flock. Thy servant slew both the lion and the bear. This uncircumcised Philistine shall be as one of them, seeing he hath defied the armies of the living God."],
          ["elias", "Saul has armour. It is the best in Israel. Watch what happens next."]
        ],
        choices: [
          { t: "Offer David your own walking staff", to: "brook", stat: { compassion: 2 }, xp: 5, reply: "He thanks you, smiling, and hands it gently back. “I have not proved these,” he says of the king’s armour. He takes his staff, his bag, and nothing else.", replyBy: "david" },
          { t: "Urge him to take the king’s sword anyway", to: "brook", stat: { wisdom: 1 }, xp: 5, reply: "He fastens it, takes two steps, and nearly falls. “I cannot go with these.” He unbuckles it. Elias raises an eyebrow at you.", replyBy: "david" },
          { t: "Say nothing. Watch what he does.", to: "brook", stat: { wisdom: 2 }, xp: 6, tag: "Wisdom", reply: "A borrowed identity never fits in the valley. David walks out in a shepherd’s tunic." }
        ]
      },
      brook: {
        hotspots: { count: 5, glyph: "◍", title: "Gather five smooth stones", titleZh: "拾起五块光滑的石子", prompt: "Sweep the lantern over the brook. Take only the SMOOTH stones — jagged decoys waste your focus. Every stone you find here is one you will carry into the fight.", promptZh: "用提灯扫过溪床。只捡「光滑」的石子——棱角锋利的假石会消耗你的专注。你在这里找到的每一块石头，都会成为上阵时的弹药。", xp: 8, stat: { faith: 1 }, decoyGlyph: "◆", seconds: 30 },
        lines: [
          ["", "The brook runs shallow and cold through the valley floor. David kneels and turns over stones until he finds five that sit perfectly in his palm."],
          ["elias", "Five smooth stones. People love to guess what the five mean — the five books of the Law, five wounds, five something. The text simply says five smooth stones. Sometimes the honest reading is the better one."],
          ["david", "He is a man, and I am a man. But he comes with a sword and a spear and a shield — and I come in the name of the LORD of hosts."],
          ["", "David looks at you. “Will you stand with me until the line?”"]
        ],
        choices: [
          { t: "Kneel and pray with him before he runs", to: "face", stat: { faith: 2, courage: 1 }, xp: 12, require: { faith: 3 }, faith: true, tag: "Faith 3", hint: "Pray once in this chapter to grow your Faith", reply: "The two of you bow beside the water. No thunder, no sign — just a quiet certainty that you are not the centre of this story.", replyBy: "" },
          { t: "Pick up a stone of your own and hold it tight", to: "face", stat: { courage: 2 }, xp: 7, tag: "Courage", reply: "The stone is ordinary. That is the strange part. God has always liked using ordinary things." },
          { t: "Step back and let him go alone", to: "face", stat: { wisdom: 1 }, xp: 5, reply: "You watch him walk down into the valley. Some roads can only be walked by one person at a time." }
        ]
      },
      face: {
        game: "sling",
        lines: [
          ["goliath", "Am I a dog, that thou comest to me with staves? Come to me, and I will give thy flesh unto the fowls of the air and to the beasts of the field!"],
          ["david", "Thou comest to me with a sword, and with a spear, and with a shield: but I come to thee in the name of the LORD of hosts, the God of the armies of Israel, whom thou hast defied."],
          ["", "David runs toward the line. He reaches into his bag. The whole valley seems to hold its breath — and Elias grips your sleeve."],
          ["elias", "Do not look away. Whatever you do, do not look away."]
        ],
        mini: {
          key: "sling", glyph: "◍", title: "Hold your nerve",
          prompt: "Keep your eyes steady as David runs. Tap when the light reaches the golden mark.",
          targets: [50], zone: 13, speed: 0.105,
          hitText: "You did not look away.",
          missText: "Your eyes flickered. David did not.",
          win: { stat: { faith: 2, courage: 1 }, xp: 12, flag: "slingWon" }
        },
        next: "end"
      },
      end: {
        end: true,
        lines: [
          ["", "The stone sinks into the giant’s forehead. Goliath falls face down into the dust of the valley he had mocked for forty days."],
          ["", "The Philistine line breaks. The army of Israel finds its voice all at once."],
          ["elias", "And there it is. Not a story about a boy beating a giant. A story about a God who keeps His promises — and a boy who knew Whose battle it was."],
          ["elias", "Come. The road goes on, and the scroll is already turning."]
        ]
      }
    },
    ending: {
      seal: "✟", title: "The Battle Is the LORD’S",
      text: "You did not lift a stone. You learned where to look.",
      takeaway: "David’s courage came before his confidence: he remembered what God had already done with the lion and the bear. Faith grows by remembering."
    },
    reflection: {
      q: "Think of one “giant” in your life right now. What is the first step of faith for you?",
      options: [
        { t: "Remember what God has already brought me through", stat: { faith: 2 }, insight: "That is exactly where David started — not with the giant, but with the lion and the bear behind him. 1 Samuel 17:37" },
        { t: "Tell someone, so I am not facing it alone", stat: { compassion: 2 }, insight: "Wise. Even David asked questions of the whole line before he stepped forward. 1 Samuel 17:26" },
        { t: "Refuse armour that does not fit me and simply start", stat: { courage: 2 }, insight: "Saul’s armour was excellent — for Saul. Discernment is knowing which help is actually yours to carry. 1 Samuel 17:39" }
      ]
    }
  },

  /* ------------------------------------------------------------------ 2 */
  {
    id: "lions",
    num: 2, roman: "II",
    title: "The Lions’ Den",
    subtitle: "Daniel in Babylon",
    ref: "Daniel 6",
    theme: "Integrity",
    art: "assets/art/lions.jpg",
    pos: [70, 27],
    length: "8–10 min",
    intro: "A decree is signed that makes prayer illegal. An old man opens his window anyway.",
    scroll: {
      verse: "My God hath sent his angel, and hath shut the lions’ mouths, that they have not hurt me: forasmuch as before him innocency was found in me.",
      ref: "Daniel 6:22 (KJV)",
      note: "Daniel is roughly eighty years old here. The decree was engineered by jealous officials who knew the one thing Daniel would not compromise: prayer, three times a day, facing Jerusalem.",
      timeline: "c. 539 BC · Babylon / the Median-Persian empire"
    },
    cast: {
      elias:   { name: "Elias", role: "Your companion" },
      daniel:  { name: "Daniel", role: "A servant of the living God" },
      satrap:  { name: "A royal official", role: "" },
      darius:  { name: "King Darius", role: "" },
      servant: { name: "A palace servant", role: "" }
    },
    start: "start",
    endFruits: ["goodness"],
    relic: "signet",
    nodes: {
      start: {
        lines: [
          ["", "The scroll turns. Cedar, hot brick, and the noise of a vast city. You are standing in the shadow of a palace in Babylon."],
          ["elias", "Daniel is an old man now — near eighty. He has outlived kings and empires. King Darius is about to set him over the whole realm."],
          ["satrap", "We shall not find any occasion against this Daniel, except we find it against him concerning the law of his God."],
          ["", "The officials drift toward the throne room with a parchment in their hands. Elias’ jaw tightens."],
          ["elias", "They are going to make faithfulness illegal. What do you do with what you just heard?"]
        ],
        choices: [
          { t: "Read the decree as it is posted in the gate", to: "decree", stat: { wisdom: 2 }, xp: 6, tag: "Wisdom", reply: "You memorise the wording: thirty days, no petition to any god or man except the king. The penalty is the lions’ den. The trap is aimed at one man.", replyBy: "" },
          { t: "Warn Daniel that the officials are watching him", to: "decree", stat: { compassion: 2 }, xp: 6, tag: "Compassion", reply: "He thanks you with real warmth. Then he asks whether you would like to pray — it is nearly the ninth hour.", replyBy: "daniel" },
          { t: "Ask Elias why they hate a man who has done no wrong", to: "decree", stat: { wisdom: 1, faith: 1 }, xp: 6, reply: "“Because a blameless life is a mirror,” Elias says. “And some people cannot bear what they see in it.”", replyBy: "elias" }
        ]
      },
      decree: {
        lines: [
          ["", "The ink is barely dry. The law of the Medes and Persians cannot be altered — not even by the king who signed it."],
          ["darius", "It is signed. Let it be done."],
          ["elias", "Daniel knows. He heard the herald in the street. Watch what he does with that knowledge."],
          ["", "An official passes close to you, smiling. “Thirty days,” he says. “Surely any reasonable man can wait thirty days.”"]
        ],
        choices: [
          { t: "Tell Daniel to pray privately — just for thirty days", to: "upstairs", stat: { compassion: 1 }, xp: 5, reply: "Daniel listens, then shakes his head, not unkindly. “If I hide it now, I have already agreed that the decree is true.” He reaches for the window latch.", replyBy: "daniel" },
          { t: "Ask whether the king can be persuaded to change the law", to: "upstairs", stat: { wisdom: 2 }, xp: 7, tag: "Wisdom", reply: "Elias sighs. “Not this law. That is the snare. The officials made mercy impossible, and they know the king loves him.”", replyBy: "elias" },
          { t: "Say nothing. Follow him at the ninth hour.", to: "upstairs", stat: { faith: 2 }, xp: 8, faith: true, tag: "Faith", reply: "You follow him to the upper room, and you are not the only one watching. Two officials are already in the courtyard below.", replyBy: "" }
        ]
      },
      upstairs: {
        hotspots: { count: 3, glyph: "✧", title: "A window toward heaven", titleZh: "朝向天堂的窗", prompt: "Drag the lantern through the dark den and find the three places Daniel prays. Beware the pale shadows.", promptZh: "拖动提灯照亮黑暗的狮子坑，找出但以理每日三次祷告的地方。小心那些浅色的影子。", xp: 8, stat: { faith: 1 }, decoyGlyph: "◇" },
        lines: [
          ["", "The upper room is plain. A mat, a scroll, a window open toward Jerusalem — hundreds of miles away, and yet the direction matters."],
          ["", "Daniel kneels. His knees are not what they were. He gives thanks, exactly as he had done before."],
          ["elias", "Three times a day. Not as protest. Not as performance. Habit formed over a lifetime is what holds a person up when the law changes overnight."],
          ["daniel", "You may stand at the window if you are afraid of being seen. I will not be."]
        ],
        choices: [
          { t: "Kneel beside him and pray", to: "accused", stat: { faith: 2 }, xp: 12, give: { fruit: "selfcontrol" }, require: { faith: 4 }, faith: true, tag: "Faith 4", hint: "Pray once in this chapter to grow your Faith", reply: "The two of you pray while sandals scramble in the courtyard below. The prayer is short. It is enough.", replyBy: "" },
          { t: "Stand at the window as a lookout", to: "accused", stat: { courage: 2 }, xp: 7, tag: "Courage", reply: "You see the officials exchange a look and hurry off toward the throne room. There is no time left to hide.", replyBy: "" },
          { t: "Ask him how he can give thanks right now", to: "accused", stat: { wisdom: 2 }, xp: 7, reply: "“Because thanksgiving is not a report on my circumstances,” he says. “It is a report on my God.”", replyBy: "daniel" }
        ]
      },
      accused: {
        game: "lions",
        lines: [
          ["satrap", "That Daniel, which is of the children of the captivity of Judah, regardeth not thee, O king, nor the decree that thou hast signed, but maketh his petition three times a day."],
          ["", "Darius is furious — at himself. He works until sunset to find a way to undo his own law, and finds none."],
          ["darius", "Thy God whom thou servest continually, he will deliver thee."],
          ["", "A stone is rolled over the mouth of the den. The king seals it with his own signet, and the nobles seal it with theirs."],
          ["elias", "He is gone. And we are still here. That is often the hardest part of the story — being the ones left outside the stone."]
        ],
        choices: [
          { t: "Go to the king and beg him to break his own law", to: "dawn", stat: { courage: 2 }, xp: 6, reply: "The king receives you with a tired face. He has already tried everything. He asks you to stay, and to wait until morning.", replyBy: "darius" },
          { t: "Stay at the mouth of the den all night", to: "dawn", stat: { compassion: 2 }, xp: 8, tag: "Compassion", reply: "You sit with your back against the sealed stone. Cold seeps through your cloak. You do not sleep. Neither does the king, you will learn.", replyBy: "" },
          { t: "Gather the household servants to pray until dawn", to: "dawn", stat: { faith: 2, wisdom: 1 }, xp: 9, faith: true, tag: "Faith", reply: "Twelve of you sit in a circle on the floor. Someone begins a psalm; others join. The night does not get shorter, but it gets lighter.", replyBy: "" }
        ]
      },
      dawn: {
        lines: [
          ["", "First light. The king comes in haste to the den, and his voice cracks before he reaches the stone."],
          ["darius", "O Daniel, servant of the living God, is thy God, whom thou servest continually, able to deliver thee from the lions?"],
          ["", "A pause. Then, from inside the earth, a voice — calm, amused almost, entirely alive."]
        ],
        choices: [
          { t: "Hold your breath and listen", to: "end", stat: { wisdom: 2 }, xp: 6, reply: "Sometimes the faithful thing is simply to stop talking and hear what God has done.", replyBy: "elias" },
          { t: "Fall to your knees on the cold stone", to: "end", stat: { faith: 2 }, xp: 8, faith: true, tag: "Faith", reply: "You are not the only one. Half the courtyard is on its knees before Daniel finishes speaking.", replyBy: "" },
          { t: "Look for the angel Elias told you about", to: "end", stat: { courage: 1, faith: 1 }, xp: 6, reply: "You see nothing but a shaft of gold light from the grate above. That is more than enough.", replyBy: "" }
        ]
      },
      end: {
        end: true,
        lines: [
          ["daniel", "O king, live for ever. My God hath sent his angel, and hath shut the lions’ mouths, that they have not hurt me: forasmuch as before him innocency was found in me; and also before thee, O king, have I done no hurt."],
          ["", "Daniel is lifted out. No wound on him — because he had believed in his God."],
          ["", "The king writes to every nation under heaven: “He is the living God, and stedfast for ever, and his kingdom that which shall not be destroyed.”"],
          ["elias", "He was not delivered from the decree. He was delivered through it. There is a difference, and you will need to know it."]
        ]
      }
    },
    ending: {
      seal: "⬡", title: "A Window Open Toward Heaven",
      text: "Integrity is what you do when the law changes and God has not.",
      takeaway: "Daniel did not become faithful in the lions’ den. He became faithful over decades of ordinary prayer — so that when the crisis came, there was nothing to decide."
    },
    reflection: {
      q: "When doing the right thing costs you, what actually helps you keep going?",
      options: [
        { t: "A habit I already have, so I do not have to decide in the moment", stat: { wisdom: 2 }, insight: "That is Daniel’s gift to us. Three times a day, long before the decree. Daniel 6:10" },
        { t: "People who will wait with me through the night", stat: { compassion: 2 }, insight: "The story quietly mentions the king fasting all night. Even desperate company matters. Daniel 6:18" },
        { t: "Remembering God can deliver me, whether or not He does", stat: { faith: 2 }, insight: "Shadrach, Meshach and Abednego said the same thing a generation earlier. Daniel 3:17–18" }
      ]
    }
  },

  /* ------------------------------------------------------------------ 3 */
  {
    id: "jericho",
    num: 3, roman: "III",
    title: "The Road to Jericho",
    subtitle: "The Good Samaritan",
    ref: "Luke 10:25–37",
    theme: "Compassion",
    art: "assets/art/jericho.jpg",
    pos: [30, 44],
    length: "8–10 min",
    intro: "A lawyer asks Jesus a question. Jesus answers with a story — and you wake up inside it.",
    scroll: {
      verse: "Then said Jesus unto him, Go, and do thou likewise.",
      ref: "Luke 10:37 (KJV)",
      note: "A lawyer asks “who is my neighbour?” wanting to limit the obligation. Jesus tells a parable in which the religious professionals pass by and a despised Samaritan stops — then turns the question around: which of the three was a neighbour?",
      timeline: "c. AD 30 · the road from Jerusalem down to Jericho"
    },
    cast: {
      elias:     { name: "Elias", role: "Your companion" },
      jesus:     { name: "Jesus", role: "" },
      lawyer:    { name: "A lawyer", role: "" },
      samaritan: { name: "A Samaritan", role: "" },
      innkeeper: { name: "The innkeeper", role: "" }
    },
    start: "start",
    endFruits: ["love", "kindness"],
    relic: "denarii",
    nodes: {
      start: {
        lines: [
          ["", "You are sitting in the dust outside a village, listening to a teacher. A lawyer stands to test Him."],
          ["lawyer", "Master, what shall I do to inherit eternal life? … And who is my neighbour?"],
          ["elias", "He is not asking for information. He is asking where the boundary is — who he is allowed to leave out."],
          ["jesus", "A certain man went down from Jerusalem to Jericho, and fell among thieves…"],
          ["", "The road rises up around you: seventeen miles of switchbacks, limestone, and shadowed places perfect for an ambush. You are in the story now."]
        ],
        choices: [
          { t: "Walk fast, before the sun gets high", to: "wounded", stat: { courage: 1 }, xp: 5, reply: "You make good time. That is the trouble with hurrying — you arrive at the bad part sooner.", replyBy: "" },
          { t: "Walk with a companion and keep your eyes open", to: "wounded", stat: { wisdom: 2 }, xp: 7, tag: "Wisdom", reply: "You notice the fresh blood before you notice the man. Your companion grips your arm.", replyBy: "" },
          { t: "Pray for safety on the road before you set out", to: "wounded", stat: { faith: 2 }, xp: 7, faith: true, tag: "Faith", reply: "You ask God to make you useful, not just safe. It is a dangerous prayer, though you do not know it yet.", replyBy: "" }
        ]
      },
      wounded: {
        game: "jericho",
        lines: [
          ["", "Halfway down, in a bend of the road where the rock walls close in, a man is lying in the dust."],
          ["", "The thieves have stripped him, beaten him, and left him half dead. His breathing is shallow. There is no one else in sight."],
          ["elias", "This is where the parable gets uncomfortable. Everyone who comes down this road has to decide something."]
        ],
        choices: [
          { t: "Cross to the far side — it could be a trap", to: "passers", stat: { wisdom: 1 }, xp: 5, reply: "You give him a wide berth. Your heart is still hammering when you reach the next bend. Being safe and being right are not the same thing.", replyBy: "" },
          { t: "Kneel and check if he is still breathing", to: "help", stat: { compassion: 2 }, xp: 9, tag: "Compassion", reply: "He is alive. Barely. You tear a strip from your own cloak and press it against the worst wound. There is not much else you can do.", replyBy: "" },
          { t: "Shout for help from the ridge above", to: "passers", stat: { courage: 1 }, xp: 5, reply: "Your voice echoes off the limestone. Nobody answers — but two figures appear at the top of the road.", replyBy: "" }
        ]
      },
      help: {
        /* This used to be a lantern hunt for three glowing marks on the chapter
           artwork, which is a strange thing to do to a man bleeding in a ditch.
           It is now the act the text actually describes: pour in oil and wine,
           bind up the wound. See GAMES.tend. */
        game: "tend",
        lines: [
          ["", "You are kneeling in the dust with blood on your hands when you hear sandals on the stone."],
          ["", "A priest comes down the road. He sees the man — clearly sees him — and passes by on the other side."],
          ["", "Later, a Levite does exactly the same."],
          ["elias", "Do not be too quick to despise them. They may have been afraid, or late, or certain that touching a corpse would make them unclean. Good reasons are always available."]
        ],
        choices: [
          { t: "Shout after them to come back", to: "passers", stat: { courage: 2 }, xp: 7, tag: "Courage", reply: "They do not turn around. Your voice cracks on the last word. The man at your feet does not notice.", replyBy: "" },
          { t: "Stay with the wounded man and keep pressure on the wound", to: "passers", stat: { compassion: 2 }, xp: 9, faith: true, tag: "Compassion", reply: "You stay. It is unglamorous and it takes a long time. Most mercy looks exactly like this.", replyBy: "" },
          { t: "Ask Elias why the holy men walked away", to: "passers", stat: { wisdom: 2 }, xp: 7, reply: "“Because knowing the Law and loving your neighbour are not the same achievement,” he says quietly. “I have been both men.”", replyBy: "elias" }
        ]
      },
      passers: {
        lines: [
          ["", "On the road, a priest comes down, sees the body, and crosses to the far side. A Levite follows, does the same, and is gone."],
          ["elias", "They had Scripture memorised. They were on their way to the temple. And the man in the ditch was still in the ditch."],
          ["", "Then a third traveller appears, leading a donkey — and from his dress, he is a Samaritan. The wounded man is a Jew. The two peoples have hated each other for centuries."],
          ["", "He stops. He kneels. He pours oil and wine on the wounds."],
          ["elias", "Watch closely. This is the part of the story people remember."]
        ],
        choices: [
          { t: "Go down and offer to carry his supplies", to: "inn", stat: { compassion: 2 }, xp: 9, give: { fruit: "kindness" }, tag: "Compassion", reply: "He looks up, surprised, then nods as if this is the most natural thing in the world. “Hold the oil,” he says. “I will lift him.”", replyBy: "samaritan" },
          { t: "Ask him why he is helping an enemy", to: "why", stat: { wisdom: 2 }, xp: 8, tag: "Wisdom", reply: "He does not answer. He simply keeps bandaging. Elias says: “The parable never tells us his reasons. I think that is deliberate — mercy that needs a reason can be argued away.”", replyBy: "elias" },
          { t: "Take the donkey’s lead rope and follow", to: "inn", stat: { faith: 2 }, xp: 8, faith: true, tag: "Faith", reply: "The donkey is calm. The man on its back is not. You lead them both down the long road toward an inn.", replyBy: "" }
        ]
      },
      why: {
        lines: [
          ["", "The Samaritan finishes the bandage and lifts the man onto his own donkey, standing him up carefully as if he were something fragile."],
          ["elias", "He has somewhere to be too. His journey is now slower, his beast is carrying a stranger, and his oil is nearly gone. Compassion always spends something."],
          ["samaritan", "Take care of him; and whatsoever thou spendest more, when I come again, I will repay thee."]
        ],
        next: "inn"
      },
      inn: {
        lines: [
          ["", "At the inn the Samaritan sets two denarii on the counter — about two days’ wages — and makes the innkeeper promise to look after the man."],
          ["innkeeper", "Two days’ wages? For a stranger?"],
          ["samaritan", "When I come again, I will repay thee whatsoever thou spendest more."],
          ["elias", "He does not just feel pity. He commits money, time, and his own return journey. That is what makes it love instead of a sentiment."]
        ],
        choices: [
          { t: "Offer to sit with the man through the night", to: "answer", stat: { compassion: 2 }, xp: 8, tag: "Compassion", reply: "You take the stool by the bed. Somewhere around midnight he opens his eyes. You are the first person he sees.", replyBy: "" },
          { t: "Tell everyone in the inn what happened on the road", to: "answer", stat: { courage: 2 }, xp: 7, reply: "By evening half the courtyard knows the story. The priest will not be pleased. The wounded man will not be alone again.", replyBy: "" },
          { t: "Ask the innkeeper to keep the coins safe until he returns", to: "answer", stat: { wisdom: 2 }, xp: 7, reply: "The innkeeper wraps them carefully. “He said he would come back,” he mutters. “Most people do not.” He is still holding the coins when you leave.", replyBy: "innkeeper" }
        ]
      },
      answer: {
        lines: [
          ["", "The road, the inn, the dust — all of it folds back into the scroll. You are sitting in the village again."],
          ["jesus", "Which now of these three, thinkest thou, was neighbour unto him that fell among the thieves?"],
          ["lawyer", "He that shewed mercy on him."],
          ["jesus", "Go, and do thou likewise."],
          ["elias", "He never actually answers “who is my neighbour?” He replaces it with a better question: whose neighbour will you be?"]
        ],
        choices: [
          { t: "Answer with the lawyer: the one who showed mercy", to: "end", stat: { wisdom: 2 }, xp: 10, faith: true, tag: "Scripture", reply: "Jesus nods. You have understood the parable — which is the easy half.", replyBy: "" },
          { t: "Answer: the priest, because he knew the Law", to: "end", stat: { courage: 1 }, xp: 5, reply: "Elias winces. Jesus gently repeats the story, more slowly this time. Being corrected by kindness is its own kind of mercy.", replyBy: "elias" },
          { t: "Stay silent and let the question sit with you", to: "end", stat: { wisdom: 1, compassion: 1 }, xp: 7, reply: "You say nothing. But you notice that you can still feel the weight of the man on the donkey. That is a beginning.", replyBy: "" }
        ]
      },
      end: {
        end: true,
        lines: [
          ["elias", "The lawyer wanted a boundary. Jesus gave him a mirror."],
          ["elias", "The neighbour in this story is not a category of person who deserves your help. It is a person you decide to become."],
          ["", "The scroll turns. The smell of the road lingers on your clothes."]
        ]
      }
    },
    ending: {
      seal: "❀", title: "Go, and Do Likewise",
      text: "Mercy is a verb with a price tag.",
      takeaway: "The Samaritan’s compassion cost him oil, wine, money, time, reputation, and his own donkey. Love that costs nothing is usually just a feeling."
    },
    reflection: {
      q: "Who is the neighbour you find it hardest to love — and what would one small act look like?",
      options: [
        { t: "Someone whose views I cannot stand", stat: { courage: 2 }, insight: "The Samaritan and the Jew disagreed about almost everything sacred. The bandage came first. Luke 10:33–34" },
        { t: "Someone I can help, but it will genuinely cost me", stat: { compassion: 2 }, insight: "Two denarii was real money. Count the cost honestly — then give anyway. Luke 10:35" },
        { t: "Someone I have walked past without really seeing", stat: { wisdom: 2 }, insight: "The priest “saw him” and passed by. Seeing is not the same as noticing. Luke 10:31" }
      ]
    }
  },

  /* ------------------------------------------------------------------ 4 */
  {
    id: "storm",
    num: 4, roman: "IV",
    title: "Peace, Be Still",
    subtitle: "The Storm on the Lake",
    ref: "Mark 4:35–41",
    theme: "Trust",
    art: "assets/art/storm.jpg",
    pos: [72, 61],
    length: "8–10 min",
    intro: "A boat, a sudden squall, and a Teacher asleep on a cushion in the stern.",
    scroll: {
      verse: "And he arose, and rebuked the wind, and said unto the sea, Peace, be still. And the wind ceased, and there was a great calm.",
      ref: "Mark 4:39 (KJV)",
      note: "The Sea of Galilee sits in a basin; cold air funnels down from the hills and turns a calm evening into a dangerous squall in minutes. Several of the disciples were experienced fishermen — and they were terrified.",
      timeline: "c. AD 31 · the Sea of Galilee, at evening"
    },
    cast: {
      elias:   { name: "Elias", role: "Your companion" },
      jesus:   { name: "Jesus", role: "" },
      disciple:{ name: "A disciple", role: "" },
      peter:   { name: "Peter", role: "A fisherman" }
    },
    start: "start",
    endFruits: ["peace"],
    relic: "rope",
    nodes: {
      start: {
        lines: [
          ["", "The scroll smells of fish and wet rope. It is evening on the western shore of the Sea of Galilee, and a crowd has only just gone home."],
          ["jesus", "Let us pass over unto the other side."],
          ["elias", "He has been teaching all day. Watch how tired He is. That matters in a few minutes."],
          ["", "The disciples begin loading a boat. There are other little ships going with them."]
        ],
        choices: [
          { t: "Help haul the boat into the water", to: "evening", stat: { courage: 2 }, xp: 6, tag: "Courage", reply: "Cold water up to your knees, rope burning your palms. You are useful, and you are soaked.", replyBy: "" },
          { t: "Check the sky over the hills before boarding", to: "evening", stat: { wisdom: 2 }, xp: 7, tag: "Wisdom", reply: "The western sky is clear. But there is a line of dark along the northern ridge that you do not like. Nobody else seems to have noticed.", replyBy: "" },
          { t: "Ask the disciples what kind of man this is", to: "evening", stat: { faith: 2 }, xp: 7, faith: true, tag: "Faith", reply: "Peter shrugs. “A good teacher. More than that, I think. We are still finding out.”", replyBy: "peter" }
        ]
      },
      evening: {
        lines: [
          ["", "The oars settle into a rhythm. The shore slides away. Jesus goes to the stern, lies down on a cushion, and falls asleep almost instantly."],
          ["disciple", "He was teaching until sunset. He did not even eat."],
          ["elias", "Exhaustion is not a lack of faith. He is fully human — which is the very thing this boat is about to forget."],
          ["", "Then the wind hits."],
          ["", "It comes down off the hills like something thrown. The sail cracks. Water comes over the gunwale in a solid sheet."]
        ],
        choices: [
          { t: "Grab the tiller and hold the bow into the waves", to: "storm", stat: { courage: 2 }, xp: 8, tag: "Courage", reply: "The wood fights you. You fight back. It is the only thing you can do, so you do it.", replyBy: "" },
          { t: "Start bailing with whatever you can find", to: "storm", stat: { compassion: 2 }, xp: 8, tag: "Compassion", reply: "You pass a bucket hand to hand. Someone is praying. Someone else is shouting. Both make sense right now.", replyBy: "" },
          { t: "Look toward the stern, where Jesus is", to: "storm", stat: { faith: 2 }, xp: 9, faith: true, tag: "Faith", reply: "He is still asleep, head on the cushion, while the boat comes apart around Him. You cannot decide if that is terrifying or the calmest thing you have ever seen.", replyBy: "" }
        ]
      },
      storm: {
        game: "storm",
        lines: [
          ["peter", "Master! Master, we perish!"],
          ["", "The waves beat into the boat so that it is already filling. The other little ships are vanishing in the spray."],
          ["elias", "Hold the tiller. Three waves are coming — keep her steady through all three. Breathe between them."],
          ["", "Elias puts a hand on your shoulder. “Do the next thing in front of you. That is how trust actually looks in a storm.”"]
        ],
        mini: {
          key: "tiller", glyph: "⌇", title: "Hold the tiller",
          prompt: "Three waves. Tap as each swell reaches the golden mark to keep the bow into the wind.",
          targets: [38, 62, 50], zone: 12, speed: 0.125,
          hitText: "Steady. She holds.",
          missText: "She slips sideways — brace!",
          win: { stat: { courage: 2, faith: 1 }, xp: 14, flag: "tillerWon" }
        },
        next: "asleep"
      },
      asleep: {
        lines: [
          ["", "The boat is filling. The sail is torn. And in the stern, on a cushion, Jesus is still asleep."],
          ["disciple", "Master, carest thou not that we perish?"],
          ["", "They shake Him awake. He opens His eyes, looks at the sky, the water, the panic — and stands up."]
        ],
        choices: [
          { t: "Wake Him calmly, believing He already cares", to: "rebuke", stat: { faith: 2 }, xp: 12, require: { faith: 5 }, faith: true, tag: "Faith 5", hint: "Pray in this chapter to grow your Faith", reply: "You put a hand on His shoulder without shouting. He looks at you for a moment, and something in His face steadies you before He has said a word.", replyBy: "" },
          { t: "Wake Him in a panic, like everyone else", to: "rebuke", stat: { courage: 1 }, xp: 7, reply: "You shout with the rest. He does not seem offended. Apparently an honest panic is acceptable to Him.", replyBy: "" },
          { t: "Keep bailing until your hands give out", to: "rebuke", stat: { courage: 2 }, xp: 8, tag: "Courage", reply: "When you finally look up, He is already standing. You did not need to earn His attention. But you could not stop yourself trying.", replyBy: "" }
        ]
      },
      rebuke: {
        lines: [
          ["jesus", "Peace, be still."],
          ["", "The wind does not fade. It stops. The water flattens as though someone has laid a hand on it."],
          ["", "The silence is so complete you can hear the rope creaking and your own breath."],
          ["jesus", "Why are ye so fearful? how is it that ye have no faith?"],
          ["elias", "He is not asking because He needs the answer. He is asking because you do."]
        ],
        choices: [
          { t: "Whisper: “Lord, I believe; help my unbelief”", to: "end", stat: { faith: 2 }, xp: 10, faith: true, tag: "Faith", reply: "A prayer borrowed from another desperate father, years later. It is still the most honest sentence a person can pray.", replyBy: "" },
          { t: "Ask the question out loud: “Who is this?”", to: "end", stat: { wisdom: 2 }, xp: 9, tag: "Wisdom", reply: "Mark says they feared exceedingly and said one to another, “What manner of man is this, that even the wind and the sea obey him?” That is the right question.", replyBy: "elias" },
          { t: "Sit in the silence and say nothing at all", to: "end", stat: { compassion: 1, faith: 1 }, xp: 8, reply: "You sit on the wet boards. Someone starts bailing again out of habit, then stops. The lake is glass.", replyBy: "" }
        ]
      },
      end: {
        end: true,
        lines: [
          ["elias", "He did not promise the disciples that they would never meet a storm. He got into the boat with them."],
          ["elias", "And when the storm came, He was in the stern — asleep, not absent. There is a difference, though it is hard to remember at 3 a.m."],
          ["", "The far shore is close now. The scroll turns."]
        ]
      }
    },
    ending: {
      seal: "✧", title: "A Great Calm",
      text: "Peace is not the absence of the storm. It is who is in the boat.",
      takeaway: "Jesus asked “why are you so fearful?” while they were still in danger. Faith is not pretending the waves are small; it is knowing the One who made them is aboard."
    },
    reflection: {
      q: "What storm are you carrying right now — and where do you keep looking?",
      options: [
        { t: "The waves — I need to stop staring at them", stat: { faith: 2 }, insight: "The disciples were experienced fishermen. Their fear was reasonable. Faith is not the denial of facts; it is a larger fact. Mark 4:38" },
        { t: "The next small thing I can actually do", stat: { wisdom: 2 }, insight: "There is no shame in holding the tiller and bailing while you pray. Psalm 107:29–30" },
        { t: "Other people in the boat with me", stat: { compassion: 2 }, insight: "They were all in it together. Who is in your boat, and how are they doing? Mark 4:36" }
      ]
    }
  },

  /* ------------------------------------------------------------------ 5 */
  {
    id: "prodigal",
    num: 5, roman: "V",
    title: "The Far Country",
    subtitle: "The Prodigal Son",
    ref: "Luke 15:11–32",
    theme: "Grace",
    art: "assets/art/prodigal.jpg",
    pos: [28, 78],
    length: "9–11 min",
    intro: "A son asks for his inheritance early. His father gives it — and then waits by the road.",
    scroll: {
      verse: "It was meet that we should make merry, and be glad: for this thy brother was dead, and is alive again; and was lost, and is found.",
      ref: "Luke 15:32 (KJV)",
      note: "This is the third of three “lost” parables in Luke 15 — the lost sheep, the lost coin, and the lost son. It is told because the religious crowd was grumbling that Jesus welcomed sinners.",
      timeline: "c. AD 32 · told somewhere in Judea"
    },
    cast: {
      elias:   { name: "Elias", role: "Your companion" },
      father:  { name: "The father", role: "" },
      younger: { name: "The younger son", role: "" },
      elder:   { name: "The elder son", role: "" },
      servant: { name: "A servant", role: "" }
    },
    start: "start",
    endFruits: ["joy", "patience"],
    relic: "ring",
    nodes: {
      start: {
        lines: [
          ["", "The scroll opens on a warm courtyard: a large house, olive trees, servants moving between the storehouses. Two sons. One father."],
          ["younger", "Father, give me the portion of goods that falleth to me."],
          ["elias", "In that culture, this is not a request for an allowance. It is “I wish you were dead, and I want my share now.” The inheritance would normally come at the funeral."],
          ["", "The father says nothing for a long moment. Then he divides his living between them."]
        ],
        choices: [
          { t: "Try to talk the younger son out of it", to: "leaving", stat: { courage: 2 }, xp: 7, tag: "Courage", reply: "He will not even look at you. Somebody has promised him a better story somewhere else, and he can already hear its music.", replyBy: "" },
          { t: "Ask the father why he agrees to give it", to: "leaving", stat: { wisdom: 2 }, xp: 8, tag: "Wisdom", reply: "“Because love that holds on by force is not love,” he says. “I would rather be wounded and keep my son than keep my property and lose him.”", replyBy: "father" },
          { t: "Stand with the servants, who have gone quiet", to: "leaving", stat: { compassion: 2 }, xp: 7, reply: "They know that a divided estate means some of them will be let go. Nobody in this story is untouched by the son’s choice.", replyBy: "" }
        ]
      },
      leaving: {
        lines: [
          ["", "Not many days later, the younger son gathers everything, takes a journey into a far country — and spends it all."],
          ["elias", "Luke uses one devastating phrase: “wasted his substance with riotous living.” No details. We are not invited to enjoy the sin."],
          ["", "Back home, the father is often on the road, looking toward the horizon."],
          ["servant", "He goes out there every evening. Every single evening."]
        ],
        choices: [
          { t: "Ask how long the father intends to keep waiting", to: "famine", stat: { wisdom: 2 }, xp: 7, reply: "The servant shrugs. “Until he comes back, I suppose.” It has been more than a year.", replyBy: "servant" },
          { t: "Go out to the road and wait with him", to: "famine", stat: { compassion: 2 }, xp: 9, tag: "Compassion", reply: "You stand beside him in the dust until the light fails. He does not say much. He does not need you to.", replyBy: "" },
          { t: "Follow the younger son into the far country", to: "famine", stat: { courage: 2 }, xp: 8, tag: "Courage", reply: "You find a city that is bright at night and expensive in the morning. His friends are already gone when the money runs out.", replyBy: "" }
        ]
      },
      famine: {
        lines: [
          ["", "A mighty famine rises in that land. The son, who once threw money from a table, now hires himself out to a citizen — to feed pigs."],
          ["", "He is so hungry that the pods the pigs eat look good to him. And no one gives him anything."],
          ["elias", "For a Jewish listener, pigs are the bottom. Luke could not have made the fall steeper."],
          ["younger", "He came to himself."],
          ["elias", "Four words. The turning point of the whole parable. He does not get rescued first — he comes to himself."]
        ],
        choices: [
          { t: "Remind him that his father’s hired servants have bread", to: "pigsty", stat: { wisdom: 2 }, xp: 8, tag: "Wisdom", reply: "The thought lands like a physical blow. “Bread,” he says. “Even the servants.” He has not thought of home in months.", replyBy: "younger" },
          { t: "Sit in the mud with him until he can speak", to: "pigsty", stat: { compassion: 2 }, xp: 9, faith: true, tag: "Compassion", reply: "You say nothing. After a long time he says, “I have to go back.” You nod. He needs to hear himself say it.", replyBy: "" },
          { t: "Help him rehearse the words: “Father, I have sinned”", to: "pigsty", stat: { faith: 2 }, xp: 9, reply: "He practises it out loud, twice, and then a third time. He is preparing to return as a servant, not a son.", replyBy: "" }
        ]
      },
      pigsty: {
        game: "prodigal",
        lines: [
          ["younger", "I will arise and go to my father, and will say unto him, Father, I have sinned against heaven, and before thee, and am no more worthy to be called thy son: make me as one of thy hired servants."],
          ["elias", "Repentance in this story is not a feeling of regret. It is a direction. He stands up and starts walking — hundreds of miles, in the same sandals he wore into the pigsty."],
          ["", "The road is long. He gets quieter the closer he gets to home."]
        ],
        choices: [
          { t: "Walk with him as far as the last ridge", to: "road", stat: { compassion: 2 }, xp: 8, reply: "At the top he stops, and you see the roof of the house below. He is crying. You leave him there — the last part is his.", replyBy: "" },
          { t: "Run ahead and warn the household", to: "road", stat: { courage: 2 }, xp: 8, tag: "Courage", reply: "You burst into the courtyard shouting. The father is already running past you before you finish the sentence.", replyBy: "" },
          { t: "Ask Elias whether the father will take him back", to: "road", stat: { wisdom: 2, faith: 1 }, xp: 8, reply: "Elias smiles. “You have read this story before,” he says. “Watch the father’s feet.”", replyBy: "elias" }
        ]
      },
      road: {
        lines: [
          ["", "And he arose, and came to his father. But when he was yet a great way off, his father saw him."],
          ["elias", "He saw him a great way off — because he had been looking. Every evening. For years."],
          ["", "The father runs. In that culture, a patriarch does not run; it is undignified. He does not care. He falls on his son’s neck and kisses him."],
          ["younger", "Father, I have sinned against heaven, and in thy sight, and am no more worthy to be called thy son —"],
          ["father", "Bring forth the best robe, and put it on him; and put a ring on his hand, and shoes on his feet! And bring hither the fatted calf, and kill it; and let us eat, and be merry!"],
          ["elias", "He never lets his son finish the sentence. The rehearsed speech about becoming a hired servant is cut off by a party."]
        ],
        choices: [
          { t: "Run alongside the father to meet him", to: "feast", stat: { compassion: 2 }, xp: 10, tag: "Compassion", reply: "You arrive out of breath in time to see the ring go onto a hand that is still shaking. “My son was dead, and is alive again,” the father keeps saying.", replyBy: "father" },
          { t: "Weep at the edge of the crowd", to: "feast", stat: { faith: 2 }, xp: 9, faith: true, tag: "Faith", reply: "You are not family. You are not a servant. You are nobody in this story. And still you cannot stop crying. That is what grace does to bystanders.", replyBy: "" },
          { t: "Fetch the best robe yourself", to: "feast", stat: { courage: 1, compassion: 1 }, xp: 8, reply: "The robe is heavy and smells of cedar. You put it over shoulders that are still covered in pig-sty dust. Nobody seems to mind.", replyBy: "" }
        ]
      },
      feast: {
        lines: [
          ["", "Music. Dancing. Lamps in the courtyard. And then the story turns — because the elder son is out in the field."],
          ["elder", "What do these things mean? Lo, these many years do I serve thee, neither transgressed I at any time thy commandment — and yet thou never gavest me a kid, that I might make merry with my friends! But as soon as this thy son was come, which hath devoured thy living, thou hast killed for him the fatted calf!"],
          ["elias", "Notice: “this thy son.” He will not say “my brother.” He is not wrong about the facts. He is wrong about the family."],
          ["", "The father goes out and pleads with him. He leaves the party to stand in the dark with the son who stayed."]
        ],
        choices: [
          { t: "Go out and listen to the elder brother", to: "elder", stat: { compassion: 2 }, xp: 10, tag: "Compassion", reply: "You stand in the field with him. He is not angry at the party, really. He is hurt that nobody noticed he never left.", replyBy: "" },
          { t: "Tell him he is being unfair", to: "elder", stat: { courage: 2 }, xp: 7, reply: "You say it plainly. He says something sharp back. Later you will wish you had asked a question instead.", replyBy: "" },
          { t: "Ask the father why he goes out to both sons", to: "elder", stat: { wisdom: 2 }, xp: 9, reply: "“Because both of them are lost,” he says. “One was lost far away. One is lost three feet from my table.”", replyBy: "father" }
        ]
      },
      elder: {
        lines: [
          ["father", "Son, thou art ever with me, and all that I have is thine. It was meet that we should make merry, and be glad: for this thy brother was dead, and is alive again; and was lost, and is found."],
          ["elias", "The parable ends there. Jesus never tells us whether the elder brother came inside. That silence is deliberate — because the people He was speaking to were the elder brothers, and the ending was up to them."],
          ["", "You look at the lit doorway. Then you look at the dark field."]
        ],
        choices: [
          { t: "Stand with the elder brother in the dark, and wait", to: "end", stat: { compassion: 2 }, xp: 9, faith: true, tag: "Compassion", reply: "You do not push. You just stay. Sometimes that is the only invitation a person can accept.", replyBy: "" },
          { t: "Remind him gently that he is already inside the family", to: "end", stat: { wisdom: 2 }, xp: 9, reply: "“All that I have is thine,” you repeat. He looks at the house for a long time. It is the truest thing anyone has said to him all day.", replyBy: "" },
          { t: "Go back to the feast and keep his seat empty", to: "end", stat: { faith: 2 }, xp: 8, reply: "You set an extra place at the table, just in case. The music goes on. The door stays open.", replyBy: "" }
        ]
      },
      end: {
        end: true,
        lines: [
          ["elias", "Two sons. One runs away, one stays and resents it. The father runs after both."],
          ["elias", "Most of us have been the younger son at some point. Quite a lot of us have been the elder one for years and never noticed."],
          ["", "The scroll turns, but the music from the courtyard follows you down the road."]
        ]
      }
    },
    ending: {
      seal: "◎", title: "Dead and Alive Again",
      text: "Grace is the father running before the apology is finished.",
      takeaway: "The father absorbs the cost, restores the ring, and throws a feast — while still going out to plead with the son who never left. He is prodigal, extravagant, with mercy for both."
    },
    reflection: {
      q: "Which brother are you today — and what would coming home look like?",
      options: [
        { t: "The younger: I need to stop rehearsing and start walking", stat: { courage: 2 }, insight: "Repentance in Luke 15 is a journey, not a mood. “He arose and came to his father.” Luke 15:20" },
        { t: "The elder: I have stayed, but my heart is far away", stat: { wisdom: 2 }, insight: "The father went out to him too. Obedience without love is its own kind of far country. Luke 15:28–31" },
        { t: "The bystander: I want to know how to welcome someone", stat: { compassion: 2 }, insight: "Then leave the seat empty and the door open. That is how the parable invites us to finish it. Luke 15:32" }
      ]
    }
  },

  /* ------------------------------------------------------------------ 6 */
  {
    id: "esther",
    num: 6, roman: "VI",
    title: "For Such a Time",
    subtitle: "Queen Esther",
    ref: "Esther 4–5",
    theme: "Boldness",
    art: "assets/art/esther.jpg",
    pos: [68, 93],
    length: "9–11 min",
    intro: "A decree of destruction. A queen who has not been summoned. One line in the law that could cost her everything.",
    scroll: {
      verse: "For if thou altogether holdest thy peace at this time, then shall there enlargement and deliverance arise to the Jews from another place … and who knoweth whether thou art come to the kingdom for such a time as this?",
      ref: "Esther 4:14 (KJV)",
      note: "Approaching the Persian king unsummoned carried the death penalty unless he extended the golden sceptre. Esther had not been called for thirty days. The book of Esther is unusual — God is never named in it — yet His providence is everywhere in the timing.",
      timeline: "c. 480 BC · Susa, the Persian capital"
    },
    cast: {
      elias:    { name: "Elias", role: "Your companion" },
      mordecai: { name: "Mordecai", role: "Esther’s cousin and guardian" },
      esther:   { name: "Queen Esther", role: "" },
      hatach:   { name: "Hathach", role: "A palace attendant" },
      king:     { name: "The King", role: "" }
    },
    start: "start",
    endFruits: ["gentleness", "selfcontrol"],
    relic: "scepter",
    nodes: {
      start: {
        lines: [
          ["", "The scroll opens on blue pillars, gold, and polished stone. Susa — the winter capital of the Persian empire."],
          ["elias", "Haman, the king’s highest official, has been furious that a Jew named Mordecai will not bow to him. So he has engineered something far worse than a personal feud."],
          ["", "A decree is being copied into every language of the empire: on one day, in every province, all Jews are to be destroyed."],
          ["", "At the king’s gate sits Mordecai, in sackcloth and ashes, weeping loudly."]
        ],
        choices: [
          { t: "Read a copy of the decree in the gate yourself", to: "decree", stat: { wisdom: 2 }, xp: 7, tag: "Wisdom", reply: "The date is set eleven months out. The whole thing is legal, sealed, and public. That is what makes it so frightening.", replyBy: "" },
          { t: "Sit with Mordecai in the ashes", to: "decree", stat: { compassion: 2 }, xp: 8, tag: "Compassion", reply: "He does not stop crying, but he makes room for you. Grief is easier to carry when someone sits down in it with you.", replyBy: "" },
          { t: "Ask Elias where God is in all of this", to: "decree", stat: { faith: 2 }, xp: 9, faith: true, tag: "Faith", reply: "“That is the question this entire book asks,” Elias says. “His name is never mentioned once. Watch the timing instead of looking for thunder.”", replyBy: "elias" }
        ]
      },
      decree: {
        lines: [
          ["", "The news reaches the palace. Esther’s maids and chamberlains tell her that Mordecai is at the gate in sackcloth, and the queen is exceedingly grieved."],
          ["hatach", "She has sent me to ask him what is the matter. But he will not take the clothes she offers him."],
          ["elias", "There is a detail people miss: Esther is queen, but she is not free. She has not seen the king in thirty days. She was not summoned."],
          ["", "Hathach returns from the gate with a copy of the decree and a message for the queen."]
        ],
        choices: [
          { t: "Carry the message to Esther exactly as Mordecai gave it", to: "mordecai", stat: { courage: 2 }, xp: 8, tag: "Courage", reply: "You do not soften it. She reads it once, then again, very slowly. Her face does not change; her hands do.", replyBy: "" },
          { t: "Soften the hardest parts before you tell her", to: "mordecai", stat: { compassion: 1 }, xp: 6, reply: "She thanks you — and then asks for the actual parchment. Elias gives you a look. People in danger deserve the truth, not comfort.", replyBy: "elias" },
          { t: "Ask about the law for approaching the king unsummoned", to: "mordecai", stat: { wisdom: 2 }, xp: 8, reply: "Hathach goes pale. “One law: whoever comes in uncalled is put to death, unless the king holds out the golden sceptre. Thirty days,” he whispers. “She has not been called in thirty days.”", replyBy: "hatach" }
        ]
      },
      mordecai: {
        lines: [
          ["esther", "Go, gather together all the Jews that are present in Shushan, and fast ye for me, and neither eat nor drink three days, night or day … and so will I go in unto the king, which is not according to the law: and if I perish, I perish."],
          ["", "But before she says it, Mordecai sends her a message that cuts through the palace walls."],
          ["mordecai", "Think not with thyself that thou shalt escape in the king’s house, more than all the Jews. For if thou altogether holdest thy peace at this time, then shall there enlargement and deliverance arise to the Jews from another place … and who knoweth whether thou art come to the kingdom for such a time as this?"],
          ["elias", "He does not say “God will use you.” He says “who knows?” — and then asks the question that has been echoing down every chapter of our road."]
        ],
        choices: [
          { t: "Deliver his words to Esther without changing a syllable", to: "message", stat: { courage: 2 }, xp: 9, tag: "Courage", reply: "She receives the message standing. Then she sits down. Then she stands again. “Gather the people,” she says.", replyBy: "esther" },
          { t: "Ask Elias what “such a time as this” actually means", to: "message", stat: { wisdom: 2 }, xp: 9, reply: "“It means your ordinary life has quietly become somebody else’s only option,” he says. “Mordecai is not flattering her. He is telling her the truth about the moment.”", replyBy: "elias" },
          { t: "Remind her that deliverance will come either way", to: "message", stat: { faith: 2 }, xp: 9, faith: true, tag: "Faith", reply: "“God does not need me,” she says slowly — and you can see the moment the sentence frees her. “But perhaps He wants me.”", replyBy: "esther" }
        ]
      },
      message: {
        lines: [
          ["", "The decree goes out from the queen’s rooms: all the Jews in Susa are to fast for three days, night and day. She and her maids will fast too."],
          ["elias", "Fasting is not a technique for making God do something. It is making room — clearing out the noise so you can hear the one thing that matters."],
          ["", "Three days. No food. No water. A whole community holding its breath together."]
        ],
        choices: [
          { t: "Join the fast for all three days", to: "fast", stat: { faith: 2 }, xp: 12, give: { fruit: "selfcontrol" }, faith: true, tag: "Faith", reply: "By the third day your head is light and your thoughts are unnervingly clear. You are not less afraid. You are less scattered.", replyBy: "" },
          { t: "Organise the fasting groups across the city", to: "fast", stat: { wisdom: 2, compassion: 1 }, xp: 9, tag: "Wisdom", reply: "You move between courtyards with lists and messages. Hundreds of people are suddenly part of the same quiet decision.", replyBy: "" },
          { t: "Keep watch outside the palace gate", to: "fast", stat: { courage: 2 }, xp: 8, reply: "You stand in the heat for three days, watching who goes in and out of the throne room. Mordecai is still there in the ashes.", replyBy: "" }
        ]
      },
      fast: {
        game: "esther",
        lines: [
          ["", "On the third day the fasting ends. Esther puts on her royal apparel and stands in the inner court of the king’s house, directly in front of the throne."],
          ["elias", "She is beautifully dressed and completely terrified. Both things are true at once."],
          ["", "The king looks up. For a moment, absolutely nothing happens."]
        ],
        choices: [
          { t: "Pray for favour with the king", to: "throne", stat: { faith: 2 }, xp: 8, faith: true, tag: "Faith", reply: "No thunder. No voice. Just a woman standing still in a doorway, while an empire holds its breath.", replyBy: "" },
          { t: "Plan the exact words she will say if she is allowed to speak", to: "throne", stat: { wisdom: 2 }, xp: 8, reply: "You settle on something simple. Later you will be glad — she does not use any of it.", replyBy: "" },
          { t: "Simply wait in silence with her", to: "throne", stat: { compassion: 2 }, xp: 8, tag: "Compassion", reply: "You stand a step behind her. She knows you are there. Sometimes presence is the whole gift.", replyBy: "" }
        ]
      },
      throne: {
        lines: [
          ["king", "What wilt thou, queen Esther? and what is thy request? it shall be even given thee to the half of the kingdom."],
          ["", "The golden sceptre is extended. She steps forward and touches the top of it."],
          ["", "And then — she does not blurt out Haman’s name. She does not accuse anyone in front of the court. She invites the king and Haman to a banquet. And then, at the banquet, to a second one."],
          ["elias", "An unsummoned approach. A sceptre. Two banquets. Nothing looks like a miracle yet. That is often how providence works — in ordinary decisions made at exactly the right time."]
        ],
        choices: [
          { t: "Step forward with her into the throne room", to: "end", stat: { courage: 2 }, xp: 12, require: { courage: 6 }, faith: true, tag: "Courage 6", hint: "Grow Courage in earlier chapters", reply: "You are not summoned either. But the sceptre is out, and the moment is now. You walk.", replyBy: "" },
          { t: "Hold your breath at the pillar and watch", to: "end", stat: { wisdom: 2 }, xp: 9, reply: "You watch a queen choose patience over accusation. Boldness and hurry are not the same thing.", replyBy: "" },
          { t: "Ask Elias why she waits until the second banquet", to: "end", stat: { wisdom: 2, faith: 1 }, xp: 10, reply: "“Because she is not just brave — she is wise,” he says. “Courage without gentleness can win a moment and lose a kingdom. She does both.”", replyBy: "elias" }
        ]
      },
      end: {
        end: true,
        lines: [
          ["elias", "The book of Esther never once says the word “God.” And yet not one thing in it is accidental — a forgotten favour, a sleepless night, a queen in the right city in the right decade."],
          ["elias", "You may never see a burning bush or a parted sea. You may just be standing in a doorway, at a time like this."],
          ["", "The scroll closes. But the road, somehow, does not."]
        ]
      }
    },
    ending: {
      seal: "✥", title: "For Such a Time as This",
      text: "Providence often looks like an ordinary person in the right place, willing.",
      takeaway: "Esther’s bravery was not loud. She fasted, waited, chose her moment, and spoke with gentleness — a reminder that boldness and self-control are not opposites."
    },
    reflection: {
      q: "Where might God have placed you “for such a time as this”?",
      options: [
        { t: "In my family, where I am the only one who prays", stat: { faith: 2 }, insight: "Esther’s first calling was in a palace nobody would call holy. Your address may be your assignment. Esther 4:14" },
        { t: "At work or school, where I can quietly do the right thing", stat: { courage: 2 }, insight: "Mordecai’s small refusal to bow came long before the decree. Faithfulness in small things prepares you for large ones. Esther 3:2–5" },
        { t: "I am not sure yet — but I want to be available", stat: { wisdom: 2 }, insight: "“Who knoweth whether thou art come to the kingdom for such a time as this?” is a question, not a command. Sit with it. Esther 4:14" }
      ]
    }
  }
];

/* Chapters 7–10 live in a compact bilingual spec so Chinese and English
   can never drift apart. They are rebuilt in place when the language changes. */
import { EXTRA_CHAPTERS, buildChapter } from "./chapters-extra.js";
for (const spec of EXTRA_CHAPTERS) CHAPTERS.push(buildChapter(spec, "en"));

/* Ten chapter markers zig-zag down the pilgrim road. */
const MAP_POSITIONS = [
  [24, 6], [72, 14], [26, 22], [74, 30], [24, 38],
  [70, 46], [26, 54], [74, 62], [26, 70], [74, 78]
];
CHAPTERS.forEach((c, i) => { c.pos = MAP_POSITIONS[i] || [50, 80 + i]; });

export const chapterById = (id) => CHAPTERS.find((c) => c.id === id);
