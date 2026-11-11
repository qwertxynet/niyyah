<div align="center">

<a href="https://qwertxynet.github.io/niyyah/"><img src="docs/readme/banner.png" alt="Niyyah — a calm prayer companion, built around how ADHD and autistic minds actually work" width="100%"></a>

<br>

**[Open the app](https://qwertxynet.github.io/niyyah/)** &nbsp;·&nbsp; [What it does](#-what-it-does) &nbsp;·&nbsp; [Get it](#-where-the-builds-are) &nbsp;·&nbsp; [Build it](#-development)

<br>

[![Live](https://img.shields.io/badge/live-qwertxynet.github.io%2Fniyyah-14503e?style=flat-square&logo=githubpages&logoColor=white)](https://qwertxynet.github.io/niyyah/)
![Android](https://img.shields.io/badge/Android-widget%20%2B%20APK-3ddc84?style=flat-square&logo=android&logoColor=white)
![iPhone](https://img.shields.io/badge/iPhone-Add%20to%20Home%20Screen-111111?style=flat-square&logo=apple&logoColor=white)
![Windows](https://img.shields.io/badge/Windows-installer-0078d4?style=flat-square&logo=windows11&logoColor=white)
<br>
![Offline](https://img.shields.io/badge/network%20at%20runtime-none-c39a55?style=flat-square)
![Tracking](https://img.shields.io/badge/accounts%20%26%20analytics-none-c39a55?style=flat-square)
![React](https://img.shields.io/badge/React%2019-TypeScript-3178c6?style=flat-square&logo=typescript&logoColor=white)

</div>

<br>

> [!NOTE]
> **Niyyah** (نِيَّة) means *intention*. It is a prayer app built around how ADHD actually fails —
> time blindness, prospective memory, task initiation and emotional regulation — and around
> autistic needs for calm, predictable, literal interfaces. One React + TypeScript codebase runs as
> an **Android app**, a **Windows program**, an **iPhone home-screen app** and a **web app**.
>
> Nothing you do leaves the device. No account, no analytics, no server, **no network request at runtime**.

<br>

## 🌅 A living sky

The whole app takes the colour of the sky outside, so you can tell which prayer it is at a glance —
a quiet answer to time blindness. The Today card shows the day as a sun (or moon) travelling an arc
past the five prayers. Low-stimulation mode turns it all into one flat, calm tint.

<p align="center"><img src="docs/readme/sky.png" alt="The Today screen at Fajr, Dhuhr, Asr, Maghrib and night, each in its own sky colour" width="100%"></p>

## ✨ What it does

<p align="center"><img src="docs/readme/features.png" alt="The Hasanat, Qibla and Journal screens" width="100%"></p>

<table>
<tr>
<td width="50%" valign="top">

### 🧭 Adapts to you
An optional name, then three optional questions — your relationship with Islam; whether you
are autistic, ADHD (both = AuDHD), neurotypical or unsure; and what gets in the way. They suggest
low-stimulation mode, minutes-only countdowns, transition warnings (wrap up → wudu → adhan),
plain wording, a gentle / encouraging / minimal tone and learning support. **Every change says
why, and each one can be reversed** in Settings → Comfort & support.

</td>
<td width="50%" valign="top">

### ⏳ Windows, not just clock times
Every prayer shows the deadline you are racing — *"Asr · 1h 02m left"* — with a bar that turns
amber under 20 minutes and a live countdown to the next adhan. **One-tap logging** (*Prayed*,
*Prayed late*, *Not today*), always undoable. A gentle **catch-up card** asks "Did you pray
Maghrib?" when a window closes unlogged.

</td>
</tr>
<tr>
<td valign="top">

### 🔔 Reminders that arrive
Alarms are scheduled 30 days ahead, a pre-alert (5–30 min) warns you before the window, and
notifications survive reboots on Android. Settings → Reminder health shows exactly what is armed.

</td>
<td valign="top">

### 📱 Home-screen widget
On Android: the current window with a live countdown to its end, and today's five times. Once
you log the prayer it counts down to the next adhan. Runs off a 30-day schedule, so it stays right
without opening the app.

</td>
</tr>
<tr>
<td valign="top">

### 🕋 Qibla compass
A dial that turns with your phone, a Kaaba marker, and a gold glow (plus one buzz) when you face
it. Without a compass it shows the bearing from north.

</td>
<td valign="top">

### 🌟 Hasanat, as encouragement
Estimates hasanat from your logged prayers (al-Fatihah in every rak'ah, plus any verses you
record, ×27 in jama'ah) and offers good-deed cards from one minute to a full juz', with a tap
counter for dhikr. **It always says that only Allah knows the reward**; the method and sources
sit behind "How is this estimated?".

</td>
</tr>
<tr>
<td valign="top">

### 📓 A journal with prompts
Check-ins (mood and energy in two taps), after-prayer reflections, gratitude, duas you can later
mark answered, and an intention for tomorrow. One prompt at a time — right after you log a
prayer, it asks about that prayer.

</td>
<td valign="top">

### 🤍 A record, not a scoreboard
A week grid you can correct by tapping any cell. No broken streaks, no red crosses, no scolding
copy. An optional make-up (qada) counter, framed as mercy rather than debt. Hijri date beside the
Gregorian, light and dark themes, 12/24-hour clock, 48 px tap targets.

</td>
</tr>
</table>

## 📴 Offline, concretely

| Need | How |
| --- | --- |
| Prayer times | Computed on device with [`adhan`](https://github.com/batoulapps/adhan-js). No API, no key. |
| Qur'an letters | `public/quran-meta.json` — letter counts per ayah (no text) from the Tanzil text, 28 KB, loaded on demand. |
| City search | `public/cities.json` — 3,429 cities with coordinates and IANA timezones (GeoNames), bundled. 292 KB raw / 110 KB gzipped, loaded on demand. |
| Fonts & icons | Amiri (Arabic), Fraunces and Figtree (Latin) bundled as `.woff2` (SIL OFL, licences in `public/fonts/`); all icons inline SVG. No CDN. |
| History & settings | `localStorage`, on the device. Export/import a JSON file to move between phone and PC. |
| Browser build | `public/sw.js` precaches the shell and city list, so a reload works in airplane mode. |
| Timezones | Times are shown in the chosen **place's** clock (per-city IANA zone), and the app says so when that differs from your device clock. |

Verify it yourself: load the app once, then turn Wi-Fi off and reload. The only
`http://` string in the built CSS/HTML is the SVG namespace.

## 📦 Where the builds are

| Platform | File | Notes |
| --- | --- | --- |
| Windows (installer) | `dist-app/Niyyah Setup 1.0.0.exe` | Per-user install, no admin needed. Creates a Start-menu shortcut and starts with Windows (toggle in Settings). |
| Windows (portable) | `dist-app/Niyyah 1.0.0.exe` | Single file, no install. |
| Android | `dist-app/Niyyah-1.0.0.apk` (Gradle's own copy: `android/app/build/outputs/apk/release/app-release.apk`) | Signed with `android/niyyah-release.keystore`. Sideload by tapping the file (allow "install unknown apps"). |
| Browser | `npm run preview` after `npm run build` | Installable PWA; reminders only fire while the tab is open. |
| iPhone & web | https://qwertxynet.github.io/niyyah/ | Deployed by `.github/workflows/pages.yml` on every push to `main`. In Safari: Share → **Add to Home Screen**. Works offline; reminders only fire while it is open. |

<details>
<summary><b>Android first-run checklist</b></summary>


1. Install the APK and open Niyyah.
2. Allow notifications when asked (Android 13+).
3. Settings → Apps → Niyyah → **Battery → Unrestricted**.
4. Samsung/Xiaomi/Oppo/Vivo: also allow **Auto-start**.
5. Settings → Apps → Niyyah → **Alarms & reminders → allow** (needed for exact times).
6. In Niyyah → Settings → **Send test** to confirm a nudge arrives.

Settings → Reminder health shows permission state, exact-alarm state and how many
alerts are armed. If exact alarms are denied, Niyyah says so instead of pretending.

</details>

## 🔧 Development

```bash
npm install
npm run dev            # browser preview with hot reload (http://127.0.0.1:5173)
npm run typecheck      # tsc --noEmit
npm run build          # typecheck + production bundle into dist/
npm run preview        # serve the production build

npm run electron:start # build + run the Windows shell locally
npm run windows:build  # installer + portable into dist-app/

npm run cap:sync       # build + copy web assets into android/
npm run android:apk    # Gradle release APK (needs the Android SDK + JDK 21)
```

Regenerate bundled assets (network needed once):

```bash
npm run icons    # rasterises public/icon.svg + assets/mark.svg
npm run cities   # rebuilds public/cities.json from a GeoNames dump
npm run quran    # rebuilds public/quran-meta.json from the Tanzil text (URLs in the script)
```

The README images are real screenshots: with `npm run dev` running, `npm run readme:images -- http://localhost:5173`
loads the app with demo data and a fake clock for each sky phase, then lays the shots out from `scripts/readme/`.

`scripts/get-android-sdk.mjs` installs a user-local Android SDK (platform 36,
build-tools 36.0.0, platform-tools) without administrator rights.

### Signing key

`android/keystore.properties` holds the password for
`android/niyyah-release.keystore` (alias `niyyah`). Keep both together: losing them
means the Play Store (or an update path) can no longer accept builds signed with that
identity. They are personal-use credentials for sideloading, not store credentials.

## 🧱 Architecture

```
src/domain/    prayer engine, formatting, persistence, reminder builder, notification drivers
src/ui/        screens and components, identical on every platform
electron/      main.cjs (app:// protocol, tray, toasts, autostart) + preload.cjs
android/       Capacitor project; SCHEDULE_EXACT_ALARM and POST_NOTIFICATIONS from the plugin
public/        cities.json, service worker, manifest, icons, Amiri font
```

`src/domain/notify.ts` picks a driver at runtime: Capacitor local notifications on
Android, IPC to the Electron main process on Windows, in-page timers in a browser.
State lives in one `localStorage` key (`niyyah.state.v1`), so all three platforms
share the same model.

<details>
<summary><b>Verification performed</b></summary>


- Prayer times compared with Aladhan for London, Makkah and New York on two dates:
  30 comparisons, all within 2 minutes except a 3-minute Asr difference in London and
  the London midsummer Fajr/Isha, which is the high-latitude convention (adhan's
  "middle of the night" default vs Aladhan's seventh-of-the-night). Both rules are
  selectable in Settings.
- `tsc --noEmit` clean, production build clean.
- Setup, logging, undo, catch-up, week grid, settings and timezone display exercised
  in the browser preview.
- Android and Windows notification delivery need one real-device check: I cannot see
  a phone screen or a native toast from here.

</details>

## 🗺️ Not in 1.0

Post-salah adhkar reminders, encrypted sync
between devices, a Play Store listing, a native iOS build (the web app installs on iPhone today).

## 🙏 Credits

Prayer calculations by [adhan-js](https://github.com/batoulapps/adhan-js) (MIT).
City data from [GeoNames](https://www.geonames.org/) (CC BY 4.0).
Qur'an letter counts derived from the [Tanzil Project](https://tanzil.net) text (simple-clean), used unchanged for counting.
Amiri, Fraunces and Figtree typefaces (SIL Open Font License; licences in `public/fonts/`).

<div align="center"><br><sub>Made with care, for the moments between intention and action.</sub></div>
