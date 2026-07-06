import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { MicGate } from '../../components/mic/MicGate'
import { AppBar, Button, Card, NoteChip, StatTile, TunerMeter, type NoteChipState } from '../../components/ui'
import { exerciseById, TEMPO_OPTIONS, type Exercise } from '../../lib/exercises'
import type { NoteName } from '../../lib/pitch/noteMath'
import type { PitchReading } from '../../lib/pitch/pitchEngine'
import { applyReading, initialPlayMatchState, isComplete } from '../../lib/playMatcher'
import { focusTipFor, recordPlayRun } from '../../lib/playRuns'
import { timingPercentage } from '../../lib/timing'
import { noteLabelFor } from '../../lib/theory'
import type { PlayNoteResult, PlayRun } from '../../lib/db/types'
import { useAudioSettingsStore } from '../../store/audioSettingsStore'
import styles from './PlayExercisePage.module.css'

const DEFAULT_TEMPO = TEMPO_OPTIONS[1]

interface PlayExerciseLiveProps {
  exercise: Exercise
  reading: PitchReading | null
  tempo: number
  onComplete: (run: PlayRun) => void
}

/** Owns the live match/timing state and reacts to `reading` via effects — never sets state during render. */
function PlayExerciseLive({ exercise, reading, tempo, onComplete }: PlayExerciseLiveProps) {
  const notationLabels = useAudioSettingsStore((state) => state.notationLabels)
  const root = exercise.expectedNotes[0]
  const [matchState, setMatchState] = useState(initialPlayMatchState())
  const [gaps, setGaps] = useState<number[]>([])
  const [noteCents, setNoteCents] = useState<number[]>([])
  const matchedCountRef = useRef(0)
  const lastMatchTimeRef = useRef<number | null>(null)
  const finishedRef = useRef(false)

  useEffect(() => {
    setMatchState((prev) => applyReading(prev, exercise.expectedNotes, reading))
  }, [reading, exercise.expectedNotes])

  useEffect(() => {
    if (matchState.matchedCount <= matchedCountRef.current || !reading) return
    matchedCountRef.current = matchState.matchedCount

    const now = Date.now()
    setNoteCents((c) => [...c, reading.cents])
    if (lastMatchTimeRef.current !== null) {
      setGaps((g) => [...g, now - lastMatchTimeRef.current!])
    }
    lastMatchTimeRef.current = now
  }, [matchState.matchedCount, reading])

  useEffect(() => {
    if (!isComplete(matchState, exercise.expectedNotes)) return

    const timingPct = timingPercentage(gaps, tempo, exercise.expectedNotes.length)
    const notes = exercise.expectedNotes.map((name, index) => ({
      name,
      result: matchState.results[index],
      cents: noteCents[index] ?? 0,
    }))
    // finishedRef is set here, inside the callback, rather than eagerly when scheduling —
    // if this effect gets torn down and re-run again before the timeout fires (its cleanup
    // cancels the pending timer), an eager flag would block ever rescheduling a replacement.
    const timeout = setTimeout(() => {
      if (finishedRef.current) return
      finishedRef.current = true
      recordPlayRun(exercise.id, notes, timingPct).then(onComplete)
    }, 400)
    return () => clearTimeout(timeout)
  }, [matchState, exercise, gaps, noteCents, tempo, onComplete])

  const cents = reading?.cents ?? 0
  const inTune = reading !== null && Math.abs(cents) <= 5
  const flat = reading !== null && cents < -5
  const sharp = reading !== null && cents > 5

  return (
    <>
      <Card className={styles.liveCard}>
        <p className={styles.liveLabel}>Current note</p>
        <div className={styles.liveNote}>
          {reading ? (
            <>
              {reading.note}
              <small>{reading.octave}</small>
            </>
          ) : (
            '—'
          )}
        </div>
        <p className={styles.liveState} data-tone={inTune ? 'good' : flat || sharp ? 'warn' : 'muted'}>
          {!reading && 'Play a note'}
          {inTune && 'In tune ✓'}
          {flat && `A touch flat ♭ ${cents}¢`}
          {sharp && `A touch sharp ♯ +${cents}¢`}
        </p>
        <TunerMeter cents={cents} />
      </Card>

      <p className={styles.sectionLabel}>Your run</p>
      <div className={styles.chipRow}>
        {exercise.expectedNotes.map((note, index) => {
          const result = matchState.results[index]
          // applyReading only ever produces clean/sharp/flat; 'missed' never occurs here.
          const state: NoteChipState =
            result && result !== 'missed' ? result : index === matchState.matchedCount ? 'now' : 'idle'
          return <NoteChip key={index} label={noteLabelFor(notationLabels, root, note)} state={state} />
        })}
      </div>
      <div className={styles.legend}>
        <span>
          <i className={styles.dotClean} />
          Clean
        </span>
        <span>
          <i className={styles.dotOff} />
          Off pitch
        </span>
        <span>
          <i className={styles.dotNext} />
          Next
        </span>
      </div>
    </>
  )
}

interface RunResultsProps {
  run: PlayRun
  onRetry: () => void
  onBack: () => void
}

function RunResults({ run, onRetry, onBack }: RunResultsProps) {
  const notationLabels = useAudioSettingsStore((state) => state.notationLabels)
  const root = exerciseById(run.exerciseId)?.expectedNotes[0]
  const cleanCount = run.notes.filter((n) => n.result === 'clean').length
  const focusTip = focusTipFor(run.notes)

  return (
    <>
      <div className={styles.statsRow}>
        <StatTile label="Clean notes" value={`${cleanCount}/${run.notes.length}`} />
        <StatTile label="Timing" value={`${run.timingPct}%`} />
        <StatTile label="Score" value={String(run.score)} />
      </div>
      <Card className={styles.notesCard}>
        <p className={styles.sectionLabel}>Note by note</p>
        <div className={styles.chipRow}>
          {run.notes.map((note, index) => (
            // recordPlayRun is only ever fed clean/sharp/flat results; 'missed' never occurs here.
            <NoteChip
              key={index}
              label={root ? noteLabelFor(notationLabels, root, note.name as NoteName) : note.name}
              state={note.result as Exclude<PlayNoteResult, 'missed'>}
            />
          ))}
        </div>
      </Card>
      {focusTip && (
        <Card className={styles.focusCard}>
          <p className={styles.focusText}>{focusTip}</p>
        </Card>
      )}
      <Button onClick={onRetry}>Try again</Button>
      <Button variant="ghost" onClick={onBack}>
        Back to exercises
      </Button>
    </>
  )
}

type Step = 'play' | 'results'

// I2 (live) -> I3 (results), one screen with internal steps
export function PlayExercisePage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { exerciseId } = useParams()
  const exercise = exerciseId ? exerciseById(exerciseId) : undefined
  const tempo = (location.state as { tempo?: number } | null)?.tempo ?? DEFAULT_TEMPO

  const [step, setStep] = useState<Step>('play')
  const [run, setRun] = useState<PlayRun | null>(null)

  // Stable across MicGate's per-tick re-renders — an inline closure here would
  // change identity every reading update, tearing down PlayExerciseLive's
  // completion effect (and its pending setTimeout) before it ever fires.
  const handlePlayComplete = useCallback((completedRun: PlayRun) => {
    setRun(completedRun)
    setStep('results')
  }, [])

  if (!exercise) {
    return (
      <div className={styles.page}>
        <AppBar title="Play & check" onClose={() => navigate('/tools/play')} />
        <p className={styles.notFound}>Exercise not found.</p>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <AppBar
        title={step === 'results' ? 'Nice run 👏' : exercise.title}
        subtitle={step === 'play' ? `listening 🎤 · ♩=${tempo}` : exercise.title}
        onClose={() => navigate('/tools/play')}
      />

      {step === 'play' && (
        <MicGate onContinueWithoutMic={() => navigate('/tools/play')}>
          {(reading) => (
            <PlayExerciseLive exercise={exercise} reading={reading} tempo={tempo} onComplete={handlePlayComplete} />
          )}
        </MicGate>
      )}

      {step === 'results' && run && (
        <RunResults
          run={run}
          onRetry={() => {
            setRun(null)
            setStep('play')
          }}
          onBack={() => navigate('/tools/play')}
        />
      )}
    </div>
  )
}
