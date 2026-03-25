/**
 * Deterministic PRNG using mulberry32.
 * Each live_loop task gets its own SeededRandom instance.
 */
export class SeededRandom {
  private state: number

  constructor(seed: number = 0) {
    this.state = seed | 0
  }

  /** Return a float in [0, 1). */
  next(): number {
    this.state |= 0
    this.state = (this.state + 0x6d2b79f5) | 0
    let t = Math.imul(this.state ^ (this.state >>> 15), 1 | this.state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }

  /** Random float in [min, max]. */
  rrand(min: number, max: number): number {
    return min + this.next() * (max - min)
  }

  /** Random int in [min, max]. */
  rrand_i(min: number, max: number): number {
    return Math.floor(this.rrand(min, max + 1))
  }

  /** Random element from array. */
  choose<T>(arr: T[]): T {
    return arr[Math.floor(this.next() * arr.length)]
  }

  /** Random integer in [1, sides]. */
  dice(sides: number): number {
    return Math.floor(this.next() * sides) + 1
  }

  /** Reset seed. */
  reset(seed: number): void {
    this.state = seed | 0
  }

  /** Clone current state. */
  clone(): SeededRandom {
    const r = new SeededRandom()
    r.state = this.state
    return r
  }
}
