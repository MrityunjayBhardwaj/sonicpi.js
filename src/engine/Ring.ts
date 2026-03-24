/**
 * Circular array — wraps indices so they never go out of bounds.
 * Sonic Pi's `ring()` function returns one of these.
 */
export class Ring<T> {
  private items: T[]
  private _tick = 0

  constructor(items: T[]) {
    this.items = [...items]
  }

  get length(): number {
    return this.items.length
  }

  /** Access by index (wraps). */
  at(index: number): T {
    const len = this.items.length
    return this.items[((index % len) + len) % len]
  }

  /** Auto-incrementing access. */
  tick(): T {
    return this.at(this._tick++)
  }

  /** Reset tick counter. */
  resetTick(): void {
    this._tick = 0
  }

  /** Convert to plain array. */
  toArray(): T[] {
    return [...this.items]
  }

  [Symbol.iterator](): Iterator<T> {
    return this.items[Symbol.iterator]()
  }
}

/** Create a Ring from values. */
export function ring<T>(...values: T[]): Ring<T> {
  return new Ring(values)
}
