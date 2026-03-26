/**
 * Transforms user code before execution:
 * - Wraps code in a function for execution
 * - Generates basic source mapping for error reporting
 *
 * Note: addMissingAwaits is preserved for backward compatibility but is
 * no longer called by transpile(). Builder chain code is synchronous.
 */

/** Functions that were previously awaited (kept for backward compat) */
const AWAIT_FUNCTIONS = new Set([
  'play', 'sleep', 'sample', 'sync',
])

/**
 * Add `await` before DSL function calls that are missing it.
 * @deprecated No longer needed — builder chain is synchronous.
 * Kept for backward compatibility with any external callers.
 */
export function addMissingAwaits(code: string): string {
  const fnNames = [...AWAIT_FUNCTIONS].join('|')
  const pattern = new RegExp(
    `(?<!await\\s)(?<!\\.)\\b(${fnNames})\\s*\\(`,
    'g'
  )
  return code.replace(pattern, 'await $1(')
}

export interface TranspileResult {
  code: string
  lineOffset: number
}

/**
 * Transpile user code into an executable function body.
 *
 * The returned code string is meant to be passed to `new Function(...)`.
 * DSL functions are provided as parameters to the generated function.
 */
export function transpile(userCode: string): TranspileResult {
  // Builder chain code is synchronous — no await injection needed.
  return {
    code: userCode,
    lineOffset: 0,
  }
}

/**
 * Create an executable function from transpiled code.
 * DSL function names are passed as parameter names,
 * and their implementations are passed as arguments at call time.
 *
 * Note: The function body runs synchronously (builder chain).
 * The outer wrapper is still async for backward compatibility with
 * the engine's evaluate() which awaits the result.
 */
export function createExecutor(
  transpiledCode: string,
  dslParamNames: string[]
): (...args: unknown[]) => Promise<void> {
  // Wrap in async IIFE — the builder code inside is synchronous,
  // but the engine awaits the executor for uniformity.
  const asyncBody = `return (async () => {\n${transpiledCode}\n})();`
  // eslint-disable-next-line @typescript-eslint/no-implied-eval
  const fn = new Function(...dslParamNames, asyncBody)
  return fn as (...args: unknown[]) => Promise<void>
}
