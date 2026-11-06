const { chromium } = require('playwright');

(async () => {
  console.log('--- Testing Turso In-App Flow ---');
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();

  const errs = [];
  page.on('pageerror', e => errs.push(e.message));

  await page.goto('http://localhost:5173');
  await page.waitForTimeout(1800); // wait for splash

  // Handle first-run gate if visible
  const gateVisible = await page.evaluate(() => document.getElementById('gate').classList.contains('on'));
  if (gateVisible) {
    console.log('Dismissing first-run gate via Skip button');
    await page.click('[data-gk]');
    await page.waitForTimeout(400);
  }

  // 1. Navigate to Settings -> Data & backup
  await page.click('#n4'); // Settings
  await page.waitForTimeout(400);
  await page.click('[data-go="data"]'); // Data & backup
  await page.waitForTimeout(400);

  // 2. Connect with URL and token
  await page.fill('#cu', 'http://127.0.0.1:8080');
  await page.fill('#ct', 'test-token');
  await page.click('[data-cv]'); // Connect & test
  await page.waitForTimeout(800);

  const statusText = await page.evaluate(() => document.getElementById('cst').textContent);
  console.log('Turso Connection Status:', statusText);
  if (!statusText.includes('Connected')) throw new Error('Failed to connect to Turso: ' + statusText);

  // 3. Create a note to back up
  await page.click('#dbk'); // Back to settings
  await page.waitForTimeout(300);
  await page.click('#n1'); // Home
  await page.waitForTimeout(300);
  await page.click('#n0'); // New note
  await page.waitForTimeout(300);
  await page.click('[data-new="text"]');
  await page.waitForTimeout(500);
  await page.fill('#t', 'Turso Cloud Note');
  await page.fill('#b', 'This note tests cloud persistence across backups');
  await page.waitForTimeout(400);
  await page.click('#bk');
  await page.waitForTimeout(500);

  // 4. Back up to cloud
  await page.click('#n4');
  await page.waitForTimeout(300);
  await page.click('[data-go="data"]');
  await page.waitForTimeout(400);
  await page.click('[data-cb]'); // Back up to cloud
  await page.waitForTimeout(800);

  const toastText = await page.evaluate(() => (document.querySelector('.toast') || {}).innerText || '');
  console.log('Backup Toast:', toastText);

  // 5. Delete all notes locally
  await page.click('#dbk');
  await page.waitForTimeout(300);
  await page.click('[data-reset]');
  await page.waitForTimeout(300);
  await page.click('[data-ok2]'); // Yes, delete all
  await page.waitForTimeout(600);

  await page.click('#n1'); // Home
  await page.waitForTimeout(400);
  const cardCount = await page.evaluate(() => document.querySelectorAll('.card').length);
  console.log('Card count after delete all:', cardCount);
  if (cardCount !== 0) throw new Error('Notes were not deleted');

  // 6. Restore from cloud
  await page.click('#n4');
  await page.waitForTimeout(300);
  await page.click('[data-go="data"]');
  await page.waitForTimeout(400);
  await page.click('[data-cr]'); // Restore from cloud
  await page.waitForTimeout(600);

  const restoreDlgText = await page.evaluate(() => document.getElementById('dlg').innerText);
  console.log('Restore Dialog:', restoreDlgText);
  await page.click('[data-rc]'); // Confirm Restore
  await page.waitForTimeout(800);

  await page.click('#dbk');
  await page.waitForTimeout(300);
  await page.click('#n1'); // Home
  await page.waitForTimeout(500);

  const restoredCount = await page.evaluate(() => document.querySelectorAll('.card').length);
  const restoredTitle = await page.evaluate(() => document.querySelector('.card h3').innerText);
  console.log('Restored notes count:', restoredCount, 'Title:', restoredTitle);
  if (restoredCount !== 1 || !restoredTitle.includes('Turso Cloud Note')) {
    throw new Error('Restored note title mismatch or count != 1');
  }

  // 7. Test wrong connection handling
  await page.click('#n4');
  await page.waitForTimeout(300);
  await page.click('[data-go="data"]');
  await page.waitForTimeout(400);
  await page.fill('#cu', 'http://127.0.0.1:9999'); // Invalid unreachable port
  await page.click('[data-cv]');
  await page.waitForTimeout(800);

  const errStatus = await page.evaluate(() => document.getElementById('cst').textContent);
  console.log('Bad connection status:', errStatus);
  if (errStatus !== 'Not verified') throw new Error('Expected Not verified for bad connection');

  if (errs.length) {
    console.error('JS errors:', errs);
    process.exit(1);
  }

  console.log('PASS: In-app Turso flow completely verified!');
  await browser.close();
})();
