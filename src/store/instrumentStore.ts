import { create } from 'zustand'
import { getOne, putOne } from '../lib/db/db'
import type { Instrument, InstrumentConfig, TuningPreset } from '../lib/db/types'
import { defaultTuningFor } from '../lib/tunings'

const LOCAL_USER_ID = 'local-guest'

function defaultConfig(instrument: Instrument): InstrumentConfig {
  const tuning = defaultTuningFor(instrument)
  return {
    id: instrument,
    userId: LOCAL_USER_ID,
    instrument,
    stringCount: tuning.notes.length as InstrumentConfig['stringCount'],
    tuning: tuning.notes,
    tuningPreset: tuning.preset,
    leftHanded: false,
    referencePitch: 440,
  }
}

interface InstrumentState {
  activeInstrument: Instrument
  configs: Record<Instrument, InstrumentConfig>
  hydrated: boolean
  hydrate: () => Promise<void>
  setActiveInstrument: (instrument: Instrument) => void
  setTuning: (instrument: Instrument, preset: TuningPreset, notes: string[]) => void
  setLeftHanded: (instrument: Instrument, leftHanded: boolean) => void
  setReferencePitch: (instrument: Instrument, referencePitch: number) => void
}

function persist(config: InstrumentConfig): void {
  putOne('instrumentConfigs', config).catch(() => {
    // Local persistence is best-effort — in-memory state remains usable if it fails.
  })
}

export const useInstrumentStore = create<InstrumentState>((set, get) => ({
  activeInstrument: 'guitar',
  configs: {
    guitar: defaultConfig('guitar'),
    bass: defaultConfig('bass'),
  },
  hydrated: false,

  hydrate: async () => {
    const [guitar, bass] = await Promise.all([
      getOne('instrumentConfigs', 'guitar'),
      getOne('instrumentConfigs', 'bass'),
    ])
    set((state) => ({
      configs: {
        guitar: guitar ?? state.configs.guitar,
        bass: bass ?? state.configs.bass,
      },
      hydrated: true,
    }))
  },

  setActiveInstrument: (instrument) => set({ activeInstrument: instrument }),

  setTuning: (instrument, preset, notes) => {
    const next: InstrumentConfig = {
      ...get().configs[instrument],
      tuning: notes,
      tuningPreset: preset,
      stringCount: notes.length as InstrumentConfig['stringCount'],
    }
    set((state) => ({ configs: { ...state.configs, [instrument]: next } }))
    persist(next)
  },

  setLeftHanded: (instrument, leftHanded) => {
    const next: InstrumentConfig = { ...get().configs[instrument], leftHanded }
    set((state) => ({ configs: { ...state.configs, [instrument]: next } }))
    persist(next)
  },

  setReferencePitch: (instrument, referencePitch) => {
    const next: InstrumentConfig = { ...get().configs[instrument], referencePitch }
    set((state) => ({ configs: { ...state.configs, [instrument]: next } }))
    persist(next)
  },
}))
