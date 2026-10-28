> **v0.7 更新 — 更多互动、更沉浸的画面（神学规则不变）**
>
> 1. **每章新增 2 个「故事里的一刻」**：按住、轻点、描线、平衡、节奏，共 20 个。全部是「在场者的一个身体动作」，**不改变经文结局、不新增资源系统、不新增按钮**，可跳过。见 `docs/INTERACTIONS.md`。
> 2. **不使用游戏引擎**。直接用 WebGL 写了一个 GPU 着色器层（体积光、尘埃、胶片颗粒、暗角），零依赖、可降级、单 WebGL context 全站复用。引擎不会让美术变好，美术本身才会。
> 3. **写实场景图**：先用 `tools/process-art.py` 把生成图裁成 848×1264 竖版。审核时请确认画面没有加入与经文冲突的细节（例如额外人物、现代物件、伪造文字）。
> 4. **沉浸模式仍是默认**，且现在与结局分析直接挂钩：请求提示的次数单独记录，不污染走路方式统计。这让「旅程之镜」尽可能反映未受提示影响的真实选择。
>
> **v0.6 更新 — 「旅程之镜」与红字原则（重要，神学审核请看这一节）**
>
> 1. **不是人格测验。** 结局不是 MBTI，也不是心理测评。它只报告玩家在游戏里**实际做过的事**：四种品格数值，加上从行为记录下来的四种「走路方式」（迈步 forward / 观察 notice / 留下 stay / 等候 wait）。然后把这些摆在一位圣经人物旁边，**包括那人真实的失败**，最后把玩家送回经文。
>    - 圣经依据：罗马书 15:4（「从前所写的圣经都是为教训我们写的」）、哥林多前书 10:11–12（「他们遭遇这些事都要作为鉴戒……自己以为站得稳的，须要谨慎，免得跌倒」）、雅各书 1:23–24（道如镜子）、撒母耳记上 16:7（「人是看外貌，耶和华是看内心」）。
>    - 因此游戏**拒绝给玩家贴人格标签**，也拒绝声称「神告诉你，你是某种人」。免责声明直接写在结局里。
> 2. **红字原则（Red-letter rule）。** 耶稣现在有立绘，但祂说的每一句都必须是 KJV／中文和合本的**逐字引用**，绝不编写对白。父神的声音仍以非具象的光表示，其台词同样只能是经文。`npm run check:redletter` 会在中英双语逐一核对所有 `jesus` / `voice` 台词与回复；`tools/check-redletter.js` 里的白名单就是审核清单，任何新增台词都必须先加经文出处再进白名单。
>    - 是否直接描绘基督，仍应由你们的牧者／神学顾问决定。要恢复非具象表现，把 `src/data/portraits.js` 的 `JESUS_FACE` 改回 `"radiance"` 即可。
> 3. **每章都把人送回圣经。** 章末新增「再走一步」卡：准确经文地址、一个值得留意的细节、一道诚实的问题。终章汇总成十段经文的阅读清单，点击可打开对应书卷。
> 4. **画面与互动更丰富，但元素不增加。** 共享一套点击涟漪、拖曳光带、火花、冲击停顿、体积光与柔和暗角，10 个关卡一起变好看；没有新增资源系统、没有新货币、没有新按钮。
>
> 详细内容见 `src/data/mirror.js`（人物档案、经文与免责声明）、`src/data/deeper.js`（十段阅读邀请）与 `docs/INTERACTIONS.md`。

> **v0.4 更新**：每章改为多幕互动场景（准备幕 + 高潮幕），新增 6 张人物立绘、电影感前景与颗粒叠层、拖动提灯的隐藏物品搜寻；大卫一章为三幕，溪边找到的石子数量直接决定甩石关卡的弹药。详见 `docs/INTERACTIONS.md`。
>
> **v0.3 更新**：10 章、10 个可操控互动关卡、营地枢纽（NPC／任务／昼夜／行囊）、「引导」资源与呼吸祷告、沉浸／纯净模式、绘画背景与天气、以及一个没有提示的终章。关卡设计详见 `docs/INTERACTIONS.md`。
>
> **v0.2 更新**：新增中文优先／英文可切换、六个可操控互动关卡、隐藏物品、滑动选项、按住祷告与全站动画。

# Covenant — Game Design Document (v0.1)

## 1. The one-sentence pitch

**A story-driven RPG that puts you *inside* the Bible — not to change it, but to be changed by it.**

Target player: teenagers and young adults who own a phone, play games, and have never read a gospel narrative end-to-end. Secondary audience: families, Sunday schools, youth groups.

---

## 2. Why a game, and why this shape

Most Bible apps are *reference tools*: search a verse, read a devotional. Games offer something different — **embodied memory**. People remember the lion's den because they stood outside the sealed stone all night, not because they read Daniel 6.

Design pillars:

1. **Presence over information.** The player has a body in the scene. They stand, wait, kneel, hold a rope.
2. **Formation over winning.** There are no game-over screens and no "wrong" reflections. The scoreboard is four virtues, not points.
3. **Fidelity over fan fiction.** See the rule below.
4. **Short sessions.** 8–11 minutes per chapter — one bus ride, one bedtime.
5. **Offline and free.** No account, no ads, no paywall between a person and Scripture.

---

## 3. The most important rule: *witness, not author*

> **Player choices shape the player character. They never change the scriptural outcome.**

David still faces Goliath. Daniel still goes into the den. Jesus still calms the storm. This single rule solves the biggest objection churches have to Bible games ("you're letting kids rewrite the Bible"), and it turns out to be *better game design*: it creates meaningful choice without contradictions.

Consequences of the rule:

- The player is a bystander, servant, disciple or companion — never the biblical hero.
- A companion character, **Elias the Scribe**, provides historical context and asks the questions the player is thinking.
- Dialogue written for the game is clearly labelled as **not scripture**. Every chapter ships with its reference, a public-domain KJV key verse, and a "read the full account" prompt.
- Where tradition adds details the text does not (e.g. the meaning of David's five stones), Elias explicitly says so. That honesty builds trust with biblically literate players.

---

## 4. Core loop

```
   MAP  →  choose a chapter  →  STORY (dialogue + choices)
    ↑                                  │
    │                            mini-game / prayer
    │                                  ↓
    └──  rewards  ←  REFLECTION  ←  END CARD
         (relic, fruit, XP, seals)
```

**Virtues.** Courage ⚔, Wisdom ✦, Compassion ♥, Faith ✟ (0–12 each). Choices raise them; some golden "faith paths" are gated behind a minimum virtue. **The once-per-chapter Pray action grants +1 Faith and shows a public-domain promise** — so a player can never be permanently locked out of a path.

**Calling (class).** Shepherd / Scribe / Guardian / Intercessor — each starts with a different virtue bonus and a short "gift" line. Purely a starting flavour; all virtues can be grown.

**Collectibles.**
- 9 **Fruits of the Spirit** (Galatians 5:22–23) — one or two per chapter.
- 6 **Relics** — a physical object carried out of each story.
- 7 **Seals** — achievements for prayer, reflection, completion, mastery.

**Reflection.** Each chapter ends with one honest, pastoral question. No right answer: each option grows a virtue and returns a tailored scripture insight. This is the "devotional" moment, and it is deliberately optional.

---

## 5. Content guidelines (please read before writing chapter 7)

1. **Translation.** KJV and WEB are public domain. Modern translations (NIV, ESV, NLT, NKJV…) are **copyrighted** — you need a licence to quote them in an app. If you want a modern voice, paraphrase and cite the reference, or obtain permission.
2. **No invented doctrine.** Narrative dialogue may imagine what a bystander said; it must never invent a teaching, a miracle, or a saying of Jesus. Direct speech attributed to Jesus in this prototype is taken from the gospel text.
3. **Say when you are guessing.** Historical notes should distinguish "the text says" from "historians think".
4. **Portraying Jesus.** The prototype includes dramatised gospel dialogue. Some traditions object to any portrayal. If yours does, reframe the storm chapter from the disciples' point of view and remove the `jesus` cast entries.
5. **Violence and age rating.** Battle, lions, a wounded man and an execution decree are described, never shown graphically. Current target: **12+ / Teen**. Add a content note if you expand into Judges, Revelation or the crucifixion.
6. **No proselytising mechanics.** No score for converting people, no "pray to win" button. Prayer in this game forms the character; it is not a spell.
7. **Accessibility.** Keep one idea per dialogue line, avoid unexplained theological jargon, and honour `prefers-reduced-motion` (the CSS already does).
8. **Review.** Every chapter should be read by at least two church leaders before release, ideally from different denominations if you want broad reach.

---

## 6. Chapter template

Chapters are plain data in `src/data/chapters.js`. Copy this into the `CHAPTERS` array:

```js
{
  id: "unique_id", num: 7, roman: "VII",
  title: "Chapter Title", subtitle: "Short label",
  ref: "John 6:1–14", theme: "Provision",
  art: "assets/art/your-image.jpg",
  pos: [30, 100],                 // map position: x %, y % of a 980px-tall canvas
  length: "8–10 min",
  intro: "One sentence shown on the map and chapter card.",
  scroll: {
    verse: "A short public-domain KJV verse.",
    ref: "John 6:xx (KJV)",
    note: "What the passage actually says and why it matters.",
    timeline: "c. AD 32 · near the Sea of Galilee"
  },
  cast: {
    elias: { name: "Elias", role: "Your companion" },
    // any other speakers used in `lines`
  },
  start: "start",
  endFruits: ["goodness"],       // from compendium.js FRUITS ids
  relic: "new_relic_id",         // add to compendium.js RELICS
  nodes: {
    start: {
      lines: [ ["", "Narrator text."], ["elias", "Spoken line."] ],
      choices: [
        { t: "What the player says", to: "node_b", stat: { courage: 2 }, xp: 6,
          tag: "Courage", reply: "A short consequence shown before moving on." }
      ]
    },
    node_b: {
      lines: [ ["", "…"] ],
      next: "end"                 // or `mini: {...}` or `choices: [...]`
    },
    end: {
      end: true,
      lines: [ ["elias", "What we learned."] ]
    }
  },
  ending: { seal: "✧", title: "End card title", text: "One line.", takeaway: "The main point." },
  reflection: {
    q: "An honest question for the player?",
    options: [
      { t: "Answer A", stat: { faith: 2 }, insight: "A scripture-backed insight. John 6:xx" },
      { t: "Answer B", stat: { wisdom: 2 }, insight: "…" },
      { t: "Answer C", stat: { compassion: 2 }, insight: "…" }
    ]
  }
}
```

Then:

```bash
npm run check   # catches broken links, unreachable nodes, missing rewards, impossible gates
npm run smoke   # plays every chapter in a headless browser
```

**Rules the validator enforces:** every `to` / `next` points at a real node; every node is reachable; every node with gated choices also has at least one ungated choice; every fruit is obtainable; every speaker exists in `cast`; every chapter has an end node and 3 reflection options.

---

## 7. Chapters in v0.1

| # | Chapter | Passage | Virtue | Fruits | Relic | Mini-game |
|---|---|---|---|---|---|---|
| I | The Valley of Elah | 1 Samuel 17 | Courage | faithfulness | Five Smooth Stones | "Hold your nerve" (1 round) |
| II | The Lions' Den | Daniel 6 | Integrity | goodness (+self-control) | The King's Signet | — |
| III | The Road to Jericho | Luke 10:25–37 | Compassion | love, kindness | Two Denarii | — |
| IV | Peace, Be Still | Mark 4:35–41 | Trust | peace | A Fisherman's Rope | "Hold the tiller" (3 rounds) |
| V | The Far Country | Luke 15:11–32 | Grace | joy, patience | The Father's Ring | — |
| VI | For Such a Time | Esther 4–5 | Boldness | gentleness, self-control | The Golden Scepter | — |

---

## 8. Art & audio direction

- **Art:** flat painterly illustration, deep indigo/teal shadows with warm gold highlights, consistent 2:3 portrait framing, no text baked in. Seven original images live in `assets/art/`. Keep the same style prompt for new chapters.
- **Audio:** procedural Web Audio tones (no files). `sfx()` in `src/core/audio.js` — tap, choice, reward, prayer, hit/miss, level up. Optional future work: ambient loops per chapter and a licensed orchestral bed.
- **Icons:** `tools/make_icons.py` regenerates all PWA/store icons with pure Python. Run `npm run icons` after changing the emblem.
- **Symbol glyphs:** decorative characters (✟ ✧ ◍ …) are backed by two ~5 KB subsets of Noto Sans Symbols 1 & 2 in `assets/fonts/`, declared at the top of `styles.css` and appended to both font stacks. Without them, those glyphs silently disappear on devices with limited fonts. If you add a new symbol, re-subset the font and extend the `unicode-range` list — or use an inline SVG instead. The licence is in `assets/fonts/OFL-Noto-Sans-Symbols.txt`.
