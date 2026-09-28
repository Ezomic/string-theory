import { describe, expect, it } from 'vitest'
import type { LessonExercise } from './curriculum'
import { varyExercise } from './exerciseVariation'
import { mulberry32 } from './shuffle'

describe('varyExercise', () => {
  it('transposes a play item to a different key, keeping the interval shape', () => {
    const play: LessonExercise = { kind: 'play', expectedNotes: ['E', 'F#', 'G#'] }
    const varied = varyExercise(play, mulberry32(3))
    if (varied.kind !== 'play') throw new Error('expected play')
    expect(varied.expectedNotes).toHaveLength(3)
    expect(varied.expectedNotes).not.toEqual(['E', 'F#', 'G#'])
    // Same interval shape (whole, whole) preserved after transposition.
    const distance = (from: string, to: string) =>
      (['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'].indexOf(to) -
        ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'].indexOf(from) +
        12) %
      12
    expect(distance(varied.expectedNotes[0], varied.expectedNotes[1])).toBe(2)
    expect(distance(varied.expectedNotes[1], varied.expectedNotes[2])).toBe(2)
  })

  it('reorders quiz choices without changing the correct label', () => {
    const quiz: LessonExercise = {
      kind: 'quiz',
      question: 'How many frets is a half step?',
      choices: ['1 fret', '2 frets', '3 frets'],
      correctLabel: '1 fret',
    }
    const varied = varyExercise(quiz, mulberry32(5))
    if (varied.kind !== 'quiz') throw new Error('expected quiz')
    expect([...varied.choices].sort()).toEqual([...quiz.choices].sort())
    expect(varied.choices).toContain(varied.correctLabel)
    expect(varied.correctLabel).toBe('1 fret')
  })

  it('is deterministic for a given seed', () => {
    const play: LessonExercise = { kind: 'play', expectedNotes: ['C', 'E', 'G'] }
    expect(varyExercise(play, mulberry32(11))).toEqual(varyExercise(play, mulberry32(11)))
  })
})
