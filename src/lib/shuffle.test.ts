import { describe, expect, it } from 'vitest'
import { mulberry32, shuffle } from './shuffle'

describe('mulberry32', () => {
  it('is deterministic for a given seed', () => {
    const a = mulberry32(42)
    const b = mulberry32(42)
    expect([a(), a(), a()]).toEqual([b(), b(), b()])
  })

  it('returns values in [0, 1)', () => {
    const rng = mulberry32(7)
    for (let i = 0; i < 100; i++) {
      const v = rng()
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })
})

describe('shuffle', () => {
  it('is deterministic under a fixed seed and preserves the elements', () => {
    const items = [0, 1, 2, 3, 4]
    const a = shuffle(items, mulberry32(1))
    const b = shuffle(items, mulberry32(1))
    expect(a).toEqual(b)
    expect([...a].sort((x, y) => x - y)).toEqual(items)
  })

  it('does not mutate the input', () => {
    const items = [1, 2, 3]
    shuffle(items, mulberry32(9))
    expect(items).toEqual([1, 2, 3])
  })

  it('produces different orders for different seeds', () => {
    const items = [0, 1, 2, 3, 4, 5]
    expect(shuffle(items, mulberry32(1))).not.toEqual(shuffle(items, mulberry32(2)))
  })
})
