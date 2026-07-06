import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Fretboard, type FretboardMarker } from '../../components/Fretboard'
import { AppBar, Button, Card } from '../../components/ui'
import { recordQuizRound, type StringTapStats } from '../../lib/fretboardSkill'
import { NOTE_NAMES, transposeNote, type NoteName } from '../../lib/pitch/noteMath'
import { fretboardPositionsForNote } from '../../lib/theory'
import { useInstrumentStore } from '../../store/instrumentStore'
import { VARIANTS, type FretboardVariant } from './instrumentVariants'
import styles from './QuizPage.module.css'

const FRETS = 12

function randomNote(excluding?: NoteName): NoteName {
  let next: NoteName
  do {
    next = NOTE_NAMES[Math.floor(Math.random() * NOTE_NAMES.length)]
  } while (next === excluding)
  return next
}

function positionKey(stringNumber: number, fret: number): string {
  return `${stringNumber}:${fret}`
}

// G3 quiz-me — active note-finding drill
export function QuizPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const variant = (searchParams.get('variant') as FretboardVariant) || 'guitar'
  const tuning = VARIANTS[variant]?.tuning ?? VARIANTS.guitar.tuning
  const leftHanded = useInstrumentStore((state) => state.configs[variant === 'guitar' ? 'guitar' : 'bass'].leftHanded)

  const [target, setTarget] = useState<NoteName>(() => randomNote())
  const [found, setFound] = useState<Set<string>>(new Set())
  const [score, setScore] = useState(0)
  const [streak, setStreak] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const [showAnswers, setShowAnswers] = useState(false)

  const allPositions = fretboardPositionsForNote(tuning, FRETS, target)
  const stringStatsRef = useRef<Map<number, StringTapStats>>(new Map())

  useEffect(() => {
    const interval = setInterval(() => setElapsed((s) => s + 1), 1000)
    return () => clearInterval(interval)
  }, [target])

  // Runs whenever `found` changes, rather than inline in the tap handler, so that
  // rapid taps batched into the same React update can't read stale `found` state
  // and silently drop a position (setFound below always uses the functional form).
  useEffect(() => {
    if (allPositions.length > 0 && found.size === allPositions.length) {
      void recordQuizRound(streak + 1, allPositions.length, stringStatsRef.current, tuning)
      stringStatsRef.current = new Map()
      setScore((s) => s + 1)
      setStreak((s) => s + 1)
      setTarget((current) => randomNote(current))
      setFound(new Set())
      setElapsed(0)
      setShowAnswers(false)
    }
  }, [found, allPositions.length, streak, tuning])

  function handleFretTap(stringNumber: number, fret: number) {
    const note = transposeNote(tuning[stringNumber - 1], fret)
    const key = positionKey(stringNumber, fret)
    const isCorrect = note === target

    const stats = stringStatsRef.current.get(stringNumber) ?? { correct: 0, wrong: 0 }
    if (isCorrect) stats.correct += 1
    else stats.wrong += 1
    stringStatsRef.current.set(stringNumber, stats)

    if (!isCorrect) {
      setStreak(0)
      return
    }

    setFound((prev) => {
      if (prev.has(key)) return prev
      const next = new Set(prev)
      next.add(key)
      return next
    })
  }

  const markers: FretboardMarker[] = [
    ...allPositions
      .filter((position) => found.has(positionKey(position.string, position.fret)))
      .map((position) => ({ ...position, label: '✓', role: 'correct' as const })),
    ...(showAnswers
      ? allPositions
          .filter((position) => !found.has(positionKey(position.string, position.fret)))
          .map((position) => ({ ...position, label: '', role: 'ghost' as const }))
      : []),
  ]

  const minutes = Math.floor(elapsed / 60)
  const seconds = String(elapsed % 60).padStart(2, '0')

  return (
    <div className={styles.page}>
      <AppBar
        title="Find the note"
        subtitle={`Score ${score} · streak ${streak}${streak > 0 ? ' 🔥' : ''}`}
        onClose={() => navigate('/tools/fretboard')}
      />

      <Card className={styles.promptCard}>
        <p className={styles.promptLabel}>Tap every</p>
        <div className={styles.targetNote}>{target}</div>
        <p className={styles.promptSub}>
          on the fretboard · ⏱ {minutes}:{seconds}
        </p>
      </Card>

      <div className={styles.fretboardWrap}>
        <Fretboard
          instrument={variant === 'guitar' ? 'guitar' : 'bass'}
          tuning={tuning}
          frets={FRETS}
          markers={markers}
          labelMode="names"
          leftHanded={leftHanded}
          onFretTap={handleFretTap}
        />
      </div>

      <p className={styles.progress}>
        Found {found.size} of {allPositions.length} · tap the rest
      </p>
      <Button variant="ghost" onClick={() => setShowAnswers(true)}>
        Show answers
      </Button>
    </div>
  )
}
