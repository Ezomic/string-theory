import { describe, expect, it } from 'vitest'
import type { LessonExercise } from './curriculum'
import {
  buildMasterTest,
  initMasterTest,
  isFailed,
  isPassed,
  MAX_STRIKES,
  recordItem,
  strikesLeft,
} from './masterTest'

const EXERCISES: LessonExercise[] = [
  { kind: 'play', expectedNotes: ['E', 'F#', 'G#'] },
  { kind: 'quiz', question: 'How many frets is a half step?', choices: ['1 fret', '2 frets', '3 frets'], correctLabel: '1 fret' },
]

describe('buildMasterTest', () => {
  it('is deterministic for a given seed', () => {
    expect(buildMasterTest(EXERCISES, 42)).toEqual(buildMasterTest(EXERCISES, 42))
  })

  it('produces more items than the base set and only kinds present in the lesson', () => {
    const items = buildMasterTest(EXERCISES, 7)
    expect(items.length).toBeGreaterThan(EXERCISES.length)
    const kinds = new Set(items.map((i) => i.kind))
    expect([...kinds].every((k) => k === 'play' || k === 'quiz')).toBe(true)
    expect(kinds.has('hear')).toBe(false)
  })

  it('gives different attempts a different order', () => {
    expect(buildMasterTest(EXERCISES, 1)).not.toEqual(buildMasterTest(EXERCISES, 2))
  })

  it('skips Play items in no-instrument mode but keeps the same total count', () => {
    const normal = buildMasterTest(EXERCISES, 7)
    const skipped = buildMasterTest(EXERCISES, 7, true)
    expect(skipped.length).toBe(normal.length)
    expect(skipped.some((i) => i.kind === 'play')).toBe(false)
    expect(skipped.every((i) => i.kind === 'quiz' || i.kind === 'hear')).toBe(true)
  })

  it('redistributes the freed Play slots to the remaining kinds', () => {
    const withPlay: LessonExercise[] = [
      { kind: 'play', expectedNotes: ['E', 'F#'] },
      { kind: 'hear', prompt: 'x', choices: ['a', 'b'], correctLabel: 'a', noteNames: ['E'], mode: 'melodic' },
      { kind: 'quiz', question: 'q', choices: ['a', 'b'], correctLabel: 'a' },
    ]
    const skipped = buildMasterTest(withPlay, 3, true)
    expect(skipped.some((i) => i.kind === 'play')).toBe(false)
    // Same count as the play-inclusive build — the Play variants became extra Hear/Quiz items.
    expect(skipped.length).toBe(buildMasterTest(withPlay, 3).length)
  })

  it('returns nothing when a lesson has only Play items and no instrument', () => {
    const onlyPlay: LessonExercise[] = [{ kind: 'play', expectedNotes: ['E'] }]
    expect(buildMasterTest(onlyPlay, 5, true)).toEqual([])
  })
})

describe('master test scoring', () => {
  it('passes when the end is reached under the strike limit', () => {
    let state = initMasterTest(3)
    state = recordItem(state, 'pass')
    state = recordItem(state, 'skip') // skip never strikes
    state = recordItem(state, 'strike')
    expect(state.strikes).toBe(1)
    expect(isPassed(state)).toBe(true)
    expect(isFailed(state)).toBe(false)
  })

  it('fails after MAX_STRIKES misses and reports strikes left', () => {
    let state = initMasterTest(10)
    expect(strikesLeft(state)).toBe(MAX_STRIKES)
    state = recordItem(state, 'strike')
    state = recordItem(state, 'strike')
    expect(isFailed(state)).toBe(false)
    expect(strikesLeft(state)).toBe(1)
    state = recordItem(state, 'strike')
    expect(isFailed(state)).toBe(true)
    expect(isPassed(state)).toBe(false)
  })

  it('does not count skips toward strikes', () => {
    let state = initMasterTest(2)
    state = recordItem(state, 'skip')
    state = recordItem(state, 'skip')
    expect(state.strikes).toBe(0)
    expect(isPassed(state)).toBe(true)
  })
})
