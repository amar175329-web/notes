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

async function runLivePhoneTests() {
  console.log('=== Starting My Note Live Phone Verification on Infinix NOTE 11S ===\n');

  const outputDir = path.resolve('/home/ubuntu/outputs/2026-11/notes-live-test');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Ensure Notes app is in foreground
  execSync('adb -s 100.73.50.71:40613 shell am start -n com.aj.mynote/com.aj.mynote.MainActivity');

  const browser = await chromium.connectOverCDP('http://localhost:9222');
  const contexts = browser.contexts();
  const page = contexts[0].pages()[0];

  const testReport = {
    timestamp: new Date().toISOString(),
    device: 'Infinix NOTE 11S (Android 11, 1080x2460)',
    appVersion: 'v1.0.18 (versionCode 19)',
    tests: []
  };

  function logPass(name, details) {
    console.log(`[PASS] ${name}: ${details}`);
    testReport.tests.push({ name, status: 'PASS', details });
  }

  function logFail(name, details) {
    console.error(`[FAIL] ${name}: ${details}`);
    testReport.tests.push({ name, status: 'FAIL', details });
  }

  // --- TEST 1: Reminder Notifications On/Off Toggle (v1.0.16) ---
  console.log('--- Test 1: Reminder Notifications On/Off Toggle (v1.0.16) ---');
  try {
    // Navigate to Settings
    await page.evaluate(() => {
      document.querySelector('#n4')?.click();
    });
    await page.waitForTimeout(400);

    // Test Toggle OFF (#no0)
    const offResult = await page.evaluate(() => {
      const offBtn = document.querySelector('#no0');
      offBtn?.click();
      const toast = document.querySelector('#tm')?.textContent || '';
      const S = JSON.parse(localStorage.getItem('notes-v2') || '{}');
      return { toast, remOff: S.remOff, offActive: offBtn?.classList.contains('act') };
    });

    console.log('Toggle OFF result:', offResult);
    if (offResult.toast.includes('Reminder notifications turned off') && offResult.remOff === true) {
      logPass('Reminder Notifications Toggle OFF', `Toast: "${offResult.toast}", S.remOff: ${offResult.remOff}`);
    } else {
      logFail('Reminder Notifications Toggle OFF', `Expected off toast and remOff=true, got ${JSON.stringify(offResult)}`);
    }

    captureScreen('01-settings-reminders-off.png');

    // Test Toggle ON (#no1)
    const onResult = await page.evaluate(() => {
      const onBtn = document.querySelector('#no1');
      onBtn?.click();
      const toast = document.querySelector('#tm')?.textContent || '';
      const S = JSON.parse(localStorage.getItem('notes-v2') || '{}');
      return { toast, remOff: S.remOff, onActive: onBtn?.classList.contains('act') };
    });

    console.log('Toggle ON result:', onResult);
    if ((onResult.toast.includes('Reminder notifications turned on') || onResult.toast.includes('enabled')) && !onResult.remOff) {
      logPass('Reminder Notifications Toggle ON', `Toast: "${onResult.toast}", S.remOff: ${onResult.remOff}`);
    } else {
      logFail('Reminder Notifications Toggle ON', `Expected on toast and remOff=undefined/false, got ${JSON.stringify(onResult)}`);
    }

    captureScreen('02-settings-reminders-on.png');
  } catch (e) {
    logFail('Test 1 Exception', e.message);
  }

  // --- TEST 2: Turso Database Zero Hardcoded Default Credentials (v1.0.16) ---
  console.log('\n--- Test 2: Turso Database Zero Hardcoded Credentials (v1.0.16) ---');
  try {
    const tursoCheck = await page.evaluate(() => {
      const urlInput = document.querySelector('#cu')?.value || '';
      const tokenInput = document.querySelector('#ct')?.value || '';
      const connBtn = document.querySelector('[data-cv]');
      connBtn?.click();
      const toast = document.querySelector('#tm')?.textContent || '';
      return { urlInput, tokenInput, toast };
    });

    console.log('Turso verification result:', tursoCheck);
    if (tursoCheck.urlInput === '' && tursoCheck.tokenInput === '' && tursoCheck.toast.includes('Paste both the URL and the token')) {
      logPass('Turso Zero Hardcoding', `URL & Token inputs are clean/empty, and connect button correctly warns: "${tursoCheck.toast}"`);
    } else {
      logFail('Turso Zero Hardcoding', `Unexpected credentials or toast: ${JSON.stringify(tursoCheck)}`);
    }

    captureScreen('03-settings-turso-clean.png');
  } catch (e) {
    logFail('Test 2 Exception', e.message);
  }

  // --- TEST 3: Checklist Checkmark on Home Cards (v1.0.17) ---
  console.log('\n--- Test 3: Checklist Checkmark on Home Cards (v1.0.17) ---');
  try {
    // Add checklist note to S.notes with type: 'list'
    await page.evaluate(() => {
      const S = JSON.parse(localStorage.getItem('notes-v2') || '{}');
      if (!S.notes) S.notes = [];
      
      const newId = (S.nid = (S.nid || 1) + 1);
      S.notes = S.notes.filter(n => n.title !== 'Verification Checklist Card');

      S.notes.unshift({
        id: newId,
        title: 'Verification Checklist Card',
        body: '[x] Completed Task with Tick\n[ ] Pending Task In Progress',
        type: 'list',
        mode: 'list',
        pin: false,
        label: 'Home',
        color: 0,
        created: Date.now(),
        updated: Date.now()
      });

      localStorage.setItem('notes-v2', JSON.stringify(S));
      window.location.reload();
    });
    await page.waitForTimeout(1000);

    const checkmarkCheck = await page.evaluate(() => {
      const cards = [...document.querySelectorAll('#grid .card')];
      const card = cards.find(c => c.textContent.includes('Verification Checklist Card'));
      if (!card) return { found: false, count: cards.length };

      const doneItem = card.querySelector('.ck.dn');
      const pendingItem = card.querySelector('.ck:not(.dn)');
      const checkIcon = doneItem ? doneItem.querySelector('i') : null;
      const pseudoContent = checkIcon ? window.getComputedStyle(checkIcon, '::before').getPropertyValue('content') : '';

      return {
        found: true,
        hasDoneItem: !!doneItem,
        hasPendingItem: !!pendingItem,
        pseudoContent
      };
    });

    console.log('Checkmark Home card result:', checkmarkCheck);
    if (checkmarkCheck.found && checkmarkCheck.hasDoneItem && checkmarkCheck.hasPendingItem && checkmarkCheck.pseudoContent.includes('✓')) {
      logPass('Checklist Checkmark Display on Home Card', `Card rendered with completed item .ck.dn and visible CSS checkmark: ${checkmarkCheck.pseudoContent}`);
    } else {
      logFail('Checklist Checkmark Display on Home Card', `Checkmark or card missing: ${JSON.stringify(checkmarkCheck)}`);
    }

    captureScreen('04-home-checklist-checkmark.png');
  } catch (e) {
    logFail('Test 3 Exception', e.message);
  }

  // --- TEST 4: Completed Notes Sink to Bottom (v1.0.17) ---
  console.log('\n--- Test 4: Completed Notes Sink to Bottom (v1.0.17) ---');
  try {
    await page.evaluate(() => {
      const S = JSON.parse(localStorage.getItem('notes-v2') || '{}');
      S.sink = true; // Ensure sink is ON
      
      // Filter out previous test notes
      S.notes = S.notes.filter(n => n.title !== 'Active Work Note' && n.title !== 'Completed All Tasks Note');
      
      const id1 = (S.nid = (S.nid || 1) + 1);
      const id2 = (S.nid = (S.nid || 1) + 1);

      // Add active incomplete note
      S.notes.push({
        id: id1,
        title: 'Active Work Note',
        body: '[ ] Still to do item',
        type: 'list',
        mode: 'list',
        created: Date.now() - 10000,
        updated: Date.now() - 10000
      });

      // Add 100% completed note (created more recently!)
      S.notes.push({
        id: id2,
        title: 'Completed All Tasks Note',
        body: '[x] Finished task 1\n[x] Finished task 2',
        type: 'list',
        mode: 'list',
        created: Date.now(),
        updated: Date.now()
      });

      localStorage.setItem('notes-v2', JSON.stringify(S));
      window.location.reload();
    });
    await page.waitForTimeout(1000);

    const sinkCheck = await page.evaluate(() => {
      const cards = [...document.querySelectorAll('#grid .card')];
      const titles = cards.map(c => c.querySelector('h3')?.textContent || '');
      const activeIdx = titles.findIndex(t => t.includes('Active Work Note'));
      const doneIdx = titles.findIndex(t => t.includes('Completed All Tasks Note'));

      return {
        titles,
        activeIdx,
        doneIdx,
        didSink: doneIdx > activeIdx
      };
    });

    console.log('Sink to bottom result:', sinkCheck);
    if (sinkCheck.didSink) {
      logPass('Completed Notes Sink to Bottom', `Active Note Index: ${sinkCheck.activeIdx}, Completed Note Index: ${sinkCheck.doneIdx}. Completed note successfully sank to bottom!`);
    } else {
      logFail('Completed Notes Sink to Bottom', `Completed note failed to sink below active note: ${JSON.stringify(sinkCheck)}`);
    }

    captureScreen('05-home-completed-notes-sink.png');
  } catch (e) {
    logFail('Test 4 Exception', e.message);
  }

  // --- TEST 5: Native Android Voice Typing Bridge & Auto Audio Permissions (v1.0.18) ---
  console.log('\n--- Test 5: Native Android Voice Typing Bridge (v1.0.18) ---');
  try {
    const voiceBridgeCheck = await page.evaluate(() => {
      const hasNativeVoice = typeof window.NativeVoice !== 'undefined';
      const hasStartSpeech = typeof window.NativeVoice?.startSpeech === 'function';
      const hasCallback = typeof window.onNativeVoiceText === 'function';
      return { hasNativeVoice, hasStartSpeech, hasCallback };
    });

    console.log('NativeVoice bridge check:', voiceBridgeCheck);
    if (voiceBridgeCheck.hasNativeVoice && voiceBridgeCheck.hasStartSpeech && voiceBridgeCheck.hasCallback) {
      logPass('NativeVoice JavaScript Bridge Exists', 'window.NativeVoice.startSpeech and window.onNativeVoiceText are verified in live Android WebView runtime');
    } else {
      logFail('NativeVoice JavaScript Bridge Exists', `Missing bridge elements: ${JSON.stringify(voiceBridgeCheck)}`);
    }

    // Open a fresh text note editor and inject voice text with reminder
    await page.evaluate(() => {
      document.querySelector('[data-sheet]')?.click();
    });
    await page.waitForTimeout(300);
    await page.evaluate(() => {
      document.querySelector('[data-new="text"]')?.click();
    });
    await page.waitForTimeout(400);

    // Call window.onNativeVoiceText as native Android would
    const voiceExecution = await page.evaluate(() => {
      window.onNativeVoiceText('kal shaam 6 baje Rahul ko call');
      const bodyVal = document.querySelector('#b')?.value || '';
      const toastMsg = document.querySelector('#tm')?.textContent || '';
      const reminderBadge = document.querySelector('#det')?.textContent || '';
      return { bodyVal, toastMsg, reminderBadge };
    });

    console.log('Voice plain text execution result:', voiceExecution);
    if (voiceExecution.bodyVal.includes('kal shaam 6 baje Rahul ko call') && voiceExecution.reminderBadge.includes('6:00 PM')) {
      logPass('Voice Text Ingestion & Natural Language Reminder Scheduling', `Spoken text inserted into note body, and "kal shaam 6 baje" auto-scheduled reminder at 6:00 PM: "${voiceExecution.reminderBadge}"`);
    } else {
      logFail('Voice Text Ingestion & Natural Language Reminder Scheduling', `Failed voice insertion: ${JSON.stringify(voiceExecution)}`);
    }

    captureScreen('06-voice-editor-reminder-scheduled.png');

    // Test Checklist Voice Insertion
    await page.evaluate(() => {
      document.querySelector('[data-mode="list"]')?.click();
    });
    await page.waitForTimeout(300);

    const voiceChecklistExecution = await page.evaluate(() => {
      window.onNativeVoiceText('Doodh aur sabzi lana');
      const checklistItems = [...document.querySelectorAll('#cl input')].map(i => i.value);
      return { checklistItems };
    });

    console.log('Voice checklist execution result:', voiceChecklistExecution);
    if (voiceChecklistExecution.checklistItems.some(i => i.includes('Doodh aur sabzi lana'))) {
      logPass('Voice Checklist Item Insertion', `Checklist item added via voice recognition: ${JSON.stringify(voiceChecklistExecution.checklistItems)}`);
    } else {
      logFail('Voice Checklist Item Insertion', `Item not added: ${JSON.stringify(voiceChecklistExecution)}`);
    }

    captureScreen('07-voice-checklist-editor.png');

    // Save and go back to Home
    await page.evaluate(() => {
      document.querySelector('[data-back]')?.click();
    });
    await page.waitForTimeout(500);

    captureScreen('08-home-after-voice-note.png');

  } catch (e) {
    logFail('Test 5 Exception', e.message);
  }

  await browser.close();

  // Write JSON report
  const reportPath = path.join(outputDir, 'live-test-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(testReport, null, 2));
  console.log(`\n=== Verification Finished. Report saved to ${reportPath} ===`);
  const passCount = testReport.tests.filter(t => t.status === 'PASS').length;
  const totalCount = testReport.tests.length;
  console.log(`Passed: ${passCount} / ${totalCount}`);
}

runLivePhoneTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
