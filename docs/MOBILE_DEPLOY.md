> **v0.6 更新**：离线缓存升级为 `covenant-v8`。新增 `src/data/mirror.js`、`src/data/deeper.js`、`src/data/portraits.js`（已在缓存清单中）以及 `assets/art/portrait-jesus.jpg`；新增两个校验脚本 `tools/check-mirror.js`、`tools/check-redletter.js`（`npm run check:mirror` / `npm run check:redletter`）。仍然**没有外部音频文件**。
>
> **v0.5 更新**：离线缓存升级为 `covenant-v7`。`src/core/audio.js` 重写为多声部自适应配乐（和弦进行、拨弦、对抗旋律、框鼓、卷积混响）——仍然**没有外部音频文件**，因此缓存清单无需新增资源。新增 `tools/check-audio.js`（`npm run check:audio`）。
>
> **v0.4.1 更新**：离线缓存升级为 `covenant-v6`；`src/core/audio.js` 新增程序化环境音乐（无外部音频文件，无需加入缓存清单）。
>
> **v0.4 更新**：离线缓存升级为 `covenant-v5`，新增 `src/engine/visual.js`、`src/engine/stages.js`、`src/data/portraits.js` 以及 6 张人物立绘——它们已全部加入缓存清单与 `www/` 构建。
>
> **v0.3 更新**：离线缓存升级为 `covenant-v4`，新增 `src/data/chapters-extra.js`、`src/data/quests.js`、`src/screens/camp.js` 以及 5 张章节插画——它们已全部加入缓存清单与 `www/` 构建。
>
> **v0.2 更新**：离线缓存升级为 `covenant-v3`，新增 `src/engine/`、`src/core/i18n.js` 与两个中文数据文件。

# Shipping Covenant on iOS and Android

You do **not** need two apps. This project uses one web codebase and **Capacitor** to produce two native store builds.

```
        src/ + assets/                 (one codebase)
              │
     npm run build:www  →  www/       (static bundle)
              │
      ┌───────┴────────┐
   ios/ (Xcode)     android/ (Gradle)
      │                  │
  App Store          Google Play
```

---

## Fastest public demo link (2 minutes, no Xcode)

If you just want a shareable link for people to try on their phones, skip native builds:

1. Push this branch (already done).
2. In your repo open **Settings → Pages** (`https://github.com/fongway94/Covenant/settings/pages`).
3. Under **Build and deployment**, set Source to **Deploy from a branch**, pick branch
   `arena/c138bec0-covenant` and folder `/ (root)`, then Save.
4. After ~1 minute the game is live at **`https://fongway94.github.io/Covenant/`** — HTTPS,
   PWA-installable, offline-capable, and shareable with anyone.

A GitHub Actions workflow tried to enable Pages automatically but the Arena GitHub
integration token lacks the `pages:write` permission, so this one-time click has to be
done by you in the browser. Everything else is already in place (the branch contains
`index.html` at its root plus `.nojekyll`).

For a completely server-free demo, `npm run build:single` produces
`Covenant-offline.html` — one 2.5 MB file with all art, fonts and code inlined. Send it
by WhatsApp/AirDrop and open it in a mobile browser; it needs no internet at all.

> Note: the `…e2b.app` sandbox preview URL is protected by a private
> `e2b-traffic-access-token` header, so it only works inside Arena's own preview panel —
> it cannot be shared as a plain link.

## Stage 0 — PWA (already done, zero cost)

`index.html` + `manifest.webmanifest` + `sw.js` make the game installable and fully offline.

- **Android / Chrome:** menu → *Add to Home screen / Install app*.
- **iPhone / Safari:** Share → *Add to Home Screen*. It launches full-screen with its own icon and splash colour.

Requirements to test properly: serve over **HTTPS** (or localhost). The live preview here is HTTPS. Service workers do not register on plain HTTP.

**This is the fastest way to test the idea with real users.** Put a QR code on a slide at church, get 30 teenagers to play, and watch what they actually do before spending money on store accounts.

---

## Stage 1 — Prerequisites

| | iOS | Android |
|---|---|---|
| Machine | **macOS** with Xcode (a Mac is required by Apple) | macOS, Windows or Linux |
| IDE | Xcode 15+ | Android Studio (Ladybug or newer) |
| SDK | iOS 15+ target | Android API 24+ (Android 7.0) |
| Developer account | Apple Developer Program — **US$99/year** | Google Play Console — **US$25 one-time** |
| Signing | App Store Connect + certificates | a generated upload keystore (keep it safe!) |

You cannot build the iOS binary on Windows/Linux. If you do not own a Mac, use a cloud CI service (GitHub Actions macOS runner, Codemagic, Bitrise) — see Stage 4.

---

## Stage 2 — One-time setup

```bash
# 1. Install dependencies (Capacitor CLI, core and the test tools)
npm install

# 2. Generate the native projects (creates ios/ and android/, both gitignored here)
npm run cap:add:ios       # Mac only
npm run cap:add:android

# 3. Every time you change src/, data or artwork:
npm run cap:sync          # rebuilds www/ and copies it into both native projects
```

`capacitor.config.json` is already set:

```json
{
  "appId": "com.covenant.journeys",
  "appName": "Covenant",
  "webDir": "www"
}
```

**Change `appId` to something you own** (reverse-domain, e.g. `org.yourchurch.covenant`) before creating the store listings — it cannot be changed after upload.

---

## Stage 3 — Build and submit

### iOS

```bash
npm run cap:sync
npm run cap:open:ios      # opens Xcode
```

In Xcode:
1. Select your team under **Signing & Capabilities**; set a unique Bundle Identifier.
2. Set **Deployment Target** to iOS 15.0+, and device family to iPhone + iPad if you want tablets.
3. Add launch screen / app icon set (export `assets/icons/icon-512.png` into the asset catalogue).
4. **Product → Archive → Distribute App → App Store Connect.**
5. In App Store Connect: fill in the description, screenshots (6.5" and 6.9" iPhone required), keywords, age rating, and the **privacy nutrition label**.

**Privacy answer:** this prototype collects nothing — no account, no analytics, no network calls, no third-party SDKs. Everything is stored in `localStorage` on the device. That means a very short privacy policy and "Data Not Collected" for most categories. If you add analytics or ads later, this changes.

### Android

```bash
npm run cap:sync
npm run cap:open:android  # opens Android Studio
```

In Android Studio:
1. **Build → Generate Signed Bundle / APK → Android App Bundle (.aab)**. Create an upload keystore and store it somewhere safe (losing it means you cannot update the app).
2. Upload the `.aab` to Google Play Console.
3. Complete the **Data safety** form (again: no data collected), content rating questionnaire, target audience (important if aimed at children), and store listing with a 512×512 icon, feature graphic and phone screenshots.
4. Release to **Internal testing** first (up to 100 testers), then closed/open testing, then production.

---

## Stage 4 — Automation (recommended once you are iterating)

A GitHub Actions workflow can produce store builds on every tagged release. Sketch (Android on Ubuntu, iOS on a macOS runner):

```yaml
jobs:
  android:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22 }
      - uses: actions/setup-java@v4
        with: { distribution: temurin, java-version: 17 }
      - run: npm ci
      - run: npm run cap:sync
      - run: cd android && ./gradlew bundleRelease   # sign with ${{ secrets.KEYSTORE }}
  ios:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22 }
      - run: npm ci && npm run cap:add:ios && npm run cap:sync
      - run: xcodebuild -workspace ios/App/App.xcworkspace -scheme App -archivePath App.xcarchive archive
```

Keep signing keys and App Store Connect API keys in GitHub Secrets — never in the repository.

---

## Store-review notes specific to a Bible game

- **Religious content is allowed** on both stores. It must not be hateful toward other groups. The Good Samaritan chapter (which explicitly challenges prejudice) is a good example of the tone to keep.
- **Age rating.** Current content includes battle, a den of lions, a beaten traveller and a decree of execution — all described, not graphically depicted. Expect **12+ / Teen**. If you target under-13s, both stores have extra children's privacy rules.
- **Intellectual property.** KJV is public domain in most territories (note: the UK has historical Crown copyright considerations — check before commercial distribution there). WEB is explicitly public domain. Generated artwork is yours; if you later use stock art or a modern translation, keep the licences in `docs/`.
- **No "loot boxes" or gambling.** Not used here. If you ever add randomised rewards, both stores require disclosure.
- **Offline by default** is a genuine selling point for churches in areas with poor connectivity — mention it in the store description.

---

## Native polish checklist (Capacitor plugins)

These are optional but make the wrapper feel like a real app:

| Need | Plugin |
|---|---|
| Splash screen / status bar | `@capacitor/splash-screen`, `@capacitor/status-bar` |
| Android back button | `@capacitor/app` — handle `backButton` to navigate screens instead of exiting |
| Haptics on choices | `@capacitor/haptics` |
| Local notifications for a daily verse | `@capacitor/local-notifications` |
| Share a verse card | `@capacitor/share` |
| In-app review prompt | `@capacitor/in-app-review` |
| Safe-area / keyboard | already handled in CSS; `@capacitor/keyboard` config is in `capacitor.config.json` |

> **Android back button is the one real gap in the web prototype.** Browsers and PWAs don't intercept it. Add the `@capacitor/app` listener when you wrap the app:
>
> ```js
> import { App as CapApp } from '@capacitor/app';
> CapApp.addListener('backButton', ({ canGoBack }) => {
>   if (ui.modal) { ui.modal = null; render(); }
>   else if (ui.view === 'story') { ui.modal = { type: 'leave' }; render(); }
>   else if (ui.view !== 'map' && ui.state) go('map');
>   else CapApp.exitApp();
> });
> ```

---

## Rough cost & time estimate (solo developer / small church team)

| Item | Cost | Time |
|---|---|---|
| Domain + hosting for PWA | US$10–20/year | 1 hour |
| Apple Developer Program | US$99/year | — |
| Google Play Console | US$25 one-time | — |
| Store assets (screenshots, feature graphic) | free with Canva/Figma | 1 day |
| First native build + signing setup | free | 1–2 days (mostly waiting on Xcode) |
| App review | included | 1–7 days |
| **Total to launch both stores** | **~US$150 first year** | ~1 week part-time |

The expensive part is not the technology — it is writing and theologically reviewing more chapters. `docs/ROADMAP.md` breaks that into phases.
