/**
 * Karplus-Strong plucked-string synthesis: seed a ring buffer with noise the
 * length of one period, then repeatedly average+decay it. This is what makes
 * an oscillator sound like a plucked guitar/bass string instead of a flat tone —
 * no sample library needed.
 */
export function generatePluckedStringSamples(
  sampleRate: number,
  frequency: number,
  durationSeconds: number,
  decay = 0.994,
): Float32Array {
  const length = Math.max(1, Math.floor(sampleRate * durationSeconds))
  const period = Math.max(2, Math.round(sampleRate / frequency))

  const ring = new Float32Array(period)
  for (let i = 0; i < period; i += 1) {
    ring[i] = Math.random() * 2 - 1
  }

  const samples = new Float32Array(length)
  let previous = 0
  for (let i = 0; i < length; i += 1) {
    const index = i % period
    const current = ring[index]
    samples[i] = current
    ring[index] = decay * 0.5 * (current + previous)
    previous = current
  }

  return samples
}

export function createPluckedStringBuffer(
  context: BaseAudioContext,
  frequency: number,
  durationSeconds: number,
  decay?: number,
): AudioBuffer {
  const samples = generatePluckedStringSamples(context.sampleRate, frequency, durationSeconds, decay)
  const buffer = context.createBuffer(1, samples.length, context.sampleRate)
  buffer.getChannelData(0).set(samples)
  return buffer
}
