import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getDB } from './db/db'
import { recordPracticeActivity } from './practiceLog'
import { maybeShowDailyReminder, shouldShowReminder } from './dailyReminder'

beforeEach(async () => {
  const db = await getDB()
  await Promise.all([...db.objectStoreNames].map((store) => db.clear(store)))
})

const EVENING = new Date('2026-01-10T19:00:00.000Z')
const MORNING = new Date('2026-01-10T08:00:00.000Z')

describe('shouldShowReminder', () => {
  function baseInput(overrides: Partial<Parameters<typeof shouldShowReminder>[0]> = {}) {
    return {
      now: EVENING,
      reminderOn: true,
      permission: 'granted' as NotificationPermission,
      hasPracticedToday: false,
      lastShownDate: null,
      ...overrides,
    }
  }

  it('shows when everything lines up', () => {
    expect(shouldShowReminder(baseInput())).toBe(true)
  })

  it('does not show when the reminder is off', () => {
    expect(shouldShowReminder(baseInput({ reminderOn: false }))).toBe(false)
  })

  it('does not show without granted permission', () => {
    expect(shouldShowReminder(baseInput({ permission: 'default' }))).toBe(false)
    expect(shouldShowReminder(baseInput({ permission: 'denied' }))).toBe(false)
  })

  it('does not show if practice already happened today', () => {
    expect(shouldShowReminder(baseInput({ hasPracticedToday: true }))).toBe(false)
  })

  it('does not show before the reminder hour', () => {
    expect(shouldShowReminder(baseInput({ now: MORNING }))).toBe(false)
  })

  it('does not show twice on the same day', () => {
    expect(shouldShowReminder(baseInput({ lastShownDate: '2026-01-10' }))).toBe(false)
  })

  it('shows again on a new day even if shown before', () => {
    expect(shouldShowReminder(baseInput({ lastShownDate: '2026-01-09' }))).toBe(true)
  })
})

describe('maybeShowDailyReminder', () => {
  let store: Record<string, string>
  let shown: { title: string; options: NotificationOptions }[]

  beforeEach(() => {
    store = {}
    shown = []
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => store[key] ?? null,
      setItem: (key: string, value: string) => {
        store[key] = value
      },
    })
    vi.stubGlobal('Notification', { permission: 'granted' })
    vi.stubGlobal('navigator', {
      serviceWorker: {
        getRegistration: async () => ({
          showNotification: async (title: string, options: NotificationOptions) => {
            shown.push({ title, options })
          },
        }),
      },
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('shows a real notification when nothing has been practiced yet today, past the reminder hour', async () => {
    const fired = await maybeShowDailyReminder(true, EVENING)
    expect(fired).toBe(true)
    expect(shown).toHaveLength(1)
    expect(shown[0].title).toContain('practice')
  })

  it('does not show when today already has a logged practice session', async () => {
    await recordPracticeActivity('lesson', 5, EVENING)
    const fired = await maybeShowDailyReminder(true, EVENING)
    expect(fired).toBe(false)
    expect(shown).toHaveLength(0)
  })

  it('only fires once per day even if called again', async () => {
    await maybeShowDailyReminder(true, EVENING)
    const secondCall = await maybeShowDailyReminder(true, EVENING)
    expect(secondCall).toBe(false)
    expect(shown).toHaveLength(1)
  })
})
