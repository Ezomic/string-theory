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

  it('has at least 10 exercises — enough variety not to run dry quickly', () => {
    expect(EXERCISES.length).toBeGreaterThanOrEqual(10)
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
})

describe('exerciseById', () => {
  it('finds a known exercise', () => {
    expect(exerciseById('c-major-scale')?.title).toBe('C major scale')
  })

  it('returns undefined for an unknown id', () => {
    expect(exerciseById('nope')).toBeUndefined()
  })
})
