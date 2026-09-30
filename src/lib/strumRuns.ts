import { getOne, putOne } from './db/db'
import type { StrumRating, StrumRun, StrumRunKind } from './db/types'
import { bumpStreak } from './pathProgress'
import { recordPracticeActivity } from './practiceLog'

const SKILL_KEY = 'strumming'

const RATING_SCORES: Record<StrumRating, number> = {
  nailed: 100,
  shaky: 60,
  lost: 20,
}

export function scoreForRating(rating: StrumRating): number {
  return RATING_SCORES[rating]
}

export interface StrumBest {
  score: number
  tempo: number
}

/** Best run per item of one kind, with the tempo it was set at; a tie goes to the faster run. */
export function bestByItem(runs: StrumRun[], kind: StrumRunKind): Record<string, StrumBest> {
  const best: Record<string, StrumBest> = {}
  runs
    .filter((run) => run.kind === kind)
    .forEach((run) => {
      const current = best[run.itemId]
      const better =
        !current || run.score > current.score || (run.score === current.score && run.tempo > current.tempo)
      if (better) best[run.itemId] = { score: run.score, tempo: run.tempo }
    })
  return best
}

export async function recordStrumRun(
  kind: StrumRunKind,
  itemId: string,
  tempo: number,
  rating: StrumRating,
): Promise<StrumRun> {
  const run: StrumRun = {
    id: crypto.randomUUID(),
    kind,
    itemId,
    tempo,
    rating,
    score: scoreForRating(rating),
    timestamp: new Date().toISOString(),
  }
  await putOne('strumRuns', run)

  const existing = await getOne('skillProgress', SKILL_KEY)
  const masteryPct = existing ? Math.round(existing.masteryPct * 0.7 + run.score * 0.3) : run.score
  await putOne('skillProgress', { skillKey: SKILL_KEY, masteryPct })

  await bumpStreak()
  await recordPracticeActivity('strumming', 2)

  return run
}
