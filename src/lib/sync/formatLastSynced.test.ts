import { describe, expect, it } from 'vitest'
import { formatLastSynced } from './formatLastSynced'

const now = new Date('2026-07-20T12:00:00.000Z')
const ago = (ms: number) => new Date(now.getTime() - ms).toISOString()

describe('formatLastSynced', () => {
  it('reads Never before the first sync', () => {
    expect(formatLastSynced(null, now)).toBe('Never')
  })

  it('reads Never rather than NaN for an unparseable timestamp', () => {
    expect(formatLastSynced('not-a-date', now)).toBe('Never')
  })

  it('collapses the last minute to Just now', () => {
    expect(formatLastSynced(ago(5_000), now)).toBe('Just now')
    expect(formatLastSynced(ago(59_000), now)).toBe('Just now')
  })

  it('counts minutes, then hours, then days', () => {
    expect(formatLastSynced(ago(5 * 60_000), now)).toBe('5 min ago')
    expect(formatLastSynced(ago(60 * 60_000), now)).toBe('1 hour ago')
    expect(formatLastSynced(ago(5 * 60 * 60_000), now)).toBe('5 hours ago')
    expect(formatLastSynced(ago(24 * 60 * 60_000), now)).toBe('Yesterday')
    expect(formatLastSynced(ago(4 * 24 * 60 * 60_000), now)).toBe('4 days ago')
  })

  it('does not show a negative age when the clock is behind the server', () => {
    expect(formatLastSynced(new Date(now.getTime() + 30_000).toISOString(), now)).toBe('Just now')
  })
})
