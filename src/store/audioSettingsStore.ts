import { create } from 'zustand'
import { playbackEngine } from '../lib/audio/playbackEngine'
import { getOne, putOne } from '../lib/db/db'
import type { Settings, VoiceId } from '../lib/db/types'

const DEFAULT_SETTINGS: Settings = {
  id: 'settings',
  notationLabels: 'names',
  theme: 'dark',
  reminderOn: false,
  micDeviceId: null,
  syncEnabled: false,
  voice: 'pluckGuitar',
}

interface AudioSettingsState {
  voice: VoiceId
  hydrated: boolean
  hydrate: () => Promise<void>
  setVoice: (voice: VoiceId) => void
}

export const useAudioSettingsStore = create<AudioSettingsState>((set) => ({
  voice: DEFAULT_SETTINGS.voice,
  hydrated: false,

  hydrate: async () => {
    const existing = await getOne('settings', 'settings')
    const voice = existing?.voice ?? DEFAULT_SETTINGS.voice
    playbackEngine.setVoice(voice)
    set({ voice, hydrated: true })
  },

  setVoice: (voice) => {
    playbackEngine.setVoice(voice)
    set({ voice })
    void getOne('settings', 'settings').then((existing) => {
      void putOne('settings', { ...(existing ?? DEFAULT_SETTINGS), voice })
    })
  },
}))
