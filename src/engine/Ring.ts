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

  /** Random element (uses Math.random — for seeded, use ctx.choose). */
  choose(): T {
    return this.items[Math.floor(Math.random() * this.items.length)]
  }

  /** Read tick without advancing. */
  look(): T {
    return this.at(this._tick)
  }

  /** Reverse the ring. */
  reverse(): Ring<T> {
    return new Ring([...this.items].reverse())
  }

  /** Shuffle the ring (Fisher-Yates). */
  shuffle(): Ring<T> {
    const arr = [...this.items]
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[arr[i], arr[j]] = [arr[j], arr[i]]
    }
    return new Ring(arr)
  }

  /** Pick n random elements. */
  pick(n: number): Ring<T> {
    const result: T[] = []
    for (let i = 0; i < n; i++) {
      result.push(this.items[Math.floor(Math.random() * this.items.length)])
    }
    return new Ring(result)
  }

  /** First n elements. */
  take(n: number): Ring<T> {
    return new Ring(this.items.slice(0, n))
  }

  /** Drop first n elements. */
  drop(n: number): Ring<T> {
    return new Ring(this.items.slice(n))
  }

  /** Stretch: repeat each element n times. */
  stretch(n: number): Ring<T> {
    const result: T[] = []
    for (const item of this.items) {
      for (let i = 0; i < n; i++) result.push(item)
    }
    return new Ring(result)
  }

  /** Mirror: [1,2,3] → [1,2,3,2,1] */
  mirror(): Ring<T> {
    const mid = this.items.slice(1, -1).reverse()
    return new Ring([...this.items, ...mid])
  }

  /** Repeat the ring n times. */
  repeat(n: number): Ring<T> {
    const result: T[] = []
    for (let i = 0; i < n; i++) result.push(...this.items)
    return new Ring(result)
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
