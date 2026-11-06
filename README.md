# My Note

Single-file notes app (`www/index.html`) with reminders, voice typing, light/dark themes and Turso backup.

```
npm install
npx playwright install chromium
npm run serve      # http://localhost:5173
npm test           # 56 smoke checks (set TURSO_URL + TURSO_TOKEN to test the cloud DB too)
```

Deploy: `vercel --prod` (serves `www/`). Android: Capacitor, see `ANTIGRAVITY_PROMPT.md` for the full ship-and-test runbook.
Logo/icons: `assets/` (Capacitor assets) and `www/icons/` (web).
