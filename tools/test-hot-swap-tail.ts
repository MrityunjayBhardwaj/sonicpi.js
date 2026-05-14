/**
 * Reproducer for #296 — captures the click-on-Run artifact.
 *
 * Snippet: a single live_loop holding a long-sustain :prophet pad inside a
 * persistent :reverb FX. We click Run, wait 2s while the pad is mid-envelope,
 * then click Run again with IDENTICAL code (still triggers hot-swap because
 * the engine doesn't know it's identical until the SV35 short-circuit — and
 * even then we want to verify we don't break anything on real changes).
 *
 * Pre-fix: /g_freeAll 100 kills the pad mid-envelope → audible click at the
 * Run boundary, then a fresh pad onset.
 * Post-fix: pad finishes its envelope; new iteration triggers fresh pad
 * underneath; no click.
 *
 * Usage:
 *   npx tsx tools/test-hot-swap-tail.ts [--swap-changed]
 *
 * --swap-changed: instead of identical re-run (SV35 no-op), modify one byte
 *                 to force the changed-code hot-swap path.
 */
import { chromium } from '@playwright/test'
import { mkdirSync, writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const OUT_DIR = resolve(ROOT, '.captures/hot-swap-tail')
const BASE_URL = process.env.BASE_URL ?? 'http://localhost:5173'
const HEADED = process.argv.includes('--headed')
const SWAP_CHANGED = process.argv.includes('--swap-changed')
const TRIAL_LABEL = process.env.TRIAL_LABEL ?? (SWAP_CHANGED ? 'changed' : 'identical')
const PRE_RUN_MS = 2500  // time playing before the Run-during-pad
const POST_RUN_MS = 3500 // time after Run to capture the tail behavior
const SETTLE_MS = 1500

// A held pad that runs ONCE per iteration. The iteration length is long
// (sleep 8) so when we click Run during the iteration, the pad note is
// mid-envelope. The reverb wraps it so we also exercise FX preservation.
const SNIPPET_A = `# hot-swap-tail repro
use_bpm 60

with_fx :reverb, mix: 0.6, room: 0.8 do
  live_loop :pad do
    use_synth :saw
    play :c3, sustain: 6, release: 1, amp: 0.4, cutoff: 90
    sleep 8
  end
end

live_loop :tick_clock do
  sleep 1
end
`

// Identical to SNIPPET_A except for a comment marker — SV35 short-circuit
// will see currentCode !== code and run the full hot-swap path.
const SNIPPET_B = SNIPPET_A.replace('# hot-swap-tail repro', '# hot-swap-tail repro (mutated)')

mkdirSync(OUT_DIR, { recursive: true })

async function installWavInterceptor(page: import('@playwright/test').Page) {
  await page.evaluate(() => {
    ;(window as unknown as { __capturedWavBlob: Blob | null }).__capturedWavBlob = null
    const origClick = HTMLAnchorElement.prototype.click
    HTMLAnchorElement.prototype.click = function () {
      if (this.href?.startsWith('blob:') && this.download?.endsWith('.wav')) {
        fetch(this.href).then(r => r.blob()).then(b => {
          ;(window as unknown as { __capturedWavBlob: Blob }).__capturedWavBlob = b
        })
      } else {
        origClick.call(this)
      }
    }
  })
}

async function main() {
  const browser = await chromium.launch({ headless: !HEADED })
  const ctx = await browser.newContext()
  const page = await ctx.newPage()
  page.on('pageerror', err => console.error('[page error]', err.message))
  page.on('console', m => {
    if (m.type() === 'error') console.error(`[console error] ${m.text()}`)
  })

  await page.goto(BASE_URL)
  await page.waitForTimeout(2000)

  const editor = page.locator('.cm-content, textarea').first()
  await editor.click()
  await page.keyboard.press('Meta+a')
  await page.keyboard.press('Backspace')
  await editor.fill(SNIPPET_A)
  await page.waitForTimeout(200)

  const runBtn = page.locator('.spw-btn-label').filter({ hasText: /^(Run|Update)$/ }).first()
  const stopBtnLocator = page.locator('button').filter({ hasText: 'Stop' }).first()

  console.log('[tail] priming Run to warm engine...')
  await runBtn.click()
  await page.waitForFunction(
    () => document.querySelector('#app')?.textContent?.includes('Audio engine ready'),
    { timeout: 15000 },
  ).catch(() => {})
  await page.waitForTimeout(SETTLE_MS)
  await stopBtnLocator.click()
  await page.waitForTimeout(800)

  // Start continuous Rec — the same button flips label Rec ↔ Save when armed,
  // so we lock onto it via the stable title attribute.
  await installWavInterceptor(page)
  const recBtn = page.locator('button[title="Record to WAV"]').first()
  await recBtn.click()

  // First Run — pad starts
  console.log(`[tail] Run #1 — pad starts (recording for ${PRE_RUN_MS}ms before hot-swap)`)
  await runBtn.click()
  await page.waitForTimeout(PRE_RUN_MS)

  // Mid-envelope: do the hot-swap
  if (SWAP_CHANGED) {
    console.log('[tail] mutating snippet for changed-code hot-swap')
    await editor.click()
    await page.keyboard.press('Meta+a')
    await page.keyboard.press('Backspace')
    await editor.fill(SNIPPET_B)
    await page.waitForTimeout(100)
  }
  console.log('[tail] Run #2 — hot-swap during pad')
  await runBtn.click()
  await page.waitForTimeout(POST_RUN_MS)

  // Stop Rec — same button (title="Record to WAV") now labeled Save and
  // clicking it triggers the WAV download which the interceptor catches.
  await recBtn.click()
  await page.waitForTimeout(2500)

  const b64 = await page.evaluate(async () => {
    const blob = (window as unknown as { __capturedWavBlob: Blob | null }).__capturedWavBlob
    if (!blob) return null
    const buf = await blob.arrayBuffer()
    const bytes = new Uint8Array(buf)
    let s = ''
    const cs = 8192
    for (let i = 0; i < bytes.length; i += cs) {
      s += String.fromCharCode(...bytes.subarray(i, Math.min(i + cs, bytes.length)))
    }
    return btoa(s)
  })
  if (!b64) throw new Error('no WAV blob captured')
  const wav = Buffer.from(b64, 'base64')
  const wavPath = resolve(OUT_DIR, `${TRIAL_LABEL}.wav`)
  writeFileSync(wavPath, wav)
  console.log(`[tail] wrote ${wavPath} (${wav.length} bytes, ~${(wav.length / 4 / 48000).toFixed(2)}s float32 stereo @48k)`)
  console.log(`[tail] Run #2 click happened around t=${(SETTLE_MS / 1000).toFixed(2)}s + ${(PRE_RUN_MS / 1000).toFixed(2)}s into capture`)

  const stopBtn = page.locator('button').filter({ hasText: 'Stop' }).first()
  if (await stopBtn.count() > 0) await stopBtn.click()
  await browser.close()
}

main().catch(err => { console.error(err); process.exit(1) })
