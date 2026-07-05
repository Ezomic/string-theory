import { getAll, getOne, putOne } from './db/db'
import type { PlayNoteResult, PlayRun } from './db/types'

const SKILL_KEY = 'play'

export function scoreForRun(results: PlayNoteResult[], timingPct: number): number {
  if (results.length === 0) return 0
  const cleanRatio = results.filter((r) => r === 'clean').length / results.length
  return Math.round(cleanRatio * 70 + timingPct * 0.3)
}

export function focusTipFor(notes: PlayRun['notes']): string | null {
  const offenders = notes.filter((n) => n.result === 'sharp' || n.result === 'flat')
  if (offenders.length === 0) return null

  const worst = offenders.reduce((a, b) => (Math.abs(b.cents) > Math.abs(a.cents) ? b : a))
  const sign = worst.cents > 0 ? '+' : ''
  const advice =
    worst.result === 'sharp'
      ? 'Try fretting a touch lighter, or check your tuning.'
      : 'Press a little firmer, right behind the fret.'
  return `Your ${worst.name} ran ${worst.result} (${sign}${worst.cents}¢). ${advice}`
}

export async function lastRunFor(exerciseId: string): Promise<PlayRun | undefined> {
  const all = await getAll('playRuns')
  return all
    .filter((run) => run.exerciseId === exerciseId)
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))[0]
}

export async function recordPlayRun(
  exerciseId: string,
  notes: PlayRun['notes'],
  timingPct: number,
): Promise<PlayRun> {
  const run: PlayRun = {
    id: crypto.randomUUID(),
    exerciseId,
    notes,
    timingPct,
    score: scoreForRun(
      notes.map((n) => n.result),
      timingPct,
    ),
    timestamp: new Date().toISOString(),
  }
  await putOne('playRuns', run)

  const existing = await getOne('skillProgress', SKILL_KEY)
  const masteryPct = existing ? Math.round(existing.masteryPct * 0.7 + run.score * 0.3) : run.score
  await putOne('skillProgress', { skillKey: SKILL_KEY, masteryPct })

  return run
}
