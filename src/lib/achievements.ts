import { DRILL_CATEGORIES, statsForCategory } from './earTraining'
import { getAll, getOne } from './db/db'
import type { DrillResult, LessonProgress, PlayRun, Streak } from './db/types'
import { ALL_LESSONS_ORDERED, UNITS, lessonsInUnit } from './curriculum'
import { bestScoresByRiff } from './riffRuns'
import { getTunerStats } from './tunerStats'

/** A riff counts as "nailed" for the Riff master badge once its best score reaches this. */
const RIFF_CLEAN_SCORE = 85
/** Distinct riffs you must nail to earn the Riff master badge. */
const RIFF_MASTER_THRESHOLD = 5
/** Correct sight-reads (drill level 3) that earn the Staff reader badge, if the unit isn't mastered first. */
const SIGHT_READING_MASTER_CORRECT = 10

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
  { key: 'fullUnit', icon: '📚', label: 'Full unit' },
  { key: 'firstMastered', icon: '🏅', label: 'Mastered a lesson' },
  { key: 'firstRiff', icon: '🎸', label: 'First riff' },
  { key: 'riffMaster', icon: '🤘', label: 'Riff master' },
  { key: 'curriculumComplete', icon: '🎓', label: 'Curriculum complete' },
  { key: 'streak30', icon: '🏆', label: '30-day streak' },
  { key: 'fretboardMaster', icon: '🧠', label: 'Fretboard master' },
  { key: 'firstSightRead', icon: '👓', label: 'First sight-read' },
  { key: 'staffReader', icon: '🎼', label: 'Staff reader' },
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
  hasCompletedAnyUnit: boolean
  masteredLessonCount: number
  riffsPlayedCount: number
  riffsCleanCount: number
  sightReadingCorrectCount: number
  sightReadingUnitMastered: boolean
}

/** Pure so it's easy to test — timezone-sensitive bits (e.g. night owl) are resolved by the caller first. */
export function computeEarnedAchievements(input: AchievementInput): Set<string> {
  const earned = new Set<string>()
  const longestStreak = input.streak?.longest ?? 0

  if (longestStreak >= 7) earned.add('streak7')
  if (longestStreak >= 30) earned.add('streak30')
  if (input.lessonsDoneCount >= 1) earned.add('firstLesson')
  if (input.hasCompletedAnyUnit) earned.add('fullUnit')
  if (input.masteredLessonCount >= 1) earned.add('firstMastered')
  if (input.riffsPlayedCount >= 1) earned.add('firstRiff')
  if (input.riffsCleanCount >= RIFF_MASTER_THRESHOLD) earned.add('riffMaster')
  if (input.sightReadingCorrectCount >= 1) earned.add('firstSightRead')
  if (input.sightReadingCorrectCount >= SIGHT_READING_MASTER_CORRECT || input.sightReadingUnitMastered) {
    earned.add('staffReader')
  }
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

function hasCompletedAnyUnit(lessonProgress: LessonProgress[]): boolean {
  const doneIds = new Set(lessonProgress.filter((p) => p.status === 'done').map((p) => p.lessonId))
  return UNITS.some((unit) => {
    const lessons = lessonsInUnit(unit.id)
    return lessons.length > 0 && lessons.every((lesson) => doneIds.has(lesson.id))
  })
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
  const [streak, lessonProgress, drillResults, playRuns, riffRuns, sightReadingRuns, skillProgress, tunerStats] =
    await Promise.all([
      getOne('streak', 'current'),
      getAll('lessonProgress'),
      getAll('drillResults'),
      getAll('playRuns'),
      getAll('riffRuns'),
      getAll('sightReadingRuns'),
      getAll('skillProgress'),
      getTunerStats(),
    ])

  const bestRiffScores = bestScoresByRiff(riffRuns)
  const lessonsDoneCount = lessonProgress.filter((p) => p.status === 'done').length
  const fretboardMasteryPct = skillProgress.find((s) => s.skillKey === 'fretboardNotes')?.masteryPct ?? 0
  const masteredLessonIds = new Set(lessonProgress.filter((p) => p.mastered).map((p) => p.lessonId))
  const sightReadingUnit = lessonsInUnit('unit-6')
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
    hasCompletedAnyUnit: hasCompletedAnyUnit(lessonProgress),
    masteredLessonCount: lessonProgress.filter((p) => p.mastered).length,
    riffsPlayedCount: Object.keys(bestRiffScores).length,
    riffsCleanCount: Object.values(bestRiffScores).filter((score) => score >= RIFF_CLEAN_SCORE).length,
    sightReadingCorrectCount: sightReadingRuns.reduce((sum, run) => sum + run.correct, 0),
    sightReadingUnitMastered: sightReadingUnit.length > 0 && sightReadingUnit.every((l) => masteredLessonIds.has(l.id)),
  }
}
