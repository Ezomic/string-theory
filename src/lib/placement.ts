import { generateQuestion, type DrillQuestion } from './earTraining'

export interface TheoryQuestion {
  id: string
  prompt: string
  choices: string[]
  correctChoice: string
}

export const THEORY_QUESTIONS: TheoryQuestion[] = [
  {
    id: 'theory-1',
    prompt: "What's the relative minor of G major?",
    choices: ['D minor', 'E minor', 'B minor', 'C minor'],
    correctChoice: 'E minor',
  },
  {
    id: 'theory-2',
    prompt: 'How many sharps are in the key of D major?',
    choices: ['1', '2', '3', '4'],
    correctChoice: '2',
  },
  {
    id: 'theory-3',
    prompt: 'What note is a perfect fifth above C?',
    choices: ['F', 'G', 'A', 'D'],
    correctChoice: 'G',
  },
  {
    id: 'theory-4',
    prompt: "Which chord is the 'four chord' (IV) in the key of C major?",
    choices: ['G major', 'F major', 'A minor', 'D minor'],
    correctChoice: 'F major',
  },
]

/** Ear questions reuse the ear-training question generator (playback, never the mic). */
export function generateEarQuestions(): DrillQuestion[] {
  return [generateQuestion('intervals', 2), generateQuestion('chordQuality', 1)]
}

export interface PlacementAnswer {
  correct: boolean
}

export interface PlacementScore {
  level: number
  theoryCorrect: number
  theoryTotal: number
  earCorrect: number
  earTotal: number
}

/** Total correct answers (0-6) map to a starting curriculum level (1-3). */
export function levelFromScore(totalCorrect: number, totalQuestions: number): number {
  const pct = totalQuestions > 0 ? totalCorrect / totalQuestions : 0
  if (pct >= 5 / 6) return 3
  if (pct >= 3 / 6) return 2
  return 1
}

export function strengthFromCount(correct: number, total: number): 'strong' | 'good' | 'weak' {
  if (total === 0) return 'weak'
  const pct = correct / total
  if (pct >= 1) return 'strong'
  if (pct >= 0.5) return 'good'
  return 'weak'
}

/** Level implied by self-rated experience, used when the placement check is skipped. */
export function levelFromExperience(experienceIndex: number): number {
  return Math.min(3, Math.max(1, experienceIndex + 1))
}

export function scoreFromAnswers(theoryAnswers: boolean[], earAnswers: boolean[]): PlacementScore {
  const theoryCorrect = theoryAnswers.filter(Boolean).length
  const earCorrect = earAnswers.filter(Boolean).length
  const totalCorrect = theoryCorrect + earCorrect
  const totalQuestions = theoryAnswers.length + earAnswers.length

  return {
    level: levelFromScore(totalCorrect, totalQuestions),
    theoryCorrect,
    theoryTotal: theoryAnswers.length,
    earCorrect,
    earTotal: earAnswers.length,
  }
}
