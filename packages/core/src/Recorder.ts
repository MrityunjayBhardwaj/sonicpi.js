/**
 * Audio recorder — captures AudioContext output to WAV.
 *
 * Uses a MediaStreamDestination + MediaRecorder to capture the
 * audio graph output, then encodes to WAV for download.
 */

export interface RecorderOptions {
  /** Sample rate (default: audioContext.sampleRate) */
  sampleRate?: number
  /** Number of channels (default: 2 for stereo) */
  channels?: number
}

type RecorderState = 'idle' | 'recording' | 'stopped'

export class Recorder {
  private audioCtx: AudioContext
  private source: AudioNode
  private mediaRecorder: MediaRecorder | null = null
  private destination: MediaStreamAudioDestinationNode | null = null
  private chunks: Blob[] = []
  private _state: RecorderState = 'idle'
  private channels: number

  constructor(audioCtx: AudioContext, source: AudioNode, options?: RecorderOptions) {
    this.audioCtx = audioCtx
    this.source = source
    this.channels = options?.channels ?? 2
  }

  get state(): RecorderState {
    return this._state
  }

  /** Start recording. */
  start(): void {
    if (this._state === 'recording') return

    this.destination = this.audioCtx.createMediaStreamDestination()
    this.source.connect(this.destination)

    this.chunks = []
    this.mediaRecorder = new MediaRecorder(this.destination.stream, {
      mimeType: this.getSupportedMimeType(),
    })

    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) this.chunks.push(e.data)
    }

    this.mediaRecorder.start(100) // collect chunks every 100ms
    this._state = 'recording'
  }

  /** Stop recording and return the audio as a WAV Blob. */
  async stop(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder || this._state !== 'recording') {
        reject(new Error('Not recording'))
        return
      }

      this.mediaRecorder.onstop = async () => {
        try {
          // Disconnect the tap
          if (this.destination) {
            try { this.source.disconnect(this.destination) } catch { /* ok */ }
          }

          const blob = new Blob(this.chunks, { type: this.mediaRecorder!.mimeType })

          // Convert to WAV
          const wavBlob = await this.blobToWav(blob)
          this._state = 'stopped'
          resolve(wavBlob)
        } catch (err) {
          reject(err)
        }
      }

      this.mediaRecorder.stop()
    })
  }

  /** Stop recording and trigger a browser download. */
  async stopAndDownload(filename?: string): Promise<void> {
    const blob = await this.stop()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename ?? `sonic-pi-web-${new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-')}.wav`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  /** Cancel recording without saving. */
  cancel(): void {
    if (this.mediaRecorder && this._state === 'recording') {
      this.mediaRecorder.stop()
    }
    if (this.destination) {
      try { this.source.disconnect(this.destination) } catch { /* ok */ }
    }
    this.chunks = []
    this._state = 'idle'
  }

  private getSupportedMimeType(): string {
    const types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/ogg']
    for (const t of types) {
      if (MediaRecorder.isTypeSupported(t)) return t
    }
    return '' // browser default
  }

  /** Convert a recorded blob (webm/ogg) to WAV format. */
  private async blobToWav(blob: Blob): Promise<Blob> {
    const arrayBuffer = await blob.arrayBuffer()

    // Decode the recorded audio
    const audioBuffer = await this.audioCtx.decodeAudioData(arrayBuffer)

    // Encode as WAV
    const numChannels = Math.min(audioBuffer.numberOfChannels, this.channels)
    const sampleRate = audioBuffer.sampleRate
    const length = audioBuffer.length
    const bytesPerSample = 2 // 16-bit
    const blockAlign = numChannels * bytesPerSample
    const dataSize = length * blockAlign
    const headerSize = 44
    const buffer = new ArrayBuffer(headerSize + dataSize)
    const view = new DataView(buffer)

    // WAV header
    this.writeString(view, 0, 'RIFF')
    view.setUint32(4, 36 + dataSize, true)
    this.writeString(view, 8, 'WAVE')
    this.writeString(view, 12, 'fmt ')
    view.setUint32(16, 16, true) // chunk size
    view.setUint16(20, 1, true)  // PCM
    view.setUint16(22, numChannels, true)
    view.setUint32(24, sampleRate, true)
    view.setUint32(28, sampleRate * blockAlign, true)
    view.setUint16(32, blockAlign, true)
    view.setUint16(34, 16, true) // bits per sample

    this.writeString(view, 36, 'data')
    view.setUint32(40, dataSize, true)

    // Interleave channels and write PCM data
    const channels: Float32Array[] = []
    for (let ch = 0; ch < numChannels; ch++) {
      channels.push(audioBuffer.getChannelData(ch))
    }

    let offset = 44
    for (let i = 0; i < length; i++) {
      for (let ch = 0; ch < numChannels; ch++) {
        const sample = Math.max(-1, Math.min(1, channels[ch][i]))
        view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true)
        offset += 2
      }
    }

    return new Blob([buffer], { type: 'audio/wav' })
  }

  private writeString(view: DataView, offset: number, str: string): void {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i))
    }
  }
}
