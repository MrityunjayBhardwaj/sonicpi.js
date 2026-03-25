# Stratified Isomorphism Between Free Monadic Interpreters for Temporal DSLs

**Abstract.** We prove that two interpreters (effect handlers) for a free monadic temporal DSL produce isomorphic event sequences, subject to a stratification condition on the program. Given a temporal DSL with operations for note triggering (`play`, `sample`) and time advancement (`sleep`), we construct its free model and define two interpreters: an AudioInterpreter that runs programs in real-time via Promise-controlled cooperative scheduling, and a QueryInterpreter that walks the program as a data structure in O(n) time. We prove that for Stratum 1 (deterministic) programs, the interpreters are isomorphic on event sequences. For Stratum 2 (seeded stochastic) programs, isomorphism holds per-seed. For Stratum 3 (synchronizing) programs, isomorphism breaks at synchronization boundaries. The stratification corresponds to algebraic properties: S1 programs form a commutative monoid under parallel composition, S2 programs form a non-commutative monoid, and S3 programs admit no monoidal structure. We formalize the time monoid action on programs, the cofree-free pairing between scheduler and program, and the forgetful natural transformation that projects effectful (FX-wrapped) programs to their temporal skeleton.

**Keywords:** free monad, stratified isomorphism, temporal DSL, effect handler, monoid action, cofree comonad, natural transformation, live coding

---

## 1. Definitions

### 1.1 The Temporal DSL Signature

**Definition 1.1** (Signature). The temporal music DSL signature Σ consists of:

```
Σ = { play, sample, sleep, synth, cue, sync, fx, stop }
```

with arities:

```
play   : Note × Opts → 1
sample : Name × Opts → 1
sleep  : ℝ≥0 → 1
synth  : Name → 1
cue    : Name → 1
sync   : Name → 1
fx     : Name × Opts × Program → 1
stop   : 0
```

where `1` denotes a single continuation (the operation returns and execution continues) and `0` denotes no continuation (execution halts).

### 1.2 The Free Model

**Definition 1.2** (Step). A step is a tagged value from the signature:

```
Step = Σᵢ Σᵢ(argsᵢ)
```

Concretely:

```
Step ::= Play(n, opts) | Sample(name, opts) | Sleep(b)
       | Synth(name) | Cue(name) | Sync(name)
       | Fx(name, opts, P) | Stop
```

where `P` is a Program (defined below).

**Definition 1.3** (Program). A program is a finite sequence of steps:

```
Program = Step*
```

This is the free monad `Free Σ ()` with bind implemented as concatenation. The empty program `ε` is the monadic unit.

**Definition 1.4** (Loop Program). A loop program is a program together with metadata:

```
LoopProgram = (name : Name, bpm : ℝ>0, seed : ℤ, body : Program)
```

### 1.3 Events

**Definition 1.5** (Event). An event is a record:

```
Event = (type : {synth, sample}, time : ℝ≥0, params : Map)
```

**Definition 1.6** (Event Sequence). An event sequence is a finite multiset of events:

```
EventSeq = Multiset(Event)
```

We use multisets because multiple events may occur at the same time with the same parameters (e.g., two loops both playing note 60 at time 0).

---

## 2. Interpreters

### 2.1 The Time Function

**Definition 2.1** (Beat Duration). Given a tempo `bpm : ℝ>0`:

```
beatDur(bpm) = 60 / bpm
```

**Definition 2.2** (Time Accumulation). The time accumulation function `T : Program × ℝ≥0 × ℝ>0 → ℝ≥0` computes the total duration of a program:

```
T(ε, t₀, bpm)              = t₀
T(Sleep(b) :: P, t₀, bpm)  = T(P, t₀ + b · beatDur(bpm), bpm)
T(Fx(_, _, Q) :: P, t₀, bpm) = T(P, T(Q, t₀, bpm), bpm)
T(s :: P, t₀, bpm)         = T(P, t₀, bpm)    for all other steps s
```

That is: only `Sleep` and `Fx` (via its sub-program) advance time. All other operations are instantaneous.

### 2.2 The QueryInterpreter

**Definition 2.3** (QueryInterpreter). The query interpreter `Q : Program × ℝ≥0 × ℝ≥0 × ℝ>0 → EventSeq` collects events in a time range:

```
Q(ε, b, e, bpm)                        = ∅
Q(Play(n, opts) :: P, b, e, bpm)       = (if t ∈ [b,e) then {(synth, t, {note:n} ∪ opts)} else ∅)
                                          ∪ Q(P, b, e, bpm)
                                          where t = current accumulated time
Q(Sample(name, opts) :: P, b, e, bpm)  = (if t ∈ [b,e) then {(sample, t, {name} ∪ opts)} else ∅)
                                          ∪ Q(P, b, e, bpm)
Q(Sleep(beats) :: P, b, e, bpm)        = Q(P, b, e, bpm)
                                          with time advanced by beats · beatDur(bpm)
Q(Synth(name) :: P, b, e, bpm)         = Q(P, b, e, bpm)
                                          with current synth updated
Q(Fx(_, _, body) :: P, b, e, bpm)      = Q(body, b, e, bpm) ∪ Q(P, b, e, bpm)
                                          with time advanced by T(body, 0, bpm)
Q(Stop :: P, b, e, bpm)                = ∅
Q(Cue(_) :: P, b, e, bpm)              = Q(P, b, e, bpm)
Q(Sync(_) :: P, b, e, bpm)             = ⊥  (undefined — see §4.3)
```

More precisely, the QueryInterpreter is a fold (catamorphism) over the Program with a state accumulator `(time, currentSynth, events)`:

**Definition 2.4** (Query Fold). Define the state `σ = (t : ℝ≥0, s : Name, bpm : ℝ>0)` and the fold:

```
fold_Q : Step × σ → σ × EventSeq

fold_Q(Play(n, opts), (t, s, bpm))      = ((t, s, bpm), {(synth, t, {note:n, synth:s} ∪ opts)})
fold_Q(Sample(name, opts), (t, s, bpm)) = ((t, s, bpm), {(sample, t, {name} ∪ opts)})
fold_Q(Sleep(b), (t, s, bpm))           = ((t + b · beatDur(bpm), s, bpm), ∅)
fold_Q(Synth(name), (t, s, bpm))        = ((t, name, bpm), ∅)
fold_Q(Stop, σ)                         = (σ, ∅)  [halt]
fold_Q(Cue(_), σ)                       = (σ, ∅)
```

Then:

```
Q(P, b, e, bpm) = { ev ∈ ⋃ fold_Q(sᵢ, σᵢ) | ev.time ∈ [b, e) }
```

where `σ₀ = (0, "beep", bpm)` and `σᵢ₊₁ = fst(fold_Q(sᵢ, σᵢ))`.

### 2.3 The AudioInterpreter

**Definition 2.5** (AudioInterpreter). The audio interpreter `A` processes a Program step-by-step, performing side effects (audio synthesis) and suspending at sleep boundaries via Promise-controlled scheduling.

We model `A` as a function in the IO monad:

```
A : Program × Context → IO(EventSeq)
```

where `Context` provides the scheduler, audio bridge, and task identity.

The critical case:

```
A(Sleep(b) :: P, ctx) = do
  scheduleSleep(ctx.taskId, b)   -- creates Promise, parks in MinHeap
  ← tick resolves the Promise    -- continuation resumes here
  A(P, ctx)
```

For the purpose of this proof, we abstract the AudioInterpreter's event production as:

```
A(Play(n, opts) :: P, ctx) = {(synth, ctx.virtualTime, {note:n, synth:ctx.synth} ∪ opts)}
                              ∪ A(P, ctx)
```

**Observation 2.6.** The AudioInterpreter's event production depends on `ctx.virtualTime`, which is advanced by `scheduleSleep`. The QueryInterpreter's event production depends on the accumulated time variable `t`, which is advanced by the `Sleep` fold case.

---

## 3. The Stratification

### 3.1 Stratum Definition

**Definition 3.1** (Stratum). The stratum of a program `P` is determined by static analysis:

```
S(P) = S1  if P contains no Sync, no Cue, and all random values are
            resolved at build time with a fixed seed
S(P) = S2  if P contains no Sync, no Cue, but random values depend
            on a seed parameter
S(P) = S3  if P contains Sync or Cue
```

**Definition 3.2** (Deterministic Program). A program `P` is deterministic if `S(P) = S1`. Its steps contain only `Play`, `Sample`, `Sleep`, `Synth`, `Fx`, and `Stop` — no operations whose semantics depend on external state.

**Definition 3.3** (Seeded Program). A program `P` is seeded if `S(P) = S2`. It is deterministic given a fixed seed.

**Definition 3.4** (Synchronizing Program). A program `P` is synchronizing if `S(P) = S3`. It contains `Sync` or `Cue` operations whose semantics depend on other concurrent programs.

### 3.2 Algebraic Characterization

**Proposition 3.5** (S1 Commutativity). For S1 programs `P₁, P₂` with no intervening `Sleep`:

```
P₁ · P₂ ≡ P₂ · P₁    (modulo event ordering within the same time instant)
```

where `·` denotes program concatenation.

*Proof.* In S1, all operations except `Sleep` are instantaneous. Two `Play` steps at the same virtual time produce events with the same timestamp regardless of their order in the program. The event multiset is order-independent for simultaneous events. □

**Proposition 3.6** (S2 Non-Commutativity). For S2 programs, commutativity fails because random state threads through sequentially:

```
choose([60,64]) ; choose([67,72]) ≢ choose([67,72]) ; choose([60,64])
```

The first `choose` consumes a random value, affecting the second's result. Swapping their order changes which random value each consumes.

**Proposition 3.7** (S3 Non-Composability). S3 programs do not form a monoid under either sequential or parallel composition because `Sync(name)` has duration that depends on when another program calls `Cue(name)` — an external, unpredictable dependency.

---

## 4. The Isomorphism Theorems

### 4.1 Theorem 1: S1 Isomorphism

**Theorem 4.1** (S1 Handler Isomorphism). For any S1 program `P`, initial time `t₀ = 0`, tempo `bpm`, and time range `[b, e)`:

```
A(P, ctx)↾[b,e) ≅ Q(P, b, e, bpm)
```

where `↾[b,e)` restricts the AudioInterpreter's events to those with `time ∈ [b, e)`, and `≅` denotes multiset equality.

**Proof.**

We prove by structural induction on `P`.

**Base case:** `P = ε` (empty program).
Both `A(ε, ctx) = ∅` and `Q(ε, b, e, bpm) = ∅`. Trivially isomorphic.

**Inductive case:** `P = s :: P'` for some step `s` and program `P'`.

**Case s = Play(n, opts):**

- `A(Play(n, opts) :: P', ctx)` produces event `(synth, ctx.virtualTime, {note:n, synth:ctx.synth} ∪ opts)` and then `A(P', ctx)`.
- `Q(Play(n, opts) :: P', b, e, bpm)` with state `σ = (t, s, bpm)` produces event `(synth, t, {note:n, synth:s} ∪ opts)` (if `t ∈ [b,e)`) and then `Q(P', b, e, bpm)` with state unchanged.

**Claim:** `ctx.virtualTime = t` at the point where `Play` is processed.

This holds because both interpreters advance time ONLY at `Sleep` steps, and by the inductive hypothesis, all prior `Sleep` steps advanced time by the same amount.

Initial state: `ctx.virtualTime = 0 = t₀`. For all prior steps in the program, the only steps that modify time are `Sleep(b)`:
- AudioInterpreter: `ctx.virtualTime += b · beatDur(bpm)`
- QueryInterpreter: `t += b · beatDur(bpm)`

Same increment, same initial value, same sequence of increments (since S1 programs are deterministic — no branches depend on external state).

Therefore `ctx.virtualTime = t` when `Play` is reached. The events are identical. By the inductive hypothesis, `A(P', ctx)↾[b,e) ≅ Q(P', b, e, bpm)`.

**Case s = Sample(name, opts):** Analogous to Play.

**Case s = Sleep(b):**

- `A(Sleep(b) :: P', ctx)`: advances `ctx.virtualTime` by `b · beatDur(bpm)`, suspends via Promise, resumes, then `A(P', ctx)`.
- `Q(Sleep(b) :: P', b, e, bpm)`: advances `t` by `b · beatDur(bpm)`, then `Q(P', b, e, bpm)`.

No events produced. Time advancement is identical. By inductive hypothesis on `P'`.

**Case s = Synth(name):**

Both interpreters update the current synth name. No events produced. Time unchanged.

**Case s = Fx(name, opts, body):**

- `A` allocates an audio bus, runs `A(body, ctx')` with modified routing, frees the bus, then `A(P', ctx)`. The time advancement is `T(body, 0, bpm)`.
- `Q` walks `body` to collect events (recursing `Q(body, b, e, bpm)`), advances time by `T(body, 0, bpm)`, then `Q(P', b, e, bpm)`.

By the inductive hypothesis applied to `body` (which is S1 since `P` is S1), the events from `body` are isomorphic. The time advancement is the same (both compute `T(body, 0, bpm)`).

**Case s = Stop:** Both return immediately with no further events.

**Cases s = Cue(_), s = Sync(_):** Cannot occur in S1 programs (by Definition 3.1). □

### 4.2 Theorem 2: S2 Per-Seed Isomorphism

**Theorem 4.2** (S2 Per-Seed Isomorphism). For any S2 program constructed with seed `k`:

```
A(P_k, ctx)↾[b,e) ≅ Q(P_k, b, e, bpm)
```

where `P_k` denotes the program built with seed `k`.

**Proof.**

In our architecture, random operations (`choose`, `rrand`, etc.) resolve **at build time** in the `ProgramBuilder`, not at interpretation time. The builder uses a `SeededRandom` initialized with seed `k`. Once the Program `P_k` is built, it contains no random operations — all `choose` results are baked into `Play` or `Sample` steps as concrete values.

Therefore `P_k` is an S1 program (all randomness resolved), and Theorem 4.1 applies. □

**Corollary 4.3.** Two evaluations with the same seed produce the same Program and therefore the same events under both interpreters.

**Corollary 4.4.** Two evaluations with different seeds may produce different Programs. The isomorphism holds within each seed, not across seeds.

### 4.3 Theorem 3: S3 Non-Isomorphism

**Theorem 4.5** (S3 Non-Isomorphism). There exist S3 programs `P` for which:

```
A(P, ctx)↾[b,e) ≇ Q(P, b, e, bpm)
```

**Proof.** By counterexample.

Consider two concurrent programs:

```
P_drums = [Play(60, {}), Sleep(1), Cue("beat")]
P_bass  = [Sync("beat"), Play(36, {}), Sleep(1)]
```

**AudioInterpreter:** `P_drums` plays note 60 at t=0, sleeps until t=1, then fires cue "beat". `P_bass` waits for cue "beat", which arrives at t=1, then plays note 36 at t=1.

Result: `{(synth, 0, {note:60}), (synth, 1, {note:36})}`.

**QueryInterpreter on P_bass:** Encounters `Sync("beat")`. The query interpreter does not simulate concurrent programs. It cannot determine when cue "beat" fires without running `P_drums` simultaneously.

The QueryInterpreter must either:
(a) Return `⊥` (undefined) — acknowledging it cannot process this program, or
(b) Assume `Sync` takes zero time — producing event `(synth, 0, {note:36})`, which is WRONG (the AudioInterpreter places it at t=1).

In either case, the results are not isomorphic. □

**Remark 4.6.** The fundamental issue is that `Sync` is a **non-algebraic operation**: its semantics depend on the global state of all concurrent computations, not just the local program state. In Plotkin and Pretnar's framework [1], this would require a **global handler** that sees all threads — which is exactly what the scheduler provides in the AudioInterpreter but which the QueryInterpreter (operating on a single program) cannot replicate.

---

## 5. The Time Monoid Action

### 5.1 Time as a Monoid

**Definition 5.1** (Time Monoid). The set `(ℝ≥0, +, 0)` is a commutative monoid under addition. We call this the **time monoid** `𝕋`.

### 5.2 Programs as a 𝕋-Module

**Definition 5.2** (Sleep Injection). Define the injection `ι : 𝕋 → Program` by:

```
ι(0) = ε
ι(t) = [Sleep(t / beatDur(bpm))]    for t > 0
```

**Definition 5.3** (Time Action). The time monoid acts on programs via interleaving:

```
t · P = ι(t) ++ P
```

where `++` is program concatenation. This "delays" program `P` by `t` seconds.

**Proposition 5.4** (Module Laws). The time action satisfies:

```
0 · P     = ε ++ P = P                     (identity)
t · (s · P) = ι(t) ++ ι(s) ++ P
            = ι(t + s) ++ P                (by E2: Sleep(a);Sleep(b) ≡ Sleep(a+b))
            = (t + s) · P                  (compatibility)
```

Therefore `Program` is a left `𝕋`-module.

**Proposition 5.5** (QueryInterpreter as Module Homomorphism). The QueryInterpreter preserves the module structure:

```
Q(t · P, b, e, bpm) = Q(P, b - t, e - t, bpm)
```

That is, delaying a program by `t` is equivalent to shifting the query window by `-t`. This is a homomorphism of 𝕋-modules.

*Proof.* The delay `ι(t) ++ P` adds a `Sleep(t/beatDur)` before `P`. The QueryInterpreter advances the time accumulator by `t` before processing `P`'s steps. Events in `P` that were at time `τ` are now at time `τ + t`. Filtering by `[b, e)` is equivalent to filtering `P`'s events by `[b-t, e-t)`. □

### 5.3 Iteration via the Module Action

**Proposition 5.6** (Loop as Iterated Module Action). A looping program that repeats with period `d = T(P, 0, bpm)` produces events:

```
events(loop(P)) = ⋃_{i=0}^{∞} Q((i · d) · P, b, e, bpm)
```

This infinite union is finite when restricted to `[b, e)` because only finitely many iterations `i` satisfy `i · d ∈ [b - T(P,0,bpm), e)`.

The QueryInterpreter's `queryLoopProgram` computes exactly this finite union.

---

## 6. The Cofree-Free Pairing

### 6.1 The Response Functor

**Definition 6.1** (Response Functor). For each operation `op ∈ Σ`, define the response type:

```
R(Play(n, opts))    = ()       — play returns nothing
R(Sample(name, opts)) = ()
R(Sleep(b))          = ()       — sleep returns nothing (but time passes)
R(Synth(name))       = ()
R(Sync(name))        = ()       — sync returns nothing (but time changes)
R(Cue(name))         = ()
R(Stop)              = ⊥        — stop never returns
```

The response functor `ResponseF` maps each operation to its response type.

### 6.2 The Cofree Comonad

**Definition 6.2** (Scheduler as Cofree). The scheduler is a cofree comonad `Cofree ResponseF State` where:

```
State = {
  virtualTime  : ℝ≥0,
  audioTime    : ℝ≥0,
  bpm          : ℝ>0,
  currentSynth : Name,
  tasks        : Map(Name, TaskState),
  queue        : MinHeap(SleepEntry)
}
```

The cofree comonad operations:
- `extract : Cofree ResponseF State → State` — current scheduler state
- `extend : (Cofree ResponseF State → a) → Cofree ResponseF State → Cofree ResponseF a` — compute a value from each future state

### 6.3 The Pairing

**Definition 6.3** (Free-Cofree Pairing). The pairing operation:

```
pair : Free Σ × Cofree ResponseF State → [Event]
```

is defined by:

```
pair(Pure(), sched)           = []
pair(Free(Play(n,o), k), sched) = [(synth, extract(sched).virtualTime, {note:n} ∪ o)]
                                  ++ pair(k(()), step(sched, Play(n,o)))
pair(Free(Sleep(b), k), sched)  = pair(k(()), step(sched, Sleep(b)))
pair(Free(Stop), sched)         = []
```

where `step(sched, op)` produces the next scheduler state after processing operation `op`, and `k` is the continuation (the rest of the program after the operation).

**Proposition 6.4.** The AudioInterpreter implements exactly this pairing:
- `pair(Free(Sleep(b), k), sched)` corresponds to `await scheduleSleep(taskId, b)` — the scheduler (cofree) processes the sleep, advances state, and resumes the continuation `k`.
- The Promise's `resolve` function IS the continuation `k`.
- `tick()` IS the `step(sched, Sleep(b))` that produces the next scheduler state and invokes the continuation.

### 6.4 Universal Property

**Proposition 6.5.** By the universal property of the free monad, the pairing is uniquely determined by how each operation is handled. Given:

```
η : Σ → (State → State × [Event])
```

specifying how each operation updates the scheduler state and produces events, the pairing extends uniquely to all programs:

```
pair = fold(η) : Free Σ × Cofree ResponseF State → [Event]
```

This is why the `switch (step.tag)` pattern in the AudioInterpreter is complete — it handles each operation of the signature, and the fold handles sequencing.

---

## 7. The Forgetful Functor for FX

### 7.1 FX as a Monad Transformer

**Definition 7.1** (FX Transformer). The `Fx` step wraps a sub-program in an audio effect context:

```
Fx(name, opts, body) : Step
```

where `body : Program`. This is a monad transformer: it lifts a Program into an effectful context (audio bus routing).

**Definition 7.2** (FX-Free Program). The underlying program without FX wrapping:

```
forget_fx : Program → Program

forget_fx([])                   = []
forget_fx(Fx(_, _, body) :: P)  = forget_fx(body) ++ forget_fx(P)
forget_fx(s :: P)               = s :: forget_fx(P)    for s ≠ Fx
```

This is the forgetful functor: it strips the FX context, inlining the sub-program.

### 7.2 QueryInterpreter Factors Through Forgetting

**Proposition 7.3.** For S1 programs, the QueryInterpreter factors through `forget_fx`:

```
Q(P, b, e, bpm) = Q(forget_fx(P), b, e, bpm)
```

*Proof.* FX steps do not affect timing or event generation — they only affect audio routing (which bus synths write to). The QueryInterpreter does not model audio routing. Therefore, for the purpose of query, `Fx(name, opts, body)` is equivalent to `body`. □

**Proposition 7.4.** The AudioInterpreter does NOT factor through `forget_fx` — it uses the FX information to allocate audio buses and route signals. This is correct: FX matter for audio, not for temporal query.

The factoring diagram:

```
         Q
Program ────→ EventSeq
  │              ↑
  │ forget_fx    │ Q
  ↓              │
Program_flat ───┘
```

The QueryInterpreter can work on either the original or flattened program. The AudioInterpreter requires the original (with FX structure intact).

---

## 8. Putting It Together

### 8.1 The Complete Picture

```
                        Σ (algebraic theory)
                        │
                   Free Σ = Program
                   /         \
          AudioHandler      QueryHandler
          (Cofree pairing)  (Catamorphism)
              │                 │
         IO [Event]         [Event]
              │                 │
              └──── ≅ ─────────┘    (for S1, S2-per-seed)
                   ≇                 (for S3)
```

The stratified isomorphism is the central result:

| Stratum | Algebraic Structure | Isomorphism | Why |
|---------|-------------------|-------------|-----|
| S1 | Commutative monoid | Full (Thm 4.1) | All operations algebraic, time is only state |
| S2 | Monoid | Per-seed (Thm 4.2) | Randomness resolved at build time |
| S3 | None | Breaks (Thm 4.5) | `Sync` is non-algebraic (requires global handler) |

### 8.2 Completeness of the Stratification

**Proposition 8.1** (Completeness). Every program `P` over signature Σ is in exactly one of S1, S2, S3. The stratification is exhaustive and mutually exclusive.

*Proof.* By Definition 3.1, the strata are defined by the presence/absence of `Sync`/`Cue` and the resolution status of random operations. These conditions partition all programs. □

**Proposition 8.2** (Stratum Ordering). S1 ⊂ S2 ⊂ S3 as sets of programs:
- Every S1 program is an S2 program with a trivial (constant) seed
- Every S2 program is an S3 program with no sync/cue operations

The isomorphism "degrades" as we move up the hierarchy: full → per-seed → none.

---

## 9. Applications

### 9.1 Query Correctness

The isomorphism theorems guarantee that for S1 and S2 programs, the QueryInterpreter produces exactly the events that the AudioInterpreter would produce. This means visualization (pianoroll, event timeline) is faithful to the audio output — no events are missing or misplaced.

### 9.2 Stratum-Dependent Optimization

The stratum classification enables optimization:
- **S1:** Cache the query result. Same program, same events forever. O(1) after first query.
- **S2:** Cache per-seed. Re-query only when the seed changes (i.e., on re-evaluation).
- **S3:** Cannot cache. Must simulate or fall back to audio-only.

### 9.3 Static Analysis

The stratum can be determined by static analysis of the Program:
- S3: `∃ step ∈ P : step.tag ∈ {sync, cue}`
- S2: not S3, and program was built with `SeededRandom`
- S1: not S2, not S3

This is decidable in O(n) — one pass over the program.

---

## 10. Conclusion

We have proven that two interpreters for a free monadic temporal DSL produce isomorphic event sequences under a stratification condition. The key results:

1. **Theorem 4.1 (S1 Isomorphism):** For deterministic programs, AudioHandler and QueryHandler produce identical events. The proof rests on the fact that time advancement (via `Sleep`) is the only state change, and both handlers advance time by the same amount.

2. **Theorem 4.2 (S2 Per-Seed):** For seeded stochastic programs, isomorphism holds per-seed because randomness resolves at build time, reducing S2 to S1.

3. **Theorem 4.5 (S3 Non-Isomorphism):** For synchronizing programs, isomorphism breaks because `Sync` is a non-algebraic operation requiring global state.

4. **The Time Monoid Action** (§5): Programs form a 𝕋-module, and the QueryInterpreter is a module homomorphism. Loop iteration is iterated module action.

5. **The Cofree-Free Pairing** (§6): The scheduler (cofree comonad) and program (free monad) pair together, with Promise resolution implementing the pairing operation in JavaScript.

6. **The Forgetful Functor** (§7): The QueryInterpreter factors through `forget_fx`, ignoring audio effect context. The AudioInterpreter preserves it.

The stratification `S1 ⊂ S2 ⊂ S3` characterizes exactly which algebraic properties hold and therefore which optimizations and guarantees are available. This framework is general — it applies to any temporal DSL with cooperative concurrency, not just music.

---

## References

[1] G. Plotkin and M. Pretnar, "Handlers of Algebraic Effects," ESOP 2009.

[2] S. Aaron and D. Orchard, "Temporal Semantics for a Live Coding Language," FARM 2014.

[3] B. Milewski, "F-Algebras," Bartosz Milewski's Programming Cafe, 2017.

[4] D. Piponi (Sigfpe), "Cofree Meets Free," A Neighborhood of Infinity, 2014.

[5] W. Swierstra, "Data Types à la Carte," JFP 18(4), 2008.

[6] P. Hudak, "An Algebraic Theory of Polymorphic Temporal Media," PADL 2004.

[7] N. Wu, T. Schrijvers, R. Hinze, "Effect Handlers in Scope," Haskell 2014.

[8] P. Chiusano and R. Bjarnason, "Functional Programming in Scala," Manning, 2014, ch. 13.
