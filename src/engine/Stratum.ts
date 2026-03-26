// ---------------------------------------------------------------------------
// Stratum Detection
// ---------------------------------------------------------------------------

export enum Stratum {
  /** Stateless, cyclic, deterministic — capturable */
  S1 = 1,
  /** Seeded stochastic — capturable with seed */
  S2 = 2,
  /** State-accumulating, external I/O — streaming only */
  S3 = 3,
}

/**
 * Classify code into a stratum based on static analysis.
 */
export function detectStratum(code: string): Stratum {
  const joined = code.replace(/\/\/.*$/gm, '')

  // S3 indicators
  const s3Patterns = [
    /\bMath\.random\b/,
    /\bDate\.now\b/,
    /\bfetch\b/,
    /\bXMLHttpRequest\b/,
    /\bsync\s*\(/,
    /\bcue\s*\(/,
  ]

  for (const pattern of s3Patterns) {
    if (pattern.test(joined)) return Stratum.S3
  }

  // S3: cross-iteration state mutation
  if (/^\s*(let|var)\s+\w+/m.test(joined)) {
    if (/\w+\s*(\+\+|--|(\+|-|\*|\/)?=)/.test(joined)) {
      return Stratum.S3
    }
  }

  // S2 indicators
  const s2Patterns = [
    /\brrand\b/,
    /\brrand_i\b/,
    /\bchoose\b/,
    /\bdice\b/,
    /\buse_random_seed\b/,
  ]

  for (const pattern of s2Patterns) {
    if (pattern.test(joined)) return Stratum.S2
  }

  return Stratum.S1
}
