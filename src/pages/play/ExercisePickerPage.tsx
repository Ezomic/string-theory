import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppBar, Button, Pill, Segmented } from '../../components/ui'
import { getAll } from '../../lib/db/db'
import { exercisesInCategory, TEMPO_OPTIONS, type ExerciseCategory } from '../../lib/exercises'
import type { PlayRun } from '../../lib/db/types'
import styles from './ExercisePickerPage.module.css'

const CATEGORY_OPTIONS: { value: ExerciseCategory; label: string }[] = [
  { value: 'scale', label: 'Scales' },
  { value: 'arpeggio', label: 'Arpeggios' },
  { value: 'exercise', label: 'Exercises' },
]

const CATEGORY_ICON: Record<ExerciseCategory, string> = {
  scale: '🎼',
  arpeggio: '🎶',
  exercise: '🎵',
}

// I1 — exercise picker
export function ExercisePickerPage() {
  const navigate = useNavigate()
  const [category, setCategory] = useState<ExerciseCategory>('scale')
  const [runs, setRuns] = useState<PlayRun[] | null>(null)
  const [tempoIndex, setTempoIndex] = useState(1)

  const exercises = exercisesInCategory(category)
  const [selectedId, setSelectedId] = useState(exercises[0]?.id)

  useEffect(() => {
    getAll('playRuns').then(setRuns)
  }, [])

  function selectCategory(next: ExerciseCategory) {
    setCategory(next)
    setSelectedId(exercisesInCategory(next)[0]?.id)
  }

  function lastScoreFor(exerciseId: string): number | null {
    if (!runs) return null
    const forExercise = runs.filter((r) => r.exerciseId === exerciseId)
    if (forExercise.length === 0) return null
    return forExercise.sort((a, b) => b.timestamp.localeCompare(a.timestamp))[0].score
  }

  const tempo = TEMPO_OPTIONS[tempoIndex]

  return (
    <div className={styles.page}>
      <AppBar title="Play & check" subtitle="What do you want to nail?" onBack={() => navigate('/tools')} />

      <Segmented options={CATEGORY_OPTIONS} value={category} onChange={selectCategory} />

      <div className={styles.list}>
        {exercises.map((exercise) => {
          const score = lastScoreFor(exercise.id)
          return (
            <button
              key={exercise.id}
              type="button"
              className={[styles.opt, selectedId === exercise.id ? styles.optOn : ''].filter(Boolean).join(' ')}
              onClick={() => setSelectedId(exercise.id)}
            >
              <span className={styles.optIcon}>{CATEGORY_ICON[category]}</span>
              <span className={styles.optText}>
                {exercise.title}
                <span className={styles.optSub}>{exercise.subtitle}</span>
              </span>
              <Pill variant={score === null ? 'warn' : score >= 85 ? 'good' : 'default'}>
                {score === null ? 'new' : `${score}%`}
              </Pill>
            </button>
          )
        })}
      </div>

      <div className={styles.tempoRow}>
        <span>Tempo</span>
        <button
          type="button"
          className={styles.tempoButton}
          onClick={() => setTempoIndex((tempoIndex + 1) % TEMPO_OPTIONS.length)}
        >
          <Pill>♩ = {tempo} bpm ▾</Pill>
        </button>
      </div>

      <Button
        disabled={!selectedId}
        onClick={() => selectedId && navigate(`/tools/play/${selectedId}`, { state: { tempo } })}
      >
        Start — I'll listen 🎤
      </Button>
    </div>
  )
}
