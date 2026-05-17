/**
 * Level-3 reproducer for #336 / PR #339 — Time State must persist across Stop.
 *
 * Exactly the user's reported workflow, with one continuous Rec spanning
 * phase 2 only:
 *   Phase 1: a "director" piece that `set :section, 2`, Run, play, STOP.
 *   Phase 2: the EXTRACTED `:arp` loop (reads `get[:section]`), Run, record.
 *
 * Pre-fix (globalStore.clear() in stop()): phase-2 `get[:section]` → nil →
 *   every `vol = X if s == N` false → amp 0 → SILENT WAV (RMS ~0).
 * Post-fix: :section survives Stop → vol 0.4 → AUDIBLE WAV (RMS > 0).
 *
 * The WAV is the observation; RMS/peak is the verdict.
 */
import { chromium } from 'playwright'
import { writeFileSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:5173/'
const OUT_DIR = resolve(process.cwd(), '.captures', 'timestate-across-stop')

const DIRECTOR = `live_loop :director do
  set :section, 2
  sleep 4
end`

const ARP_ONLY = `live_loop :arp do
  s = get[:section]
  use_synth :saw
  vol = 0
  vol = 0.2 if s == 0
  vol = 0.3 if s == 1
  vol = 0.4 if s == 2 or s == 4
  vol = 0.15 if s == 3
  co = 70
  co = 90 if s == 1
  co = 110 if s >= 2
  notes = scale(:a3, :minor_pentatonic, num_octaves: 2)
  with_fx :echo, phase: 0.25, decay: 4, mix: 0.4 do
    play notes.tick, release: 0.15, amp: vol, cutoff: co
    sleep 0.125
  end
end`

function wavRms(buf: Buffer): { rms: number; peak: number; durSec: number } {
  // Find 'data' chunk; samples are float32 LE (Recorder.ts raw float32 WAV).
  let off = 12
  let dataOff = -1
  let dataLen = 0
  while (off + 8 <= buf.length) {
    const id = buf.toString('ascii', off, off + 4)
    const sz = buf.readUInt32LE(off + 4)
    if (id === 'data') { dataOff = off + 8; dataLen = sz; break }
    off += 8 + sz + (sz & 1)
  }
  if (dataOff < 0) return { rms: 0, peak: 0, durSec: 0 }
  // Recorder.ts emits PCM 16-bit LE stereo @48k (audioFormat=1).
  const n = Math.floor(Math.min(dataLen, buf.length - dataOff) / 2)
  let sumSq = 0
  let peak = 0
  for (let i = 0; i < n; i++) {
    const s = buf.readInt16LE(dataOff + i * 2) / 32768
    sumSq += s * s
    const a = Math.abs(s)
    if (a > peak) peak = a
  }
  return { rms: Math.sqrt(sumSq / n), peak, durSec: n / 2 / 48000 }
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true })
  const browser = await chromium.launch({ headless: false })
  const page = await (await browser.newContext()).newPage()
  page.on('pageerror', e => console.error('[page error]', e.message))
  page.on('console', m => {
    if (m.type() === 'error') console.error('[console error]', m.text())
  })

  await page.goto(BASE_URL)
  await page.waitForTimeout(2000)

  await page.evaluate(() => {
    ;(window as unknown as { __wav: Blob | null }).__wav = null
    const oc = HTMLAnchorElement.prototype.click
    HTMLAnchorElement.prototype.click = function () {
      if (this.href?.startsWith('blob:') && this.download?.endsWith('.wav')) {
        fetch(this.href).then(r => r.blob()).then(b => {
          ;(window as unknown as { __wav: Blob }).__wav = b
        })
      } else { oc.call(this) }
    }
  })

  const editor = page.locator('.cm-content, textarea').first()
  const runBtn = page.locator('.spw-btn-label').filter({ hasText: /^(Run|Update)$/ }).first()
  const stopBtn = page.locator('button').filter({ hasText: 'Stop' }).first()
  const recBtn = page.getByTitle('Record to WAV').first()

  const paste = async (code: string) => {
    await editor.click()
    await page.keyboard.press('Meta+a')
    await page.keyboard.press('Backspace')
    await page.waitForTimeout(100)
    await editor.fill(code)
    await page.waitForTimeout(200)
  }

  // ── Phase 1: director sets :section, then STOP ──
  console.log('[ts] Phase 1: run :director (set :section, 2)…')
  await paste(DIRECTOR)
  await runBtn.click()
  await page.waitForFunction(
    () => document.querySelector('#app')?.textContent?.includes('Audio engine ready'),
    { timeout: 15000 },
  ).catch(() => {})
  await page.waitForTimeout(3000)            // let :director run + set state
  console.log('[ts] Phase 1: STOP (pre-fix this wipes Time State)')
  await stopBtn.click()
  await page.waitForTimeout(1000)

  // ── Phase 2: extracted :arp only, record the result ──
  // Run FIRST (engine live → stratum S1 → Rec available; Stop had dropped
  // it to S3). The state read happens at this Run, AFTER the phase-1 Stop —
  // that is precisely what the fix must make survive.
  console.log('[ts] Phase 2: paste :arp-only, Run…')
  await paste(ARP_ONLY)
  await runBtn.click()
  await page.waitForTimeout(1200)
  const btns = (await page.locator('button').allTextContents()).filter(t => t.trim())
  console.log('[ts] toolbar buttons after phase-2 Run:', btns.join(' | '))
  console.log('[ts] Phase 2: Rec ON, observe 7s…')
  await recBtn.waitFor({ timeout: 10000 })
  await recBtn.click()
  await page.waitForTimeout(7000)

  // Toggle the same recording button OFF — this fires the .wav blob download
  // (intercepted above). The 💾 toolbar button saves the CODE buffer, not the WAV.
  await recBtn.click()
  await page.waitForTimeout(3000)

  const b64 = await page.evaluate(async () => {
    const b = (window as unknown as { __wav: Blob | null }).__wav
    if (!b) return null
    const u = new Uint8Array(await b.arrayBuffer())
    let s = ''
    for (let i = 0; i < u.length; i += 8192) s += String.fromCharCode(...u.subarray(i, Math.min(i + 8192, u.length)))
    return btoa(s)
  })
  await page.locator('button').filter({ hasText: 'Stop' }).first().click().catch(() => {})
  await browser.close()

  if (!b64) throw new Error('no WAV captured')
  const wav = Buffer.from(b64, 'base64')
  const wavPath = resolve(OUT_DIR, 'arp-after-stop.wav')
  writeFileSync(wavPath, wav)
  const { rms, peak, durSec } = wavRms(wav)
  console.log(`\n[ts] WAV: ${wavPath} (${(wav.length / 1e6).toFixed(2)} MB, ~${durSec.toFixed(1)}s)`)
  console.log(`[ts] RMS=${rms.toFixed(5)}  Peak=${peak.toFixed(4)}`)
  const PASS = rms > 0.002
  console.log(`[ts] VERDICT: ${PASS ? 'PASS — :arp AUDIBLE after Stop (Time State survived)' : 'FAIL — silent (state wiped on Stop)'}`)
  process.exit(PASS ? 0 : 1)
}

main()
