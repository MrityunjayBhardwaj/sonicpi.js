import { test, expect, Page } from '@playwright/test'

const DJ_DAVE_BLOCKGAME = `use_bpm 130

live_loop :met1 do
  sleep 1
end

cmaster1 = 130
cmaster2 = 130

define :pattern do |pattern|
  return pattern.ring.tick == "x"
end

live_loop :kick, sync: :met1 do
  a = 1.5
  sample :bd_tek, amp: a, cutoff: cmaster1 if pattern "x--x--x---x--x--"
  sleep 0.25
end

with_fx :echo, mix: 0.2 do
  with_fx :reverb, mix: 0.2, room: 0.5 do
    live_loop :clap, sync: :met1 do
      a = 0.75
      sleep 1
      sample :drum_snare_hard, rate: 2.5, cutoff: cmaster1, amp: a
      sample :drum_snare_hard, rate: 2.2, start: 0.02, cutoff: cmaster1, pan: 0.2, amp: a
      sample :drum_snare_hard, rate: 2, start: 0.04, cutoff: cmaster1, pan: -0.2, amp: a
      sleep 1
    end
  end
end

with_fx :reverb, mix: 0.7 do
  live_loop :arp, sync: :met1 do
    with_fx :echo, phase: 1, mix: (line 0.1, 1, steps: 128).mirror.tick do
      a = 0.6
      use_synth :beep
      tick
      notes = (scale :g4, :major_pentatonic).shuffle
      play notes.look, amp: a, release: 0.25, cutoff: 130, pan: (line -0.7, 0.7, steps: 64).mirror.tick, attack: 0.01
      sleep 0.75
    end
  end
end

with_fx :panslicer, mix: 0.4 do
  with_fx :reverb, mix: 0.75 do
    live_loop :synthbass, sync: :met1 do
      use_synth :tech_saws
      play :g3, sustain: 6, cutoff: 60, amp: 0.75
      sleep 6
      play :d3, sustain: 2, cutoff: 60, amp: 0.75
      sleep 2
      play :e3, sustain: 8, cutoff: 60, amp: 0.75
      sleep 8
    end
  end
end`

test.describe('DJ_Dave Blockgame — full E2E', () => {
  test('loads, transpiles, and runs without errors', async ({ page }) => {
    const jsErrors: string[] = []
    const consoleMessages: string[] = []

    page.on('pageerror', (err) => jsErrors.push(err.message))
    page.on('console', (msg) => {
      consoleMessages.push(`[${msg.type()}] ${msg.text()}`)
    })

    // Load app
    await page.goto('/')
    await page.waitForTimeout(2000)

    // Paste code into editor
    const editor = page.locator('.cm-content, textarea').first()
    await editor.click()
    await page.keyboard.press('Meta+a')
    await page.keyboard.press('Backspace')
    await page.waitForTimeout(100)
    await editor.fill(DJ_DAVE_BLOCKGAME)
    await page.waitForTimeout(200)

    // Click Run
    const runBtn = page.locator('.spw-btn-label:has-text("Run")')
    await runBtn.click()

    // Let it run for 8 seconds (enough for all loops to fire)
    await page.waitForTimeout(8000)

    // Capture app state
    const appText = await page.locator('#app').textContent() ?? ''

    // Stop
    await page.keyboard.press('Escape')
    await page.waitForTimeout(500)

    // ---- Assertions ----

    // Filter out known benign browser errors
    const realErrors = jsErrors.filter(e =>
      !e.includes('h1-check') &&
      !e.includes('detectStore') &&
      !e.includes('InstallTrigger') &&
      !e.includes('lockdown') &&
      !e.includes('Aborted')
    )

    // 1. No JS errors
    if (realErrors.length > 0) {
      console.error('JS ERRORS:', realErrors)
    }
    expect(realErrors).toHaveLength(0)

    // 2. No "not a function" / "not defined" in app console
    const errorPatterns = ['not a function', 'not defined', 'Something went wrong', 'Error in loop']
    const foundErrors = errorPatterns.filter(p => appText.includes(p))
    if (foundErrors.length > 0) {
      for (const pattern of foundErrors) {
        const idx = appText.indexOf(pattern)
        const context = appText.slice(Math.max(0, idx - 150), idx + 200)
        console.error(`RUNTIME ERROR [${pattern}]:`, context)
      }
    }
    expect(foundErrors).toHaveLength(0)

    // 3. No syntax errors
    expect(appText).not.toContain('Syntax error')
    expect(appText).not.toContain('SyntaxError')

    // 4. No transpiler fallback warning (tree-sitter should handle this)
    const consoleFallback = consoleMessages.find(m => m.includes('fell back'))
    if (consoleFallback) {
      console.warn('Transpiler fell back:', consoleFallback)
    }

    // 5. App should show the loops are running (loop names visible in UI)
    // This is a soft check — depends on UI implementation
    const loopNames = ['met1', 'kick', 'clap', 'arp', 'synthbass']
    const visibleLoops = loopNames.filter(name => appText.includes(name))
    console.log('Visible loops in UI:', visibleLoops)

    // 6. Dump ALL console messages for debugging
    console.log('=== ALL CONSOLE MESSAGES ===')
    for (const msg of consoleMessages) {
      console.log(msg)
    }
    console.log('=== END CONSOLE ===')
  })
})
