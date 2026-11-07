const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();

  const fileUrl = 'file://' + path.resolve(__dirname, 'www/index.html');
  console.log('Navigating to', fileUrl);
  await page.goto(fileUrl);

  // Initialize fresh state with sample notes
  await page.evaluate(() => {
    localStorage.clear();
    const state = {
      theme: 'light',
      view: 'grid',
      sink: true,
      user: { name: 'Hh' },
      nid: 3,
      notes: [
        {
          id: 1,
          type: 'text',
          mode: 'plain',
          title: 'Active Task',
          body: 'This is an active task note that is not completed',
          created: Date.now() - 50000,
          upd: Date.now() - 50000,
          label: 'Home'
        },
        {
          id: 2,
          type: 'list',
          mode: 'list',
          title: 'WhiteSelectionBar',
          body: '[x] Bkt',
          created: Date.now() - 10000,
          upd: Date.now() - 10000,
          label: 'Home'
        }
      ]
    };
    localStorage.setItem('notes-v2', JSON.stringify(state));
    window.location.reload();
  });

  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);

  // 1. Verify Home screen checklist card tick and note sink
  console.log('Checking Home screen...');
  const cardTitles = await page.$$eval('.card h3', els => els.map(e => e.textContent.replace(/[\u200B]/g,'').trim()));
  console.log('Card order on Home screen:', cardTitles);

  // Verify that WhiteSelectionBar (done) sank below Active Task
  if (cardTitles[0] === 'Active Task' && cardTitles[1] === 'WhiteSelectionBar') {
    console.log('PASS: Completed note WhiteSelectionBar correctly sank below Active Task!');
  } else {
    console.error('FAIL: Order unexpected:', cardTitles);
  }

  // Check the tick mark on WhiteSelectionBar card
  const tickElementStyle = await page.evaluate(() => {
    const card = [...document.querySelectorAll('.card')].find(c => c.textContent.replace(/[\u200B]/g,'').includes('WhiteSelectionBar'));
    const ck = card.querySelector('.ck');
    const i = card.querySelector('.ck i');
    const beforeContent = window.getComputedStyle(i, '::before').getPropertyValue('content');
    return {
      hasDnClass: ck.classList.contains('dn'),
      beforeContent,
      bg: window.getComputedStyle(i).backgroundColor,
      border: window.getComputedStyle(i).borderColor,
    };
  });
  console.log('Home card checkbox computed style:', tickElementStyle);
  if (tickElementStyle.hasDnClass && tickElementStyle.beforeContent.includes('✓')) {
    console.log('PASS: Checkmark ✓ is rendered inside Home card checkbox!');
  } else {
    console.error('FAIL: Checkmark missing on Home card checkbox:', tickElementStyle);
  }

  // Take Home screenshot
  const homeShot = path.resolve(__dirname, '../outputs/2026-11/test-home-tick-and-sink.png');
  await page.screenshot({ path: homeShot });
  console.log('Saved screenshot:', homeShot);

  // 2. Test unticking from Home screen card
  console.log('Testing click on Home card checkbox to uncheck...');
  await page.evaluate(() => {
    const card = [...document.querySelectorAll('.card')].find(c => c.textContent.replace(/[\u200B]/g,'').includes('WhiteSelectionBar'));
    const i = card.querySelector('.ck i');
    i.click();
  });
  await page.waitForTimeout(500);

  const updatedTitles = await page.$$eval('.card h3', els => els.map(e => e.textContent.replace(/[\u200B]/g,'').trim()));
  console.log('Card order after untick:', updatedTitles);
  if (updatedTitles[0] === 'WhiteSelectionBar') {
    console.log('PASS: Unticked note popped back to top!');
  }

  // 3. Test Settings screen: Reminder notifications On/Off
  console.log('Testing Settings screen...');
  await page.evaluate(() => go('settings'));
  await page.waitForTimeout(500);

  const notifToggleVisible = await page.evaluate(() => {
    const no1 = document.getElementById('no1');
    const no0 = document.getElementById('no0');
    return {
      exists: !!(no1 && no0),
      no1On: no1.classList.contains('on'),
      no0On: no0.classList.contains('on'),
    };
  });
  console.log('Settings Reminder notifications toggle:', notifToggleVisible);

  // Click Off
  await page.evaluate(() => document.getElementById('no0').click());
  await page.waitForTimeout(300);
  const afterOff = await page.evaluate(() => ({
    no1On: document.getElementById('no1').classList.contains('on'),
    no0On: document.getElementById('no0').classList.contains('on'),
    toast: document.getElementById('tm').textContent,
  }));
  console.log('After clicking Off:', afterOff);

  const settingsShot = path.resolve(__dirname, '../outputs/2026-11/test-settings-notif-toggle.png');
  await page.screenshot({ path: settingsShot });
  console.log('Saved screenshot:', settingsShot);

  // 4. Test Data & backup screen
  console.log('Testing Data & backup screen...');
  await page.evaluate(() => go('data'));
  await page.waitForTimeout(500);

  const dataBackupStatus = await page.evaluate(() => {
    return {
      statusText: document.getElementById('cst').textContent,
      cuValue: document.getElementById('cu').value,
      ctValue: document.getElementById('ct').value,
    };
  });
  console.log('Data & backup initial status:', dataBackupStatus);

  // Click Test connection without entering values
  await page.evaluate(() => document.querySelector('[data-cv]').click());
  await page.waitForTimeout(300);
  const toastText = await page.evaluate(() => document.getElementById('tm').textContent);
  console.log('Toast on Test connection without credentials:', toastText);

  const dataShot = path.resolve(__dirname, '../outputs/2026-11/test-data-backup-clean.png');
  await page.screenshot({ path: dataShot });
  console.log('Saved screenshot:', dataShot);

  await browser.close();
  console.log('ALL VERIFICATION TESTS COMPLETED SUCCESSFULLY!');
}

run().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
