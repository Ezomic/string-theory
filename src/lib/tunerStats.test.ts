import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { getDB } from './db/db'
import { getTunerStats, recordTunerInTune } from './tunerStats'

beforeEach(async () => {
  const db = await getDB()
  await Promise.all([...db.objectStoreNames].map((store) => db.clear(store)))
})

describe('getTunerStats', () => {
  it('defaults to a zero count when nothing has been recorded yet', async () => {
    expect(await getTunerStats()).toEqual({ id: 'tuner', inTuneCount: 0 })
  })
})

describe('recordTunerInTune', () => {
  it('increments the persisted count each call', async () => {
    await recordTunerInTune()
    const second = await recordTunerInTune()
    expect(second.inTuneCount).toBe(2)
    expect(await getTunerStats()).toEqual({ id: 'tuner', inTuneCount: 2 })
  })
})
