import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MicGate } from '../../components/mic/MicGate'
import { Staff } from '../../components/Staff'
import { AnswerGrid, AppBar, Button, Card, ProgressBar, Segmented } from '../../components/ui'
import { levelProgressFromCorrectCount } from '../../lib/earTraining'
import {
  generateSightReadingQuestion,
  getSightReadingRuns,
  recordSightReadingRun,
  SIGHT_READING_MODES,
  type SightReadingMode,
  type SightReadingQuestion,
} from '../../lib/sightReading'
import { useAudioSettingsStore } from '../../store/audioSettingsStore'
import { LessonPlayStep, PLAY_CLEAN_PASS_PCT } from '../lesson/exerciseItems'
import styles from './SightReadingDrillPage.module.css'

const ADVANCE_DELAY_MS = 1100

export function SightReadingDrillPage() {
  const navigate = useNavigate()
  const notationLabels = useAudioSettingsStore((state) => state.notationLabels)

  const [mode, setMode] = useState<SightReadingMode>('name')
  const [correctCount, setCorrectCount] = useState(0)
  const [question, setQuestion] = useState<SightReadingQuestion | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [questionNumber, setQuestionNumber] = useState(1)
  const [streak, setStreak] = useState(0)
  const [serveKey, setServeKey] = useState(0)

  useEffect(() => {
    getSightReadingRuns().then((runs) => {
      const count = runs.reduce((sum, r) => sum + r.correct, 0)
      setCorrectCount(count)
      setQuestion(generateSightReadingQuestion(mode, levelProgressFromCorrectCount(count).level))
    })
  }, [mode])

  const progress = levelProgressFromCorrectCount(correctCount)

  function advance(nextCorrectCount: number, nextStreak: number) {
    setQuestion(generateSightReadingQuestion(mode, levelProgressFromCorrectCount(nextCorrectCount).level))
    setSelected(null)
    setStreak(nextStreak)
    setQuestionNumber((n) => n + 1)
    setServeKey((k) => k + 1)
  }

  function commit(correct: boolean) {
    const nextCount = correct ? correctCount + 1 : correctCount
    const nextStreak = correct ? streak + 1 : 0
    void recordSightReadingRun(mode, progress.level, correct)
    if (correct) setCorrectCount(nextCount)
    return { nextCount, nextStreak }
  }

  function handleSelect(choice: string) {
    if (!question || selected !== null) return
    setSelected(choice)
    const correct = choice === question.correctLabel
    const { nextCount, nextStreak } = commit(correct)
    if (correct) setTimeout(() => advance(nextCount, nextStreak), ADVANCE_DELAY_MS)
    else setStreak(0)
  }

  function handlePlayComplete(cleanPct: number) {
    const correct = cleanPct >= PLAY_CLEAN_PASS_PCT
    const { nextCount, nextStreak } = commit(correct)
    advance(nextCount, nextStreak)
  }

  const answered = selected !== null
  const isWrong = answered && question !== null && selected !== question.correctLabel

  return (
    <div className={styles.page}>
      <AppBar title="Sight reading" subtitle={`Level ${progress.level}`} onClose={() => navigate('/tools')} />

      <Segmented
        options={SIGHT_READING_MODES.map((m) => ({ value: m.id, label: m.label }))}
        value={mode}
        onChange={setMode}
      />

      <Card className={styles.xpCard}>
        <div className={styles.xpRow}>
          <span className={styles.xpValue}>⭐ {progress.xp} XP</span>
          <span className={styles.xpLevel}>Level {progress.level}</span>
        </div>
        <ProgressBar value={progress.progressPct} />
        <p className={styles.xpCaption}>
          {progress.correctToNextLevel === null
            ? 'Max level reached'
            : `${progress.correctToNextLevel} more correct to Level ${progress.level + 1}`}
        </p>
      </Card>

      {question && mode === 'name' && (
        <>
          <Card className={styles.promptCard}>
            <p className={styles.questionLabel}>
              Question {questionNumber} · streak {streak}
              {streak > 0 ? ' 🔥' : ''}
            </p>
            <div className={styles.staffWrap}>
              <Staff notes={question.notes} width={200} />
            </div>
            <p className={styles.prompt}>Which note is this?</p>
          </Card>

          <AnswerGrid
            choices={question.choices}
            correctLabel={question.correctLabel}
            selected={selected}
            onSelect={handleSelect}
          />

          {isWrong && <Button onClick={() => advance(correctCount, 0)}>Got it — next</Button>}
        </>
      )}

      {question && mode === 'play' && (
        <MicGate onContinueWithoutMic={() => navigate('/tools')}>
          {(reading) => (
            <LessonPlayStep
              key={serveKey}
              reading={reading}
              expectedNotes={question.expectedNotes}
              notationLabels={notationLabels}
              staff={question.notes}
              onComplete={handlePlayComplete}
              onSkip={() => advance(correctCount, streak)}
            />
          )}
        </MicGate>
      )}
    </div>
  )
}
