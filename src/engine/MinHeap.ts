/**
 * Generic min-heap priority queue.
 * Items are ordered by a numeric key extracted via the `key` function.
 */
export class MinHeap<T> {
  private data: T[] = []
  private keyFn: (item: T) => number

  constructor(keyFn: (item: T) => number) {
    this.keyFn = keyFn
  }

  get size(): number {
    return this.data.length
  }

  peek(): T | undefined {
    return this.data[0]
  }

  push(item: T): void {
    this.data.push(item)
    this.bubbleUp(this.data.length - 1)
  }

  pop(): T | undefined {
    if (this.data.length === 0) return undefined
    const top = this.data[0]
    const last = this.data.pop()!
    if (this.data.length > 0) {
      this.data[0] = last
      this.sinkDown(0)
    }
    return top
  }

  clear(): void {
    this.data.length = 0
  }

  private bubbleUp(i: number): void {
    while (i > 0) {
      const parent = (i - 1) >> 1
      if (this.keyFn(this.data[i]) >= this.keyFn(this.data[parent])) break
      ;[this.data[i], this.data[parent]] = [this.data[parent], this.data[i]]
      i = parent
    }
  }

  private sinkDown(i: number): void {
    const n = this.data.length
    while (true) {
      let smallest = i
      const left = 2 * i + 1
      const right = 2 * i + 2
      if (left < n && this.keyFn(this.data[left]) < this.keyFn(this.data[smallest])) {
        smallest = left
      }
      if (right < n && this.keyFn(this.data[right]) < this.keyFn(this.data[smallest])) {
        smallest = right
      }
      if (smallest === i) break
      ;[this.data[i], this.data[smallest]] = [this.data[smallest], this.data[i]]
      i = smallest
    }
  }
}
