import { createPluckedStringBuffer } from './karplusStrong'

export type PlaybackMode = 'harmonic' | 'melodic'
export type PlaybackKind = PlaybackMode | 'melodicThenHarmonic'

const NOTE_STEP_RATIO = 0.6
const MELODIC_HARMONIC_GAP_SECONDS = 0.3
// Karplus-Strong rings out past the "logical" note duration — let it, rather
// than cutting the string off abruptly like the old fixed-decay sine tone did.
const DECAY_TAIL_SECONDS = 0.6

/**
 * Plays frequencies as plucked strings (Karplus-Strong synthesis) — no sample
 * library needed. Lazily creates its AudioContext so construction never
 * requires a user gesture; playback calls do, per the iOS/Chrome autoplay policy.
 */
export class PlaybackEngine {
  private audioContext: AudioContext | null = null

  private getContext(): AudioContext {
    if (!this.audioContext) {
      this.audioContext = new AudioContext()
    }
    if (this.audioContext.state === 'suspended') {
      void this.audioContext.resume()
    }
    return this.audioContext
  }

  private playTone(frequency: number, startTime: number, durationSeconds: number): void {
    const context = this.getContext()
    const ringDuration = durationSeconds + DECAY_TAIL_SECONDS
    const source = context.createBufferSource()
    source.buffer = createPluckedStringBuffer(context, frequency, ringDuration)

    const gain = context.createGain()
    // A few ms ramp-up avoids a hard click on the very first sample.
    gain.gain.setValueAtTime(0, startTime)
    gain.gain.linearRampToValueAtTime(0.3, startTime + 0.004)

    source.connect(gain)
    gain.connect(context.destination)
    source.start(startTime)
    source.stop(startTime + ringDuration)
  }

  private playToneGroup(
    frequencies: number[],
    mode: PlaybackMode,
    startAt: number,
    noteDurationSeconds: number,
  ): number {
    frequencies.forEach((frequency, index) => {
      const startTime = mode === 'melodic' ? startAt + index * noteDurationSeconds * NOTE_STEP_RATIO : startAt
      this.playTone(frequency, startTime, noteDurationSeconds)
    })
    return mode === 'melodic'
      ? startAt + (frequencies.length - 1) * noteDurationSeconds * NOTE_STEP_RATIO + noteDurationSeconds
      : startAt + noteDurationSeconds
  }

  /** Plays frequencies together (chords) or in sequence (scales, melodic intervals). */
  playSequence(frequencies: number[], mode: PlaybackMode = 'harmonic', noteDurationSeconds = 0.9): void {
    this.playToneGroup(frequencies, mode, this.getContext().currentTime + 0.05, noteDurationSeconds)
  }

  /** Plays the notes in sequence, then immediately together — the standard way to ear-train an interval. */
  playMelodicThenHarmonic(frequencies: number[], noteDurationSeconds = 0.9): void {
    const melodicEnd = this.playToneGroup(
      frequencies,
      'melodic',
      this.getContext().currentTime + 0.05,
      noteDurationSeconds,
    )
    this.playToneGroup(frequencies, 'harmonic', melodicEnd + MELODIC_HARMONIC_GAP_SECONDS, noteDurationSeconds)
  }

  /** Dispatches to the right playback shape for a drill question's `playbackKind`. */
  play(frequencies: number[], kind: PlaybackKind, noteDurationSeconds = 0.9): void {
    if (kind === 'melodicThenHarmonic') {
      this.playMelodicThenHarmonic(frequencies, noteDurationSeconds)
    } else {
      this.playSequence(frequencies, kind, noteDurationSeconds)
    }
  }
}

export const playbackEngine = new PlaybackEngine()
