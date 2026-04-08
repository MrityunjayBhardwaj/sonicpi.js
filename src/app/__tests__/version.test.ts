/**
 * Composition pair enforcement — package.json version MUST match
 * src/app/version.ts APP_VERSION.
 *
 * This test exists because dharana §10 (Release Engineering Boundary)
 * identifies this as a composition pair: if the two drift, the running
 * app lies about its version and bug reports get triaged to the wrong
 * build. The release runbook (RELEASE.md) codifies this as a manual
 * step, but manual discipline is a weaker guarantee than a failing
 * test. This test turns that discipline into a mechanical gate.
 *
 * If this test fails, the fix is always the same: update one of the
 * two files to match the other. Usually you're bumping package.json
 * for a release and forgot to update src/app/version.ts (or vice
 * versa). They must be in lockstep in every commit.
 *
 * Implementation note: uses Vite's native JSON import (enabled by
 * resolveJsonModule in tsconfig) rather than fs.readFileSync to avoid
 * pulling in @types/node for a single test.
 */
import { describe, it, expect } from 'vitest'
import { APP_VERSION } from '../version'
import pkg from '../../../package.json'

// Semver with optional prerelease suffix: 1.2.3, 1.2.3-beta.0,
// 1.2.3-rc.1, 1.2.3-alpha.42. No build metadata (+...) — we don't use it.
// Capture groups intentionally omitted; this is a validity check, not a
// parser. If we ever need parsing, use a proper semver library.
const SEMVER_RE =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(-(alpha|beta|rc)\.(0|[1-9]\d*))?$/

describe('version composition pair (dharana §10)', () => {
  it('APP_VERSION must equal package.json version', () => {
    expect(APP_VERSION).toBe(pkg.version)
  })

  it('APP_VERSION must be a valid semver string', () => {
    // Catches the "both files say 'banana'" failure mode that the
    // equality test alone can't see. The regex enforces the cycle
    // convention from dharana §10: only alpha/beta/rc prerelease
    // suffixes, zero-indexed counters, no build metadata.
    expect(APP_VERSION).toMatch(SEMVER_RE)
  })

  it('package.json version must be a valid semver string', () => {
    expect(pkg.version).toMatch(SEMVER_RE)
  })
})
