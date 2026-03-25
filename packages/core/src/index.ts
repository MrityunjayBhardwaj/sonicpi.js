// Core engine
export { SonicPiEngine } from './SonicPiEngine'
export type { EngineComponents } from './SonicPiEngine'

// Scheduler
export { VirtualTimeScheduler } from './VirtualTimeScheduler'
export type { TaskState, SchedulerEvent, SleepEntry, SchedulerOptions } from './VirtualTimeScheduler'

// DSL
export { createDSLContext } from './DSLContext'
export type { TaskDSL, DSLFunctions } from './DSLContext'

// Audio
export { SuperSonicBridge } from './SuperSonicBridge'

// Event stream
export { SoundEventStream } from './SoundEventStream'
export type { SoundEvent } from './SoundEventStream'

// Capture (fast-forward for visualization)
export { CaptureScheduler, detectStratum, Stratum } from './CaptureScheduler'
export type { CapturedEvent } from './CaptureScheduler'

// Music theory
export { ring } from './Ring'
export { spread } from './EuclideanRhythm'
export { noteToMidi, midiToFreq, noteToFreq } from './NoteToFreq'
export { chord, scale, chord_invert, note, note_range, chord_names, scale_names } from './ChordScale'
export { SeededRandom } from './SeededRandom'

// Transpilation
export { transpile, addMissingAwaits, createExecutor } from './Transpiler'
export { transpileRubyToJS, detectLanguage, autoTranspile } from './RubyTranspiler'
export { parseAndTranspile } from './Parser'
export type { ParseError } from './Parser'

// Error handling
export { friendlyError, formatFriendlyError } from './FriendlyErrors'
export type { FriendlyError } from './FriendlyErrors'

// Sandbox (opt-in — not used by default engine, see Sandbox.ts for why)
export { createSandboxedExecutor, validateCode, BLOCKED_GLOBALS } from './Sandbox'

// Examples
export { examples, getExample, getExampleNames, getExamplesByDifficulty } from './examples'
export type { Example, Difficulty } from './examples'

// Sample catalog
export { getAllSamples, getCategories, getSamplesByCategory, searchSamples, getSampleNames } from './SampleCatalog'
export type { SampleInfo } from './SampleCatalog'

// Extensions
export { Recorder } from './Recorder'
export { MidiBridge } from './MidiBridge'
export type { MidiDevice, MidiEventHandler } from './MidiBridge'
export { SessionLog } from './SessionLog'
export type { SessionEntry, SignedSession } from './SessionLog'
export { CollaborationSession, generateRoomId } from './Collaboration'
export type { Peer, CollabCallbacks } from './Collaboration'
export { LinkBridge } from './LinkBridge'
export type { LinkState, LinkStateHandler } from './LinkBridge'
