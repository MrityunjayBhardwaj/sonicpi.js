/**
 * Engine test: transpile + QueryInterpreter for any example JSON file.
 * Usage: npx tsx tools/pipeline_engine_test.ts <examples.json> [results_output.json]
 */

import { initTreeSitter, treeSitterTranspile, isTreeSitterReady } from '../src/engine/TreeSitterTranspiler'
import { autoTranspileDetailed } from '../src/engine/RubyTranspiler'
import { SonicPiEngine } from '../src/engine/SonicPiEngine'
import * as fs from 'fs'

interface Example { name: string; code: string }

async function main() {
  const inputFile = process.argv[2] || 'tools/sonic_pi_100_examples.json'
  const outputFile = process.argv[3] || inputFile.replace('.json', '_results.json')

  const examples: Example[] = JSON.parse(fs.readFileSync(inputFile, 'utf-8'))
  console.log(`Testing ${examples.length} examples from ${inputFile}\n`)

  await initTreeSitter({
    treeSitterWasmUrl: './node_modules/web-tree-sitter/tree-sitter.wasm',
    rubyWasmUrl: './node_modules/tree-sitter-wasms/out/tree-sitter-ruby.wasm',
  })

  const results: any[] = []
  let pass = 0, fail = 0

  for (let i = 0; i < examples.length; i++) {
    const ex = examples[i]
    const result: any = { name: ex.name, treeSitter: 'error', evaluate: 'skip', events: 0 }

    if (isTreeSitterReady()) {
      const ts = treeSitterTranspile(ex.code)
      if (ts.ok) {
        try { new Function(ts.code); result.treeSitter = 'ok' }
        catch { result.treeSitter = 'fallback' }
      } else {
        result.treeSitter = 'fallback'
      }
    }

    try {
      const engine = new SonicPiEngine()
      await engine.init()
      engine.setPrintHandler(() => {})
      const evalResult = await engine.evaluate(ex.code)
      if (evalResult.error) {
        result.evaluate = 'error'
        result.evalError = evalResult.error.message.slice(0, 100)
      } else {
        result.evaluate = 'ok'
        if (engine.components.capture) {
          try {
            const events = await engine.components.capture.queryRange(0, 4)
            result.events = events.length
          } catch {}
        }
      }
      engine.dispose()
    } catch (e: any) {
      result.evaluate = 'error'
      result.evalError = e.message?.slice(0, 100)
    }

    results.push(result)
    const ok = result.evaluate === 'ok'
    if (ok) pass++; else fail++
    const ts = result.treeSitter === 'ok' ? 'TS' : 'RX'
    const err = result.evalError ? ` — ${result.evalError.slice(0, 60)}` : ''
    console.log(`${ok ? '✓' : '✗'} ${String(i+1).padStart(3)}. [${ts}] ${ex.name}${result.events ? ` (${result.events}ev)` : ''}${err}`)
  }

  console.log(`\nRESULTS: ${pass}/${examples.length} pass, ${fail} fail`)
  fs.writeFileSync(outputFile, JSON.stringify(results, null, 2))
  console.log(`Saved: ${outputFile}`)
}

main().catch(console.error)
