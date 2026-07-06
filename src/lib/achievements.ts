import { DRILL_CATEGORIES, statsForCategory } from './earTraining'
import { getAll, getOne } from './db/db'
import type { DrillResult, PlayRun, Streak } from './db/types'
import { ALL_LESSONS_ORDERED } from './curriculum'
import { getTunerStats } from './tunerStats'

export interface AchievementDef {
  key: string
  icon: string
  label: string
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { key: 'streak7', icon: '🔥', label: '7-day streak' },
  { key: 'firstLesson', icon: '📖', label: 'First lesson' },
  { key: 'earLevel3', icon: '👂', label: 'Ear Lv 3' },
  { key: 'perfectRun', icon: '💯', label: 'Perfect run' },
  { key: 'fretboardNovice', icon: '🎸', label: 'Fretboard novice' },
  { key: 'nightOwl', icon: '🌙', label: 'Night owl' },
  { key: 'tuned50', icon: '🎯', label: 'Tuned 50×' },
  { key: 'curriculumComplete', icon: '🎓', label: 'Curriculum complete' },
  { key: 'streak30', icon: '🏆', label: '30-day streak' },
  { key: 'fretboardMaster', icon: '🧠', label: 'Fretboard master' },
]

export interface AchievementInput {
  streak: Streak | undefined
  lessonsDoneCount: number
  totalLessonsCount: number
  bestEarLevel: number
  hasPerfectPlayRun: boolean
  fretboardMasteryPct: number
  hasNightOwlActivity: boolean
  tunerInTuneCount: number
}

/** Pure so it's easy to test — timezone-sensitive bits (e.g. night owl) are resolved by the caller first. */
export function computeEarnedAchievements(input: AchievementInput): Set<string> {
  const earned = new Set<string>()
  const longestStreak = input.streak?.longest ?? 0

  if (longestStreak >= 7) earned.add('streak7')
  if (longestStreak >= 30) earned.add('streak30')
  if (input.lessonsDoneCount >= 1) earned.add('firstLesson')
  if (input.totalLessonsCount > 0 && input.lessonsDoneCount >= input.totalLessonsCount) {
    earned.add('curriculumComplete')
  }
  if (input.bestEarLevel >= 3) earned.add('earLevel3')
  if (input.hasPerfectPlayRun) earned.add('perfectRun')
  if (input.fretboardMasteryPct >= 50) earned.add('fretboardNovice')
  if (input.fretboardMasteryPct >= 100) earned.add('fretboardMaster')
  if (input.hasNightOwlActivity) earned.add('nightOwl')
  if (input.tunerInTuneCount >= 50) earned.add('tuned50')

  return earned
}

const NIGHT_OWL_START_HOUR = 22
const NIGHT_OWL_END_HOUR = 5

function isNightOwlHour(iso: string): boolean {
  const hour = new Date(iso).getHours()
  return hour >= NIGHT_OWL_START_HOUR || hour < NIGHT_OWL_END_HOUR
}

function isPerfectRun(run: PlayRun): boolean {
  return run.notes.length > 0 && run.notes.every((n) => n.result === 'clean')
}

function bestEarLevel(drillResults: DrillResult[]): number {
  return Math.max(0, ...DRILL_CATEGORIES.map((c) => statsForCategory(drillResults, c.id).level))
}

/** Gathers current state from IndexedDB and resolves it into `computeEarnedAchievements`'s input shape. */
export async function loadAchievementInput(): Promise<AchievementInput> {
  const [streak, lessonProgress, drillResults, playRuns, skillProgress, tunerStats] = await Promise.all([
    getOne('streak', 'current'),
    getAll('lessonProgress'),
    getAll('drillResults'),
    getAll('playRuns'),
    getAll('skillProgress'),
    getTunerStats(),
  ])

  const lessonsDoneCount = lessonProgress.filter((p) => p.status === 'done').length
  const fretboardMasteryPct = skillProgress.find((s) => s.skillKey === 'fretboardNotes')?.masteryPct ?? 0
  const activityTimestamps = [
    ...lessonProgress.map((p) => p.completedAt).filter((t): t is string => t !== null),
    ...drillResults.map((r) => r.timestamp),
    ...playRuns.map((r) => r.timestamp),
  ]

  return {
    streak,
    lessonsDoneCount,
    totalLessonsCount: ALL_LESSONS_ORDERED.length,
    bestEarLevel: bestEarLevel(drillResults),
    hasPerfectPlayRun: playRuns.some(isPerfectRun),
    fretboardMasteryPct,
    hasNightOwlActivity: activityTimestamps.some(isNightOwlHour),
    tunerInTuneCount: tunerStats.inTuneCount,
  }
}
