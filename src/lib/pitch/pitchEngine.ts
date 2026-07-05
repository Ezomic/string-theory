import { autocorrelate } from './autocorrelate'
import { centsBetween, hzToNote, noteToHz, type NoteName } from './noteMath'

export type PermissionState = 'prompt' | 'granted' | 'denied'

export interface PitchReading {
  hz: number
  note: NoteName
  octave: number
  cents: number
  confidence: number
}

type PitchListener = (reading: PitchReading | null) => void

const FFT_SIZE = 2048
const SMOOTHING_WINDOW = 5

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.floor(sorted.length / 2)]
}

/**
 * Turns live microphone audio into note + cents-off readings.
 * Standalone module — the tuner, ear-training call-and-response, and
 * play-and-feedback screens all consume it rather than touching Web Audio directly.
 */
export class PitchEngine {
  permissionState: PermissionState = 'prompt'

  private referencePitch = 440
  private audioContext: AudioContext | null = null
  private analyser: AnalyserNode | null = null
  private mediaStream: MediaStream | null = null
  private rafId: number | null = null
  private listeners = new Set<PitchListener>()
  private recentHz: number[] = []

  /** `deviceId` selects a specific input (see Settings > Audio & mic); omitted/null uses the system default. */
  async start(deviceId?: string | null): Promise<PermissionState> {
    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: deviceId ? { deviceId: { exact: deviceId } } : true,
      })
      this.permissionState = 'granted'
    } catch {
      this.permissionState = 'denied'
      return this.permissionState
    }

    this.audioContext = new AudioContext()
    this.analyser = this.audioContext.createAnalyser()
    this.analyser.fftSize = FFT_SIZE

    const source = this.audioContext.createMediaStreamSource(this.mediaStream)
    source.connect(this.analyser)

    this.recentHz = []
    this.tick()

    return this.permissionState
  }

  stop(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId)
      this.rafId = null
    }
    this.mediaStream?.getTracks().forEach((track) => track.stop())
    this.mediaStream = null
    void this.audioContext?.close()
    this.audioContext = null
    this.analyser = null
    this.recentHz = []
  }

  onPitch(listener: PitchListener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  setReference(referencePitch: number): void {
    this.referencePitch = referencePitch
  }

  /** Convenience wrapper around noteToHz using this engine's current reference pitch. */
  targetHz(note: string, octave: number): number {
    return noteToHz(note, octave, this.referencePitch)
  }

  /** Cents deviation of `hz` from the given target frequency. */
  centsFromTarget(hz: number, targetHz: number): number {
    return centsBetween(hz, targetHz)
  }

  private tick = (): void => {
    if (!this.analyser) {
      return
    }

    const buffer = new Float32Array(this.analyser.fftSize)
    this.analyser.getFloatTimeDomainData(buffer)

    const sampleRate = this.audioContext?.sampleRate ?? 44100
    const rawHz = autocorrelate(buffer, sampleRate)

    if (rawHz === -1) {
      this.recentHz = []
      this.emit(null)
    } else {
      this.recentHz.push(rawHz)
      if (this.recentHz.length > SMOOTHING_WINDOW) {
        this.recentHz.shift()
      }
      const smoothedHz = median(this.recentHz)
      const confidence = Math.min(this.recentHz.length / SMOOTHING_WINDOW, 1)
      const { note, octave, cents } = hzToNote(smoothedHz, this.referencePitch)
      this.emit({ hz: smoothedHz, note, octave, cents, confidence })
    }

    this.rafId = requestAnimationFrame(this.tick)
  }

  private emit(reading: PitchReading | null): void {
    this.listeners.forEach((listener) => listener(reading))
  }
}
