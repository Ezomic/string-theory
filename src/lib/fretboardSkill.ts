import { getOne, putOne } from './db/db'
import { bumpStreak } from './pathProgress'
import { recordPracticeActivity } from './practiceLog'

const SKILL_KEY = 'fretboardNotes'

export interface StringTapStats {
  correct: number
  wrong: number
}

export function stringLabel(tuning: string[], stringNumber: number): string {
  return `String ${stringNumber} · ${tuning[stringNumber - 1]}`
}

/**
 * Blends this round's per-string tap accuracy into the persisted breakdown via the
 * same 70/30 exponential-moving-average used for overall masteryPct elsewhere, so a
 * single unlucky round can't overwrite a string's established mastery.
 */
export function blendStringBreakdown(
  existing: Record<string, number> | undefined,
  roundStats: Map<number, StringTapStats>,
  tuning: string[],
): Record<string, number> {
  const next = { ...existing }

  roundStats.forEach((stats, stringNumber) => {
    const attempts = stats.correct + stats.wrong
    if (attempts === 0) return

    const roundPct = Math.round((stats.correct / attempts) * 100)
    const label = stringLabel(tuning, stringNumber)
    const prior = next[label]
    next[label] = prior === undefined ? roundPct : Math.round(prior * 0.7 + roundPct * 0.3)
  })

  return next
}

export async function recordQuizRound(
  streak: number,
  total: number,
  roundStats: Map<number, StringTapStats>,
  tuning: string[],
): Promise<void> {
  const timestamp = new Date().toISOString()
  await putOne('drillResults', {
    id: crypto.randomUUID(),
    type: SKILL_KEY,
    level: 1,
    correct: total,
    total,
    streak,
    timestamp,
  })

  const existing = await getOne('skillProgress', SKILL_KEY)
  const masteryPct = Math.min(100, (existing?.masteryPct ?? 0) + 2)
  const perStringBreakdown = blendStringBreakdown(existing?.perStringBreakdown, roundStats, tuning)
  await putOne('skillProgress', { skillKey: SKILL_KEY, masteryPct, perStringBreakdown })

  await bumpStreak()
  await recordPracticeActivity('fretboard', 1)
}
