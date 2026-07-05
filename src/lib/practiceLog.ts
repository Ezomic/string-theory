import { getAll, getOne, putOne } from './db/db'
import type { PracticeSession } from './db/types'

function dateKey(now: Date): string {
  return now.toISOString().slice(0, 10)
}

/** Upserts today's practice session, adding minutes and (deduped) activity tags. */
export async function recordPracticeActivity(
  activity: string,
  minutes: number,
  now: Date = new Date(),
): Promise<PracticeSession> {
  const date = dateKey(now)
  const existing = await getOne('practiceSessions', date)
  const activities = existing?.activities.includes(activity)
    ? existing.activities
    : [...(existing?.activities ?? []), activity]
  const session: PracticeSession = {
    date,
    minutes: (existing?.minutes ?? 0) + minutes,
    activities,
  }
  await putOne('practiceSessions', session)
  return session
}

export async function getAllPracticeSessions(): Promise<PracticeSession[]> {
  return getAll('practiceSessions')
}

export function totalPracticeMinutes(sessions: PracticeSession[]): number {
  return sessions.reduce((sum, s) => sum + s.minutes, 0)
}

const HEATMAP_DAYS = 28

/** Last 28 days (oldest first) as 0-3 intensity buckets, for the `Heatmap` component. */
export function last28DaysHeatmap(sessions: PracticeSession[], now: Date = new Date()): number[] {
  const minutesByDate = new Map(sessions.map((s) => [s.date, s.minutes]))
  const days: number[] = []
  for (let i = HEATMAP_DAYS - 1; i >= 0; i -= 1) {
    const day = new Date(now.getTime() - i * 86400000)
    const minutes = minutesByDate.get(dateKey(day)) ?? 0
    days.push(intensityFor(minutes))
  }
  return days
}

function intensityFor(minutes: number): number {
  if (minutes <= 0) return 0
  if (minutes < 5) return 1
  if (minutes < 15) return 2
  return 3
}
