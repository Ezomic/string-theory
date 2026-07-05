import { describe, expect, it } from 'vitest'
import { autocorrelate } from './autocorrelate'

function sineWave(frequency: number, sampleRate: number, length: number): Float32Array {
  const buffer = new Float32Array(length)
  for (let i = 0; i < length; i += 1) {
    buffer[i] = Math.sin((2 * Math.PI * frequency * i) / sampleRate)
  }
  return buffer
}

describe('autocorrelate', () => {
  const sampleRate = 44100

  it('detects a 440Hz sine wave (A4) within 1%', () => {
    const buffer = sineWave(440, sampleRate, 2048)
    const detected = autocorrelate(buffer, sampleRate)
    expect(detected).toBeGreaterThan(0)
    expect(Math.abs(detected - 440) / 440).toBeLessThan(0.01)
  })

  it('detects a low 82.4Hz sine wave (guitar low E) within 1%', () => {
    const buffer = sineWave(82.4069, sampleRate, 4096)
    const detected = autocorrelate(buffer, sampleRate)
    expect(detected).toBeGreaterThan(0)
    expect(Math.abs(detected - 82.4069) / 82.4069).toBeLessThan(0.01)
  })

  it('detects a low 30.9Hz sine wave (5-string bass low B) within 2%', () => {
    const buffer = sineWave(30.868, sampleRate, 8192)
    const detected = autocorrelate(buffer, sampleRate)
    expect(detected).toBeGreaterThan(0)
    expect(Math.abs(detected - 30.868) / 30.868).toBeLessThan(0.02)
  })

  it('returns -1 for silence (below the noise floor)', () => {
    const buffer = new Float32Array(2048)
    expect(autocorrelate(buffer, sampleRate)).toBe(-1)
  })
})
