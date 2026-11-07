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

  // Initialize with empty notes and light theme
  await page.evaluate(() => {
    localStorage.clear();
    const state = {
      theme: 'light',
      view: 'grid',
      sink: true,
      user: { name: 'User' },
      nid: 1,
      notes: []
    };
    localStorage.setItem('notes-v2', JSON.stringify(state));
    window.location.reload();
  });

  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);

  console.log('Creating a new plain text note...');
  await page.click('[data-sheet]');
  await page.waitForTimeout(300);
  await page.click('[data-new="text"]');
  await page.waitForTimeout(500);

  console.log('Testing voice text insertion via window.onNativeVoiceText...');
  const voiceResult = await page.evaluate(() => {
    window.onNativeVoiceText('kal shaam 6 baje Rahul ko call');
    const noteBody = document.querySelector('#b').value;
    const toastMsg = document.querySelector('#tm').textContent;
    const reminderBadge = document.querySelector('#det').innerText;
    return {
      body: noteBody,
      toast: toastMsg,
      reminderBadge
    };
  });

  console.log('Voice plain text result:', voiceResult);
  if (voiceResult.body.includes('kal shaam 6 baje Rahul ko call') && voiceResult.reminderBadge.includes('6:00 PM')) {
    console.log('PASS: Spoken text inserted and "kal shaam 6 baje" reminder auto-scheduled!');
  } else {
    console.error('FAIL: Unexpected plain text voice result:', voiceResult);
    process.exit(1);
  }

  // Save screenshot of editor with voice note
  const editorVoiceShot = path.resolve(__dirname, '../outputs/2026-11/test-voice-editor-verified.png');
  await page.screenshot({ path: editorVoiceShot });
  console.log('Saved screenshot:', editorVoiceShot);

  // Test Checklist Voice Insertion
  console.log('Testing voice insertion in checklist mode...');
  await page.click('[data-mode="list"]');
  await page.waitForTimeout(300);

  const checklistResult = await page.evaluate(() => {
    window.onNativeVoiceText('Buy fresh vegetables');
    const noteBody = document.querySelector('#b').value;
    const items = [...document.querySelectorAll('#cl input')].map(i => i.value);
    return {
      body: noteBody,
      items
    };
  });

  console.log('Checklist voice result:', checklistResult);
  if (checklistResult.items.some(i => i.includes('Buy fresh vegetables'))) {
    console.log('PASS: Checklist item added from voice text!');
  } else {
    console.error('FAIL: Checklist item not added:', checklistResult);
    process.exit(1);
  }

  // Go to Home and verify card shows voice checklist
  await page.click('[data-back]');
  await page.waitForTimeout(500);

  const homeShot = path.resolve(__dirname, '../outputs/2026-11/test-voice-home-verified.png');
  await page.screenshot({ path: homeShot });
  console.log('Saved Home screenshot with voice notes:', homeShot);

  console.log('ALL VOICE VERIFICATION TESTS PASSED SUCCESSFULLY!');
  await browser.close();
}

run().catch(e => {
  console.error('Test error:', e);
  process.exit(1);
});
