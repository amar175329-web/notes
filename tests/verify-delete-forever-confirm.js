const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

function captureScreen(filename) {
  const targetPath = path.resolve('/home/ubuntu/outputs/2026-11/notes-live-test', filename);
  try {
    execSync(`adb -s 100.73.50.71:40613 exec-out screencap -p > "${targetPath}"`);
    console.log(`Saved screenshot: ${filename}`);
  } catch (e) {
    console.warn(`Could not capture screencap: ${e.message}`);
  }
}

async function verifyDeleteForever() {
  console.log('=== Starting Delete Forever Confirmation Verification on Infinix NOTE 11S ===\n');

  execSync('adb -s 100.73.50.71:40613 shell am start -n com.aj.mynote/com.aj.mynote.MainActivity');
  execSync('sleep 1.5');

  // Forward port 9222 to webview of com.aj.mynote
  const pid = execSync('adb -s 100.73.50.71:40613 shell pidof com.aj.mynote').toString().trim();
  console.log('My Note PID:', pid);
  execSync(`adb -s 100.73.50.71:40613 forward tcp:9222 localabstract:webview_devtools_remote_${pid}`);

  const browser = await chromium.connectOverCDP('http://localhost:9222');
  const contexts = browser.contexts();
  const page = contexts[0].pages()[0];

  // 1. Setup a test trashed note
  console.log('\n--- Step 1: Setting up a test note in Trash ---');
  await page.evaluate(() => {
    const S = JSON.parse(localStorage.getItem('notes-v2') || '{}');
    if (!S.notes) S.notes = [];
    
    // Remove any previous test-trash notes
    S.notes = S.notes.filter(n => n.title !== 'Temporary Trash Note');

    const testId = (S.nid = (S.nid || 1) + 1);
    S.notes.unshift({
      id: testId,
      title: 'Temporary Trash Note',
      body: 'Testing delete forever confirmation flow',
      trash: Date.now() - 10000,
      label: 'Home',
      color: 0,
      created: Date.now() - 50000,
      updated: Date.now() - 10000
    });

    localStorage.setItem('notes-v2', JSON.stringify(S));
    window.location.reload();
  });
  await page.waitForTimeout(1000);

  // 2. Switch to Trash filter
  console.log('--- Step 2: Navigating to Trash filter ---');
  await page.evaluate(() => {
    const chips = [...document.querySelectorAll('#chips .chip')];
    const trashChip = chips.find(c => c.textContent.trim() === 'Trash');
    trashChip?.click();
  });
  await page.waitForTimeout(400);

  // 3. Click the trashed note to open first dialog
  console.log('--- Step 3: Clicking Trashed Note Card ---');
  const firstDialog = await page.evaluate(() => {
    const card = [...document.querySelectorAll('#grid .card')].find(c => c.textContent.includes('Temporary Trash Note'));
    card?.click();
    const dlgH3 = document.querySelector('#dlg h3')?.textContent || '';
    const hasRestore = !!document.querySelector('#dlg [data-rs]');
    const hasDeleteForever = !!document.querySelector('#dlg [data-fd]');
    const hasCancel = !!document.querySelector('#dlg [data-no]');
    return { dlgH3, hasRestore, hasDeleteForever, hasCancel };
  });

  console.log('First dialog info:', firstDialog);
  captureScreen('10-trash-first-dialog.png');

  if (!firstDialog.hasDeleteForever) {
    throw new Error('First dialog missing Delete forever button');
  }

  // 4. Click "Delete forever" button -> Expect Confirmation Dialog with Yes / No
  console.log('--- Step 4: Clicking "Delete forever" -> Checking Confirmation Dialog ---');
  const confirmDialog = await page.evaluate(() => {
    const fdBtn = document.querySelector('#dlg [data-fd]');
    fdBtn?.click();

    const dlgH3 = document.querySelector('#dlg h3')?.textContent || '';
    const dlgDesc = document.querySelector('#dlg p')?.textContent || '';
    const yesBtn = document.querySelector('#dlg [data-fd2]');
    const noBtn = document.querySelector('#dlg [data-no]');

    return {
      title: dlgH3,
      desc: dlgDesc,
      yesText: yesBtn?.textContent || '',
      noText: noBtn?.textContent || '',
      hasYes: !!yesBtn,
      hasNo: !!noBtn
    };
  });

  console.log('Confirmation dialog info:', confirmDialog);
  captureScreen('11-delete-forever-confirm-dialog.png');

  if (!confirmDialog.hasYes || !confirmDialog.hasNo) {
    throw new Error('Confirmation dialog missing Yes or No buttons');
  }
  console.log('[PASS] Confirmation dialog correctly popped up with Yes and No buttons!');

  // 5. Test "No" button (Should NOT delete note, should dismiss dialog)
  console.log('\n--- Step 5: Testing "No" Click (Should cancel deletion) ---');
  const afterNoClick = await page.evaluate(() => {
    const noBtn = document.querySelector('#dlg [data-no]');
    noBtn?.click();

    const isDlgClosed = !document.querySelector('#dlg')?.classList.contains('on');
    const S = JSON.parse(localStorage.getItem('notes-v2') || '{}');
    const noteStillExists = S.notes.some(n => n.title === 'Temporary Trash Note' && n.trash);

    return { isDlgClosed, noteStillExists };
  });

  console.log('After "No" click result:', afterNoClick);
  captureScreen('12-after-no-cancel.png');

  if (afterNoClick.isDlgClosed && afterNoClick.noteStillExists) {
    console.log('[PASS] Clicking "No" dismissed the dialog and preserved the note in Trash!');
  } else {
    throw new Error(`Clicking "No" failed: ${JSON.stringify(afterNoClick)}`);
  }

  // 6. Test "Yes, delete" button (Should permanently delete note)
  console.log('\n--- Step 6: Testing "Yes, delete" Click (Should permanently delete note) ---');
  // Re-open dialog on note
  await page.evaluate(() => {
    const card = [...document.querySelectorAll('#grid .card')].find(c => c.textContent.includes('Temporary Trash Note'));
    card?.click();
  });
  await page.waitForTimeout(300);

  // Click Delete forever to open confirmation
  await page.evaluate(() => {
    document.querySelector('#dlg [data-fd]')?.click();
  });
  await page.waitForTimeout(300);

  // Click "Yes, delete"
  const afterYesClick = await page.evaluate(() => {
    const yesBtn = document.querySelector('#dlg [data-fd2]');
    yesBtn?.click();

    const isDlgClosed = !document.querySelector('#dlg')?.classList.contains('on');
    const toastText = document.querySelector('#tm')?.textContent || '';
    const S = JSON.parse(localStorage.getItem('notes-v2') || '{}');
    const noteExists = S.notes.some(n => n.title === 'Temporary Trash Note');

    return { isDlgClosed, toastText, noteExists };
  });

  console.log('After "Yes, delete" click result:', afterYesClick);
  captureScreen('13-after-yes-permanent-delete.png');

  if (afterYesClick.isDlgClosed && !afterYesClick.noteExists && afterYesClick.toastText.includes('deleted')) {
    console.log('[PASS] Clicking "Yes, delete" permanently deleted the note and displayed toast confirmation!');
  } else {
    throw new Error(`Clicking "Yes, delete" failed: ${JSON.stringify(afterYesClick)}`);
  }

  await browser.close();
  console.log('\n=== ALL DELETE FOREVER CONFIRMATION TESTS PASSED 100% ===');
}

verifyDeleteForever().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
