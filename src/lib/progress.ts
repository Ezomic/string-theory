import { DRILL_CATEGORIES, statsForCategory } from './earTraining'
import type { DrillResult, PracticeSession, SkillProgress } from './db/types'

export interface SkillDisplay {
  key: string
  label: string
  masteryPct: number
  /** Where "drill the weak spots" should send the user. */
  route: string
}

interface SkillMeta {
  label: string
  route: string
}

const SKILL_META: Record<string, SkillMeta> = {
  fretboardNotes: { label: 'Fretboard notes', route: '/tools/fretboard/quiz' },
  play: { label: 'Play & feedback', route: '/tools/play' },
  riffs: { label: 'Riffs', route: '/tools/riffs' },
  intervals: { label: 'Intervals (ear)', route: '/tools/ear/drill?category=intervals' },
  chordQuality: { label: 'Chord quality (ear)', route: '/tools/ear/drill?category=chordQuality' },
  scaleRecognition: { label: 'Scale recognition (ear)', route: '/tools/ear/drill?category=scaleRecognition' },
  progressions: { label: 'Chord progressions (ear)', route: '/tools/ear/drill?category=progressions' },
}

/**
 * Combines the two places "mastery" lives: SkillProgress records (fretboard, play)
 * and ear-drill accuracy (DrillResult, which never got its own SkillProgress rows).
 */
export function buildSkillsList(skillProgress: SkillProgress[], drillResults: DrillResult[]): SkillDisplay[] {
  const list: SkillDisplay[] = []

  skillProgress.forEach((skill) => {
    const meta = SKILL_META[skill.skillKey]
    if (meta) list.push({ key: skill.skillKey, label: meta.label, masteryPct: skill.masteryPct, route: meta.route })
  })

  DRILL_CATEGORIES.forEach((category) => {
    const stats = statsForCategory(drillResults, category.id)
    const meta = SKILL_META[category.id]
    if (stats.attempts > 0 && meta) {
      list.push({ key: category.id, label: meta.label, masteryPct: stats.accuracyPct, route: meta.route })
    }
  })

  return list.sort((a, b) => b.masteryPct - a.masteryPct)
}

export function skillMetaFor(skillKey: string): SkillMeta | undefined {
  return SKILL_META[skillKey]
}

/** True before any practice has happened at all — drives the K3 empty state. */
export function isProgressEmpty(sessions: PracticeSession[]): boolean {
  return sessions.length === 0
}
