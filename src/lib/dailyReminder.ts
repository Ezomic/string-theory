import { getAllPracticeSessions } from './practiceLog'

/** Local hour after which a reminder is worth showing — no point nagging first thing in the morning. */
const REMINDER_HOUR = 18
const LAST_SHOWN_KEY = 'st_reminder_last_shown_date'

function dateKey(now: Date): string {
  return now.toISOString().slice(0, 10)
}

/** Requests real browser notification permission; a no-op resolving 'granted' if already granted. */
export async function requestReminderPermission(): Promise<NotificationPermission> {
  if (typeof Notification === 'undefined') return 'denied'
  if (Notification.permission === 'granted') return 'granted'
  return Notification.requestPermission()
}

export interface ReminderCheckInput {
  now: Date
  reminderOn: boolean
  permission: NotificationPermission
  hasPracticedToday: boolean
  lastShownDate: string | null
}

/** Pure so it's easy to test — the real time/permission/practice-log lookups happen in maybeShowDailyReminder. */
export function shouldShowReminder(input: ReminderCheckInput): boolean {
  if (!input.reminderOn) return false
  if (input.permission !== 'granted') return false
  if (input.hasPracticedToday) return false
  if (input.now.getHours() < REMINDER_HOUR) return false
  return input.lastShownDate !== dateKey(input.now)
}

/**
 * Checks once (called on app load) whether today's reminder should fire, and if so shows a
 * real local notification via the registered service worker — this is a PWA with no push
 * backend, so this only fires while the app is opened, not truly in the background.
 */
export async function maybeShowDailyReminder(reminderOn: boolean, now: Date = new Date()): Promise<boolean> {
  if (typeof Notification === 'undefined') return false

  const today = dateKey(now)
  const lastShownDate = localStorage.getItem(LAST_SHOWN_KEY)
  const sessions = await getAllPracticeSessions()
  const hasPracticedToday = sessions.some((session) => session.date === today && session.minutes > 0)

  const shouldShow = shouldShowReminder({
    now,
    reminderOn,
    permission: Notification.permission,
    hasPracticedToday,
    lastShownDate,
  })
  if (!shouldShow) return false

  localStorage.setItem(LAST_SHOWN_KEY, today)

  const title = 'Time for a quick practice?'
  const options: NotificationOptions = {
    body: "You haven't practiced today — even 5 minutes keeps your streak alive.",
    icon: '/favicon.svg',
  }
  const registration = await navigator.serviceWorker?.getRegistration()
  if (registration) {
    await registration.showNotification(title, options)
  } else {
    new Notification(title, options)
  }
  return true
}
