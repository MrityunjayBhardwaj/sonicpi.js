// End-to-end batch runner — drives the live dev server with every Ruby
// file in the book/community/e2e test suites and every built-in example
// from the dropdown. Reports pass/fail per file and summary counts.
//
// One browser context is reused across all files for speed. Between
// files we swap the editor contents and click Run; no page reload.
//
// Usage: npx tsx tools/test-corpora.mjs [--max N] [--headless]

import { chromium } from '@playwright/test'
import { readFileSync, writeFileSync, readdirSync } from 'fs'
import { join } from 'path'

const ROOT = process.cwd()
const args = process.argv.slice(2)
const maxArg = args.find(a => a.startsWith('--max='))
const MAX = maxArg ? parseInt(maxArg.split('=')[1]) : Infinity
const HEADLESS = args.includes('--headless')

const ERROR_PATTERNS = [
  'not a function',
  'not defined',
  'Something went wrong',
  'Syntax error',
  'Error in loop',
  "isn't available",
  'Unexpected identifier',
  'Unexpected token',
  'TypeError',
  'ReferenceError',
  'Infinite loop detected',
]

function listRb(dir) {
  try {
    return readdirSync(join(ROOT, dir))
      .filter(f => f.endsWith('.rb'))
      .map(f => ({ bucket: dir, name: f, path: join(ROOT, dir, f) }))
      .sort((a, b) => a.name.localeCompare(b.name))
  } catch { return [] }
}

const CORPORA = [
  ...listRb('tests/book-examples'),
  ...listRb('tests/book-examples/community'),
  ...listRb('tools/audio_comparison/e2e_test_suite'),
]

const BUILTIN_EXAMPLES = [
  'Hello Beep',
  'Basic Beat',
  'Ambient Pad',
  'Arpeggio',
  'Euclidean Rhythm',
  'Random Melody',
  'Sync/Cue',
  'Multi-Layer',
  'FX Chain',
  'Minimal Techno',
  'DnB',
  'House',
  'Full Composition',
  'DJ Dave',
  'Blade Runner x Techno',
  'Snowflight',
  'Dark Ambience',
  'Ambient Lead',
]

const ENTRIES = [
  ...CORPORA.slice(0, MAX).map(e => ({ kind: 'file', ...e })),
  ...BUILTIN_EXAMPLES.map(n => ({ kind: 'builtin', bucket: 'builtin', name: n, path: n })),
]

console.log(`# Running ${ENTRIES.length} entries (${CORPORA.length} files + ${BUILTIN_EXAMPLES.length} builtins)`)
console.log('')

const browser = await chromium.launch({ headless: HEADLESS })
const context = await browser.newContext()
const page = await context.newPage()

// Error collection — reset per entry
let currentEntry = null
const jsErrors = []
page.on('pageerror', (err) => {
  if (currentEntry && !err.message.includes('h1-check') && !err.message.includes('detectStore')) {
    jsErrors.push({ entry: currentEntry.name, msg: err.message })
  }
})
page.on('console', (msg) => {
  if (currentEntry && msg.type() === 'error') {
    const t = msg.text()
    if (!t.includes('Cross-Origin') && !t.includes('CORS') && !t.includes('404') && !t.includes('ERR_FAILED')) {
      jsErrors.push({ entry: currentEntry.name, msg: t })
    }
  }
})

await page.goto('http://localhost:5173')
await page.waitForTimeout(2500)

const runBtn = page.locator('.spw-btn-label:has-text("Run")')
const stopBtn = page.locator('.spw-btn-label:has-text("Stop")').first()
const editor = page.locator('.cm-content, textarea').first()
const dropdown = page.locator('select').first()

// One initial Run to make the engine reach "Audio engine ready" state
await editor.click()
await page.keyboard.press('Meta+a')
await page.keyboard.press('Backspace')
await editor.fill('play 60')
await runBtn.click()
await page.waitForFunction(
  () => document.querySelector('#app')?.textContent?.includes('Audio engine ready'),
  { timeout: 20000 }
).catch(() => {})
await page.waitForTimeout(1500)
await page.keyboard.press('Escape')
await page.waitForTimeout(500)

const results = []

async function clearConsolePanel() {
  // Best-effort: click the Cue Log "Clear" button if present
  const clr = page.locator('button:has-text("Clear")').first()
  if (await clr.count()) await clr.click().catch(() => {})
}

async function runEntry(entry) {
  currentEntry = entry
  const before = jsErrors.length
  try {
    if (entry.kind === 'builtin') {
      // Select from dropdown
      const count = await dropdown.count()
      if (count === 0) {
        return { ...entry, status: 'SKIP', reason: 'no dropdown' }
      }
      await dropdown.selectOption({ label: entry.name }).catch(async () => {
        // try as value
        await dropdown.selectOption(entry.name).catch(() => {})
      })
      await page.waitForTimeout(300)
    } else {
      const src = readFileSync(entry.path, 'utf-8')
      await editor.click()
      await page.keyboard.press('Meta+a')
      await page.keyboard.press('Backspace')
      await page.waitForTimeout(50)
      await editor.fill(src)
      await page.waitForTimeout(100)
    }

    await runBtn.click()
    await page.waitForTimeout(3000)

    // Inspect app text for error markers
    const appText = (await page.locator('#app').textContent()) ?? ''
    const uiErrors = ERROR_PATTERNS.filter(p => appText.includes(p))
    const newJsErrors = jsErrors.slice(before)

    // Press Escape to stop
    await page.keyboard.press('Escape')
    await page.waitForTimeout(400)

    if (uiErrors.length === 0 && newJsErrors.length === 0) {
      return { ...entry, status: 'OK' }
    }
    return {
      ...entry,
      status: 'FAIL',
      uiErrors,
      jsErrors: newJsErrors.map(e => e.msg).slice(0, 3),
    }
  } catch (err) {
    return { ...entry, status: 'CRASH', err: String(err).slice(0, 200) }
  }
}

for (const entry of ENTRIES) {
  const r = await runEntry(entry)
  results.push(r)
  const mark = r.status === 'OK' ? 'OK ' : r.status === 'FAIL' ? 'FAIL' : r.status
  const suffix = r.status === 'FAIL'
    ? ` — ${[...(r.uiErrors || []), ...(r.jsErrors || [])].slice(0, 2).join(' | ').slice(0, 120)}`
    : r.status === 'CRASH' ? ` — ${r.err}` : ''
  console.log(`[${mark}] ${r.bucket}/${r.name}${suffix}`)
}

await browser.close()

// Summary by bucket
const byBucket = {}
for (const r of results) {
  if (!byBucket[r.bucket]) byBucket[r.bucket] = { total: 0, ok: 0, fail: 0, crash: 0, skip: 0 }
  const b = byBucket[r.bucket]
  b.total++
  if (r.status === 'OK') b.ok++
  else if (r.status === 'FAIL') b.fail++
  else if (r.status === 'CRASH') b.crash++
  else if (r.status === 'SKIP') b.skip++
}

console.log('')
console.log('# Summary')
console.log('| bucket | total | OK | FAIL | CRASH | SKIP |')
console.log('|---|---|---|---|---|---|')
for (const [b, s] of Object.entries(byBucket)) {
  console.log(`| ${b} | ${s.total} | ${s.ok} | ${s.fail} | ${s.crash} | ${s.skip} |`)
}

const totalOk = results.filter(r => r.status === 'OK').length
const totalFail = results.filter(r => r.status === 'FAIL').length
const totalCrash = results.filter(r => r.status === 'CRASH').length
console.log('')
console.log(`TOTAL: ${results.length}  OK: ${totalOk}  FAIL: ${totalFail}  CRASH: ${totalCrash}`)

// Dump failures in detail
const failures = results.filter(r => r.status === 'FAIL' || r.status === 'CRASH')
if (failures.length > 0) {
  console.log('')
  console.log('# Failures (detail)')
  for (const f of failures) {
    console.log(`\n## ${f.bucket}/${f.name} (${f.status})`)
    if (f.uiErrors?.length) console.log(`  UI patterns: ${f.uiErrors.join(', ')}`)
    if (f.jsErrors?.length) for (const m of f.jsErrors) console.log(`  JS: ${m}`)
    if (f.err) console.log(`  crash: ${f.err}`)
  }
}

// Persist
writeFileSync('.captures/corpora-results.json', JSON.stringify(results, null, 2))
console.log('\nResults saved to .captures/corpora-results.json')

process.exit(totalFail + totalCrash > 0 ? 1 : 0)
