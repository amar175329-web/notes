// Smoke tests. Usage: BASE_URL=http://localhost:5173 node tests/smoke.js
// Optional: TURSO_URL (https://... or libsql://...) + TURSO_TOKEN to test the cloud database from the browser.
const { chromium } = require('playwright');
const fs = require('fs');
const BASE = process.env.BASE_URL || 'http://localhost:5173';
const OUT = 'test-output'; fs.mkdirSync(OUT, { recursive: true });
const rows = []; const rec = (name, ok, info = '') => { rows.push({ name, ok, info }); console.log((ok ? 'PASS ' : 'FAIL ') + name + (info ? ' - ' + info : '')); };
(async () => {
  const b = await chromium.launch();
  for (const theme of ['light', 'dark']) {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
    const p = await ctx.newPage(); const errs = [];
    p.on('pageerror', e => errs.push(e.message));
    await p.addInitScript(t => {
      try { localStorage.setItem('notes-v2', JSON.stringify({ theme: t, view: 'grid', user: 'Aj', nid: 1, notes: [] })); } catch (e) {}
      // Voice mock (headless Chrome has no speech engine): the real mic() code path is exercised.
      window.SpeechRecognition = window.webkitSpeechRecognition = function () { this.start = () => setTimeout(() => { this.onresult && this.onresult({ results: [[{ transcript: 'नमस्ते voice test' }]] }); this.onend && this.onend(); }, 150); this.stop = () => {}; };
    }, theme);
    await p.goto(BASE); await p.waitForTimeout(450); await p.screenshot({ path: `${OUT}/${theme}-1-splash.png` });
    await p.waitForTimeout(1800);
    rec(`[${theme}] splash goes away and Home shows`, await p.evaluate(() => !document.getElementById('splash') && document.querySelector('#home h1').innerText === 'Notes'));
    const bg = await p.evaluate(() => getComputedStyle(document.body).backgroundColor);
    rec(`[${theme}] page background is pure ${theme === 'light' ? 'white' : 'black'}`, bg === (theme === 'light' ? 'rgb(255, 255, 255)' : 'rgb(0, 0, 0)'), bg);
    await p.screenshot({ path: `${OUT}/${theme}-2-home.png` });
    rec(`[${theme}] clock shows 12-hour AM/PM and 'Next reminder' is hidden when there is none`, await p.evaluate(() => /^\d{1,2}:\d\d:\d\d$/.test(document.getElementById('lt').textContent) && /^(AM|PM)$/.test(document.getElementById('lap').textContent) && getComputedStyle(document.querySelector('.live .ln')).display === 'none'));
    await p.click('#n0'); await p.waitForTimeout(500); await p.click('[data-new=text]'); await p.waitForTimeout(700);
    await p.fill('#t', 'Test note'); await p.fill('#b', 'Kal shaam 6 baje Rahul ko call'); await p.waitForTimeout(400);
    rec(`[${theme}] note editor opens`, await p.evaluate(() => document.querySelector('.scr.on').id === 'editor'));
    rec(`[${theme}] colour swatches show real colours (not white)`, await p.evaluate(() => new Set([...document.querySelectorAll('.sw[data-sw]')].map(e => getComputedStyle(e).backgroundColor)).size > 4));
    rec(`[${theme}] word-count text is grammatical`, await p.evaluate(() => /\d+ words?$/.test(document.getElementById('when').textContent) && !/\b1 words\b/.test(document.getElementById('when').textContent)));
    await p.click('[data-pk=d]'); await p.waitForTimeout(500); await p.screenshot({ path: `${OUT}/${theme}-3-datepicker.png` });
    await p.click('.pkd:not(.sel) >> nth=20'); await p.click('[data-pkx=set]'); await p.waitForTimeout(400);
    await p.click('[data-pk=t]'); await p.waitForTimeout(400); await p.click('[data-pkh="7"]'); await p.click('[data-pka=PM]'); await p.click('[data-pkx=set]'); await p.waitForTimeout(400);
    const rq = await p.evaluate(() => document.getElementById('rq').innerText.replace(/\n/g, ' | '));
    rec(`[${theme}] custom date + time picker set the reminder`, /7:00 PM/.test(rq) && /Nov 2026/.test(rq), rq);
    await p.click('#mic'); await p.waitForTimeout(600);
    rec(`[${theme}] voice typing writes text into the note (mocked recognizer)`, await p.evaluate(() => document.getElementById('b').value.includes('voice test')));
    await p.click('#bk'); await p.waitForTimeout(600);
    rec(`[${theme}] note saved and card shown on Home`, await p.evaluate(() => document.querySelectorAll('.card').length === 1));
    // ---- 3-dot menu + per-note password ----
    const tx = () => p.evaluate(() => (document.querySelector('.toast') || {}).innerText || '');
    const dlgTxt = () => p.evaluate(() => document.getElementById('dlg').innerText);
    await p.click('.card'); await p.waitForTimeout(500);
    await p.click('#more'); await p.waitForTimeout(500);
    let m = await dlgTxt(); await p.screenshot({ path: `${OUT}/${theme}-5-menu.png` });
    rec(`[${theme}] 3-dot menu: Set password, Pin, Archive, Attach, Copy, Share, Delete (no Forgot yet)`, ['Set password', 'Pin note', 'Archive', 'Attach', 'Copy text', 'Share', 'Delete note'].every(x => m.includes(x)) && !m.includes('Forgot password'));
    await p.click('[data-mn=set]'); await p.waitForTimeout(400);
    await p.fill('#pw1', 'abcd'); await p.fill('#pw2', 'abxx'); await p.click('[data-pwa=save]'); await p.waitForTimeout(300);
    rec(`[${theme}] mismatching passwords rejected`, /do not match/i.test(await tx()));
    await p.fill('#pw2', 'abcd'); await p.fill('#pwh', 'first four letters'); await p.screenshot({ path: `${OUT}/${theme}-6-setpw.png` }); await p.click('[data-pwa=save]'); await p.waitForTimeout(500);
    const code = (await p.evaluate(() => (document.getElementById('rc') || {}).textContent || '')).trim();
    rec(`[${theme}] recovery code shown after setting password`, /^[A-Z2-9]{4}-[A-Z2-9]{4}$/.test(code), code);
    await p.click('[data-pwa=done]'); await p.waitForTimeout(500);
    await p.click('#more'); await p.waitForTimeout(400); m = await dlgTxt();
    rec(`[${theme}] menu now offers Change / Remove / Forgot password`, ['Change password', 'Remove password', 'Forgot password'].every(x => m.includes(x)));
    await p.keyboard.press('Escape'); await p.evaluate(() => sheet(false)); await p.click('#bk'); await p.waitForTimeout(500);
    rec(`[${theme}] locked note content is hidden on Home`, await p.evaluate(() => /Locked/.test(document.querySelector('.card').innerText) && !/Rahul/.test(document.querySelector('.card').innerText)));
    await p.click('.card'); await p.waitForTimeout(400); await p.screenshot({ path: `${OUT}/${theme}-7-openlocked.png` });
    await p.fill('#pwo', 'nope'); await p.click('[data-pwa=open]'); await p.waitForTimeout(400);
    rec(`[${theme}] wrong password does not open the note`, /Wrong password/i.test(await tx()) && await p.evaluate(() => document.querySelector('.scr.on').id === 'home'));
    await p.click('[data-pwa=hint]'); await p.waitForTimeout(300);
    rec(`[${theme}] hint is shown`, /first four letters/.test(await tx()));
    await p.fill('#pwo', 'abcd'); await p.click('[data-pwa=open]'); await p.waitForTimeout(600);
    rec(`[${theme}] correct password opens the note`, await p.evaluate(() => document.querySelector('.scr.on').id === 'editor' && document.getElementById('b').value.includes('Rahul')));
    await p.click('#bk'); await p.waitForTimeout(400);
    // forgot password with recovery code
    await p.click('.card'); await p.waitForTimeout(400); await p.click('[data-pwa=fgo]'); await p.waitForTimeout(400); await p.screenshot({ path: `${OUT}/${theme}-8-forgot.png` });
    rec(`[${theme}] Forgot password screen shows hint + recovery option + delete option`, await dlgTxt().then(x => /first four letters/.test(x) && /recovery code/i.test(x) && /Delete this note/.test(x)));
    await p.fill('#rcin', 'ZZZZ-ZZZZ'); await p.click('[data-pwa=rc]'); await p.waitForTimeout(300);
    rec(`[${theme}] wrong recovery code rejected`, /Wrong password/i.test(await tx()));
    await p.fill('#rcin', code.toLowerCase().replace('-', ' ')); await p.click('[data-pwa=rc]'); await p.waitForTimeout(400);
    await p.fill('#pw1', 'wxyz'); await p.fill('#pw2', 'wxyz'); await p.click('[data-pwa=save]'); await p.waitForTimeout(500);
    const code2 = (await p.evaluate(() => (document.getElementById('rc') || {}).textContent || '')).trim();
    await p.click('[data-pwa=done]'); await p.waitForTimeout(600);
    rec(`[${theme}] reset with recovery code sets a new password, issues a new code and opens the note`, /^[A-Z2-9]{4}-[A-Z2-9]{4}$/.test(code2) && code2 !== code && await p.evaluate(() => document.querySelector('.scr.on').id === 'editor'));
    // change password
    await p.click('#more'); await p.waitForTimeout(400); await p.click('[data-mn=chg]'); await p.waitForTimeout(400);
    await p.fill('#pw0', 'bad'); await p.fill('#pw1', 'pqrs'); await p.fill('#pw2', 'pqrs'); await p.click('[data-pwa=save]'); await p.waitForTimeout(300);
    const badCur = /Wrong password/i.test(await tx());
    await p.fill('#pw0', 'wxyz'); await p.click('[data-pwa=save]'); await p.waitForTimeout(500);
    rec(`[${theme}] change password needs the current password`, badCur && /Password changed/i.test(await tx()));
    await p.click('#bk'); await p.waitForTimeout(400); await p.click('.card'); await p.waitForTimeout(400);
    await p.fill('#pwo', 'wxyz'); await p.click('[data-pwa=open]'); await p.waitForTimeout(300);
    const oldFails = await p.evaluate(() => document.querySelector('.scr.on').id === 'home');
    await p.fill('#pwo', 'pqrs'); await p.click('[data-pwa=open]'); await p.waitForTimeout(500);
    rec(`[${theme}] old password stops working, new one works`, oldFails && await p.evaluate(() => document.querySelector('.scr.on').id === 'editor'));
    // remove password
    await p.click('#more'); await p.waitForTimeout(400); await p.click('[data-mn=rm]'); await p.waitForTimeout(400);
    await p.fill('#pw0', 'pqrs'); await p.click('[data-pwa=remove]'); await p.waitForTimeout(500);
    await p.click('#bk'); await p.waitForTimeout(400);
    rec(`[${theme}] remove password unlocks the note`, await p.evaluate(() => /Rahul/.test(document.querySelector('.card').innerText)));
    // brute-force lockout + delete via forgot
    await p.click('.card'); await p.waitForTimeout(400); await p.click('#more'); await p.waitForTimeout(300); await p.click('[data-mn=set]'); await p.waitForTimeout(300);
    await p.fill('#pw1', 'lock1'); await p.fill('#pw2', 'lock1'); await p.click('[data-pwa=save]'); await p.waitForTimeout(400); await p.click('[data-pwa=done]'); await p.waitForTimeout(400); await p.click('#bk'); await p.waitForTimeout(400);
    await p.click('.card'); await p.waitForTimeout(300);
    for (let i = 0; i < 5; i++) { await p.fill('#pwo', 'x' + i); await p.click('[data-pwa=open]'); await p.waitForTimeout(150); }
    await p.fill('#pwo', 'lock1'); await p.click('[data-pwa=open]'); await p.waitForTimeout(300);
    rec(`[${theme}] 5 wrong tries lock the prompt for 30 seconds`, /Wait \d+ seconds/.test(await tx()) && await p.evaluate(() => document.querySelector('.scr.on').id === 'home'));
    await p.click('[data-pwa=fgo]'); await p.waitForTimeout(300); await p.click('[data-pwa=erase]'); await p.waitForTimeout(300); await p.click('[data-pwa=erase2]'); await p.waitForTimeout(600);
    rec(`[${theme}] "Delete this note instead" removes a locked note for good`, await p.evaluate(() => document.querySelectorAll('.card').length === 0));
    // re-create a note so the following checks (calendar etc.) still have data
    await p.click('#n0'); await p.waitForTimeout(400); await p.click('[data-new=text]'); await p.waitForTimeout(600); await p.fill('#t', 'Reminder note'); await p.fill('#b', 'kal 9 baje call'); await p.waitForTimeout(400); await p.click('#bk'); await p.waitForTimeout(1200);
    rec(`[${theme}] live clock + next-reminder countdown`, await p.evaluate(() => /^\d{1,2}:\d\d:\d\d$/.test(document.getElementById('lt').textContent) && /^(AM|PM)$/.test(document.getElementById('lap').textContent) && /^in /.test(document.getElementById('lnx').textContent) && getComputedStyle(document.querySelector('.live .ln')).display !== 'none'));
    for (const [id, nm] of [['n2', 'calendar'], ['n3', 'reminders'], ['n4', 'settings']]) { await p.click('#' + id); await p.waitForTimeout(500); await p.screenshot({ path: `${OUT}/${theme}-4-${nm}.png` }); }
    rec(`[${theme}] Settings uses the clear label names`, await p.evaluate(() => { const x = document.getElementById('settings') ? document.getElementById('settings').innerText : document.querySelector('.scr.on').innerText; return ['Ticked items go to bottom', 'Reminder notifications', 'Notes on this phone', 'Widget previews', 'Delete all notes'].every(l => x.includes(l)) && !/Move ticked|Start fresh|Reminder alerts/.test(x); }));
    rec(`[${theme}] no JavaScript errors`, errs.length === 0, errs.join(' | '));
    await ctx.close();
  }
  if (process.env.TURSO_URL && process.env.TURSO_TOKEN) {
    const ctx = await b.newContext(); const p = await ctx.newPage(); await p.goto(BASE);
    const r = await p.evaluate(async ([u, t]) => { try { const url = u.replace(/^libsql:/, 'https:'); const x = await fetch(url + '/v2/pipeline', { method: 'POST', headers: { Authorization: 'Bearer ' + t, 'Content-Type': 'application/json' }, body: JSON.stringify({ requests: [{ type: 'execute', stmt: { sql: 'select 1' } }, { type: 'close' }] }) }); return x.status; } catch (e) { return 'ERR ' + e.message; } }, [process.env.TURSO_URL, process.env.TURSO_TOKEN]);
    rec('Turso reachable from the browser (CORS + token)', r === 200, String(r));
  } else console.log('SKIP Turso test (set TURSO_URL and TURSO_TOKEN)');
  await b.close();
  const bad = rows.filter(r => !r.ok); console.log(`\n${rows.length - bad.length}/${rows.length} passed`);
  fs.writeFileSync(`${OUT}/report.json`, JSON.stringify(rows, null, 2)); process.exit(bad.length ? 1 : 0);
})();
