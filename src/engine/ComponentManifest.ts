/**
 * Component manifest — the set of sample / FX / synth names a built
 * Program references. First child of the pre-Run preflight EPIC (#318,
 * child #318.1 / #321).
 *
 * Why a standalone module (not inlined in the engine): the preflight is
 * one domain concern that spans walk → resolve → gate. Each piece gets
 * its own auditable surface so the cluster (SP5/SP84/SP89/SP90) is
 * consolidated, not scattered — same rationale as SoundLayer mirroring
 * sound.rb. This file owns *only* the walk; #318.2 resolves the names
 * and #318.3 gates Run on the result.
 *
 * Names are resolved at BUILD time and stamped onto their steps by
 * ProgramBuilder, so this is a pure structural walk — no use_synth
 * state-tracking needed:
 *   - `play`   → `step.synth` (ProgramBuilder sets `synth ?? currentSynth`
 *                at push time, ProgramBuilder.ts; the `useSynth` step is
 *                NOT collected — it would over-report a synth that may
 *                never actually play).
 *   - `sample` → `step.name`.
 *   - `fx`     → `step.name`, then recurse `step.body`.
 *   - `thread` → recurse `step.body` (in_thread / nested bodies carry
 *                their own play/sample/fx).
 * All other tags carry no CDN-loadable component and are ignored.
 */

import type { Program } from './Program'

export interface ComponentManifest {
  samples: Set<string>
  fx: Set<string>
  synths: Set<string>
}

/**
 * Walk a built Program (and its nested fx/thread bodies) and collect every
 * referenced sample, FX, and synth name. Pure: no I/O, no engine refs —
 * unit-testable without a DOM or audio context.
 */
export function collectComponentManifest(
  program: Program,
  into: ComponentManifest = { samples: new Set(), fx: new Set(), synths: new Set() },
): ComponentManifest {
  for (const step of program) {
    switch (step.tag) {
      case 'play':
        // `synth` is optional on the type but ProgramBuilder always stamps
        // it; guard defensively rather than assume.
        if (step.synth) into.synths.add(step.synth)
        break
      case 'sample':
        into.samples.add(step.name)
        break
      case 'fx':
        into.fx.add(step.name)
        collectComponentManifest(step.body, into)
        break
      case 'thread':
        collectComponentManifest(step.body, into)
        break
      // Every other tag (sleep, cue, control, useSynth, midiOut, liveAudio,
      // recording*, …) references no CDN-loadable component — ignored.
    }
  }
  return into
}
