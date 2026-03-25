import { VirtualTimeScheduler, type SchedulerEvent } from './VirtualTimeScheduler'
import { createDSLContext } from './DSLContext'

export interface CapturedEvent {
  type: 'synth' | 'sample' | 'control'
  taskId: string
  time: number
  params: Record<string, unknown>
}

/**
 * Fast-forward scheduler for pattern querying.
 * Resolves all sleeps immediately (no real-time waiting), collecting events.
 */
export class CaptureScheduler {
  private maxIterations: number

  constructor(options?: { maxIterations?: number }) {
    this.maxIterations = options?.maxIterations ?? 10000
  }

  async runUntilCapture(
    setupFn: (dsl: ReturnType<typeof createDSLContext>) => void,
    endTime: number
  ): Promise<CapturedEvent[]> {
    const events: CapturedEvent[] = []

    const scheduler = new VirtualTimeScheduler({
      getAudioTime: () => 0,
      schedAheadTime: 0,
    })

    scheduler.onEvent((event) => {
      if (event.virtualTime <= endTime) {
        events.push({
          type: event.type,
          taskId: event.taskId,
          time: event.virtualTime,
          params: event.params,
        })
      }
    })

    const dsl = createDSLContext({ scheduler })
    setupFn(dsl)

    // Fast-forward: repeatedly tick to endTime and flush microtasks
    for (let i = 0; i < this.maxIterations; i++) {
      const peek = scheduler['queue'].peek()
      if (!peek || peek.time > endTime) break

      scheduler.tick(endTime)

      // Flush microtasks so async functions resume and push new sleeps
      await new Promise((r) => setTimeout(r, 0))
    }

    // Stop all tasks to prevent further execution after dispose
    scheduler.stop()

    return events
  }
}

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
