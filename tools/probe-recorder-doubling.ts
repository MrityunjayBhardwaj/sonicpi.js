/**
 * Diagnostic — does pressing Save (recorder.stop) cause audible doubling
 * at AudioContext.destination?
 *
 * Strategy
 * --------
 * The engine's master analyser sits BEFORE masterGainNode. The Recorder's
 * silentSink connects in parallel: analyser → ScriptProcessor → silentSink
 * (gain=0) → destination. If silentSink leaks (or anything else sums into
 * destination), the engine's analyser cannot see it — analyser is upstream.
 *
 * To observe what actually reaches the speakers, we install a "destinationTap"
 * inside the page: a second AnalyserNode that we wire in parallel to every
 * audible output by intercepting AudioNode.connect when the destination is
 * the AudioContext destination.
 *
 * Run: `npx tsx tools/probe-recorder-doubling.ts`
 */

import { chromium, firefox } from '@playwright/test'

const BROWSER = process.env.BROWSER ?? 'chromium'

const URL = process.env.BASE_URL ?? 'http://localhost:5173'
const CODE = `use_bpm 120
live_loop :a do
  sample :bd_haus
  sleep 0.5
end
live_loop :b do
  sleep 0.25
  sample :elec_blip, rate: 1.5
  sleep 0.25
end`

async function main() {
  console.log(`  browser=${BROWSER}`)
  const launcher = BROWSER === 'firefox' ? firefox : chromium
  const browser = await launcher.launch({
    headless: false,
    args: BROWSER === 'firefox' ? [] : ['--autoplay-policy=no-user-gesture-required'],
  })
  const ctx = await browser.newContext()
  const page = await ctx.newPage()

  page.on('console', (msg) => {
    const t = msg.text()
    if (t.startsWith('[probe]')) console.log('  page:', t)
  })
  page.on('pageerror', (err) => console.log('  pageerr:', err.message))

  await page.addInitScript(() => {
    ;(window as unknown as Record<string, unknown>).__recorderTrace = true
    ;(window as unknown as Record<string, unknown>).__recorderTraceEvents = []
  })

  await page.goto(URL)
  await page.waitForSelector('.spw-btn-label:has-text("Run")', { timeout: 10000 })

  // Paste code into editor.
  const editor = page.locator('.cm-content, textarea').first()
  await editor.click()
  await page.keyboard.press('Meta+a')
  await page.keyboard.press('Backspace')
  await page.waitForTimeout(100)
  await editor.fill(CODE)
  await page.waitForTimeout(200)

  // Click Run.
  await page.locator('.spw-btn-label:has-text("Run")').click()
  console.log('  clicked Run, waiting for engine ready...')
  await page.waitForFunction(
    () => document.querySelector('#app')?.textContent?.includes('Audio engine ready'),
    { timeout: 30000 },
  )
  console.log('  engine ready')
  await page.waitForTimeout(800)

  // Install destination-tap and a connect() interceptor.
  await page.evaluate(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const e = (window as any).__spw_engine
    const audioCtx: AudioContext = e.components.audio.audioCtx
    const masterGain: AudioNode = e.bridge.masterOutputNode
    if (!masterGain) throw new Error('masterOutputNode not exposed on bridge')

    const tapMaster = audioCtx.createAnalyser()
    tapMaster.fftSize = 2048
    tapMaster.smoothingTimeConstant = 0
    masterGain.connect(tapMaster)
    ;(window as unknown as Record<string, unknown>).__tapMaster = tapMaster

    const tapDest = audioCtx.createAnalyser()
    tapDest.fftSize = 2048
    tapDest.smoothingTimeConstant = 0
    ;(window as unknown as Record<string, unknown>).__tapDest = tapDest
    ;(window as unknown as Record<string, unknown>).__tapDestNodes = []

    const origConnect = AudioNode.prototype.connect
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(AudioNode.prototype.connect as any) = function (this: AudioNode, dest: any, ...rest: unknown[]) {
      if (dest === audioCtx.destination) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ;(origConnect as any).call(this, tapDest)
          ;((window as unknown as Record<string, unknown>).__tapDestNodes as unknown[]).push({
            ctor: this.constructor.name,
            t: performance.now(),
            channels: this.channelCount,
          })
          console.log('[probe] node connected to destination:', this.constructor.name)
        } catch (err) {
          console.log('[probe] tap connect failed:', String(err))
        }
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (origConnect as any).call(this, dest, ...rest)
    }

    // Retroactively tap masterGain (already connected to destination before our wrap).
    masterGain.connect(tapDest)
    ;((window as unknown as Record<string, unknown>).__tapDestNodes as unknown[]).push({
      ctor: 'GainNode (master, retro)',
      t: performance.now(),
      channels: masterGain.channelCount,
    })
    console.log('[probe] taps installed')
  })

  // Sampler helper.
  const sampleRms = async (label: string, durationMs: number) => {
    const result = await page.evaluate(async ({ label, durationMs }) => {
      const tapMaster = (window as unknown as Record<string, unknown>).__tapMaster as AnalyserNode
      const tapDest = (window as unknown as Record<string, unknown>).__tapDest as AnalyserNode
      const start = performance.now()
      const samples: { master: number; dest: number }[] = []
      const bufM = new Float32Array(tapMaster.fftSize)
      const bufD = new Float32Array(tapDest.fftSize)
      while (performance.now() - start < durationMs) {
        tapMaster.getFloatTimeDomainData(bufM)
        tapDest.getFloatTimeDomainData(bufD)
        let sumM = 0, sumD = 0
        for (let i = 0; i < bufM.length; i++) sumM += bufM[i] * bufM[i]
        for (let i = 0; i < bufD.length; i++) sumD += bufD[i] * bufD[i]
        samples.push({
          master: Math.sqrt(sumM / bufM.length),
          dest: Math.sqrt(sumD / bufD.length),
        })
        await new Promise((r) => setTimeout(r, 16))
      }
      const meanM = samples.reduce((a, s) => a + s.master, 0) / samples.length
      const meanD = samples.reduce((a, s) => a + s.dest, 0) / samples.length
      const peakM = samples.reduce((a, s) => Math.max(a, s.master), 0)
      const peakD = samples.reduce((a, s) => Math.max(a, s.dest), 0)
      const ratio = meanM > 0 ? meanD / meanM : 0
      return { label, count: samples.length, meanMaster: meanM, meanDest: meanD, peakMaster: peakM, peakDest: peakD, ratio }
    }, { label, durationMs })
    console.log(
      `  [${result.label}]\n      master rms=${result.meanMaster.toFixed(5)} pk=${result.peakMaster.toFixed(5)}\n        dest rms=${result.meanDest.toFixed(5)} pk=${result.peakDest.toFixed(5)}\n      dest/master ratio=${result.ratio.toFixed(3)}  (n=${result.count})`,
    )
    return result
  }

  await page.waitForTimeout(1500)
  await sampleRms('T0 baseline (no rec)', 1500)

  // The Rec/Save toggle button has title="Record to WAV". The other "Save"
  // button is for buffer save. Pick the right one by title.
  const recToggle = page.locator('button[title="Record to WAV"]')
  await recToggle.click()
  console.log('  clicked Rec')
  await page.waitForTimeout(800)
  await sampleRms('T1 during recording', 1500)

  // Snapshot which nodes are connected to destination right before Save.
  const nodesBefore = await page.evaluate(() => (window as unknown as Record<string, unknown>).__tapDestNodes)
  console.log('  destination-connected nodes BEFORE Save:', JSON.stringify(nodesBefore, null, 2))

  // Suppress the debugger so the test can run unattended.
  await page.evaluate(() => { (window as unknown as Record<string, unknown>).__recorderTrace = false })
  await recToggle.click()
  console.log('  clicked Save (Rec→Save toggle)')
  // Re-enable so the trace events from stop() get appended.
  await page.evaluate(() => { (window as unknown as Record<string, unknown>).__recorderTrace = true })

  await page.waitForTimeout(200)
  await sampleRms('T2 +200ms after Save', 1500)
  await sampleRms('T3 +1.7s after Save', 1500)
  await sampleRms('T4 +3.2s after Save', 1500)

  const traceEvents = await page.evaluate(() => (window as unknown as Record<string, unknown>).__recorderTraceEvents)
  console.log('  recorder trace events:', JSON.stringify(traceEvents, null, 2))

  await page.locator('button').filter({ hasText: /^Stop$/ }).first().click().catch(() => {})
  await page.waitForTimeout(500)
  await browser.close()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
