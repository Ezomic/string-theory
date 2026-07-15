import { describe, expect, it } from 'vitest'
import { exerciseById } from './exercises'
import { ROUTINES, routineById, routineExercises, routineTempoRange } from './routines'

describe('ROUTINES', () => {
  it('has unique ids', () => {
    const ids = ROUTINES.map((r) => r.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('gives every routine at least two steps, each a real exercise with a positive tempo', () => {
    ROUTINES.forEach((routine) => {
      expect(routine.steps.length).toBeGreaterThanOrEqual(2)
      expect(routine.title.length).toBeGreaterThan(0)
      routine.steps.forEach((step) => {
        expect(step.tempo).toBeGreaterThan(0)
        expect(exerciseById(step.exerciseId)).toBeDefined()
      })
    })
  })

  it('ramps the tempo across the speed-builder routine', () => {
    const builder = routineById('scale-speed-builder')!
    const tempos = builder.steps.map((s) => s.tempo)
    expect(tempos).toEqual([...tempos].sort((a, b) => a - b))
    expect(new Set(tempos).size).toBeGreaterThan(1)
  })
})

describe('routineById', () => {
  it('finds a routine', () => {
    expect(routineById('warm-up-flow')?.title).toBe('Warm-Up Flow')
  })

  it('returns undefined for an unknown id', () => {
    expect(routineById('nope')).toBeUndefined()
  })
})

describe('routineTempoRange', () => {
  it('reports the slowest and fastest step tempo', () => {
    expect(routineTempoRange(routineById('scale-speed-builder')!)).toEqual({ min: 60, max: 120 })
  })
})

describe('routineExercises', () => {
  it('resolves every step to its exercise', () => {
    const resolved = routineExercises(routineById('warm-up-flow')!)
    expect(resolved).toHaveLength(3)
    expect(resolved[0].exercise.id).toBe('chromatic-run')
    expect(resolved[0].step.tempo).toBe(60)
  })
})
