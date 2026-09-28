import { describe, expect, it } from 'vitest'
import { CHORD_VOICINGS, displayStringOrder, voicingById, voicingsForChord } from './chordVoicings'
import { CHORDS } from './theory'

describe('CHORD_VOICINGS', () => {
  it('has unique ids', () => {
    const ids = CHORD_VOICINGS.map((v) => v.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('is well-formed: 6 strings, valid base fret, and a real chord catalog id', () => {
    CHORD_VOICINGS.forEach((v) => {
      expect(v.frets).toHaveLength(6)
      expect(v.fingers).toHaveLength(6)
      expect(v.baseFret).toBeGreaterThanOrEqual(1)
      expect(v.root.length).toBeGreaterThan(0)
      expect(CHORDS.some((c) => c.id === v.chordId)).toBe(true)
      v.frets.forEach((f) => {
        if (f !== null) expect(f).toBeGreaterThanOrEqual(0)
      })
    })
  })

  it('keeps barre frets within the voicing', () => {
    CHORD_VOICINGS.forEach((v) => {
      v.barres?.forEach((barre) => {
        expect(barre.fromString).toBeLessThan(barre.toString)
        expect(barre.fret).toBeGreaterThanOrEqual(v.baseFret)
      })
    })
  })
})

describe('voicing lookups', () => {
  it('finds a voicing by id', () => {
    expect(voicingById('c-major-open')?.name).toBe('C major')
    expect(voicingById('nope')).toBeUndefined()
  })

  it('lists every voicing for a chord id', () => {
    const majors = voicingsForChord('major')
    expect(majors.length).toBeGreaterThan(1)
    expect(majors.every((v) => v.chordId === 'major')).toBe(true)
  })
})

describe('displayStringOrder', () => {
  it('runs low→high right-handed', () => {
    expect(displayStringOrder(6, false)).toEqual([1, 2, 3, 4, 5, 6])
  })

  it('mirrors for left-handed while preserving the set', () => {
    const left = displayStringOrder(6, true)
    expect(left).toEqual([6, 5, 4, 3, 2, 1])
    expect([...left].sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6])
  })
})
