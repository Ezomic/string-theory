import type { LessonExercise } from './curriculum'
import { transposeNote } from './pitch/noteMath'
import { shuffle } from './shuffle'
import { transposeStaffNote } from './staff'

/** Small offsets keep a "play what you see" prompt near the staff instead of drifting into ledger lines. */
const STAFF_PLAY_OFFSETS = [-2, -1, 1, 2]

/**
 * Produce a varied version of an exercise for a redo, so a re-served item isn't identical:
 * Play/Hear items are transposed to a different key (same shape, new root), Quiz/Staff choices are
 * reordered. `rng` makes it deterministic for tests. The correct answer is unchanged.
 */
export function varyExercise(exercise: LessonExercise, rng: () => number): LessonExercise {
  if (exercise.kind === 'play') {
    if (exercise.staff) {
      const offset = STAFF_PLAY_OFFSETS[Math.floor(rng() * STAFF_PLAY_OFFSETS.length)]
      return {
        ...exercise,
        expectedNotes: exercise.expectedNotes.map((note) => transposeNote(note, offset)),
        staff: exercise.staff.map((note) => transposeStaffNote(note, offset)),
      }
    }
    const offset = 1 + Math.floor(rng() * 11)
    return { ...exercise, expectedNotes: exercise.expectedNotes.map((note) => transposeNote(note, offset)) }
  }
  if (exercise.kind === 'hear') {
    const offset = 1 + Math.floor(rng() * 11)
    return { ...exercise, noteNames: exercise.noteNames.map((note) => transposeNote(note, offset)) }
  }
  return { ...exercise, choices: shuffle(exercise.choices, rng) }
}
