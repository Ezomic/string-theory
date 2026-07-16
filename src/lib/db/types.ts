export type Instrument = 'guitar' | 'bass'
export type TuningPreset = 'standard' | 'dropD' | 'halfStepDown' | 'dadgad' | 'openG' | 'custom'
export type NotationLabels = 'names' | 'degrees' | 'solfege'
export type Theme = 'dark' | 'light'
export type LoopStep = 'read' | 'see' | 'hear' | 'play'
export type LessonStatus = 'locked' | 'available' | 'in_progress' | 'done'
export type PlayNoteResult = 'clean' | 'sharp' | 'flat' | 'missed'
export type VoiceId =
  | 'pluckGuitar'
  | 'pluckBass'
  | 'pluckNylon'
  | 'sine'
  | 'triangle'
  | 'sawtooth'
  | 'square'
  | 'organ'
  | 'bell'
  | 'pad'
/** A stored voice preference — a fixed voice, or 'random' to reroll on each new question. */
export type VoiceSelection = VoiceId | 'random'

export interface UserProfile {
  id: string
  name: string
  email?: string
  isGuest: boolean
  createdAt: string
  plan: 'free' | 'pro'
}

export interface InstrumentConfig {
  id: string
  userId: string
  instrument: Instrument
  stringCount: 4 | 5 | 6
  tuning: string[]
  tuningPreset: TuningPreset
  leftHanded: boolean
  referencePitch: number
}

export interface PlacementResult {
  id: string
  userId: string
  level: number
  strengths: {
    ear: number
    theory: number
    fretboard: number
    chords: number
  }
  takenAt: string
}

export interface Unit {
  id: string
  title: string
  order: number
  level: number
}

export interface Lesson {
  id: string
  unitId: string
  order: number
  title: string
  concept: string
  loopSteps: LoopStep[]
  fretboardData: unknown
  audioData: unknown
  unlockRule: string
}

export interface LessonProgress {
  lessonId: string
  status: LessonStatus
  score: number
  notesCleanPct: number
  completedAt: string | null
  /** Set once the learner passes the lesson's Master test (built in A5). */
  mastered?: boolean
}

export interface SkillProgress {
  skillKey: string
  masteryPct: number
  perStringBreakdown?: Record<string, number>
}

export interface Streak {
  id: 'current'
  current: number
  longest: number
  lastPracticeDate: string | null
}

export interface TunerStats {
  id: 'tuner'
  /** Count of genuine in-tune transitions, not frames — see recordTunerInTune. */
  inTuneCount: number
}

export interface Achievement {
  key: string
  earnedAt: string | null
}

export interface DrillResult {
  id: string
  type: string
  level: number
  correct: number
  total: number
  streak: number
  timestamp: string
}

export interface PlayRun {
  id: string
  exerciseId: string
  notes: { name: string; result: PlayNoteResult; cents: number }[]
  timingPct: number
  score: number
  timestamp: string
}

export interface RiffRun {
  id: string
  riffId: string
  notes: { name: string; result: PlayNoteResult; cents: number }[]
  timingPct: number
  score: number
  timestamp: string
}

export interface SightReadingRun {
  id: string
  mode: 'name' | 'play'
  level: number
  correct: number
  total: number
  timestamp: string
}

export interface PracticeSession {
  date: string
  minutes: number
  activities: string[]
}

export interface Settings {
  id: 'settings'
  notationLabels: NotationLabels
  theme: Theme
  reminderOn: boolean
  micDeviceId: string | null
  syncEnabled: boolean
  voice: VoiceSelection
  noInstrument: boolean
}
