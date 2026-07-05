import { create } from 'zustand'
import { playbackEngine } from '../lib/audio/playbackEngine'
import { VOICES } from '../lib/audio/voices'
import { getOne, putOne } from '../lib/db/db'
import type { NotationLabels, Settings, VoiceId, VoiceSelection } from '../lib/db/types'

const DEFAULT_SETTINGS: Settings = {
  id: 'settings',
  notationLabels: 'names',
  theme: 'dark',
  reminderOn: false,
  micDeviceId: null,
  syncEnabled: false,
  voice: 'random',
}

interface AudioSettingsState {
  voice: VoiceSelection
  micDeviceId: string | null
  notationLabels: NotationLabels
  reminderOn: boolean
  hydrated: boolean
  hydrate: () => Promise<void>
  setVoice: (voice: VoiceSelection) => void
  setMicDeviceId: (micDeviceId: string | null) => void
  setNotationLabels: (notationLabels: NotationLabels) => void
  setReminderOn: (reminderOn: boolean) => void
  /** Re-rolls the live playback voice when the selection is 'random'; a no-op for a fixed voice. */
  rerollPlaybackVoice: () => void
}

async function persist(partial: Partial<Settings>): Promise<void> {
  const existing = await getOne('settings', 'settings')
  await putOne('settings', { ...(existing ?? DEFAULT_SETTINGS), ...partial })
}

function randomVoice(): VoiceId {
  return VOICES[Math.floor(Math.random() * VOICES.length)].id
}

function applyVoiceToEngine(selection: VoiceSelection): void {
  playbackEngine.setVoice(selection === 'random' ? randomVoice() : selection)
}

export const useAudioSettingsStore = create<AudioSettingsState>((set, get) => ({
  voice: DEFAULT_SETTINGS.voice,
  micDeviceId: DEFAULT_SETTINGS.micDeviceId,
  notationLabels: DEFAULT_SETTINGS.notationLabels,
  reminderOn: DEFAULT_SETTINGS.reminderOn,
  hydrated: false,

  hydrate: async () => {
    const existing = await getOne('settings', 'settings')
    const voice = existing?.voice ?? DEFAULT_SETTINGS.voice
    applyVoiceToEngine(voice)
    set({
      voice,
      micDeviceId: existing?.micDeviceId ?? DEFAULT_SETTINGS.micDeviceId,
      notationLabels: existing?.notationLabels ?? DEFAULT_SETTINGS.notationLabels,
      reminderOn: existing?.reminderOn ?? DEFAULT_SETTINGS.reminderOn,
      hydrated: true,
    })
  },

  setVoice: (voice) => {
    applyVoiceToEngine(voice)
    set({ voice })
    void persist({ voice })
  },

  setMicDeviceId: (micDeviceId) => {
    set({ micDeviceId })
    void persist({ micDeviceId })
  },

  setNotationLabels: (notationLabels) => {
    set({ notationLabels })
    void persist({ notationLabels })
  },

  setReminderOn: (reminderOn) => {
    set({ reminderOn })
    void persist({ reminderOn })
  },

  rerollPlaybackVoice: () => {
    applyVoiceToEngine(get().voice)
  },
}))
