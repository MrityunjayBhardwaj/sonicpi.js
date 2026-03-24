import { Ring } from './Ring'

/**
 * Bjorklund algorithm for Euclidean rhythms.
 * spread(3, 8) → [true, false, false, true, false, false, true, false]
 */
export function spread(hits: number, total: number, rotation: number = 0): Ring<boolean> {
  if (hits >= total) return new Ring(Array(total).fill(true))
  if (hits <= 0) return new Ring(Array(total).fill(false))

  let pattern = bjorklund(hits, total)

  // Apply rotation
  if (rotation !== 0) {
    const r = ((rotation % total) + total) % total
    pattern = [...pattern.slice(r), ...pattern.slice(0, r)]
  }

  return new Ring(pattern)
}

function bjorklund(hits: number, total: number): boolean[] {
  let groups: boolean[][] = []

  for (let i = 0; i < total; i++) {
    groups.push([i < hits])
  }

  let tail = total - hits

  while (tail > 1) {
    const head = groups.length - tail
    const min = Math.min(head, tail)

    const newGroups: boolean[][] = []
    for (let i = 0; i < min; i++) {
      newGroups.push([...groups[i], ...groups[head + i]])
    }

    // Remaining groups
    const remaining = head > tail
      ? groups.slice(min, head)
      : groups.slice(head + min)

    groups = [...newGroups, ...remaining]
    tail = remaining.length
  }

  return groups.flat()
}
