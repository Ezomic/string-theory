import { describe, expect, it } from 'vitest'
import {
  CHORDS,
  SCALES,
  fretboardMarkersForNotes,
  fretboardPositionsForNote,
  intervalLabel,
  noteLabelFor,
  notesForFormula,
  solfegeLabel,
} from './theory'

describe('intervalLabel', () => {
  it('labels the root as R', () => {
    expect(intervalLabel('C', 'C')).toBe('R')
  })

  it('labels a major third', () => {
    expect(intervalLabel('C', 'E')).toBe('3')
  })

  it('labels a perfect fifth', () => {
    expect(intervalLabel('C', 'G')).toBe('5')
  })

  it('labels a flat seventh', () => {
    expect(intervalLabel('C', 'A#')).toBe('♭7')
  })
})

describe('solfegeLabel', () => {
  it('labels the root as Do', () => {
    expect(solfegeLabel('C', 'C')).toBe('Do')
  })

  it('labels a major third as Mi', () => {
    expect(solfegeLabel('C', 'E')).toBe('Mi')
  })

  it('labels a perfect fifth as Sol', () => {
    expect(solfegeLabel('C', 'G')).toBe('Sol')
  })

  it('labels a flat seventh as Te', () => {
    expect(solfegeLabel('C', 'A#')).toBe('Te')
  })

  it('is movable-do — relative to whatever root is given', () => {
    expect(solfegeLabel('G', 'G')).toBe('Do')
    expect(solfegeLabel('G', 'B')).toBe('Mi')
  })
})

describe('noteLabelFor', () => {
  it('returns the plain note name for the "names" style', () => {
    expect(noteLabelFor('names', 'C', 'E')).toBe('E')
  })

  it('returns the interval degree for the "degrees" style', () => {
    expect(noteLabelFor('degrees', 'C', 'E')).toBe('3')
  })

  it('returns the solfège syllable for the "solfege" style', () => {
    expect(noteLabelFor('solfege', 'C', 'E')).toBe('Mi')
  })
})

describe('notesForFormula', () => {
  it('computes C major as the seven natural notes', () => {
    const major = SCALES.find((s) => s.id === 'major')!
    expect(notesForFormula('C', major.formula)).toEqual([
      'C',
      'D',
      'E',
      'F',
      'G',
      'A',
      'B',
    ])
  })

  it('computes a G major triad', () => {
    const majorChord = CHORDS.find((c) => c.id === 'major')!
    expect(notesForFormula('G', majorChord.formula)).toEqual(['G', 'B', 'D'])
  })

  it('computes an A minor triad', () => {
    const minorChord = CHORDS.find((c) => c.id === 'minor')!
    expect(notesForFormula('A', minorChord.formula)).toEqual(['A', 'C', 'E'])
  })

  it('computes D Dorian as the seven natural notes (D to D on the white keys)', () => {
    const dorian = SCALES.find((s) => s.id === 'dorian')!
    expect(notesForFormula('D', dorian.formula)).toEqual(['D', 'E', 'F', 'G', 'A', 'B', 'C'])
  })

  it('computes G Mixolydian as the seven natural notes (G to G on the white keys)', () => {
    const mixolydian = SCALES.find((s) => s.id === 'mixolydian')!
    expect(notesForFormula('G', mixolydian.formula)).toEqual(['G', 'A', 'B', 'C', 'D', 'E', 'F'])
  })

  it('computes C harmonic minor with a flat 3rd/6th and a natural (raised) 7th', () => {
    const harmonicMinor = SCALES.find((s) => s.id === 'harmonicMinor')!
    expect(notesForFormula('C', harmonicMinor.formula)).toEqual(['C', 'D', 'D#', 'F', 'G', 'G#', 'B'])
  })
})

describe('fretboardMarkersForNotes', () => {
  const standardGuitar = ['E', 'A', 'D', 'G', 'B', 'E']

  it('marks the root note on the low E string at fret 8 (C)', () => {
    const notes = notesForFormula('C', SCALES.find((s) => s.id === 'major')!.formula)
    const markers = fretboardMarkersForNotes(standardGuitar, 12, notes, 'C', 'scale')
    const lowEFret8 = markers.find((m) => m.string === 1 && m.fret === 8)
    expect(lowEFret8).toEqual({ string: 1, fret: 8, label: 'C', role: 'root' })
  })

  it('marks non-root scale tones with the scale role', () => {
    const notes = notesForFormula('C', SCALES.find((s) => s.id === 'major')!.formula)
    const markers = fretboardMarkersForNotes(standardGuitar, 12, notes, 'C', 'scale')
    const nonRoot = markers.filter((m) => m.label !== 'C')
    expect(nonRoot.length).toBeGreaterThan(0)
    expect(nonRoot.every((m) => m.role === 'scale')).toBe(true)
  })

  it('only marks positions whose note is in the given set', () => {
    const notes = notesForFormula('C', CHORDS.find((c) => c.id === 'major')!.formula)
    const markers = fretboardMarkersForNotes(standardGuitar, 12, notes, 'C', 'chord')
    expect(markers.every((m) => notes.includes(m.label as (typeof notes)[number]))).toBe(true)
  })

  it('labels markers with interval degrees when labelStyle is "degrees"', () => {
    const notes = notesForFormula('C', SCALES.find((s) => s.id === 'major')!.formula)
    const markers = fretboardMarkersForNotes(standardGuitar, 12, notes, 'C', 'scale', 'degrees')
    const lowEFret8 = markers.find((m) => m.string === 1 && m.fret === 8)
    expect(lowEFret8?.label).toBe('R')
  })

  it('labels markers with solfège syllables when labelStyle is "solfege"', () => {
    const notes = notesForFormula('C', SCALES.find((s) => s.id === 'major')!.formula)
    const markers = fretboardMarkersForNotes(standardGuitar, 12, notes, 'C', 'scale', 'solfege')
    const lowEFret8 = markers.find((m) => m.string === 1 && m.fret === 8)
    expect(lowEFret8?.label).toBe('Do')
  })
})

describe('fretboardPositionsForNote', () => {
  it('finds every F on a standard guitar within 12 frets', () => {
    const standardGuitar = ['E', 'A', 'D', 'G', 'B', 'E']
    const positions = fretboardPositionsForNote(standardGuitar, 12, 'F')
    // Low E string: F is fret 1 and fret 13 (out of range) -> only fret 1 within 12
    expect(positions).toContainEqual({ string: 1, fret: 1 })
    // A string: F is fret 8
    expect(positions).toContainEqual({ string: 2, fret: 8 })
    expect(positions.length).toBeGreaterThan(0)
  })
})
