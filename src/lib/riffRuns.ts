import { getAll, getOne, putOne } from './db/db'
import type { RiffRun } from './db/types'
import { bumpStreak } from './pathProgress'
import { scoreForRun } from './playRuns'
import { recordPracticeActivity } from './practiceLog'

const SKILL_KEY = 'riffs'

/** Best score achieved per riff id, for showing progress in the library. */
export function bestScoresByRiff(runs: RiffRun[]): Record<string, number> {
  const best: Record<string, number> = {}
  runs.forEach((run) => {
    best[run.riffId] = Math.max(best[run.riffId] ?? 0, run.score)
  })
  return best
}

export async function lastRiffRun(riffId: string): Promise<RiffRun | undefined> {
  const all = await getAll('riffRuns')
  return all
    .filter((run) => run.riffId === riffId)
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))[0]
}

export async function recordRiffRun(
  riffId: string,
  notes: RiffRun['notes'],
  timingPct: number,
): Promise<RiffRun> {
  const run: RiffRun = {
    id: crypto.randomUUID(),
    riffId,
    notes,
    timingPct,
    score: scoreForRun(
      notes.map((n) => n.result),
      timingPct,
    ),
    timestamp: new Date().toISOString(),
  }
  await putOne('riffRuns', run)

  const existing = await getOne('skillProgress', SKILL_KEY)
  const masteryPct = existing ? Math.round(existing.masteryPct * 0.7 + run.score * 0.3) : run.score
  await putOne('skillProgress', { skillKey: SKILL_KEY, masteryPct })

  await bumpStreak()
  await recordPracticeActivity('riff', 2)

  return run
}
