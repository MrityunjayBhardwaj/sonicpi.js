# Mathematical Foundations Research

## 1. The Virtual Time Monad (Aaron & Orchard, FARM 2014)

```haskell
data Temporal a = T ((Time, Time) -> (VTime -> IO (a, VTime)))
```

- Maps (startTime, currentTime) + virtualTime -> (result, newVirtualTime) with IO
- Bind threads virtual time through sequential computations
- Retrieves fresh wall-clock reading before continuation (how vt and real time interact)

**sleep interpretation:**
```haskell
sleep delayT = do
  vT <- getVirtualTime
  let vT' = vT + delayT
  setVirtualTime vT'
  if (vT' < elapsedTime) then return () else kernelSleep (vT' - elapsedTime)
```

**Monad laws:** Hold only approximately (~=) because `time` returns non-deterministic wall clock. For user-observable subset (no `time`/`start` access), laws hold exactly.

## 2. Cooperative Concurrency (Claessen JFP 1999)

```haskell
data Action s = Atom (IO (Action s)) | Fork (Action s) (Action s) | Stop
```

Scheduler: round-robin over queue of Actions.
This IS a Free monad over ThreadF. JS event loop IS this model:
- `await` = Atom boundary (explicit yield)
- Microtasks = priority queue processed before macrotasks
- Within sync block = deterministic, uninterruptible

## 3. The Three-Clock Model

```
musicalTime(beat) : R>=0         (user domain)
audioTime(beat)   : R>=0         audioTime = audioStart + musicalTime / cps
wallTime          : R>=0         wallTime ~= audioTime + epsilon
```

scheduleAheadTime bridges: `audioTime = virtualTime + schedAheadTime`

Formal guarantee: if `schedAheadTime > max_jitter(setInterval)`, no events missed.

## 4. Priority Queue / DES

Music scheduler = discrete event simulation:
```
State: (clock, eventQueue: PriorityQueue<(Time, Event)>, systemState)
Loop: dequeue min, advance clock, process event, enqueue new events
```

Properties: causal ordering, determinism (same inputs = same output), composable (merge queues = Strudel's `stack`).

## 5. Free Monad Bridge

```haskell
data MusicF next = PlayNote Pitch Duration next | Sleep Duration next | GetTime (Time -> next)
type Music = Free MusicF
```

Three interpreters:
1. **Execute** — runs IO (operational semantics)
2. **Query** — walks AST, accumulates time, produces [(Time, Event)] (denotational)
3. **Transform** — rewrites AST (fast, rev) before interpretation

**Relationship to Temporal monad:**
- Temporal: opaque function, cannot inspect
- Free: transparent AST, pattern-matchable, transformable
- For Stratum 1-2: isomorphic (same traces)
- Free monad is the Temporal monad made *inspectable*

**Codensity optimization:** Naive Free has O(n^2) for left-associated binds. Codensity monad fixes to O(n). For ~100 events/cycle: negligible. Matters at 1000+ binds/cycle.

## 6. Stratified Isomorphism (Theorem 5.13)

```
Queryable ⊃ Deterministic ⊃ Transformable

S1: queryable, deterministic, fully transformable  (stateless cyclic)
S2: queryable(seed), deterministic(seed), transformable(seed)  (seeded random)
S3: NOT queryable, NOT transformable  (state-accumulating — fast(k) breaks)
```

Cyclic projection: linear trace → S^1 by `trace mod cycleDuration`.
- fast(k) = k-fold covering map of S^1
- rev = reflection on S^1
- stack = pointwise union of pattern functions

## Key Insight

```
Imperative program → (execute in capture mode) → [(Time, Event)] → (wrap as Pattern) → queryArc
```

The Free monad is the bridge. The temporal monad and pattern function are two denotational semantics for the same domain, connected by reification.

## Sources
- Aaron & Orchard (FARM 2014): temporal monad
- Claessen (JFP 1999): poor man's concurrency monad
- Abadi & Plotkin (POPL 2009): cooperative thread model
- Kiselyov & Ishii (2015): freer monads
- Moggi (1991): notions of computation and monads
- Elliott (2009): denotational design with TCM
- Chris Wilson (web.dev): tale of two clocks
- Hudak (PADL 2004): polymorphic temporal media
