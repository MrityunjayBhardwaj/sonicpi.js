import { describe, it, expect } from 'vitest'
import { MinHeap } from '../MinHeap'

describe('MinHeap', () => {
  it('maintains min-heap property', () => {
    const heap = new MinHeap<number>((x) => x)
    heap.push(5)
    heap.push(3)
    heap.push(7)
    heap.push(1)
    heap.push(4)

    expect(heap.pop()).toBe(1)
    expect(heap.pop()).toBe(3)
    expect(heap.pop()).toBe(4)
    expect(heap.pop()).toBe(5)
    expect(heap.pop()).toBe(7)
  })

  it('returns undefined when empty', () => {
    const heap = new MinHeap<number>((x) => x)
    expect(heap.peek()).toBeUndefined()
    expect(heap.pop()).toBeUndefined()
  })

  it('reports correct size', () => {
    const heap = new MinHeap<number>((x) => x)
    expect(heap.size).toBe(0)
    heap.push(1)
    expect(heap.size).toBe(1)
    heap.push(2)
    expect(heap.size).toBe(2)
    heap.pop()
    expect(heap.size).toBe(1)
  })

  it('works with object keys', () => {
    const heap = new MinHeap<{ time: number; name: string }>((x) => x.time)
    heap.push({ time: 2.0, name: 'b' })
    heap.push({ time: 0.5, name: 'a' })
    heap.push({ time: 1.0, name: 'c' })

    expect(heap.pop()!.name).toBe('a')
    expect(heap.pop()!.name).toBe('c')
    expect(heap.pop()!.name).toBe('b')
  })

  it('clear empties the heap', () => {
    const heap = new MinHeap<number>((x) => x)
    heap.push(1)
    heap.push(2)
    heap.clear()
    expect(heap.size).toBe(0)
    expect(heap.peek()).toBeUndefined()
  })
})
