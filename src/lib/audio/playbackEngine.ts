import type { VoiceId } from '../db/types'
import { scheduleVoice } from './voices'

export type PlaybackMode = 'harmonic' | 'melodic'
export type PlaybackKind = PlaybackMode | 'melodicThenHarmonic' | 'progression'

const NOTE_STEP_RATIO = 0.6
const MELODIC_HARMONIC_GAP_SECONDS = 0.3
const CHORD_GAP_SECONDS = 0.15
const DEFAULT_VOICE: VoiceId = 'pluckGuitar'

/**
 * Sequences frequencies into chords/scales/intervals and hands each note off to
 * `voices.ts` for the actual synthesis. Lazily creates its AudioContext so
 * construction never requires a user gesture; playback calls do, per the
 * iOS/Chrome autoplay policy.
 */
export class PlaybackEngine {
  private audioContext: AudioContext | null = null
  private voice: VoiceId = DEFAULT_VOICE

  setVoice(voice: VoiceId): void {
    this.voice = voice
  }

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
    scheduleVoice(this.voice, {
      context,
      destination: context.destination,
      frequency,
      startTime,
      durationSeconds,
    })
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

  /** Plays each chord's frequency group together, one chord after another — for ear-training progressions. */
  playChordProgression(chordFrequencyGroups: number[][], chordDurationSeconds = 0.8): void {
    let startAt = this.getContext().currentTime + 0.05
    chordFrequencyGroups.forEach((frequencies) => {
      startAt = this.playToneGroup(frequencies, 'harmonic', startAt, chordDurationSeconds) + CHORD_GAP_SECONDS
    })
  }

  /**
   * Dispatches to the right playback shape for a drill question's `playbackKind`. 'progression'
   * questions carry grouped chords in `chordFrequencyGroups` instead — callers should prefer
   * `playChordProgression` for those; this falls back to playing `frequencies` as one chord.
   */
  play(frequencies: number[], kind: PlaybackKind, noteDurationSeconds = 0.9): void {
    if (kind === 'melodicThenHarmonic') {
      this.playMelodicThenHarmonic(frequencies, noteDurationSeconds)
    } else if (kind === 'progression') {
      this.playSequence(frequencies, 'harmonic', noteDurationSeconds)
    } else {
      this.playSequence(frequencies, kind, noteDurationSeconds)
    }
  }
}

export const playbackEngine = new PlaybackEngine()
