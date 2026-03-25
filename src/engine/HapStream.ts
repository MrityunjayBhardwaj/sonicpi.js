/**
 * Lightweight event bus for visualization and highlighting.
 *
 * emitEvent() is the primary API — engines emit flat event objects directly.
 * No Strudel-specific "hap" shape required.
 */

export interface HapEvent {
  audioTime: number
  audioDuration: number
  scheduledAheadMs: number
  midiNote: number | null
  s: string | null
  color: string | null
  loc: Array<{ start: number; end: number }> | null
}

type HapHandler = (event: HapEvent) => void

export class HapStream {
  private handlers = new Set<HapHandler>()

  on(handler: HapHandler): void {
    this.handlers.add(handler)
  }

  off(handler: HapHandler): void {
    this.handlers.delete(handler)
  }

  /** Emit a pre-built event directly. Preferred API for all engines. */
  emitEvent(event: HapEvent): void {
    for (const handler of this.handlers) {
      try {
        handler(event)
      } catch {
        // Prevent one bad subscriber from breaking others
      }
    }
  }

  dispose(): void {
    this.handlers.clear()
  }
}
