import { chromium } from '@playwright/test'
import { readFileSync } from 'fs'

const main = async () => {
  const browser = await chromium.launch({
    headless: false,
    args: ['--autoplay-policy=no-user-gesture-required'],
  })
  const page = await browser.newPage()

  const logs: string[] = []
  page.on('console', msg => {
    const text = msg.text()
    if (text.startsWith('[MONITOR]')) {
      logs.push(text)
      console.log(text)
    }
  })

  await page.goto('http://localhost:5173')
  await page.waitForTimeout(2000)

  // Inject monitor — pure strings, no function declarations (tsx __name issue)
  await page.addScriptTag({ content: `
    (() => {
      const lagSamples = [];
      const longTasks = [];
      const frameTimes = [];
      let lastFrame = 0;
      window.__monitorRunning = true;

      const measureLag = () => {
        const t0 = performance.now();
        setTimeout(() => {
          lagSamples.push(performance.now() - t0);
          if (window.__monitorRunning) measureLag();
        }, 0);
      };
      measureLag();

      try {
        new PerformanceObserver(list => {
          for (const e of list.getEntries()) longTasks.push({ duration: e.duration });
        }).observe({ type: 'longtask', buffered: true });
      } catch(e) {}

      const measureFrames = (ts) => {
        if (lastFrame > 0) frameTimes.push(ts - lastFrame);
        lastFrame = ts;
        if (window.__monitorRunning) requestAnimationFrame(measureFrames);
      };
      requestAnimationFrame(measureFrames);

      const t0 = performance.now();
      setInterval(() => {
        if (!window.__monitorRunning) return;
        const elapsed = ((performance.now() - t0) / 1000).toFixed(0);
        const lag = lagSamples.splice(0);
        const lt = longTasks.splice(0);
        const fr = frameTimes.splice(0);

        const avgLag = lag.length ? (lag.reduce((a,b)=>a+b,0)/lag.length).toFixed(1) : '?';
        const maxLag = lag.length ? Math.max(...lag).toFixed(0) : '?';
        const p95 = lag.length > 5 ? lag.sort((a,b)=>a-b)[Math.floor(lag.length*0.95)].toFixed(0) : '?';
        const ltCount = lt.length;
        const ltMax = lt.length ? Math.max(...lt.map(t=>t.duration)).toFixed(0) : '0';
        const fps = fr.length ? (1000/(fr.reduce((a,b)=>a+b,0)/fr.length)).toFixed(0) : '?';
        const dropped = fr.filter(f => f > 33).length;

        // Read SuperSonic metrics via exposed engine
        var ssInfo = '';
        try {
          var engine = window.__spw_engine;
          if (engine && engine.getMetrics) {
            var m = engine.getMetrics();
            if (m) {
              ssInfo = ' | ss:' +
                ' nodes=' + (m.nodeCount != null ? m.nodeCount : '?') +
                ' drop=' + (m.scsynthMessagesDropped || 0) +
                ' late=' + (m.scsynthLateExecutions || 0) +
                ' inBuf=' + (m.inBufferUsed && m.inBufferUsed.percentage != null ? m.inBufferUsed.percentage.toFixed(0) + '%' : '?') +
                ' mode=' + (m.transportMode || '?');
            } else {
              ssInfo = ' | ss: no metrics';
            }
          } else {
            ssInfo = ' | ss: engine not ready';
          }
        } catch(e) { ssInfo = ' | ss: error'; }

        console.log('[MONITOR] t=' + elapsed + 's | loop: avg=' + avgLag + 'ms max=' + maxLag + 'ms p95=' + p95 + 'ms | longTasks: ' + ltCount + ' (max ' + ltMax + 'ms) | fps: ' + fps + ' dropped: ' + dropped + ssInfo);
      }, 5000);
    })();
  `})

  // Paste code and run
  const code = readFileSync('/tmp/thread_monitor.rb', 'utf8')
  const editor = page.locator('.cm-content, textarea').first()
  await editor.click()
  await page.keyboard.press('Meta+a')
  await page.keyboard.press('Backspace')
  await page.waitForTimeout(100)
  await editor.fill(code)
  await page.waitForTimeout(500)

  const runBtn = page.locator('.spw-btn-label:has-text("Run")')
  await runBtn.click()
  await page.waitForFunction(
    () => document.querySelector('#app')?.textContent?.includes('Audio engine ready'),
    { timeout: 15000 }
  ).catch(() => {})

  console.log('\n=== Monitoring thread load for 45 seconds ===\n')
  await page.waitForTimeout(45000)

  await page.evaluate(() => { (window as any).__monitorRunning = false })
  await page.waitForTimeout(500)
  await browser.close()

  console.log('\n=== FULL RESULTS ===')
  for (const l of logs) console.log(l)
}

main().catch(err => { console.error(err); process.exit(1) })
