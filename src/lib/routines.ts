import { exerciseById } from './exercises'

export interface RoutineStep {
  /** References an Exercise id in exercises.ts. */
  exerciseId: string
  /** Target tempo (bpm) for this step. */
  tempo: number
}

export interface Routine {
  id: string
  title: string
  subtitle: string
  steps: RoutineStep[]
}

export const ROUTINES: Routine[] = [
  {
    id: 'warm-up-flow',
    title: 'Warm-Up Flow',
    subtitle: 'Loosen up: chromatics into scales',
    steps: [
      { exerciseId: 'chromatic-run', tempo: 60 },
      { exerciseId: 'c-major-scale', tempo: 80 },
      { exerciseId: 'a-minor-pentatonic', tempo: 100 },
    ],
  },
  {
    id: 'scale-speed-builder',
    title: 'Scale Speed Builder',
    subtitle: 'Same scale, climbing the tempo',
    steps: [
      { exerciseId: 'g-major-scale', tempo: 60 },
      { exerciseId: 'g-major-scale', tempo: 80 },
      { exerciseId: 'g-major-scale', tempo: 100 },
      { exerciseId: 'g-major-scale', tempo: 120 },
    ],
  },
  {
    id: 'arpeggio-workout',
    title: 'Arpeggio Workout',
    subtitle: 'Triads and 7th-chord shapes',
    steps: [
      { exerciseId: 'c-major-arpeggio', tempo: 80 },
      { exerciseId: 'a-minor-arpeggio', tempo: 80 },
      { exerciseId: 'g-dominant-7-arpeggio', tempo: 100 },
      { exerciseId: 'c-major-7-arpeggio', tempo: 100 },
    ],
  },
  {
    id: 'modal-explorer',
    title: 'Modal Explorer',
    subtitle: 'Dorian, Mixolydian and Phrygian',
    steps: [
      { exerciseId: 'd-dorian-scale', tempo: 80 },
      { exerciseId: 'g-mixolydian-scale', tempo: 80 },
      { exerciseId: 'e-phrygian-scale', tempo: 100 },
    ],
  },
  {
    id: 'bass-groove-session',
    title: 'Bass Groove Session',
    subtitle: 'Scales and a walking line for bass',
    steps: [
      { exerciseId: 'e-major-scale-bass', tempo: 80 },
      { exerciseId: 'a-minor-pentatonic-bass', tempo: 100 },
      { exerciseId: 'walking-bass-c', tempo: 100 },
    ],
  },
]

export function routineById(id: string): Routine | undefined {
  return ROUTINES.find((r) => r.id === id)
}

/** The slowest and fastest tempo target in a routine, for a summary badge. */
export function routineTempoRange(routine: Routine): { min: number; max: number } {
  const tempos = routine.steps.map((s) => s.tempo)
  return { min: Math.min(...tempos), max: Math.max(...tempos) }
}

/** Resolves each step's exercise; skips steps whose exercise id is unknown. */
export function routineExercises(routine: Routine) {
  return routine.steps
    .map((step) => ({ step, exercise: exerciseById(step.exerciseId) }))
    .filter((entry): entry is { step: RoutineStep; exercise: NonNullable<typeof entry.exercise> } => entry.exercise !== undefined)
}
