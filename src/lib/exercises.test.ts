import { describe, expect, it } from 'vitest'
import { EXERCISES, exerciseById, exercisesInCategory } from './exercises'

describe('EXERCISES', () => {
  it('has unique ids', () => {
    const ids = EXERCISES.map((e) => e.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('gives every exercise at least two expected notes', () => {
    EXERCISES.forEach((exercise) => {
      expect(exercise.expectedNotes.length).toBeGreaterThan(1)
    })
  })

  it('covers all three categories', () => {
    expect(exercisesInCategory('scale').length).toBeGreaterThan(0)
    expect(exercisesInCategory('arpeggio').length).toBeGreaterThan(0)
    expect(exercisesInCategory('exercise').length).toBeGreaterThan(0)
  })

  it('has a broad catalog — enough variety not to run dry quickly', () => {
    expect(EXERCISES.length).toBeGreaterThanOrEqual(25)
  })

  it('includes bass exercises, not only guitar', () => {
    expect(EXERCISES.some((e) => e.instrument === 'bass')).toBe(true)
    expect(EXERCISES.some((e) => e.instrument === 'guitar')).toBe(true)
  })

  it('includes two-octave scale runs', () => {
    const eMajor2oct = exerciseById('e-major-scale-2oct')!
    expect(eMajor2oct.expectedNotes.length).toBe(15)
    expect(eMajor2oct.expectedNotes[0]).toBe('E')
    expect(eMajor2oct.expectedNotes.at(-1)).toBe('E')
  })

  it('includes a technique drill played in diatonic thirds', () => {
    const thirds = exerciseById('c-major-thirds')!
    expect(thirds.category).toBe('exercise')
    expect(thirds.expectedNotes.slice(0, 4)).toEqual(['C', 'E', 'D', 'F'])
  })

  it('includes a walking bass line', () => {
    const walking = exerciseById('walking-bass-c')!
    expect(walking.instrument).toBe('bass')
    expect(walking.expectedNotes).toEqual(['C', 'E', 'G', 'A', 'C'])
  })

  it('includes real arpeggios for the 7th chords the curriculum now teaches', () => {
    const g7 = exerciseById('g-dominant-7-arpeggio')!
    expect(g7.expectedNotes.slice(0, 4)).toEqual(['G', 'B', 'D', 'F'])

    const cmaj7 = exerciseById('c-major-7-arpeggio')!
    expect(cmaj7.expectedNotes.slice(0, 4)).toEqual(['C', 'E', 'G', 'B'])

    const am7 = exerciseById('a-minor-7-arpeggio')!
    expect(am7.expectedNotes.slice(0, 4)).toEqual(['A', 'C', 'E', 'G'])
  })

  it('includes a natural minor scale run', () => {
    const aMinor = exerciseById('a-natural-minor-scale')!
    expect(aMinor.expectedNotes).toEqual(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'A'])
  })

  it('includes modal scale runs matching curriculum Unit 4', () => {
    const dorian = exerciseById('d-dorian-scale')!
    expect(dorian.expectedNotes).toEqual(['D', 'E', 'F', 'G', 'A', 'B', 'C', 'D'])

    const mixolydian = exerciseById('g-mixolydian-scale')!
    expect(mixolydian.expectedNotes).toEqual(['G', 'A', 'B', 'C', 'D', 'E', 'F', 'G'])

    const phrygian = exerciseById('e-phrygian-scale')!
    expect(phrygian.expectedNotes).toEqual(['E', 'F', 'G', 'A', 'B', 'C', 'D', 'E'])
  })

  it('includes arpeggios for the new sus/diminished chord types', () => {
    const sus4 = exerciseById('d-sus4-arpeggio')!
    expect(sus4.expectedNotes.slice(0, 3)).toEqual(['D', 'G', 'A'])

    const dim7 = exerciseById('b-diminished-7-arpeggio')!
    expect(dim7.expectedNotes.slice(0, 4)).toEqual(['B', 'D', 'F', 'G#'])

    const m7b5 = exerciseById('b-half-diminished-arpeggio')!
    expect(m7b5.expectedNotes.slice(0, 4)).toEqual(['B', 'D', 'F', 'A'])
  })

  it('includes major pentatonic and Locrian scale runs', () => {
    const fMajorPentatonic = exerciseById('f-major-pentatonic')!
    expect(fMajorPentatonic.expectedNotes).toEqual(['F', 'G', 'A', 'C', 'D', 'F'])

    const gSharpLocrian = exerciseById('g-sharp-locrian-scale')!
    expect(gSharpLocrian.expectedNotes).toEqual(['G#', 'A', 'B', 'C#', 'D', 'E', 'F#', 'G#'])
  })

  it('includes scale runs on sharp roots that spell cleanly with sharp note names', () => {
    const cSharpDorian = exerciseById('c-sharp-dorian-scale')!
    expect(cSharpDorian.expectedNotes).toEqual(['C#', 'D#', 'E', 'F#', 'G#', 'A#', 'B', 'C#'])

    const fSharpMinor = exerciseById('f-sharp-natural-minor-scale')!
    expect(fSharpMinor.expectedNotes).toEqual(['F#', 'G#', 'A', 'B', 'C#', 'D', 'E', 'F#'])

    const dSharpMinorPentatonic = exerciseById('d-sharp-minor-pentatonic')!
    expect(dSharpMinorPentatonic.expectedNotes).toEqual(['D#', 'F#', 'G#', 'A#', 'C#', 'D#'])
  })

  it('includes diminished and sus2 arpeggios', () => {
    const aSharpDim = exerciseById('a-sharp-diminished-arpeggio')!
    expect(aSharpDim.expectedNotes).toEqual(['A#', 'C#', 'E', 'A#'])

    const dSharpDim = exerciseById('d-sharp-diminished-arpeggio')!
    expect(dSharpDim.expectedNotes).toEqual(['D#', 'F#', 'A', 'D#'])

    const sus2 = exerciseById('f-sus2-arpeggio')!
    expect(sus2.expectedNotes).toEqual(['F', 'G', 'C', 'F'])
  })

  it('uses roots beyond the original A/B/C/D/E/G set for broader transposition practice', () => {
    const roots = new Set(EXERCISES.map((e) => e.expectedNotes[0]))
    expect([...roots]).toEqual(expect.arrayContaining(['C#', 'D#', 'F', 'F#', 'G#', 'A#']))
  })
})

describe('exerciseById', () => {
  it('finds a known exercise', () => {
    expect(exerciseById('c-major-scale')?.title).toBe('C major scale')
  })

  it('returns undefined for an unknown id', () => {
    expect(exerciseById('nope')).toBeUndefined()
  })
})
