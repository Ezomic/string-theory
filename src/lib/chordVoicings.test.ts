import { describe, expect, it } from 'vitest'
import {
  CHORD_VOICINGS,
  chordSymbol,
  displayStringOrder,
  matchesQuality,
  voicingById,
  voicingsForChord,
} from './chordVoicings'
import { NOTE_NAMES, transposeNote } from './pitch/noteMath'
import { CHORDS } from './theory'

const STANDARD_TUNING = ['E', 'A', 'D', 'G', 'B', 'E']

/** Pitch class (0-11) of every string the voicing sounds, low to high. */
function soundedPitchClasses(frets: (number | null)[]): number[] {
  return frets.flatMap((fret, string) =>
    fret === null ? [] : [NOTE_NAMES.indexOf(transposeNote(STANDARD_TUNING[string], fret))],
  )
}

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

  it('adds the open shapes the progressions need', () => {
    const names = CHORD_VOICINGS.map((v) => v.name)
    ;['A7', 'D7', 'E7', 'B7', 'Am7', 'Em7', 'Dm7', 'Asus2', 'Asus4', 'Dsus2', 'Dsus4', 'Cadd9', 'Fmaj7'].forEach(
      (name) => expect(names).toContain(name),
    )
    expect(CHORD_VOICINGS).toHaveLength(25)
  })

  it('sounds only chord tones in standard tuning, with the root in the bass', () => {
    CHORD_VOICINGS.forEach((v) => {
      const formula = CHORDS.find((c) => c.id === v.chordId)!.formula
      const root = NOTE_NAMES.indexOf(v.root)
      const chordTones = formula.map((semitones) => (root + semitones) % 12)
      const sounded = soundedPitchClasses(v.frets)
      sounded.forEach((pitchClass) => expect(chordTones, v.name).toContain(pitchClass))
      expect(sounded[0], `${v.name} bass note`).toBe(root)
    })
  })

  it('fingers every fretted string and nothing else', () => {
    CHORD_VOICINGS.forEach((v) => {
      v.frets.forEach((fret, string) => {
        const fretted = fret !== null && fret > 0
        expect(v.fingers[string] !== null, `${v.name} string ${string + 1}`).toBe(fretted)
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

describe('chordSymbol', () => {
  it('writes majors as the bare root and minors with an m', () => {
    expect(chordSymbol(voicingById('g-major-open')!)).toBe('G')
    expect(chordSymbol(voicingById('e-minor-open')!)).toBe('Em')
  })

  it('uses the catalog label for everything else', () => {
    expect(chordSymbol(voicingById('a7-open')!)).toBe('A7')
    expect(chordSymbol(voicingById('am7-open')!)).toBe('Am7')
    expect(chordSymbol(voicingById('cmaj7-open')!)).toBe('Cmaj7')
    expect(chordSymbol(voicingById('dsus4-open')!)).toBe('Dsus4')
    expect(chordSymbol(voicingById('cadd9-open')!)).toBe('Cadd9')
  })
})

describe('matchesQuality', () => {
  const idsFor = (quality: Parameters<typeof matchesQuality>[1]) =>
    CHORD_VOICINGS.filter((v) => matchesQuality(v.chordId, quality)).map((v) => v.id)

  it('shows minor sevenths under 7th, next to the dominant and major sevenths', () => {
    expect(matchesQuality('min7', 'seventh')).toBe(true)
    expect(matchesQuality('dom7', 'seventh')).toBe(true)
    expect(matchesQuality('maj7', 'seventh')).toBe(true)
    expect(idsFor('seventh')).toEqual(expect.arrayContaining(['am7-open', 'em7-open', 'dm7-open']))
  })

  it('gives sus2, sus4 and add9 a filter of their own', () => {
    expect(idsFor('sus').sort()).toEqual(
      ['asus2-open', 'asus4-open', 'cadd9-open', 'dsus2-open', 'dsus4-open'].sort(),
    )
  })

  it('keeps major and minor to plain triads', () => {
    expect(matchesQuality('major', 'major')).toBe(true)
    expect(matchesQuality('maj7', 'major')).toBe(false)
    expect(matchesQuality('minor', 'minor')).toBe(true)
    expect(matchesQuality('min7', 'minor')).toBe(false)
  })

  it('shows every voicing under All', () => {
    expect(idsFor('all')).toHaveLength(CHORD_VOICINGS.length)
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
