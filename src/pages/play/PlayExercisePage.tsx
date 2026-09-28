import { useCallback, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { MicGate } from '../../components/mic/MicGate'
import { AppBar, Button, Card, NoteChip, StatTile } from '../../components/ui'
import { exerciseById, TEMPO_OPTIONS } from '../../lib/exercises'
import type { NoteName } from '../../lib/pitch/noteMath'
import { focusTipFor } from '../../lib/playRuns'
import { noteLabelFor } from '../../lib/theory'
import type { PlayNoteResult, PlayRun } from '../../lib/db/types'
import { useAudioSettingsStore } from '../../store/audioSettingsStore'
import { PlayExerciseLive } from './PlayExerciseLive'
import styles from './PlayExercisePage.module.css'

const DEFAULT_TEMPO = TEMPO_OPTIONS[1]

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
