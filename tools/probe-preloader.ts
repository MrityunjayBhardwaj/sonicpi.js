/**
 * Diagnostic — verify the preloader renders, progresses through every
 * step's label, hits 100%, fades out, and lets the App mount.
 *
 * Captures: the sequence of (label, percent) updates seen by the user,
 * total preload time, and whether the App's editor mounts after fade.
 *
 * Run:  npx tsx tools/probe-preloader.ts
 */

import { chromium } from '@playwright/test'

const URL = process.env.BASE_URL ?? 'http://localhost:5173'

async function main() {
  const browser = await chromium.launch({
    headless: false,
    args: ['--autoplay-policy=no-user-gesture-required'],
  })
  const ctx = await browser.newContext()
  const page = await ctx.newPage()

  // Throttle network so the preloader's progress is observable. Without
  // throttling on a fast connection the steps complete in <50 ms each
  // and the bar appears to skip from 0 to 100. The probe still works
  // un-throttled but the trace is less informative.
  // (Playwright's CDP route lets us slow only image/script/wasm — nothing
  //  fancy needed here, the comment is for the human reader.)

  page.on('console', (msg) => {
    const t = msg.text()
    if (t.startsWith('[preloader]')) console.log('  page:', t)
  })
  page.on('pageerror', (err) => console.log('  pageerr:', err.message))

  // Install a MutationObserver in-page so we capture every status / percent
  // change BEFORE the preloader fades out, even on a fast connection.
  // Pass as raw string to bypass tsx's __name closure-rewriting which
  // breaks page.evaluate of arrow-function source (capture.ts uses the
  // same workaround).
  await page.addInitScript(`(function () {
    window.__preloadTrace = [];
    setInterval(function () {
      var overlay = document.getElementById('spw-preloader');
      if (!overlay) return;
      var spans = overlay.querySelectorAll('div > span');
      var status = (spans[0] && spans[0].textContent) || '';
      var percent = (spans[1] && spans[1].textContent) || '';
      var trace = window.__preloadTrace;
      var last = trace[trace.length - 1];
      if (!last || last.status !== status || last.percent !== percent) {
        trace.push({ t: performance.now(), status: status, percent: percent });
      }
    }, 16);
  })()`)

  const t0 = Date.now()
  await page.goto(URL)

  // Wait for the App's Run button — the preloader has fully finished by then.
  await page.waitForSelector('.spw-btn-label:has-text("Run")', { timeout: 30000 })
  const elapsed = Date.now() - t0
  console.log(`  app mounted in ${elapsed} ms`)

  // Collect the trace.
  const trace = await page.evaluate(() => (window as unknown as Record<string, unknown>).__preloadTrace as unknown[])
  console.log(`  preload trace (${(trace as unknown[]).length} samples):`)
  console.log(JSON.stringify(trace, null, 2))

  // Verify the preloader actually disappeared.
  const preloaderStillThere = await page.evaluate(() => !!document.getElementById('spw-preloader'))
  console.log(`  preloader removed from DOM: ${!preloaderStillThere}`)

  await browser.close()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
