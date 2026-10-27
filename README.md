# Covenant — Journeys Through the Word

> An interactive Bible story RPG for **iPhone, Android and the web**.

**Yes — this is entirely possible, and a playable prototype is already in this repository.** You can open the live preview on your phone right now, play six Bible stories, and install it to your home screen. The last step — publishing real apps in the App Store and Google Play — is a packaging job, not a rewrite.

---

## What the prototype is

You are a pilgrim carrying a scroll that opens *inside* the stories of Scripture. You stand in the Valley of Elah, sit in a boat on the Sea of Galilee, wait outside the lions' den. You make choices — and those choices shape **your character**, never the biblical outcome.

| | |
|---|---|
| **6 playable chapters** | David & Goliath · Daniel · Good Samaritan · Jesus calms the storm · Prodigal Son · Queen Esther |
| **RPG systems** | 4 virtues (Courage, Wisdom, Compassion, Faith), XP/levels, 4 callings, gated "faith paths", 9 Fruits of the Spirit, 6 relics, 7 seals |
| **Interactive methods** | 96 branching choices, 165 dialogue lines, typewriter storytelling, 2 timing mini-games, once-per-chapter prayer, end-of-chapter reflection |
| **Bible-first design** | Every chapter has a real scripture reference, a KJV key verse, a historical note, and a "read the full account" link |
| **Mobile-ready** | Portrait, touch-first, safe-area aware, offline (service worker), PWA installable, auto-save |

The whole thing is plain HTML/CSS/JavaScript — **no build step, no framework, no tracking, no ads, no backend**. That is deliberate: one codebase runs everywhere.

---

## Run it

```bash
npm run dev            # http://localhost:4173 — open on your phone via the preview URL
npm run check          # validates all 6 stories, links, rewards and state transitions
npm run smoke          # headless playthrough of every chapter (needs npm install)
npm run build:www      # produces www/ for native packaging
```

No install is required to *play*: any static web server works (`python3 -m http.server 4173` is fine). `npm install` is only needed for the tests and the native tooling.

---

## The path to real iOS + Android apps

There are three stages, and the first two already work:

1. **Web / PWA — works today.** Open in Safari/Chrome, "Add to Home Screen". Full-screen, offline, with an app icon. Zero store approval. Great for validating the idea with a youth group.
2. **Capacitor native wrapper — one codebase, two stores.** The same web app is wrapped in a real native project and submitted to the App Store and Google Play. `capacitor.config.json` is already configured; see **[docs/MOBILE_DEPLOY.md](docs/MOBILE_DEPLOY.md)** for the exact commands, costs and store requirements.
3. **Native rewrite (optional, later).** If the game grows into real-time 3D, heavy animation or console releases, Unity/Godot would be the next step. For a narrative RPG like this one, that is unnecessary.

**Recommended approach:** ship the PWA first, then wrap it with Capacitor. Both platforms from one codebase — roughly 90% shared code.

---

## Design documents

| Document | What it covers |
|---|---|
| [docs/GAME_DESIGN.md](docs/GAME_DESIGN.md) | Vision, audience, the "witness not author" rule, content guidelines, chapter template, how to add a story |
| [docs/MOBILE_DEPLOY.md](docs/MOBILE_DEPLOY.md) | Step-by-step iOS + Android build, store accounts/costs, privacy, ratings, testing |
| [docs/ROADMAP.md](docs/ROADMAP.md) | What to build next, phased plan, monetisation options, risks |

---

## Important decisions you still need to make

These are yours, not technical ones — I picked sensible defaults for the prototype:

- **Bible translation.** The prototype quotes the **KJV (public domain)**. Most modern translations are copyrighted and require a licence for an app. **WEB (World English Bible)** and **KJV** are public-domain options; otherwise contact the publisher (e.g. NIV / ESV / NKJV) for permission.
- **Theological review.** Have pastors/leaders from your own church review every chapter before publication. The game is written to be broadly orthodox and non-denominational, but your community should own that call.
- **Audience & language.** Currently English, teen-and-up reading level. Malay, Mandarin or Tamil translations are a natural next step for Malaysia.
- **Depictions of Jesus.** The prototype includes dramatised dialogue for Jesus drawn from the gospel text. Some traditions prefer not to portray Him in a game at all — an easy toggle if you prefer the "observe the disciples" framing.

---

## Project layout

```
index.html · manifest.webmanifest · sw.js     app shell, PWA + offline cache
src/styles.css                               mobile-first portrait design system
src/main.js                                  router, input, toasts
src/core/{state,audio,util,bus}.js           save, SFX, helpers
src/data/chapters.js                         ALL story content — edit this to add chapters
src/data/compendium.js                       virtues, callings, fruits, relics, seals
src/screens/{home,world,story,modals}.js     UI + story engine
assets/art/*.jpg                             7 original illustrations
assets/icons/*                               app icons (regenerate: npm run icons)
assets/fonts/*                               tiny Noto Sans Symbols subsets (SIL OFL 1.1)
tools/{serve,validate,smoke,build-www}.js    dev server, tests, native bundle
docs/*                                       design + deployment guides
```

Everything saves to `localStorage` on the device. There is no account and no server — which also makes privacy compliance very simple.

**Credits / licences.** Artwork was generated for this project. App icons are drawn by `tools/make_icons.py`. The decorative symbol glyphs use subsets of **Noto Sans Symbols 1 & 2** (SIL Open Font License 1.1 — full text in `assets/fonts/OFL-Noto-Sans-Symbols.txt`). Scripture quotations are from the King James Version (public domain).
