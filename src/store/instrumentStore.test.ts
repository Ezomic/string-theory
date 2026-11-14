import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getDB, getOne, putOne } from '../lib/db/db'
import { useInstrumentStore } from './instrumentStore'

const initial = useInstrumentStore.getState()

beforeEach(async () => {
  const db = await getDB()
  await Promise.all([...db.objectStoreNames].map((store) => db.clear(store)))
  useInstrumentStore.setState(initial, true)
})

describe('instrumentStore', () => {
  it('starts on guitar with standard tunings for both instruments', () => {
    const { activeInstrument, configs } = useInstrumentStore.getState()
    expect(activeInstrument).toBe('guitar')
    expect(configs.guitar).toMatchObject({ stringCount: 6, tuning: ['E', 'A', 'D', 'G', 'B', 'E'], referencePitch: 440 })
    expect(configs.bass).toMatchObject({ stringCount: 4, tuning: ['E', 'A', 'D', 'G'], leftHanded: false })
  })

  it('derives the string count from the chosen tuning and persists it', async () => {
    useInstrumentStore.getState().setTuning('bass', 'standard', ['B', 'E', 'A', 'D', 'G'])

    expect(useInstrumentStore.getState().configs.bass).toMatchObject({ stringCount: 5, tuning: ['B', 'E', 'A', 'D', 'G'] })
    await vi.waitFor(async () => expect((await getOne('instrumentConfigs', 'bass'))?.stringCount).toBe(5))
  })

  it('changes only the instrument it was asked to change', () => {
    useInstrumentStore.getState().setLeftHanded('guitar', true)
    useInstrumentStore.getState().setReferencePitch('guitar', 432)

    const { configs } = useInstrumentStore.getState()
    expect(configs.guitar).toMatchObject({ leftHanded: true, referencePitch: 432 })
    expect(configs.bass).toMatchObject({ leftHanded: false, referencePitch: 440 })
  })

  it('hydrates saved configs and keeps defaults for instruments never saved', async () => {
    await putOne('instrumentConfigs', { ...initial.configs.guitar, leftHanded: true, referencePitch: 442 })

    await useInstrumentStore.getState().hydrate()

    const { configs, hydrated } = useInstrumentStore.getState()
    expect(hydrated).toBe(true)
    expect(configs.guitar).toMatchObject({ leftHanded: true, referencePitch: 442 })
    expect(configs.bass).toEqual(initial.configs.bass)
  })
})
