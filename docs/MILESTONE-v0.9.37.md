# Milestone — v0.9.37 · "Story Mode, complete"

Tagged `v0.9.37-story`. This is the finished version of the game as it was designed:
a scroll-and-choice Bible story RPG. Everything below is frozen. Future work
builds **beside** it, not on top of it.

Commit `247d21d` · Pages `built` · the last public build of this design.

---

## What is finished and must not be broken

**Ten chapters, both languages, ~5,300 Chinese characters of story in the first six.**
Each chapter carries: an intro, a briefing (place / who / where, grounded in
history), a branching story told in nodes, a set-piece action game, story
moments, hotspots, a reflection, an ending line and a scroll.

| chapter | zh chars | lines | choices |
|---|---|---|---|
| I  elah | 975 | 27 | 12 |
| II lions | 825 | 25 | 15 |
| III jericho | 886 | 32 | 18 |
| IV storm | 588 | 24 | 12 |
| V prodigal | 1106 | 32 | 21 |
| VI esther | 945 | 25 | 18 |
| VII–X | via `buildChapter(spec, lang)` in `chapters-extra.js` | | |

**Systems that work and are covered by lints:**
15 set-piece games · 20 story moments · 5 interaction kinds · Journey Mirror
(10 profiles, 4 ways, label-free) · compendium (stats, fruits, relics, seals,
callings) · quests · journal · breathing prayer · clean mode · red-letter rule
for the words of Jesus · full zh/en parity · save/reset · offline single-file
build · iOS/Android via Capacitor.

**Ten lints, all green at this tag:** `check:copy` (1868 lines) · `check:i18n` ·
`check:games` · `check:acts` · `check:audio` · `check:mirror` ·
`check:redletter` · `check:moments` · `check:demos` · `smoke` · `smoke:single`.

**The house voice.** The user rewrote 22 weak lines themselves and those exact
strings are approved, frozen, and protected in `check-copy`'s `KEEP` list. Full
explanatory sentences; 看起来 / 其实 / 原来 / 未必 / 或许 / 真正 / 依然 as
connective glue; 不是…而是… used sparingly; meaning carried, not gestured at.

---

## How the next idea attaches

The next design — walking a world, meeting people, finding things, a shop, a
turn-based confrontation — is added as a **new mode with its own entry on the
title screen**. Story mode stays the default and stays complete until the new
mode is demonstrably better. Nothing is deleted; the old flow is always one tap
away, and if the new mode fails it can be switched off without a revert.

Reused as-is by the new mode: all chapter content, portraits and painted art,
`CHAPTER_AMBIENCE`, the games and moments, the i18n layer, the save state.

New, and therefore at risk: field movement, collision, NPC scheduling, shop
economy, the confrontation system, and the camera. These get their own lints
and their own smoke pass before they can become the default.
