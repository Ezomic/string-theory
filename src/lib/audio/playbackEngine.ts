export type PlaybackMode = 'harmonic' | 'melodic'

/**
 * Plays frequencies via Web Audio oscillators — no sample library needed.
 * Lazily creates its AudioContext so construction never requires a user gesture;
 * playback calls do, per the iOS/Chrome autoplay policy.
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
    const oscillator = context.createOscillator()
    const gain = context.createGain()

    oscillator.type = 'sine'
    oscillator.frequency.value = frequency

    // Short linear envelope avoids the click of starting/stopping at a non-zero sample.
    gain.gain.setValueAtTime(0, startTime)
    gain.gain.linearRampToValueAtTime(0.22, startTime + 0.02)
    gain.gain.linearRampToValueAtTime(0, startTime + durationSeconds)

    oscillator.connect(gain)
    gain.connect(context.destination)
    oscillator.start(startTime)
    oscillator.stop(startTime + durationSeconds + 0.02)
  }

  /** Plays frequencies together (chords, "harmonic" intervals) or in sequence (scales, "melodic" intervals). */
  playSequence(
    frequencies: number[],
    mode: PlaybackMode = 'harmonic',
    noteDurationSeconds = 0.9,
  ): void {
    const context = this.getContext()
    const startAt = context.currentTime + 0.05
    frequencies.forEach((frequency, index) => {
      const startTime = mode === 'melodic' ? startAt + index * noteDurationSeconds * 0.6 : startAt
      this.playTone(frequency, startTime, noteDurationSeconds)
    })
  }
}

export const playbackEngine = new PlaybackEngine()
