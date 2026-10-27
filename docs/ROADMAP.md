# Covenant — Roadmap

> The prototype in this repo is a **vertical slice**: enough of the game to feel the whole idea on a phone. This document is the plan for turning it into a real product.

---

## Where we are now (v0.1)

- ✅ 6 complete, branching Bible stories
- ✅ Full RPG loop: virtues, XP, callings, relics, fruits, seals, reflection
- ✅ Mobile-first portrait UI, offline, PWA, auto-save
- ✅ Automated content validation + full headless playthrough test
- ✅ Capacitor config and native build pipeline
- ⛔ No backend, accounts, analytics, push notifications, soundtracks or localisation
- ⛔ Depictions are still illustrations, not animation; no voice acting

---

## Phase 1 — Validate the idea (2–4 weeks, ~US$0)

**Goal:** find out if people actually want to play it, before writing chapter 7.

1. Publish the PWA to a public HTTPS URL (Netlify / Vercel / GitHub Pages / Cloudflare Pages — all free for static sites).
2. Print a QR code. Give it to a youth group, a cell group, a Sunday school class.
3. Watch 10 people play without helping them. Note where they tap the wrong thing, where they get bored, where they stop.
4. Ask three questions after: *What story do you remember? Did anything make you think? Would you play a chapter tomorrow?*
5. Fix the top three confusions.

**Decisions to lock here:** translation (KJV vs WEB vs licensed modern version), target age, language(s), and whether Jesus is portrayed directly. See `docs/GAME_DESIGN.md` §5.

---

## Phase 2 — Content depth (2–3 months)

The #1 reason players leave a narrative game is running out of story.

- **12 more chapters** to cover the whole arc of Scripture. Suggested set:
  - *Old Testament:* Creation & Fall, Noah, Abraham's test, Moses & the burning bush, Ruth & Naomi, Elijah on Carmel, Jonah, Nehemiah rebuilding the wall.
  - *New Testament:* The nativity (from the shepherds' side), the woman at the well, Zacchaeus, Mary & Martha, the road to Emmaus, Pentecost, Paul's conversion.
- **Branching arcs** per chapter: 2–3 meaningful endings for the *player's* character (not the biblical event), tracked with `flags`.
- **A companion relationship** with Elias — he reacts to how compassionate/wrong-headed you have been, and his dialogue changes.
- **More mini-games:** build the ark (resource choices), rebuild the wall (timing + teamwork), Emmaus (a "scripture connection" puzzle where you link prophecies to the story).
- **Voice acting & ambient audio** — one narrator voice, licensed music beds per era.
- **Localisation.** Put all UI strings in a `src/data/strings.js` and load `strings.ms.json` / `strings.zh.json`. Malay, Mandarin and Tamil are strong choices for Malaysia; Indonesian and Tagalog widen the reach further.

Content is the expensive part. Budget roughly **1–2 days of writing + 1 day of review per chapter**.

---

## Phase 3 — Production quality (parallel with Phase 2)

- **Animated scenes.** Keep the generated art, add parallax layers, drifting dust, rain on the lake, flickering lamplight. Cheap and very effective.
- **Character portraits** for Elias and the main cast, with expression changes.
- **Onboarding.** An interactive prologue chapter that teaches tapping, choices, prayer and the scroll instead of a text "How to play".
- **Accessibility.** Full screen-reader labels, adjustable text (already partly there), high-contrast mode, reduced-motion (done), one-handed reachability.
- **Save sync (optional).** A simple backend (Supabase / Firebase) for cloud saves and a leaderboard of chapters completed. This adds a privacy policy and account flow — only do it if players ask.
- **Daily verse / devotional** with local notifications; tie it to fruits you have collected.
- **Share cards.** Generate a beautiful image of a verse + your character to share on WhatsApp — the single most effective growth loop for a faith app.

---

## Phase 4 — Launch (after Phase 1 validation)

1. `npm run cap:sync`, then follow `docs/MOBILE_DEPLOY.md` for both stores.
2. Soft-launch in one country (Malaysia) for 2 weeks; collect crash reports and feedback.
3. Ask churches / Christian schools to feature it — this audience is reached far better through community than ads.
4. Then widen to English-speaking markets, with localised builds following.

---

## Monetisation (recommendation: keep it free)

| Option | Verdict |
|---|---|
| **Free, donation-supported** | ✅ Best fit. Churches and individuals can give; no one is charged to read the Bible. |
| One-time "support the developers" unlock for extra chapters | ⚠️ Acceptable, but be careful not to paywall Scripture itself. |
| Ads | ❌ Avoid. An ad mid-reflection would destroy the tone, and ad networks bring tracking + children's-privacy complexity. |
| Subscriptions / loot boxes / energy timers | ❌ Do not. Wrong for the subject matter and bad for store ratings. |
| Grant / church sponsorship | ✅ Realistic. A ministry or foundation funds development; the app stays free forever. |

---

## Risks and how to handle them

| Risk | Mitigation |
|---|---|
| **Doctrinal disagreement** between denominations | The witness-not-author rule, public-domain translation, reference shown in every chapter, and review by leaders from multiple backgrounds. Make the content data-driven so a church can fork its own version. |
| **Copyright on modern translations** | Use KJV/WEB, paraphrase, or licence a translation officially. |
| **"Games trivialise the Bible"** criticism | Keep reflection mandatory-feeling but optional, show the real passage at the end, and never reward players for "beating" a Bible character. Playtest with pastors early. |
| **Small team burnout** | Content is data, not code — volunteers can write chapters using the template in `docs/GAME_DESIGN.md` without touching JavaScript. `npm run check` catches their mistakes automatically. |
| **iOS build needs a Mac** | Use a macOS CI runner (GitHub Actions / Codemagic) rather than buying hardware. |
| **Player data** | Currently none — keep it that way as long as possible. |

---

## The honest answer to "is it possible?"

Yes. The hard part was never the technology — a single web codebase runs on both iOS and Android today, and this repository proves it. The hard part is **writing faithful, genuinely moving stories** and getting them reviewed. That is a people job, not a coding job — and it is a very good problem to have.
