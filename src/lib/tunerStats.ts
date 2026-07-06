import { getOne, putOne } from './db/db'
import type { TunerStats } from './db/types'

const KEY = 'tuner'

export async function getTunerStats(): Promise<TunerStats> {
  return (await getOne('tunerStats', KEY)) ?? { id: KEY, inTuneCount: 0 }
}

/** Call once per in-tune transition (not-in-tune -> in-tune) — never once per animation frame. */
export async function recordTunerInTune(): Promise<TunerStats> {
  const existing = await getTunerStats()
  const next: TunerStats = { id: KEY, inTuneCount: existing.inTuneCount + 1 }
  await putOne('tunerStats', next)
  return next
}
