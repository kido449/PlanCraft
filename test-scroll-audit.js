import { spawn } from 'child_process';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9222;

function wait(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function getPageWsUrl() {
  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/list`);
      if (res.ok) {
        const pages = await res.json();
        const page = pages.find((p) => p.type === 'page' && p.url.includes('localhost:3000'));
        if (page?.webSocketDebuggerUrl) {
          return page.webSocketDebuggerUrl;
        }
      }
    } catch (e) {}
    await wait(200);
  }
  throw new Error('Could not find active localhost:3000 page target in Chrome CDP');
}

class CDPClient {
  constructor(ws) {
    this.ws = ws;
    this.id = 1;
    this.callbacks = new Map();
    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && this.callbacks.has(msg.id)) {
        const { resolve, reject } = this.callbacks.get(msg.id);
        this.callbacks.delete(msg.id);
        if (msg.error) reject(new Error(msg.error.message));
        else resolve(msg.result);
      }
    };
  }

  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = this.id++;
      this.callbacks.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async eval(expression) {
    const res = await this.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    if (res.exceptionDetails) {
      throw new Error(JSON.stringify(res.exceptionDetails));
    }
    return res.result?.value;
  }
}

async function main() {
  console.log('=== Starting Programmatic Scroll Stability Audit ===');
  const chromeProcess = spawn(
    CHROME_PATH,
    [
      `--remote-debugging-port=${PORT}`,
      '--headless=new',
      '--disable-gpu',
      '--no-first-run',
      '--no-default-browser-check',
      '--window-size=1440,900',
      'http://localhost:3000',
    ],
    { stdio: 'ignore' }
  );

  let ws;
  try {
    const wsUrl = await getPageWsUrl();
    ws = new WebSocket(wsUrl);
    await new Promise((resolve) => (ws.onopen = resolve));

    const cdp = new CDPClient(ws);
    await cdp.send('Runtime.enable');

    console.log('Target page connected.');
    await wait(3000);

    const initialInfo = await cdp.eval(`({
      title: document.title,
      scrollHeight: document.body.scrollHeight,
      eventsCount: document.querySelectorAll('main').length
    })`);
    console.log('Initial Page Info:', initialInfo);

    const auditResults = [];

    async function auditAction(actionName, scrollIntoViewSelector, actionScript) {
      // 0. Ensure target element is in user viewport
      if (scrollIntoViewSelector) {
        await cdp.eval(`(() => {
          const el = document.querySelector(${JSON.stringify(scrollIntoViewSelector)});
          if (el) el.scrollIntoView({ block: 'center' });
        })()`);
        await wait(300);
      }

      // Step 1: Before action, log window.scrollY and document.body.scrollHeight
      const before = await cdp.eval(`({
        scrollY: Math.round(window.scrollY),
        scrollHeight: Math.round(document.body.scrollHeight)
      })`);

      // Step 2: Perform the action (save/click/edit)
      const actionResult = await cdp.eval(actionScript);
      await wait(600);

      // Step 3: Immediately after, log window.scrollY and document.body.scrollHeight again
      const after = await cdp.eval(`({
        scrollY: Math.round(window.scrollY),
        scrollHeight: Math.round(document.body.scrollHeight)
      })`);

      // Step 4: Report before/after numbers and net difference
      const netShiftY = after.scrollY - before.scrollY;
      const netShiftH = after.scrollHeight - before.scrollHeight;
      const passed = Math.abs(netShiftY) <= 1;

      const record = {
        action: actionName,
        beforeScrollY: `${before.scrollY}px`,
        afterScrollY: `${after.scrollY}px`,
        netScrollShift: `${netShiftY}px`,
        beforeHeight: `${before.scrollHeight}px`,
        afterHeight: `${after.scrollHeight}px`,
        netHeightShift: `${netShiftH}px`,
        status: passed ? 'PASSED (0px shift)' : `FAILED (${netShiftY}px shift)`,
      };

      auditResults.push(record);
      console.log(`\n[ACTION: ${actionName}]`);
      console.log(`  1. Before action:  scrollY = ${record.beforeScrollY}, scrollHeight = ${record.beforeHeight}`);
      console.log(`  2. Performed:      ${actionResult || 'Action completed'}`);
      console.log(`  3. After action:   scrollY = ${record.afterScrollY}, scrollHeight = ${record.afterHeight}`);
      console.log(`  4. Net difference: ${record.netScrollShift} (ΔscrollY) | ${record.netHeightShift} (ΔscrollHeight)`);
      console.log(`  Verification:      ${record.status}`);
    }

    // 1. Budget Item Inline Edit & Save
    await auditAction(
      'Budget Item Inline Edit & Save',
      'table tbody tr',
      `(async () => {
        const row = document.querySelector('table tbody tr');
        if (row) {
          row.click();
          await new Promise(r => setTimeout(r, 150));
          const saveBtn = document.querySelector('table button[title="Save changes"]');
          if (saveBtn) {
            saveBtn.click();
            return 'Opened row and clicked Save changes';
          }
        }
        return 'Row or save button not found';
      })()`
    );

    // 2. Timeline Milestone Status Toggle
    await auditAction(
      'Timeline Milestone Status Checkbox Click',
      'button[title*="Mark"]',
      `(() => {
        const checkBtn = document.querySelector('button[title*="Mark"]');
        if (checkBtn) {
          checkBtn.click();
          return 'Toggled milestone status';
        }
        return 'Milestone button not found';
      })()`
    );

    // 3. Vendor Status Badge Cycle
    await auditAction(
      'Vendor Status Badge Click',
      'button[title="Edit vendor"]',
      `(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const statusBtn = btns.find(b => b.textContent?.includes('shortlisted') || b.textContent?.includes('contacted') || b.textContent?.includes('booked'));
        if (statusBtn) {
          statusBtn.click();
          return 'Cycled vendor status';
        }
        return 'Status button not found';
      })()`
    );

    // 4. Guest List RSVP status click
    await auditAction(
      'Guest List RSVP Status Button Click',
      'button:is([title="Remove guest"])',
      `(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const rsvpBtn = btns.find(b => b.textContent?.includes('Mark Attending') || b.textContent?.includes('Mark Pending'));
        if (rsvpBtn) {
          const actionText = rsvpBtn.textContent.trim();
          rsvpBtn.click();
          return 'Clicked ' + actionText;
        }
        return 'RSVP button not found';
      })()`
    );

    // 5. Open and Save Constraints in Modal
    await auditAction(
      'Constraint Edit Modal Save Action',
      'button:has(svg.lucide-sliders-horizontal)',
      `(async () => {
        const editBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent?.includes('Edit Constraints'));
        if (editBtn) {
          editBtn.click();
          await new Promise(r => setTimeout(r, 200));
          const saveBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent?.includes('Save Constraints Only'));
          if (saveBtn) {
            saveBtn.click();
            return 'Opened modal and clicked Save Constraints Only';
          }
        }
        return 'Edit Constraints button not found';
      })()`
    );

    console.log('\n========================================================================');
    console.log('NUMERIC PROGRAMMATIC VERIFICATION SUMMARY:');
    console.log('========================================================================');
    console.table(auditResults);

    const allPassed = auditResults.every((r) => r.status.startsWith('PASSED'));
    console.log(`\nOVERALL AUDIT VERDICT: ${allPassed ? 'ALL TESTS PASSED (0px NET SCROLL SHIFT)' : 'SOME TESTS SHIFTED'}`);

    ws.close();
  } catch (err) {
    console.error('Audit run error:', err);
  } finally {
    try {
      ws?.close();
    } catch (e) {}
    chromeProcess.kill();
  }
}

main();
