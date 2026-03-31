## Project: Sonic Pi Web

Browser-native reimplementation of Sonic Pi's temporal scheduling model in JavaScript.
This has never been done before. You are building the first one.

### Required Reading (in order)
1. `artifacts/ref/THESIS.md` — Full build thesis (architecture, math, implementation outline)
2. `artifacts/ref/SESSION_PROMPT.md` — Implementation guide with phase breakdown and time budget
3. `artifacts/ref/RESEARCH_SONIC_PI_INTERNALS.md` — How desktop Sonic Pi works internally
4. `artifacts/ref/RESEARCH_JS_SCHEDULING.md` — JS async patterns for the scheduler
5. `artifacts/ref/RESEARCH_SUPERSONIC.md` — SuperSonic (scsynth WASM) API reference
6. `artifacts/ref/RESEARCH_MATH_FOUNDATIONS.md` — Formal math (temporal monad, free monad, stratified isomorphism)

### The Core Innovation
`sleep()` returns a Promise that ONLY the VirtualTimeScheduler can resolve.
This gives JavaScript cooperative concurrency with virtual time.
Previous attempts tried to make sleep block the JS thread (impossible).
Our insight: you don't need blocking, you need scheduler-controlled Promise resolution.

### Architecture Decisions — Don't Revisit Without Understanding Why

These decisions were validated through debugging. Don't change them unless the underlying assumption changes.

**Free Monad / Algebraic Effects:**
ProgramBuilder builds `Step[]` data (the free monad). Two interpreters:
- AudioInterpreter — real-time execution via scheduler Promises
- QueryInterpreter — instant O(n) array walk for capture/visualization
The system IS algebraic effects: Step = operation signature, Program = free model, interpreters = effect handlers, scheduler = cofree comonad dual, await = perform, tick() = handler resume.

**Stratified Isomorphism:**
- S1 (deterministic) → AudioHandler ≅ QueryHandler (full isomorphism)
- S2 (seeded random) → isomorphic per-seed (randomness resolves at build time)
- S3 (sync/cue) → non-isomorphic (sync is non-algebraic, needs global handler)

**Sandbox: Proxy-Based `with()` Scope:**
Parameter shadowing failed cross-browser (Firefox + SES). Proxy wraps user code in `with(__scope__)` where scope intercepts all lookups. `has()` returns true for everything → bare assignments go through `set` trap into scope-isolated storage. `let`/`const` bypass the proxy entirely — that's why the transpiler emits bare assignments (Opal/CoffeeScript pattern).

**FX Bus Routing:**
`with_fx` allocates private audio bus, runs inner program with modified outBus, restores on exit. FX step contains sub-Program + nodeRef for control(). AudioInterpreter stores applyFx() node ID in nodeRefMap.

**Transpiler: Tree-sitter Partial Fold (NOT a catamorphism):**
Partial fold over the Sonic Pi subset of the Ruby grammar (~60 semantic handlers, recursive traversal for structural wrappers, warning for unrecognized leaves). NOT exhaustive over all ~150 Ruby node types — that's the wrong goal for a CST. Falls back to regex transpiler if tree-sitter fails.

**Variable Assignment:** Bare assignment (no `let`/`const`) so the Sandbox Proxy captures writes. Matches Ruby's mutable semantics and Opal's approach.

### Build Target
Implementation lives in `src/engine/` (this is a standalone package).
The engine implements `LiveCodingEngine` from the Motif editor package (`@motif/editor`).
The Motif monorepo is at `../struCode/` — reference `DemoEngine.ts` and `StrudelEngine.ts` there.

### Phase Order: A → B → C → D → E → F → G → H (skip I, J for v1)
Phase A (VirtualTimeScheduler) is the hard part. Get it rock-solid before moving on.

### Constraints
- SuperSonic GPL core: load via CDN, never bundle
- Atomic commits per phase
- Tests via Vitest
- This is a SEPARATE package — does not modify struCode

---

## Development Workflow — MANDATORY

Follow this workflow for ALL work. Do not skip steps. Do not silently proceed.

### 1. Planning Phase
- Create GitHub issues for each task with clear problem + solution description
- Add issues to the GitHub Project board (SonicPi.js Roadmap)
- Update ROADMAP.md if priorities change
- Use issue labels from the ontology (P0-P4, area:*, good first issue, help wanted)
- **CHECKPOINT:** "Here's the plan and GitHub issues. Review before I start implementation?"

### 2. Implementation Phase
- **Branch:** sensible name — `fix/`, `feat/`, `chore/` prefix with descriptive slug
- **Commits:** always use gitmoji. Always state the **problem** and the **fix** in the body:
  ```
  🐛 fix: short summary

  Problem: what was broken and why
  Fix: what was changed and how it solves it
  ```
- **No Co-Author attribution** — never add "Co-Authored-By: Claude" or any AI attribution
- **No force push** — use regular `git push`. Only use `--force-with-lease` when history was actually rewritten (interactive rebase, amend) AND after confirming with the user.
- **CHECKPOINT:** "Here's what I changed. Run tests? Review the diff?"

### 3. Testing Phase — Verify AND Observe
When asked to "test" something, ALWAYS run BOTH:

1. **Verify** — `npx vitest run` (fast, checks known invariants, 4 seconds)
2. **Observe** — `npx tsx tools/capture.ts` with the relevant code (slow, launches real browser, captures everything the app actually does)

Then **READ the `.captures/*.md` output**. Look for:
- Errors, warnings, "not a function", "Error in loop"
- Missing events (zero events after N seconds = something is broken)
- Unexpected behavior

Tests tell you "nothing I expected broke." Capture tells you "here's what actually happened."
The second finds bugs you didn't think to test for.

```
npx tsx tools/capture.ts "live_loop :t do; play 60; sleep 1; end"
npx tsx tools/capture.ts --all-examples
npx tsx tools/capture.ts --file path/to/code.rb
```

The capture output (`.captures/`) is gitignored — diagnostic only, not committed.

- **CHECKPOINT:** "All tests green + capture clean. Create the PR?"

### 4. PR Phase
- Create PR with summary, test plan, `closes #N` references
- **CHECKPOINT:** "PR is up at #N. Review and merge when ready."

### 5. Review Phase
- If issues found: "Found N issues. Fix them before merge?"
- Never silently proceed from one phase to the next

### 6. Critical Analysis Loop — After Every PR
After the PR is up, **critically analyse all gaps, suboptimal patterns, and leaks** in the diff.
This is not optional. Don't ask "ready to merge?" — ask "what did I miss?"

- Audit every changed file for: dead code, redundant logic, missing edge cases, semantic divergence from Sonic Pi, parameter leaks, type safety holes
- State each gap clearly with severity
- Create GitHub issues for real problems (correctness, data-flow, boundary mismatches)
- Fix them incrementally with the same issue→fix→observe→commit cycle
- Then do another pass. The PR improves through iteration, not through getting it right the first time.

Two passes found 15 gaps in one session. Not all were bugs — but the real ones (#30 seed, #31 note override, #33 time range, #34 BPM propagation) would have been silent correctness issues in production.

### 7. Project Board Reflects Reality
Issues aren't just filed — they're on the project board with correct Status field:
- **Todo** — filed, not started
- **In Progress** — actively being worked on right now
- **Done** — committed, verified, merged

Update the board status when work starts and when it finishes. Labels don't control the board — the Status field does.

### Why This Works
The loop is self-correcting. Each pass (observe → classify → issue → fix → observe) produces a fix AND new observations that feed the next pass. Bugs surface incrementally through repeated observation, not through trying to get it right the first time.

Checkpoints prevent momentum from carrying bad work forward. Issue-first forces clear thinking — if you can't write a one-sentence issue title, you're not done diagnosing. Observation beats inference — trust what you hear and see over what the code says should happen.

### Voice
- **GitHub-facing** (issues, PRs, commits, docs): warm, approachable, empathetic. Gitmoji in commits.
- **User-facing** (conversation): concise and direct.

---

## GitHub Protocol — How Issues, PRs, and the Board Work

### Issues Are the Source of Truth
Every bug, feature, and task starts as an issue. No code gets written without one.

- **Title:** Gitmoji + clear one-line description (`🐛 AudioInterpreter never sends note parameter to SuperSonic`)
- **Body:** Problem (what's broken and why), reproduction code, impact, and proposed fix
- **Labels:** Priority (`P0`–`P4`) + area (`area: audio`, `area: scheduler`, `area: transpiler`)
- **Project board:** Every issue is added to "SonicPi.js Roadmap" immediately after creation

### Project Board Is the Dashboard
The board has three columns via the **Status field** (not labels):
- **Todo** — filed, not started
- **In Progress** — actively being worked on right now
- **Done** — committed, verified, merged

If the board doesn't match reality, fix it before doing anything else.

### Commits Tell a Story
Every commit has:
- Gitmoji prefix (`🐛`, `✨`, `📋`, `🧹`, `🔀`)
- Short summary line
- `Problem:` — what was broken and why
- `Fix:` — what changed and how
- `Closes #N` — links to the issue
- No AI attribution. No `Co-Authored-By`.

### PRs Are Reviewable Units
A PR collects related commits. The body has:
- **Summary** — bullet points of what changed, with issue references
- **Test plan** — checklist of what was verified (unit tests, E2E, observation tools, type check)
- `Closes #N` for every issue addressed

PRs aren't merged by Claude. The user reads the diff, reviews it, then merges.

### ROADMAP.md Is the Long-Term View
Issues are tactical. The roadmap is strategic. Groups work by P0–P4 priority. When work is completed, the item gets ~~strikethrough~~ with the PR reference and details move to the `Completed` section.

### Issue Lifecycle
```
Problem observed
    → GitHub issue created (with labels + board)
    → Board status: Todo
    → Branch created
    → Board status: In Progress
    → Fix committed (atomic, one issue per commit)
    → Observation tools run (verify it actually works)
    → PR created or updated
    → Board status: Done
    → PR merged → issue auto-closed via "Closes #N"
```

Every step is visible on GitHub. Nothing happens off-platform.

---

## Testing Protocol — Details

### The Observation Hierarchy (MANDATORY)

There are THREE levels of observation. Each level catches bugs the previous cannot.
**You must reach Level 3 before declaring anything "works."**

```
Level 1: Unit tests (Vitest)         — "Did the code I expected to run, run?"
Level 2: Event log (capture tool)    — "Did the engine schedule the right events?"
Level 3: Audio WAV analysis          — "Did scsynth actually produce the right sound?"
```

**Level 1 and 2 are INFERENCE. Level 3 is OBSERVATION.**

The event log says "drum_snare_hard scheduled at t=3.84" — that's what the JS scheduler intended.
The WAV file says "zero snare frequency content" — that's what scsynth actually played.
When they disagree, **the WAV wins. Always.**

This distinction cost an entire debugging session. The event log showed perfect timing, correct
patterns, correct event counts — and the actual audio was a wall of clipping bass with no snare.
The snare events were scheduled but never reached the output because `out_bus` wasn't sent for
samples, so they bypassed the FX chain entirely.

**Rule: Never say "verified ✓" from the event log alone. The event log is a plan, not proof.**

### Level 1: Unit tests (Vitest)
- `npx vitest run` — 638+ tests, all must pass
- `npx tsc --noEmit` — zero type errors
- Semantic execution tests run transpiled code against real ProgramBuilder
- **What it catches:** regressions, type errors, logic bugs in pure functions
- **What it misses:** audio routing, scsynth behavior, browser-specific issues, FX signal flow

### Level 2: Event log capture (Chromium, headed)
- `npx tsx tools/capture.ts "code"` — Chromium headed, captures events + screenshots + audio WAV
- `npx tsx tools/capture.ts --file path/to/code.rb --duration 15000`
- `npx tsx tools/capture.ts --firefox` — Firefox headless fallback (no audio capture)
- Output: `.captures/*.md` with event log, screenshots, audio stats
- **What it catches:** transpiler failures, runtime errors, missing events, wrong timing in the scheduler
- **What it misses:** audio routing bugs, FX signal flow, volume balance, whether scsynth actually played the note

### Level 3: Audio WAV analysis (THE REAL TEST)
The capture tool now records audio via the Rec button in Chromium and analyzes the WAV:
- **Duration, Peak, RMS, Clipping %** — compare against original Sonic Pi (RMS ≈ 0.19, clipping < 0.1%)
- **Per-beat frequency analysis** — ZCR (zero-crossing rate) detects kick (low freq) vs snare (bright)
- **Snare-present beats** — count how many beats have bright frequency content vs kick-only

Use Python for deeper analysis when the capture stats aren't enough:
```python
# Compare against reference WAV
python3 -c "
import wave, struct, math
# ... load both WAVs, compare RMS, peak, frequency content per beat
"
```

**Reference values (original Sonic Pi, DJ Dave kick+clap code):**
- RMS: 0.19, Peak: 1.0, Clipping: 0.01%
- Kick peak: 0.44, Snare peak: 0.47
- Snare/Kick ratio: 1.06x (snare LEADS)
- Snare-present beats: 13/13 (100%)

### Audio diagnosis (expected vs actual)
- `npx tsx tools/diagnose-audio.ts "code"` — runs QueryInterpreter (expected) + browser (actual), diffs events
- Catches: missing synths, silent output, event deficits, wrong notes

### Audio analysis / spectrogram (read the music)
- `npx tsx tools/spectrogram.ts "code"` — captures event stream, maps MIDI→freq→note names, detects repeating patterns, analyzes timing jitter
- This is how Claude "hears" the music: reads note sequences, frequencies, timing intervals
- Example output: "Pattern (period 4): E2 → E2 → G2 → A2, 82.4Hz–110.0Hz, ~120 BPM"
- **WARNING:** This reads the EVENT LOG, not the audio output. Use it for timing analysis only.
  For audio fidelity, analyze the WAV.

---

## Cognitive Framework — ALWAYS ACTIVE

Load the Anvikshiki cognitive OS for this project. This is not optional.
- Base layer: @~/.claude/anvi/cognitive-os/base-layer.md
- Context rot: @~/.claude/anvi/cognitive-os/context-rot.md
- Translation: @~/.claude/anvi/cognitive-os/translation.md
- Lenses: @~/.claude/anvi/cognitive-os/modes/
- Project catalogues: @artifacts/.anvi/

### Use Anvi for ALL work

**Before starting any non-trivial work:**
- `/anvi:rq` — Surface the right questions. Before coding, before debugging, before planning. "What should I be asking?" Prevents solving the wrong problem.
- `/anvi:orient` — Where am I? What's known, unknown, assumed? Should I go deep or wide? Use at session start or when feeling lost.
- `/anvi:list-phase-assumptions` — Surface Claude's assumptions BEFORE planning. Prevents building on wrong mental models.

**Planning:** Use `/anvi:plan-phase` or `/anvi:discuss-phase` before implementation. Never start coding without a plan that's been through the Anvi planning lens (ownership mapping, lifecycle sequencing, pre-mortem analysis).

**Execution:** Use `/anvi:execute-phase` for implementation. Atomic commits, deviation handling, checkpoint protocols, cognitive checks per task.

**Debugging:** Use `/anvi:debug` when something is broken. Systematic diagnosis — gather observations, classify the problem, scan boundaries, compress to root cause. Do NOT guess-and-check.

**Verification:** Use `/anvi:verify-phase` to check that the phase goal was actually achieved, not just that tasks were completed.

**Progress:** Use `/anvi:progress` to check where we are and what's next.

**Session handoff:**
- `/anvi:pause-work` — Create context handoff when stopping mid-work. So the next session can resume cleanly.
- `/anvi:resume-work` — Pick up from previous session with full context restoration.

**Quick tasks:** Use `/anvi:fast` for trivial 1-3 file changes, `/anvi:quick` for small tasks that still need atomic commits.

### Anvi way of thinking — always apply

**The Lokayata Principle (observation over inference) — THE PRIMARY RULE:**

Reading the event log is inference. Analyzing the WAV is observation.
Reading the code is inference. Running the code and examining the output is observation.
"The event says drum_snare_hard" is inference. "The audio has bright frequency content at beat 3" is observation.
**When inference and observation disagree, observation wins. Always. No exceptions.**

This principle was violated repeatedly in one session: the event log showed perfect timing and correct
events, so fixes were declared "verified ✓". But the actual audio had zero snare content, 17% clipping,
and 3x the correct volume. The event log was a plan; the WAV was reality. Five rounds of "it's still
broken" could have been prevented by analyzing the audio on the first pass.

**Applying Lokayata to this project:**
- After ANY audio-related fix: capture the WAV, analyze frequency content, compare against reference
- After ANY FX routing change: verify the signal reaches bus 0 by checking the WAV, not the event log
- After ANY mixer/volume change: compare RMS and peak against original Sonic Pi reference (RMS ≈ 0.19)
- The sentence "events are correct ✓" is NEVER sufficient for audio work. The audio must be verified.

**The remaining principles:**

- **Ask the right questions first.** Before diving in, pause: "What should I be asking?" The answer is usually not about the code — it's about the problem.
- **Classify before fixing.** Is it data-flow, timing, ownership, or boundary? Name the type before writing the fix. If you can't classify it, you don't understand it yet.
- **State the full argument.** Claim, reason, principle, application, conclusion. If any part is missing, the fix isn't understood.
- **One observation per fix.** Run something that proves the fix works. "It should work because..." is not proof. For audio: capture a WAV.
- **Compress, don't accumulate.** After 3 observations, state what they mean together. Keep the root cause in one sentence.
- **Receive corrections without ego.** When the user corrects your framing, adopt it first, verify second. Don't defend a failed approach.
- **Know when to stop.** Ship it when it works. Don't optimize past the goal.
- **Don't add a second workaround.** If the first workaround didn't fix it, the framing is wrong. Stop. Return to diagnosis.
- **Understand before removing.** "I don't see why this is needed" is not the same as "this is not needed." Check git blame. Ask.

### Blind spot awareness — learned from this project

These are the patterns that caused bugs to survive multiple "fix" rounds:

1. **Event log ≠ audio output.** Events can be scheduled correctly while audio is completely broken (wrong bus, missing out_bus, FX not routing). Always check the WAV.

2. **Boundary bugs hide at interfaces.** Every major bug in this project was at a boundary: JS↔scsynth (OSC encoding, NTP timestamps, bus routing), transpiler↔engine (sync: semantics), AudioInterpreter↔SuperSonicBridge (missing out_bus for samples). When debugging, scan EVERY boundary the signal crosses.

3. **Parameter names differ between layers.** Sonic Pi says `cutoff`, the synthdef says `lpf`. Sonic Pi says `basic_stereo_player`, complex opts need `stereo_player`. Always check the synthdef's actual parameter names, not the DSL's names.

4. **Nested wrappers lose outer context.** A single `currentTopFx` variable loses outer FX in nested `with_fx`. A closure-local `didInitialSync` flag doesn't survive hot-swap. Always ask: "does this state survive nesting? Does it survive re-evaluation?"

5. **scsynth group execution order matters.** Synths → FX → mixer must execute in that order. Groups at "head" execute first. `ReplaceOut` overwrites, `Out` adds. Getting the order wrong means the mixer processes an empty bus.
