import type { SkillProgress } from './db/types'

export interface DailyMixStep {
  id: string
  icon: string
  title: string
  subtitle: string
  route: string
}

interface WeakSpotInfo {
  icon: string
  label: string
  route: string
}

const WEAK_SPOT_BY_SKILL: Record<string, WeakSpotInfo> = {
  fretboardNotes: { icon: '🎸', label: 'Fretboard notes drill', route: '/tools/fretboard/quiz' },
  play: { icon: '🎼', label: 'Play a scale for feedback', route: '/tools/play' },
}

const DEFAULT_WEAK_SPOT: WeakSpotInfo = WEAK_SPOT_BY_SKILL.fretboardNotes

function weakestSkillStep(skillProgress: SkillProgress[]): DailyMixStep {
  const tracked = skillProgress.filter((s) => s.skillKey in WEAK_SPOT_BY_SKILL)
  const weakest = tracked.length > 0 ? tracked.reduce((a, b) => (a.masteryPct <= b.masteryPct ? a : b)) : undefined
  const info = weakest ? WEAK_SPOT_BY_SKILL[weakest.skillKey] : DEFAULT_WEAK_SPOT

  return {
    id: 'weakspot',
    icon: info.icon,
    title: info.label,
    subtitle: weakest ? 'Your weak spot · 3 min' : '3 min',
    route: info.route,
  }
}

/** A ~10 min blended session: warm-up, weakest tracked skill, an ear drill, and a play exercise. */
export function buildDailyMix(skillProgress: SkillProgress[]): DailyMixStep[] {
  return [
    { id: 'warmup', icon: '🎯', title: 'Warm-up: tune up', subtitle: 'Tuner · 1 min', route: '/tools/tuner' },
    weakestSkillStep(skillProgress),
    {
      id: 'ear',
      icon: '👂',
      title: 'Interval ear training',
      subtitle: '4 min',
      route: '/tools/ear/drill?category=intervals',
    },
    {
      id: 'play',
      icon: '🎼',
      title: 'Play a C major scale',
      subtitle: 'Feedback · 2 min',
      route: '/tools/play/c-major-scale',
    },
  ]
}

const STORAGE_PREFIX = 'stringtheory:dailyMix:'

function todayStorageKey(now: Date): string {
  return STORAGE_PREFIX + now.toISOString().slice(0, 10)
}

/** Which steps have been tapped through today. Best-effort — storage failures just mean nothing's marked done. */
export function getCompletedMixSteps(now: Date = new Date()): Set<string> {
  try {
    const raw = localStorage.getItem(todayStorageKey(now))
    return new Set(raw ? (JSON.parse(raw) as string[]) : [])
  } catch {
    return new Set()
  }
}

export function markMixStepDone(stepId: string, now: Date = new Date()): void {
  const done = getCompletedMixSteps(now)
  done.add(stepId)
  try {
    localStorage.setItem(todayStorageKey(now), JSON.stringify([...done]))
  } catch {
    // best-effort — e.g. private browsing with storage disabled
  }
}
