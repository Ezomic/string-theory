import type { SkillDisplay } from './progress'

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

const DEFAULT_WEAK_SPOT: WeakSpotInfo = { icon: '🎸', label: 'Fretboard notes drill', route: '/tools/fretboard/quiz' }

const ICON_BY_SKILL_KEY: Record<string, string> = {
  fretboardNotes: '🎸',
  play: '🎼',
  riffs: '🎵',
  sightReading: '📖',
  intervals: '👂',
  chordQuality: '👂',
  scaleRecognition: '👂',
  progressions: '👂',
}

/** Same route as the fixed 'ear' step below — picking it again as the "weak spot" would just repeat it. */
const FIXED_EAR_STEP_ROUTE = '/tools/ear/drill?category=intervals'

/**
 * `skills` is the same combined SkillProgress + ear-drill-accuracy list Progress (J1) shows,
 * so a genuinely weak ear-training category can be picked here too, not just fretboard/play.
 */
function weakestSkillStep(skills: SkillDisplay[]): DailyMixStep {
  const weakest = [...skills].sort((a, b) => a.masteryPct - b.masteryPct).find((s) => s.route !== FIXED_EAR_STEP_ROUTE)
  const info: WeakSpotInfo = weakest
    ? {
        icon: ICON_BY_SKILL_KEY[weakest.key] ?? '🎯',
        label: `${weakest.label.replace(' (ear)', '')} drill`,
        route: weakest.route,
      }
    : DEFAULT_WEAK_SPOT

  return {
    id: 'weakspot',
    icon: info.icon,
    title: info.label,
    subtitle: weakest ? 'Your weak spot · 3 min' : '3 min',
    route: info.route,
  }
}

/** A ~10 min blended session: warm-up, weakest tracked skill, an ear drill, and a play exercise. */
export function buildDailyMix(skills: SkillDisplay[]): DailyMixStep[] {
  return [
    { id: 'warmup', icon: '🎯', title: 'Warm-up: tune up', subtitle: 'Tuner · 1 min', route: '/tools/tuner' },
    weakestSkillStep(skills),
    {
      id: 'ear',
      icon: '👂',
      title: 'Interval ear training',
      subtitle: '4 min',
      route: FIXED_EAR_STEP_ROUTE,
    },
    {
      id: 'play',
      icon: '🎼',
      title: 'Play a C major scale',
      subtitle: 'Feedback · 2 min',
      route: '/tools/play/c-major-scale',
    },
    {
      id: 'routine',
      icon: '🔁',
      title: 'Practice routine',
      subtitle: 'Warm-Up Flow · 3 min',
      route: '/tools/routines/warm-up-flow',
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
