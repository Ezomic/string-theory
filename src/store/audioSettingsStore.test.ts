import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { playbackEngine } from '../lib/audio/playbackEngine'
import { VOICES } from '../lib/audio/voices'
import { getDB, getOne, putOne } from '../lib/db/db'
import { DEFAULT_SETTINGS, useAudioSettingsStore } from './audioSettingsStore'

const initial = useAudioSettingsStore.getState()

beforeEach(async () => {
  const db = await getDB()
  await Promise.all([...db.objectStoreNames].map((store) => db.clear(store)))
  useAudioSettingsStore.setState(initial, true)
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('audioSettingsStore', () => {
  it('hydrates from saved settings and falls back to defaults for missing fields', async () => {
    await putOne('settings', { ...DEFAULT_SETTINGS, micDeviceId: 'usb-mic', voice: VOICES[0].id })

    await useAudioSettingsStore.getState().hydrate()

    expect(useAudioSettingsStore.getState()).toMatchObject({
      hydrated: true,
      micDeviceId: 'usb-mic',
      voice: VOICES[0].id,
      notationLabels: DEFAULT_SETTINGS.notationLabels,
    })
  })

  it('hydrates to the defaults when nothing was saved', async () => {
    await useAudioSettingsStore.getState().hydrate()

    expect(useAudioSettingsStore.getState()).toMatchObject({ hydrated: true, voice: 'random', micDeviceId: null })
  })

  it('merges each change into the saved settings instead of replacing them', async () => {
    await putOne('settings', { ...DEFAULT_SETTINGS, theme: 'light', syncEnabled: true })

    useAudioSettingsStore.getState().setMicDeviceId('usb-mic')

    await vi.waitFor(async () => expect((await getOne('settings', 'settings'))?.micDeviceId).toBe('usb-mic'))
    expect(await getOne('settings', 'settings')).toMatchObject({ theme: 'light', syncEnabled: true })
  })

  it('hands a fixed voice straight to the playback engine', () => {
    const setVoice = vi.spyOn(playbackEngine, 'setVoice')

    useAudioSettingsStore.getState().setVoice(VOICES[1].id)
    useAudioSettingsStore.getState().rerollPlaybackVoice()

    expect(setVoice).toHaveBeenNthCalledWith(1, VOICES[1].id)
    expect(setVoice).toHaveBeenNthCalledWith(2, VOICES[1].id)
  })

  it('picks a real voice for the engine when the selection is random', () => {
    const setVoice = vi.spyOn(playbackEngine, 'setVoice')
    vi.spyOn(Math, 'random').mockReturnValue(0.999)

    useAudioSettingsStore.getState().setVoice('random')

    expect(useAudioSettingsStore.getState().voice).toBe('random')
    expect(setVoice).toHaveBeenCalledWith(VOICES.at(-1)!.id)
  })
})
