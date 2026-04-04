/**
 * Test 100 Sonic Pi examples through the full engine pipeline.
 * Checks: transpilation (tree-sitter + fallback), evaluation (no JS errors),
 * and query (events produced for examples with play/sample).
 */

import { initTreeSitter, treeSitterTranspile, isTreeSitterReady } from '../src/engine/TreeSitterTranspiler'
import { autoTranspileDetailed } from '../src/engine/RubyTranspiler'
import { SonicPiEngine } from '../src/engine/SonicPiEngine'
import * as fs from 'fs'

interface Example {
  name: string
  code: string
}

interface Result {
  name: string
  treeSitter: 'ok' | 'fallback' | 'error'
  tsError?: string
  evaluate: 'ok' | 'error' | 'skip'
  evalError?: string
  events: number
}

async function main() {
  // Load examples
  const examples: Example[] = JSON.parse(
    fs.readFileSync('./tools/sonic_pi_100_examples.json', 'utf-8')
  )
  console.log(`Loaded ${examples.length} examples\n`)

  // Init tree-sitter
  const tsOk = await initTreeSitter({
    treeSitterWasmUrl: './node_modules/web-tree-sitter/tree-sitter.wasm',
    rubyWasmUrl: './node_modules/tree-sitter-wasms/out/tree-sitter-ruby.wasm',
  })
  console.log(`Tree-sitter init: ${tsOk}\n`)

  const results: Result[] = []
  let passCount = 0
  let failCount = 0

  for (let i = 0; i < examples.length; i++) {
    const ex = examples[i]
    const result: Result = {
      name: ex.name,
      treeSitter: 'error',
      evaluate: 'skip',
      events: 0,
    }

    // 1. Tree-sitter transpile
    if (isTreeSitterReady()) {
      const tsResult = treeSitterTranspile(ex.code)
      if (tsResult.ok) {
        // Validate JS
        try {
          new Function(tsResult.code)
          result.treeSitter = 'ok'
        } catch (e: any) {
          // Tree-sitter produced invalid JS — try fallback
          result.treeSitter = 'fallback'
          result.tsError = `invalid JS: ${e.message.slice(0, 80)}`
        }
      } else {
        result.treeSitter = 'fallback'
        result.tsError = tsResult.errors?.[0]?.slice(0, 80)
      }
    }

    // 2. Regex fallback transpile (always test)
    const regexResult = autoTranspileDetailed(ex.code)

    // 3. Engine evaluate (use the best transpilation)
    try {
      const engine = new SonicPiEngine()
      await engine.init()
      const prints: string[] = []
      engine.setPrintHandler((msg) => prints.push(msg))

      const evalResult = await engine.evaluate(ex.code)
      if (evalResult.error) {
        result.evaluate = 'error'
        result.evalError = evalResult.error.message.slice(0, 100)
      } else {
        result.evaluate = 'ok'
        // Try to query events
        if (engine.components.capture) {
          try {
            const events = await engine.components.capture.queryRange(0, 4)
            result.events = events.length
          } catch {
            // Query failed — not critical
          }
        }
      }
      engine.dispose()
    } catch (e: any) {
      result.evaluate = 'error'
      result.evalError = e.message?.slice(0, 100)
    }

    results.push(result)

    const pass = result.evaluate === 'ok'
    if (pass) passCount++
    else failCount++

    const icon = pass ? '✓' : '✗'
    const ts = result.treeSitter === 'ok' ? 'TS' : result.treeSitter === 'fallback' ? 'RX' : 'ER'
    const evts = result.events > 0 ? `${result.events}ev` : ''
    const err = result.evalError ? ` — ${result.evalError.slice(0, 60)}` : ''
    console.log(`${icon} ${String(i + 1).padStart(3)}. [${ts}] ${ex.name}${evts ? ` (${evts})` : ''}${err}`)
  }

  console.log(`\n${'='.repeat(60)}`)
  console.log(`RESULTS: ${passCount}/${examples.length} pass, ${failCount} fail`)
  console.log(`Tree-sitter: ${results.filter(r => r.treeSitter === 'ok').length} ok, ${results.filter(r => r.treeSitter === 'fallback').length} fallback, ${results.filter(r => r.treeSitter === 'error').length} error`)
  console.log(`${'='.repeat(60)}\n`)

  // Show failures
  const failures = results.filter(r => r.evaluate !== 'ok')
  if (failures.length > 0) {
    console.log('FAILURES:')
    for (const f of failures) {
      console.log(`  ${f.name}: ${f.evalError}`)
      if (f.tsError) console.log(`    tree-sitter: ${f.tsError}`)
    }
  }

  // Save results
  fs.writeFileSync('./tools/test_100_results.json', JSON.stringify(results, null, 2))
  console.log('\nResults saved to tools/test_100_results.json')
}

main().catch(console.error)
