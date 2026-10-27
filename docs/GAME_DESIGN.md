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
