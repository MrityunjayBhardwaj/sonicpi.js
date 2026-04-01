/**
 * Minimal OSC bundle encoder — fallback when SuperSonic.osc is unavailable.
 *
 * OSC binary format: 4-byte aligned strings, int32/float32 in big-endian,
 * bundles prefixed with "#bundle\0" + 8-byte NTP timetag.
 *
 * ALLOCATION-FREE hot path (#75): Uses pre-allocated shared buffers instead
 * of `new ArrayBuffer()` per call. At 43 events/sec, this eliminates ~260KB/sec
 * of garbage that caused V8 Major GC pauses (200ms+) after 20 seconds.
 */

/** NTP epoch offset: seconds between 1900-01-01 and 1970-01-01. */
export const NTP_EPOCH_OFFSET = 2208988800

/**
 * Convert AudioContext seconds to NTP timestamp (seconds since 1900-01-01).
 * Uses performance.timeOrigin for wall-clock anchor.
 */
export function audioTimeToNTP(
  audioTime: number,
  audioCtxCurrentTime: number,
): number {
  const wallNow = (performance.timeOrigin + performance.now()) / 1000
  const delta = audioTime - audioCtxCurrentTime
  return wallNow + delta + NTP_EPOCH_OFFSET
}

/** Pad length to next 4-byte boundary. */
function pad4(n: number): number {
  return (n + 3) & ~3
}

// ---------------------------------------------------------------------------
// Pre-allocated shared buffers — eliminates per-call ArrayBuffer allocation.
// These are reused across calls. The returned Uint8Array view is a SLICE
// (new view of the same buffer) — callers must consume it before the next call.
// SuperSonic's sendOSC() transfers the view immediately, so this is safe.
// ---------------------------------------------------------------------------

const SINGLE_BUF = new ArrayBuffer(4096)
const SINGLE_DV = new DataView(SINGLE_BUF)

const MSG_BUF = new ArrayBuffer(4096)
const MSG_DV = new DataView(MSG_BUF)

const MULTI_BUF = new ArrayBuffer(65536)
const MULTI_DV = new DataView(MULTI_BUF)

/** Write a null-terminated, 4-byte-padded string into DataView. Returns new offset. */
function writeString(dv: DataView, off: number, s: string): number {
  const start = off
  for (let i = 0; i < s.length; i++) dv.setUint8(off++, s.charCodeAt(i))
  // Null terminator + pad to 4-byte boundary
  const end = start + pad4(s.length + 1)
  while (off < end) dv.setUint8(off++, 0)
  return off
}

/** Write NTP timetag at offset. Returns new offset. */
function writeNTP(dv: DataView, off: number, ntpTime: number): number {
  const secs = Math.floor(ntpTime) >>> 0
  const frac = ((ntpTime - Math.floor(ntpTime)) * 0x100000000) >>> 0
  dv.setUint32(off, secs, false); off += 4
  dv.setUint32(off, frac, false); off += 4
  return off
}

/** Write "#bundle\0" header at offset. Returns new offset. */
function writeBundleTag(dv: DataView, off: number): number {
  // '#' 'b' 'u' 'n' 'd' 'l' 'e' '\0'
  dv.setUint8(off++, 35); dv.setUint8(off++, 98); dv.setUint8(off++, 117)
  dv.setUint8(off++, 110); dv.setUint8(off++, 100); dv.setUint8(off++, 108)
  dv.setUint8(off++, 101); dv.setUint8(off++, 0)
  return off
}

/** Encode args into a DataView at offset. Returns new offset. */
function writeArgs(dv: DataView, off: number, args: (string | number)[]): number {
  // Type tag string
  let types = ','
  for (let i = 0; i < args.length; i++) {
    const a = args[i]
    types += typeof a === 'string' ? 's' : (Number.isInteger(a) ? 'i' : 'f')
  }
  off = writeString(dv, off, types)

  // Arguments
  for (let i = 0; i < args.length; i++) {
    const a = args[i]
    if (typeof a === 'string') {
      off = writeString(dv, off, a)
    } else if (Number.isInteger(a)) {
      dv.setInt32(off, a, false); off += 4
    } else {
      dv.setFloat32(off, a, false); off += 4
    }
  }
  return off
}

/**
 * Encode a single OSC message inside an OSC bundle with an NTP timetag.
 * Uses pre-allocated buffer — zero allocation in the hot path.
 */
export function encodeSingleBundle(
  ntpTime: number,
  address: string,
  args: (string | number)[],
): Uint8Array {
  let off = 0
  off = writeBundleTag(SINGLE_DV, off)
  off = writeNTP(SINGLE_DV, off, ntpTime)

  // Element size placeholder
  const sizeOff = off; off += 4
  const msgStart = off

  off = writeString(SINGLE_DV, off, address)
  off = writeArgs(SINGLE_DV, off, args)

  // Fill element size
  SINGLE_DV.setUint32(sizeOff, off - msgStart, false)

  return new Uint8Array(SINGLE_BUF, 0, off)
}

/**
 * Encode an OSC message (without bundle wrapping).
 * Uses pre-allocated buffer — zero allocation.
 */
export function encodeMessage(
  address: string,
  args: (string | number)[],
): Uint8Array {
  let off = 0
  off = writeString(MSG_DV, off, address)
  off = writeArgs(MSG_DV, off, args)
  return new Uint8Array(MSG_BUF, 0, off)
}

/**
 * Encode multiple OSC messages into a single bundle with one NTP timetag.
 * Uses pre-allocated 64KB buffer — zero ArrayBuffer allocation.
 */
export function encodeBundle(
  ntpTime: number,
  messages: Array<{ address: string; args: (string | number)[] }>,
): Uint8Array {
  let off = 0
  off = writeBundleTag(MULTI_DV, off)
  off = writeNTP(MULTI_DV, off, ntpTime)

  // Each message: encode into MSG_BUF, copy into MULTI_BUF
  for (const msg of messages) {
    const msgBytes = encodeMessage(msg.address, msg.args)
    MULTI_DV.setUint32(off, msgBytes.length, false); off += 4
    new Uint8Array(MULTI_BUF, off, msgBytes.length).set(msgBytes)
    off += msgBytes.length
  }

  return new Uint8Array(MULTI_BUF, 0, off)
}
