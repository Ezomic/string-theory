import { describe, expect, it } from 'vitest'
import { generatePluckedStringSamples } from './karplusStrong'

function rms(samples: Float32Array): number {
  const sumSquares = samples.reduce((sum, s) => sum + s * s, 0)
  return Math.sqrt(sumSquares / samples.length)
}

describe('generatePluckedStringSamples', () => {
  it('generates exactly sampleRate * duration samples', () => {
    expect(generatePluckedStringSamples(44100, 440, 1).length).toBe(44100)
    expect(generatePluckedStringSamples(44100, 440, 0.5).length).toBe(22050)
  })

  it('keeps all samples finite and within a sane amplitude range', () => {
    const samples = generatePluckedStringSamples(44100, 220, 1)
    expect(samples.every((s) => Number.isFinite(s) && Math.abs(s) <= 1.5)).toBe(true)
  })

  it('decays in energy over time, like a plucked string dying away', () => {
    const samples = generatePluckedStringSamples(44100, 220, 2)
    const tenPercent = Math.floor(samples.length * 0.1)
    const head = samples.slice(0, tenPercent)
    const tail = samples.slice(-tenPercent)
    expect(rms(tail)).toBeLessThan(rms(head) * 0.5)
  })

  it('is not silent immediately after the pluck', () => {
    const samples = generatePluckedStringSamples(44100, 440, 1)
    expect(rms(samples.slice(0, 1000))).toBeGreaterThan(0)
  })
})
