import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { AnswerGrid, AppBar, BigIcon, Button, Card, Pill, PlayButton, ProgressBar } from '../../components/ui'
import { playbackEngine } from '../../lib/audio/playbackEngine'
import type { DrillQuestion } from '../../lib/earTraining'
import {
  generateEarQuestions,
  levelFromExperience,
  scoreFromAnswers,
  strengthFromCount,
  THEORY_QUESTIONS,
  type TheoryQuestion,
} from '../../lib/placement'
import { seedProgressFromPlacement } from '../../lib/pathProgress'
import onboardingStyles from './OnboardingPage.module.css'
import styles from './PlacementPage.module.css'

const ADVANCE_DELAY_MS = 900

type PlacementItem = { kind: 'theory'; data: TheoryQuestion } | { kind: 'ear'; data: DrillQuestion }

type Step = 'intro' | 'questions' | 'result'

function itemChoices(item: PlacementItem): string[] {
  return item.kind === 'theory' ? item.data.choices : item.data.choices
}

function itemCorrectLabel(item: PlacementItem): string {
  return item.kind === 'theory' ? item.data.correctChoice : item.data.correctLabel
}

// B1 (intro) -> B2/B3 (questions) -> B4 (result), one screen with internal steps
export function PlacementPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const experienceIndex = (location.state as { experienceIndex?: number } | null)?.experienceIndex ?? 1

  const [step, setStep] = useState<Step>('intro')
  const [items] = useState<PlacementItem[]>(() => [
    ...THEORY_QUESTIONS.map((data): PlacementItem => ({ kind: 'theory', data })),
    ...generateEarQuestions().map((data): PlacementItem => ({ kind: 'ear', data })),
  ])
  const [index, setIndex] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)
  const [answers, setAnswers] = useState<boolean[]>([])
  const [resultLevel, setResultLevel] = useState(1)
  const [strengths, setStrengths] = useState({ ear: 0, theory: 0, fretboard: 0, chords: 0 })

  const current = items[index]

  useEffect(() => {
    if (step === 'questions' && current?.kind === 'ear') {
      playbackEngine.play(current.data.frequencies, current.data.playbackKind)
    }
    // `items` never changes after the initial lazy useState, so `current` is
    // fully determined by `index` — these extra deps don't add re-runs.
  }, [step, index, current])

  async function finish(finalAnswers: boolean[]) {
    const theoryAnswers = finalAnswers.slice(0, THEORY_QUESTIONS.length)
    const earAnswers = finalAnswers.slice(THEORY_QUESTIONS.length)
    const score = scoreFromAnswers(theoryAnswers, earAnswers)

    const earStrong = strengthFromCount(score.earCorrect, score.earTotal) === 'strong'
    const theoryStrength = strengthFromCount(score.theoryCorrect, score.theoryTotal)
    const strengthValues = {
      ear: earStrong ? 1 : 0.5,
      theory: theoryStrength === 'strong' ? 1 : 0.5,
      fretboard: 0,
      chords: theoryStrength === 'weak' ? 0 : 0.7,
    }

    setResultLevel(score.level)
    setStrengths(strengthValues)
    await seedProgressFromPlacement(score.level, strengthValues)
    setStep('result')
  }

  function handleSelect(choice: string) {
    if (!current || selected !== null) return
    setSelected(choice)
    const isCorrect = choice === itemCorrectLabel(current)
    const nextAnswers = [...answers, isCorrect]
    setAnswers(nextAnswers)

    setTimeout(() => {
      if (index + 1 < items.length) {
        setIndex(index + 1)
        setSelected(null)
      } else {
        void finish(nextAnswers)
      }
    }, ADVANCE_DELAY_MS)
  }

  async function handleSkip() {
    const level = levelFromExperience(experienceIndex)
    const strengthValues = { ear: 0.5, theory: 0.5, fretboard: 0, chords: 0.5 }
    await seedProgressFromPlacement(level, strengthValues)
    navigate('/path', { replace: true })
  }

  if (step === 'intro') {
    return (
      <div className={onboardingStyles.page}>
        <AppBar title="" onBack={() => navigate(-1)} />
        <div className={onboardingStyles.centerCol}>
          <BigIcon>🧭</BigIcon>
          <h2 className={styles.heading}>Quick placement check</h2>
          <p className={styles.body}>
            {items.length} short questions — some theory, some listening. It just sets your
            starting level. No score, no pressure.
          </p>
          <Button onClick={() => setStep('questions')}>Start check</Button>
          <button type="button" className={styles.skip} onClick={handleSkip}>
            Rather dive in? Skip — we'll adjust as you go
          </button>
        </div>
      </div>
    )
  }

  if (step === 'result') {
    return (
      <div className={onboardingStyles.page}>
        <div className={onboardingStyles.centerCol}>
          <BigIcon tone="good">🎯</BigIcon>
          <h2 className={styles.heading}>You're starting at Level {resultLevel}</h2>
          <p className={styles.body}>
            We'll skip ahead to match where you already are, and build up whatever needs it.
          </p>
          <Card className={styles.resultCard}>
            <div className={styles.skillRow}>
              <span>Ear &amp; intervals</span>
              <Pill variant={strengths.ear >= 1 ? 'good' : 'default'}>
                {strengths.ear >= 1 ? 'Strong' : 'Good'}
              </Pill>
            </div>
            <div className={styles.skillRow}>
              <span>Chords &amp; theory</span>
              <Pill variant={strengths.chords >= 0.7 ? 'good' : 'default'}>
                {strengths.chords >= 0.7 ? 'Strong' : 'Good'}
              </Pill>
            </div>
            <div className={styles.skillRow}>
              <span>Fretboard knowledge</span>
              <Pill variant="warn">Let's build this</Pill>
            </div>
          </Card>
          <Button onClick={() => navigate('/path', { replace: true })}>Go to my Path →</Button>
        </div>
      </div>
    )
  }

  if (!current) return null

  return (
    <div className={onboardingStyles.page}>
      <AppBar title="" subtitle={`Question ${index + 1} of ${items.length}`} onClose={handleSkip} />
      <ProgressBar value={((index + 1) / items.length) * 100} />

      <Card className={styles.questionCard}>
        <Pill variant="accent">{current.kind === 'theory' ? 'Theory' : 'Ear'}</Pill>
        {current.kind === 'theory' ? (
          <p className={styles.prompt}>{current.data.prompt}</p>
        ) : (
          <>
            <div className={styles.playWrap}>
              <PlayButton
                playing={false}
                onClick={() => playbackEngine.play(current.data.frequencies, current.data.playbackKind)}
              />
            </div>
            <p className={styles.replayHint}>Tap to replay</p>
          </>
        )}
      </Card>

      <AnswerGrid
        choices={itemChoices(current)}
        correctLabel={itemCorrectLabel(current)}
        selected={selected}
        onSelect={handleSelect}
      />
    </div>
  )
}
