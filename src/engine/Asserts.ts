/**
 * Live-testing helpers — Sonic Pi's `assert`, `assert_equal`, `assert_similar`,
 * `assert_not`, `assert_error`. Build-time pure: failures throw immediately so
 * the editor's error overlay surfaces the failure. Successes are silent.
 *
 * Surface mirrors Sonic Pi's `lang/assertions.rb`. Issue #211 (Tier A).
 */

export class AssertionFailedError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AssertionFailedError'
  }
}

function fail(msg: string): never {
  throw new AssertionFailedError(msg)
}

export function assert(condition: unknown, msg?: string): true {
  if (!condition) fail(msg ?? `assert failed (got ${JSON.stringify(condition)})`)
  return true
}

export function assert_equal(a: unknown, b: unknown, msg?: string): true {
  // Strict equality for primitives; JSON-shape for objects/arrays/rings.
  if (a === b) return true
  if (typeof a === 'object' && typeof b === 'object' && a !== null && b !== null) {
    if (JSON.stringify(a) === JSON.stringify(b)) return true
  }
  fail(msg ?? `assert_equal failed: ${JSON.stringify(a)} !== ${JSON.stringify(b)}`)
}

export function assert_similar(a: unknown, b: unknown, msg?: string, epsilon = 1e-9): true {
  if (typeof a === 'number' && typeof b === 'number') {
    if (Math.abs(a - b) > epsilon) {
      fail(msg ?? `assert_similar failed: ${a} ≉ ${b} (epsilon=${epsilon})`)
    }
    return true
  }
  return assert_equal(a, b, msg)
}

export function assert_not(condition: unknown, msg?: string): true {
  if (condition) fail(msg ?? `assert_not failed (got ${JSON.stringify(condition)})`)
  return true
}

/** Pass if `blockFn` throws an exception; fail if it does not. */
export function assert_error(blockFn: () => unknown, msg?: string): true {
  try {
    blockFn()
  } catch {
    return true
  }
  fail(msg ?? 'assert_error failed: block did not raise an exception')
}

/** Increment helper. `inc(x)` → `x + 1`. */
export function inc(x: number): number {
  return x + 1
}

/** Decrement helper. `dec(x)` → `x - 1`. */
export function dec(x: number): number {
  return x - 1
}
