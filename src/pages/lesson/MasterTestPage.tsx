import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { MicGate } from '../../components/mic/MicGate'
import { AppBar, Button } from '../../components/ui'
import { ACHIEVEMENTS } from '../../lib/achievements'
import { lessonById, nextLesson, type CurriculumLesson, type LessonExercise } from '../../lib/curriculum'
import {
  buildMasterTest,
  initMasterTest,
  isFailed,
  isPassed,
  MASTER_PLAY_PASS_PCT,
  MAX_STRIKES,
  recordItem,
  strikesLeft,
  type MasterItemOutcome,
  type MasterTestState,
} from '../../lib/masterTest'
import { markLessonMastered } from '../../lib/pathProgress'
import { useAudioSettingsStore } from '../../store/audioSettingsStore'
import { LessonHearExerciseView, LessonPlayStep, LessonQuizStepView } from './exerciseItems'
import styles from './LessonLoopPage.module.css'

const MASTERED_BADGE = ACHIEVEMENTS.find((a) => a.key === 'firstMastered')!

type Phase = 'test' | 'passed' | 'failed'

export function MasterTestPage() {
  const navigate = useNavigate()
  const { lessonId } = useParams()
  const lesson = lessonId ? lessonById(lessonId) : undefined
  const notationLabels = useAudioSettingsStore((state) => state.notationLabels)
  const noInstrument = useAudioSettingsStore((state) => state.noInstrument)

  const [seed, setSeed] = useState(() => Date.now())
  const [items, setItems] = useState<LessonExercise[]>(() =>
    lesson ? buildMasterTest(lesson.exercises, seed, noInstrument) : [],
  )
  const [testState, setTestState] = useState<MasterTestState>(() => initMasterTest(items.length))
  const [serveKey, setServeKey] = useState(0)
  const [phase, setPhase] = useState<Phase>('test')

  if (!lesson) {
    return (
      <div className={styles.page}>
        <AppBar title="Master test" onClose={() => navigate('/path')} />
        <p className={styles.notFound}>Lesson not found.</p>
      </div>
    )
  }

  const typedLesson: CurriculumLesson = lesson
  const next = nextLesson(typedLesson)
  const currentItem = items[testState.index]

  async function resolve(outcome: MasterItemOutcome) {
    const nextState = recordItem(testState, outcome)
    setTestState(nextState)
    if (isFailed(nextState)) {
      setPhase('failed')
    } else if (isPassed(nextState)) {
      await markLessonMastered(typedLesson.id)
      setPhase('passed')
    } else {
      setServeKey((key) => key + 1)
    }
  }

  function restart() {
    const nextSeed = Date.now()
    const nextItems = buildMasterTest(typedLesson.exercises, nextSeed, noInstrument)
    setSeed(nextSeed)
    setItems(nextItems)
    setTestState(initMasterTest(nextItems.length))
    setServeKey((key) => key + 1)
    setPhase('test')
  }

  const pips = Array.from({ length: MAX_STRIKES }, (_, i) => (i < testState.strikes ? '✕' : '·')).join(' ')

  return (
    <div className={styles.page}>
      <AppBar
        title=""
        subtitle={phase === 'test' ? `${typedLesson.title} · Master test` : undefined}
        onClose={() => navigate('/path')}
      />

      {phase === 'test' && currentItem && (
        <>
          <div className={styles.stepRow}>
            <div className={[styles.stepChip, styles.stepOn].join(' ')}>
              <span className={styles.stepIcon}>🎯</span>
              Item {testState.index + 1} of {items.length}
            </div>
            <div className={styles.stepChip}>
              <span className={styles.stepIcon}>❤️</span>
              {pips} · {strikesLeft(testState)} left
            </div>
          </div>

          {currentItem.kind === 'play' ? (
            <MicGate onContinueWithoutMic={() => void resolve('skip')}>
              {(reading) => (
                <LessonPlayStep
                  key={serveKey}
                  reading={reading}
                  expectedNotes={currentItem.expectedNotes}
                  notationLabels={notationLabels}
                  onComplete={(pct) => void resolve(pct >= MASTER_PLAY_PASS_PCT ? 'pass' : 'strike')}
                  onSkip={() => void resolve('skip')}
                />
              )}
            </MicGate>
          ) : currentItem.kind === 'quiz' ? (
            <LessonQuizStepView
              key={serveKey}
              quiz={currentItem}
              onAnswered={(correct) => void resolve(correct ? 'pass' : 'strike')}
            />
          ) : (
            <LessonHearExerciseView
              key={serveKey}
              item={currentItem}
              onAnswered={(correct) => void resolve(correct ? 'pass' : 'strike')}
            />
          )}
        </>
      )}

      {phase === 'failed' && (
        <div className={styles.completeCol}>
          <div className={styles.completeIcon}>💥</div>
          <h2 className={styles.completeTitle}>Test failed</h2>
          <p className={styles.completeLead}>
            {MAX_STRIKES} mistakes ends the run. Give it another go — the items come back in a new order.
          </p>
          <Button onClick={restart}>Try again 🔁</Button>
          <Button variant="ghost" onClick={() => navigate('/path')}>
            Back to Path
          </Button>
        </div>
      )}

      {phase === 'passed' && (
        <div className={styles.completeCol}>
          <div className={styles.completeIcon}>{MASTERED_BADGE.icon}</div>
          <h2 className={styles.completeTitle}>Mastered!</h2>
          <p className={styles.completeLead}>
            You passed the Master test for {typedLesson.title}. Badge earned: {MASTERED_BADGE.label}.
          </p>
          {next ? (
            <Button onClick={() => navigate(`/path/lesson/${next.id}`)}>Next lesson →</Button>
          ) : (
            <Button onClick={() => navigate('/path')}>Back to Path</Button>
          )}
          <Button variant="ghost" onClick={() => navigate('/path')}>
            Back to Path
          </Button>
        </div>
      )}
    </div>
  )
}
