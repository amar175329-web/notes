# Task for Antigravity: ship "My Note" (GitHub → Vercel → APK), test everything

You are an autonomous engineer. Work end to end and do not stop at the first problem: fix it, retest, continue. Ask me only for things you truly cannot do yourself (logins, tokens), and ask for all of them **once, at the start**.

## What this project is
`My Note` is a notes app built as one static file: `www/index.html` (HTML + CSS + JS, no build step).
Features: text / checklist / voice / draw / chat notes, labels, pin, calendar, reminders with a custom date-time picker, live clock + next-reminder countdown, light and dark theme, backup to a Turso (libSQL) database over its HTTP API (`/v2/pipeline`), backup to the phone (Capacitor Filesystem, `Documents/MyNote/mynote-backup.json`), Hindi + English voice typing (`mic()`, `hi-IN`).

Project layout:
- `www/` web app (index.html, manifest.webmanifest, icons/)
- `assets/` icon-only.png, icon-foreground.png, icon-background.png, splash.png, splash-dark.png (the new logo)
- `capacitor.config.json` (appId `com.aj.mynote`, webDir `www`)
- `vercel.json` (serves `www/`, no build)
- `tests/smoke.js` Playwright smoke tests (56 checks, all pass locally on the web build)

## Label names were changed on purpose (do not revert)
The owner asked for clearer wording. Current names: "Ticked items go to bottom" (checklists), "Reminder notifications" (button "Allow"/"Allowed"), "Notes on this phone", "Widget previews", "Delete all notes", "Numbered list" (was Points), "Sending as: Me / Other" (chat), Data & backup: "Connect & test", "Back up to cloud", "Restore from cloud", "Back up to phone", "Restore from phone", "Auto-backup to cloud", "Auto-backup to phone", "Save backup file", "Open backup file", "Copy backup text", "Paste backup text", "not backed up", "Not connected / Connected". If you find any other label a first-time user could misunderstand, report it and propose a clearer one (do not rename silently).

## Hard rules
1. **Do not redesign.** Keep the current look: light theme is all white, dark theme is all black, Geist / Geist Mono fonts. Only fix real bugs.
2. **The logo is final.** The app start (splash) and the Android launcher icon must use the supplied logo (`assets/`). Do not regenerate or restyle it.
3. **Never commit secrets** (Turso token, keystore, passwords). Use environment variables / `.env` (git-ignored) / the app's own Settings screen.
4. Every claim in your final report must come from a test you actually ran. If something could not be tested, say so plainly.
5. **Verify EVERY feature, no exceptions.** Build the full feature inventory first (Step 1b) and give each feature its own test and its own row in the final report. A feature with no test is a failure of this task.

## Zero-gaps testing policy (owner's explicit instruction)
Test **everything**, every feature, every setting, every screen, so there are no surprises later. Pay special attention to what a browser sandbox cannot prove, because nobody has tested it for real yet. These MUST be tested by you on a real Android emulator or device (not mocked):
1. **Voice typing** with a real speech engine: Hindi sentence, English sentence, mixed Hinglish, permission granted / denied / "don't ask again", offline behaviour, tapping the mic twice, voice in plain notes AND chat notes AND the "Voice" new-note type.
2. **Reminder alerts**: enable them through the real Android permission prompt; set reminders 1, 2 and 5 minutes ahead; verify the notification fires with the screen off, with the app in background, **after the app is swiped away from recents**, and **after a device reboot**; tap the notification (opens the right note); Snooze and Done; daily / weekly / monthly repeats fire again; editing or removing a reminder cancels the old alarm; locked notes must not leak their text in the notification. Many phone brands (Oppo, Realme, Xiaomi, Vivo, OnePlus) kill background apps: check battery-optimization behaviour and, if alarms are unreliable, add a one-time prompt to the app that sends the user to the "Ignore battery optimizations / Allow background activity" setting, then re-test.
3. **Settings > "Ticked items go to bottom"** (On / Off): in a Checklist note with 4 items, tick the first one. On = the ticked item jumps to the bottom of the list; Off = it stays where it is; the choice survives closing and reopening the app and a backup restore. Also test unticking, adding items with Enter, deleting items, and Points / Plain text modes.
4. Backup to phone (Filesystem) and Turso over real mobile data and Wi-Fi, restore after uninstall + reinstall.
5. Camera / gallery / file attach, share sheet, clipboard (recovery code copy), status bar and navigation bar colours, native splash + launcher icon, back button, keyboard, rotation lock, notch / gesture-bar safe areas, Hindi text rendering, large font size setting, TalkBack basics (buttons have labels).
6. GitHub, Vercel and APK delivery themselves (links open, APK installs on a clean emulator).

If any item cannot be tested for a real, specific reason, say exactly why in the report; do not silently skip it.

## Step 0 – Prerequisites (check, then ask me once for anything missing)
Check: `git`, `gh` (GitHub CLI, logged in), `node` ≥ 18, `npm`, `vercel` CLI (logged in), `turso` CLI (logged in), JDK 17, Android SDK (`ANDROID_HOME`, platform-tools, build-tools, one platform, emulator + a system image), `adb`.
Install what you can. For logins, tell me the exact command to run (`gh auth login`, `vercel login`, `turso auth login`).

## Step 1 – Baseline
1. `npm install` then `npx playwright install chromium`.
2. `npm run serve` (port 5173) in the background, then `npm test`. All 56 checks must pass before you change anything. Screenshots land in `test-output/`.

## Step 1b – Feature inventory (mandatory, before any fixing)
Read `www/index.html` and build `FEATURES.md`: **every** feature, button, setting and screen in the app, one line each, with how you will test it (Playwright on the web build, adb/UIAutomator on Android, or both). Generate it from the code, do not rely on my list: grep every `data-*` attribute handled in the main click handler, every `id` in the HTML, every Settings row, every sheet/dialog (`dlg(`), every toast message, every `localStorage`/Filesystem/Turso call.
Starting list (not exhaustive): first-run name screen; Home grid/list switch; sort; search (text, dates, labels); label chips incl. Pinned, Trash, Archive; new note types (Plain text, Points, Checklist, Chat, Voice, Draw) and templates; edit/auto-save; pin; colour label; label picker; archive/unarchive; lock note with PIN; attach image/file/camera; copy text; share; delete → undo → Trash → restore/empty trash; reminder quick chips; **custom date picker and time picker** (month arrows, selected day, AM/PM, Set/Clear/Cancel, remove reminder); natural-language reminders ("kal 9 baje", Hinglish, Hindi digits); snooze / done; Reminders screen (Missed, Upcoming); Calendar (month arrows, Today, per-day notes, dots); live clock bar on Home; app lock (4-digit PIN: set, wrong PIN, unlock, remove); name; theme Light/Dark; "Ticked items go to bottom"; reminder notifications permission (button "Allow"); Data & backup (Turso save & verify, disconnect, back up now, restore, auto-backup; phone Save backup file, Open backup file, Copy backup text, Paste backup text, auto-backup to Documents, back up/restore from phone); Widget previews; import .txt file; Delete all notes; chat note bubbles; draw canvas (pen colours, clear, add to note); voice typing; toasts; empty states; splash + logo; PWA manifest/icons.

**Per-note password + 3-dot menu (new, verify every path on the web AND on the APK):**
- Editor header has a **⋮ menu** (`#more`) with: Set password (or Change / Remove / Forgot password when the note is locked), Pin/Unpin, Archive/Unarchive, Attach photo or file, Copy text, Share (`navigator.share`, falls back to copy), Delete note. The old top Delete button is hidden (Delete lives in the menu); the "Set password / Password options" chip in the editor opens the same flow.
- Set password: min 4 characters, confirm must match, optional hint, then a **one-time recovery code** (`XXXX-XXXX`) with Copy / "I saved it" (test the Android clipboard).
- Locked notes show "Locked" on Home, are excluded from search text, widgets and thumbnails, and ask for the password when opened. Wrong password → error; 5 wrong tries → 30-second wait; "Show hint"; Enter key submits.
- Forgot password: hint shown; reset with the recovery code (case/space/dash tolerant) → new password + new code; reset with the app-lock PIN when one is set; last resort "Delete this note instead" (confirm, deletes for good incl. attachments).
- Change password (needs current), Remove password (needs current). Legacy notes locked with the old global 4-digit PIN (`S.pin`) must still open and can be upgraded.
- Passwords are salted SHA-256 (`crypto.subtle`; make sure it works in the Android WebView, which is a secure context under `https://localhost`). The text is only hidden, not encrypted: confirm backups/exports still work and that restoring a backup keeps locked notes locked with the same password.
- Android: back button closes the sheet first; soft keyboard does not hide the buttons; password manager/autofill does not store the note password; screenshots of locked notes (optional: FLAG_SECURE is NOT required).

**Recent changes that must be re-verified explicitly:**
- The Home live clock shows **12-hour time with AM/PM** (e.g. `6:24:03 PM`), never 24-hour.
- The **"Next reminder" block is hidden when there is no upcoming reminder** (no "None" text); it appears with a live countdown when a future reminder exists; shows "N overdue" only if reminders are overdue.
- Singular/plural wording everywhere ("1 note", "1 word", "1 file").
- Note colour swatches and draw pen swatches show their real colours in both themes.
- "Unsynced" count is 0 when no cloud database is connected.
- Light theme: every surface is white. Dark theme: every surface is black (check Home, editor, sheets, date/time picker, toasts, Settings, Data & backup, splash, system bars). Text/icons stay readable.

## Step 2 – Turso (cloud database)
1. `turso db create my-note` (or reuse it if it exists).
2. Get the URL: `turso db show my-note --url` (it starts with `libsql://`; the app converts it to `https://`).
3. Create a token: `turso db tokens create my-note`.
4. Put them in `.env` as `TURSO_URL` / `TURSO_TOKEN` (never commit). Run `TURSO_URL=… TURSO_TOKEN=… npm test`; the check "Turso reachable from the browser (CORS + token)" must pass.
5. Then test the **real in-app flow** with Playwright: Settings → Data & backup → connect with the URL + token → back up → wipe local notes → restore → verify the same notes come back. Also test a wrong token (the app must show a clear error, not crash) and offline (clear message).
6. Tell me the Turso URL and how I should enter the token inside the app. Do not print the token in logs or the final report.

## Step 3 – Things that do NOT work in a plain browser/WebView: implement and test them
The web build passes, but these will fail or silently do nothing in the Android app. Fix each one, keeping the UI unchanged:

**a) Voice typing.** `mic()` in `www/index.html` uses `SpeechRecognition` / `webkitSpeechRecognition`, which the Android WebView does not provide, so the app only shows "Voice typing is not supported". Install `@capacitor-community/speech-recognition` and, when `window.Capacitor?.isNativePlatform()`, use it (`requestPermissions`, `available`, `start` with `language: 'hi-IN'`, `maxResults: 1`, `partialResults: false`), appending the result exactly as the web path does (into `#b`, or `#cin` for chat notes) and toggling the `.rec` class on `#mic`. Keep the web path for browsers. Add `RECORD_AUDIO`. Also make a second tap on the mic stop listening (currently it starts another session). Test: Hindi phrase, English phrase, a mix, permission denied, tapping twice.

**b) Reminder notifications.** The app uses the web `Notification` API, which does not work in the Android WebView, so reminders will not ring when the app is closed. Install `@capacitor/local-notifications`. When a reminder is set / changed / removed / marked done / snoozed, schedule / update / cancel the matching local notification (stable numeric id per note). Handle `POST_NOTIFICATIONS` (Android 13+) and exact alarms (`SCHEDULE_EXACT_ALARM`, Android 12+); the existing "Notifications are off – Allow" banner (`[data-notif]`) must request the native permission. Reschedule after device reboot. Test on the emulator: set a reminder 1–2 minutes ahead, close the app, confirm the notification fires, tap it and confirm the right note opens.

**c) Phone backup (Filesystem).** `FS()` uses `Capacitor.Plugins.Filesystem`. Install `@capacitor/filesystem`. Verify "Back up to this phone" and "Restore from this phone" really write/read `Documents/MyNote/mynote-backup.json` on Android 13/14/15 (scoped storage), including after reinstall. Fix the `if(fresh&&FS())devRead()` first-run restore prompt if it misbehaves.

**d) System bars + splash.** `chrome()` calls `StatusBar` and `NavigationBar` plugins. Install `@capacitor/status-bar` (and a navigation-bar color plugin only if the nav bar color cannot be set another way). Status bar and navigation bar must be pure white in light theme and pure black in dark theme, with correct icon contrast, and switching theme in the app must update them live. Splash: native splash (white / black by system theme) uses the logo, then the in-app splash shows the same logo – there must be no white flash in dark mode.

**e) Other WebView checks.** Image/video attach (file input), camera/gallery permission, share/export of backup JSON, back button behavior (closes sheets, then editor, then app), keyboard not covering the editor, safe-area insets (notch / gesture bar), landscape lock to portrait, Hindi text rendering.

## Step 4 – GitHub
1. `git init`, commit (`Initial commit: My Note`), `gh repo create my-note --private --source . --push` (ask me only if I want it public).
2. Make sure `.gitignore` is respected (no keystore, `.env`, `node_modules`, APK).

## Step 5 – Vercel
1. `vercel link` then `vercel --prod` (output dir is `www`, no build).
2. Optionally connect the GitHub repo to the Vercel project so pushes redeploy.
3. Run `BASE_URL=<live url> npm test` against the **live URL** and open it in Chromium with a mobile viewport. Confirm: no errors, manifest and icons load (200), the page is installable as a PWA, light and dark both correct.
4. Give me the live link.

## Step 6 – Android APK
1. `npm i @capacitor/core @capacitor/cli @capacitor/android` plus the plugins from Step 3 (use current versions), `npx cap add android`.
2. `npm run assets` (generates launcher icons + native splash from `assets/`), `npx cap sync android`.
3. Set min/target SDK to current Play requirements, `versionName 1.0.0`, `versionCode 1`, portrait only, app name "My Note", permissions: INTERNET, RECORD_AUDIO, POST_NOTIFICATIONS, SCHEDULE_EXACT_ALARM, RECEIVE_BOOT_COMPLETED.
4. Build a **debug APK** (`./gradlew assembleDebug`). Also create a **release APK** signed with a new keystore (store it outside git, tell me where it is and to back it up; never print the passwords).
5. Start an emulator (or use my device via `adb`) and install the APK.

## Step 7 – Test the APK on the emulator/device (this is the real test)
Every line of `FEATURES.md` must be tested on the APK (or on the web build when it is purely web logic, and then re-checked on the APK for regressions). Run and screenshot each, in light AND dark system theme. At minimum:
- Launch: native splash with the logo, in-app splash, first-run name screen, Home.
- Launcher icon shows the logo correctly (adaptive icon, not clipped).
- Create text / checklist / voice / draw / chat notes; edit; pin; label; delete + undo; search; sort/grid switch.
- Custom date and time picker; reminder fires as a notification while the app is closed; snooze / done.
- **Voice typing in Hindi and English** (use the emulator's virtual microphone or a real device); mic stop on second tap.
- Calendar, Reminders, Settings, theme switch (white-only / black-only, system bars follow).
- Backup/restore to the phone and to Turso (real network), wrong token, airplane mode.
- Rotate, background/foreground, kill and reopen (data persists), reboot (reminders still scheduled).
- `adb logcat` has no uncaught JS or native errors.
Any failure → fix → rebuild → retest. Repeat until everything passes or you hit something you truly cannot do (then explain exactly why).

## Step 8 – Deliver
Create a GitHub Release `v1.0.0` with the APK attached (`gh release create v1.0.0 <apk> --notes …`). Copy the APKs to `./deliverables/` as well.

Final report (keep it short, in simple Hinglish):
1. **GitHub repo link**
2. **Vercel live link**
3. **APK download link** (GitHub Release) + local path of `my-note-debug.apk` and `my-note-release.apk`
4. **Turso**: database URL (no token) and how to connect inside the app
5. **Test table**: one row for **every** feature in `FEATURES.md` (web and Android columns) with PASS / FAIL / NOT TESTED and one line of evidence; `NOT TESTED` is allowed only with a concrete reason. Include the totals (e.g. 94/96 passed) and the screenshots folder. Also commit your extra tests to `tests/` so I can re-run them.
6. **What you changed** in `www/index.html` (voice, notifications, filesystem, bars) as a short list
7. **Anything I must do** (e.g. back up the keystore, allow notification permission on first run)
