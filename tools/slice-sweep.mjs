// Slice the exp-001 synth-audit WAV into per-synth 0.6s windows and report peak/RMS.
// Usage: npx tsx tools/slice-sweep.mjs <path-to-wav> [--onset=SEC]

import { readFileSync } from 'fs'

const SYNTH_ORDER = [
  'beep', 'sine', 'saw', 'pulse', 'subpulse', 'square', 'tri',
  'dsaw', 'dpulse', 'dtri', 'fm', 'mod_fm', 'mod_saw', 'mod_dsaw',
  'mod_sine', 'mod_beep', 'mod_tri', 'mod_pulse',
  'supersaw', 'hoover', 'prophet', 'zawa', 'dark_ambience', 'growl',
  'hollow', 'blade', 'piano', 'pluck', 'pretty_bell', 'dull_bell',
  'tech_saws', 'winwood_lead', 'chipbass', 'chiplead', 'chipnoise',
  'tb303', 'bass_foundation', 'bass_highend',
  'organ_tonewheel', 'rhodey', 'rodeo', 'kalimba',
  'gabberkick',
  'noise', 'pnoise', 'bnoise', 'gnoise', 'cnoise',
  'sound_in', 'sound_in_stereo',
  'sc808_bassdrum', 'sc808_snare', 'sc808_clap',
  'sc808_tomlo', 'sc808_tommid', 'sc808_tomhi',
  'sc808_congalo', 'sc808_congamid', 'sc808_congahi',
  'sc808_rimshot', 'sc808_claves', 'sc808_maracas', 'sc808_cowbell',
  'sc808_closed_hihat', 'sc808_open_hihat', 'sc808_cymbal',
]

const WINDOW_SEC = 1.4

const path = process.argv[2]
const args = process.argv.slice(3)
const onsetArg = args.find(a => a.startsWith('--onset='))
const forcedOnset = onsetArg ? parseFloat(onsetArg.split('=')[1]) : null
const showScan = args.includes('--scan')
if (!path) { console.error('usage: slice-sweep.mjs <wav-path> [--onset=SEC] [--scan]'); process.exit(1) }

const buf = readFileSync(path)
const sampleRate = buf.readUInt32LE(24)
const numChannels = buf.readUInt16LE(22)
const bitsPerSample = buf.readUInt16LE(34)
const bytesPerSample = bitsPerSample / 8

let dataOffset = 44
if (buf.readUInt32BE(36) !== 0x64617461) {
  for (let i = 12; i < buf.length - 8; i++) {
    if (buf.readUInt32BE(i) === 0x64617461) { dataOffset = i + 8; break }
  }
}

const totalFrames = Math.floor((buf.length - dataOffset) / (numChannels * bytesPerSample))
const totalSec = totalFrames / sampleRate
console.log(`# WAV: ${path}`)
console.log(`# sr=${sampleRate} ch=${numChannels} bits=${bitsPerSample} dur=${totalSec.toFixed(2)}s`)
console.log('')

function readSample(frameIdx) {
  let sum = 0
  const off = dataOffset + frameIdx * numChannels * bytesPerSample
  for (let c = 0; c < numChannels; c++) {
    sum += buf.readInt16LE(off + c * bytesPerSample) / 32768
  }
  return sum / numChannels
}

// Peak per 100ms chunk — prints first 10 seconds so we can eyeball the onset
if (showScan) {
  console.log('# Peak per 100ms (first 10s)')
  for (let t = 0; t < 10; t += 0.1) {
    const f0 = Math.floor(t * sampleRate)
    const f1 = Math.min(f0 + Math.floor(0.1 * sampleRate), totalFrames)
    let p = 0
    for (let f = f0; f < f1; f++) {
      const a = Math.abs(readSample(f))
      if (a > p) p = a
    }
    console.log(`  t=${t.toFixed(1)}s peak=${p.toFixed(4)}`)
  }
  console.log('')
}

// Auto-detect onset: the first 100ms chunk whose peak jumps above 0.05 following
// a sustained quiet region. Falls back to 0 if nothing found.
function detectOnset() {
  const chunkFrames = Math.floor(sampleRate * 0.02)
  let quietRun = 0
  for (let f = 0; f + chunkFrames < Math.min(totalFrames, sampleRate * 10); f += chunkFrames) {
    let p = 0
    for (let i = 0; i < chunkFrames; i++) {
      const a = Math.abs(readSample(f + i))
      if (a > p) p = a
    }
    if (p < 0.002) { quietRun++; continue }
    if (quietRun >= 5 && p > 0.05) {
      return f / sampleRate
    }
    quietRun = 0
  }
  return 0
}

const onsetSec = forcedOnset !== null ? forcedOnset : detectOnset()
const onsetFrame = Math.floor(onsetSec * sampleRate)
console.log(`# onset at ${onsetSec.toFixed(3)}s${forcedOnset !== null ? ' (forced)' : ' (auto)'}`)
console.log('')

const windowFrames = Math.floor(WINDOW_SEC * sampleRate)
const results = []

for (let i = 0; i < SYNTH_ORDER.length; i++) {
  const startFrame = onsetFrame + i * windowFrames
  const endFrame = Math.min(startFrame + windowFrames, totalFrames)
  if (startFrame >= totalFrames) {
    results.push({ name: SYNTH_ORDER[i], peak: 0, rms: 0, status: 'OUT_OF_RANGE' })
    continue
  }
  let sumSq = 0, peak = 0, count = 0
  for (let f = startFrame; f < endFrame; f++) {
    const s = readSample(f)
    sumSq += s * s
    const a = Math.abs(s)
    if (a > peak) peak = a
    count++
  }
  const rms = Math.sqrt(sumSq / Math.max(count, 1))
  let status
  if (peak < 0.003) status = 'SILENT'
  else if (peak < 0.02) status = 'LOW'
  else status = 'OK'
  results.push({ name: SYNTH_ORDER[i], peak, rms, status })
}

console.log('| # | synth | peak | rms | status |')
console.log('|---|---|---|---|---|')
for (let i = 0; i < results.length; i++) {
  const r = results[i]
  console.log(`| ${i + 1} | ${r.name} | ${r.peak.toFixed(4)} | ${r.rms.toFixed(4)} | ${r.status} |`)
}
console.log('')
const ok = results.filter(r => r.status === 'OK').length
const low = results.filter(r => r.status === 'LOW').length
const silent = results.filter(r => r.status === 'SILENT').length
const oor = results.filter(r => r.status === 'OUT_OF_RANGE').length
console.log(`# Summary: OK=${ok}  LOW=${low}  SILENT=${silent}  OUT_OF_RANGE=${oor}  TOTAL=${results.length}`)
console.log('')
console.log('# Silent/out-of-range synths (candidates for SYNTH_NAMES removal)')
for (const r of results.filter(r => r.status === 'SILENT' || r.status === 'OUT_OF_RANGE')) {
  console.log(`- ${r.name}: peak=${r.peak.toFixed(4)} rms=${r.rms.toFixed(4)} (${r.status})`)
}
console.log('')
console.log('# Low synths')
for (const r of results.filter(r => r.status === 'LOW')) {
  console.log(`- ${r.name}: peak=${r.peak.toFixed(4)} rms=${r.rms.toFixed(4)}`)
}
