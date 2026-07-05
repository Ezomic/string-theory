import { describe, expect, it } from 'vitest'
import { centsBetween, hzToNote, noteToHz, transposeNote } from './noteMath'

describe('hzToNote', () => {
  it('identifies A4 at the reference pitch exactly', () => {
    expect(hzToNote(440)).toEqual({ note: 'A', octave: 4, cents: 0, midi: 69 })
  })

  it('identifies middle C', () => {
    const result = hzToNote(261.6255653005986)
    expect(result.note).toBe('C')
    expect(result.octave).toBe(4)
    expect(result.cents).toBe(0)
  })

  it('identifies the low E of a standard-tuned guitar (E2)', () => {
    const result = hzToNote(82.4069)
    expect(result.note).toBe('E')
    expect(result.octave).toBe(2)
    expect(Math.abs(result.cents)).toBeLessThanOrEqual(1)
  })

  it('reports positive cents when sharp of the nearest note', () => {
    const result = hzToNote(441.5)
    expect(result.note).toBe('A')
    expect(result.cents).toBeGreaterThan(0)
  })

  it('reports negative cents when flat of the nearest note', () => {
    const result = hzToNote(438.5)
    expect(result.note).toBe('A')
    expect(result.cents).toBeLessThan(0)
  })

  it('respects a custom reference pitch', () => {
    const result = hzToNote(432, 432)
    expect(result).toEqual({ note: 'A', octave: 4, cents: 0, midi: 69 })
  })

  it('throws for non-positive frequencies', () => {
    expect(() => hzToNote(0)).toThrow(RangeError)
    expect(() => hzToNote(-10)).toThrow(RangeError)
  })
})

describe('noteToHz', () => {
  it('is the inverse of hzToNote for A4', () => {
    expect(noteToHz('A', 4)).toBeCloseTo(440, 5)
  })

  it('computes low B on a 5-string bass (B0)', () => {
    expect(noteToHz('B', 0)).toBeCloseTo(30.868, 2)
  })

  it('normalizes flat note names to their sharp equivalent', () => {
    expect(noteToHz('Eb', 4)).toBeCloseTo(noteToHz('D#', 4), 10)
  })

  it('respects a custom reference pitch', () => {
    expect(noteToHz('A', 4, 432)).toBeCloseTo(432, 5)
  })

  it('throws for an unknown note name', () => {
    expect(() => noteToHz('H', 4)).toThrow(RangeError)
  })
})

describe('centsBetween', () => {
  it('is zero for equal frequencies', () => {
    expect(centsBetween(440, 440)).toBe(0)
  })

  it('is +1200 for one octave sharp', () => {
    expect(centsBetween(880, 440)).toBeCloseTo(1200, 5)
  })

  it('is -1200 for one octave flat', () => {
    expect(centsBetween(220, 440)).toBeCloseTo(-1200, 5)
  })

  it('throws for non-positive inputs', () => {
    expect(() => centsBetween(0, 440)).toThrow(RangeError)
    expect(() => centsBetween(440, 0)).toThrow(RangeError)
  })
})

describe('transposeNote', () => {
  it('returns the same note for zero semitones', () => {
    expect(transposeNote('E', 0)).toBe('E')
  })

  it('wraps forward across the octave boundary', () => {
    expect(transposeNote('B', 1)).toBe('C')
  })

  it('wraps backward for negative semitones', () => {
    expect(transposeNote('C', -1)).toBe('B')
  })

  it('normalizes flat input note names', () => {
    expect(transposeNote('Bb', 2)).toBe('C')
  })

  it('computes a perfect fifth above E (guitar low E to B string open note)', () => {
    expect(transposeNote('E', 7)).toBe('B')
  })
})

describe('hzToNote and noteToHz round-trip', () => {
  it('recovers the same note across the guitar and bass range', () => {
    for (let midi = 28; midi <= 88; midi += 1) {
      const hz = 440 * Math.pow(2, (midi - 69) / 12)
      const detected = hzToNote(hz)
      const recovered = noteToHz(detected.note, detected.octave)
      expect(recovered).toBeCloseTo(hz, 6)
    }
  })
})
