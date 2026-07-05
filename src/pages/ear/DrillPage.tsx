import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AppBar, Button, Card, Pill, PlayButton } from '../../components/ui'
import { playbackEngine, type PlaybackMode } from '../../lib/audio/playbackEngine'
import { getAll, putOne } from '../../lib/db/db'
import {
  DRILL_CATEGORIES,
  generateQuestion,
  statsForCategory,
  type DrillCategory,
  type DrillQuestion,
} from '../../lib/earTraining'
import { AnswerGrid } from './AnswerGrid'
import styles from './DrillPage.module.css'

const ADVANCE_DELAY_MS = 1200

function useCategoryFromUrl(): DrillCategory {
  const [searchParams] = useSearchParams()
  const raw = searchParams.get('category')
  return (DRILL_CATEGORIES.some((c) => c.id === raw) ? raw : 'intervals') as DrillCategory
}

// H2 (active/correct) and H3 (wrong-answer teach) — the same screen, different state
export function DrillPage() {
  const navigate = useNavigate()
  const category = useCategoryFromUrl()

  const [level, setLevel] = useState(1)
  const [question, setQuestion] = useState<DrillQuestion | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [streak, setStreak] = useState(0)
  const [questionNumber, setQuestionNumber] = useState(1)
  const [mode, setMode] = useState<PlaybackMode>('harmonic')

  useEffect(() => {
    getAll('drillResults').then((results) => {
      const stats = statsForCategory(results, category)
      setLevel(stats.level)
      const q = generateQuestion(category, stats.level)
      setQuestion(q)
      setMode(q.defaultMode)
    })
  }, [category])

  function playCurrent(withMode: PlaybackMode) {
    if (!question) return
    playbackEngine.playSequence(question.frequencies, withMode)
  }

  function nextQuestion(nextStreak: number) {
    const q = generateQuestion(category, level)
    setQuestion(q)
    setMode(q.defaultMode)
    setSelected(null)
    setStreak(nextStreak)
    setQuestionNumber((n) => n + 1)
  }

  function handleSelect(choice: string) {
    if (!question || selected !== null) return
    setSelected(choice)

    const isCorrect = choice === question.correctLabel
    const nextStreak = isCorrect ? streak + 1 : 0

    void putOne('drillResults', {
      id: crypto.randomUUID(),
      type: category,
      level,
      correct: isCorrect ? 1 : 0,
      total: 1,
      streak: nextStreak,
      timestamp: new Date().toISOString(),
    })

    if (isCorrect) {
      setTimeout(() => nextQuestion(nextStreak), ADVANCE_DELAY_MS)
    } else {
      setStreak(0)
    }
  }

  if (!question) {
    return (
      <div className={styles.page}>
        <AppBar
          title={DRILL_CATEGORIES.find((c) => c.id === category)?.label ?? 'Ear training'}
          onClose={() => navigate('/tools/ear')}
        />
      </div>
    )
  }

  const answered = selected !== null
  const isCorrect = answered && selected === question.correctLabel
  const isWrong = answered && !isCorrect

  return (
    <div className={styles.page}>
      <AppBar
        title={DRILL_CATEGORIES.find((c) => c.id === category)?.label ?? 'Ear training'}
        subtitle={`Level ${level}`}
        onClose={() => navigate('/tools/ear')}
      />

      <div className={styles.categoryRow}>
        {DRILL_CATEGORIES.filter((c) => !c.unlockRule).map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => navigate(`/tools/ear/drill?category=${c.id}`)}
          >
            <Pill variant={c.id === category ? 'accent' : 'default'}>{c.label}</Pill>
          </button>
        ))}
      </div>

      <Card className={styles.promptCard}>
        {!isWrong && (
          <p className={styles.questionLabel}>
            Question {questionNumber} · streak {streak}
            {streak > 0 ? ' 🔥' : ''}
          </p>
        )}
        <PlayButton playing={false} onClick={() => playCurrent(mode)} />
        <p className={styles.prompt}>
          {category === 'chordQuality'
            ? 'What chord quality did you hear?'
            : category === 'scaleRecognition'
              ? 'Major or minor?'
              : 'What interval did you hear?'}
        </p>
        {!answered && (
          <div className={styles.replayRow}>
            <button type="button" onClick={() => playCurrent(mode)}>
              🔁 Replay
            </button>
            {question.supportsModeToggle && (
              <button
                type="button"
                onClick={() => {
                  const next = mode === 'harmonic' ? 'melodic' : 'harmonic'
                  setMode(next)
                  playCurrent(next)
                }}
              >
                🎹 {mode === 'harmonic' ? 'Melodic' : 'Harmonic'}
              </button>
            )}
          </div>
        )}
      </Card>

      <AnswerGrid
        choices={question.choices}
        correctLabel={question.correctLabel}
        selected={selected}
        onSelect={handleSelect}
      />

      {isCorrect && streak > 0 && streak % 5 === 0 && (
        <p className={styles.encouragement}>
          Nice — {streak} in a row. Difficulty steps up soon.
        </p>
      )}

      {isWrong && (
        <>
          <Card className={styles.hintCard}>
            <p className={styles.hintText}>
              <b>Listen again:</b> {question.hint}
            </p>
          </Card>
          <Button onClick={() => nextQuestion(0)}>Got it — next</Button>
        </>
      )}
    </div>
  )
}
