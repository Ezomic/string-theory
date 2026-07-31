const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

/** Short, glanceable phrasing for the last successful sync. */
export function formatLastSynced(iso: string | null, now: Date = new Date()): string {
  if (!iso) return 'Never'

  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return 'Never'

  const elapsed = now.getTime() - then
  if (elapsed < 0) return 'Just now'
  if (elapsed < MINUTE) return 'Just now'
  if (elapsed < HOUR) {
    const minutes = Math.floor(elapsed / MINUTE)
    return `${minutes} min ago`
  }
  if (elapsed < DAY) {
    const hours = Math.floor(elapsed / HOUR)
    return hours === 1 ? '1 hour ago' : `${hours} hours ago`
  }
  const days = Math.floor(elapsed / DAY)
  return days === 1 ? 'Yesterday' : `${days} days ago`
}
