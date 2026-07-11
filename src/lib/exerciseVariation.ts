import type { LessonExercise } from './curriculum'
import { transposeNote } from './pitch/noteMath'
import { shuffle } from './shuffle'

/**
 * Produce a varied version of an exercise for a redo, so a re-served item isn't identical:
 * Play/Hear items are transposed to a different key (same shape, new root), Quiz choices are
 * reordered. `rng` makes it deterministic for tests. The correct answer is unchanged.
 */
export function varyExercise(exercise: LessonExercise, rng: () => number): LessonExercise {
  if (exercise.kind === 'play') {
    const offset = 1 + Math.floor(rng() * 11)
    return { ...exercise, expectedNotes: exercise.expectedNotes.map((note) => transposeNote(note, offset)) }
  }
  if (exercise.kind === 'hear') {
    const offset = 1 + Math.floor(rng() * 11)
    return { ...exercise, noteNames: exercise.noteNames.map((note) => transposeNote(note, offset)) }
  }
  return { ...exercise, choices: shuffle(exercise.choices, rng) }
}
