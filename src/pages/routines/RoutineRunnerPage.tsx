import { useCallback, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { MicGate } from '../../components/mic/MicGate'
import { AppBar, Button, Card, StatTile } from '../../components/ui'
import { exerciseById } from '../../lib/exercises'
import { routineById } from '../../lib/routines'
import type { PlayRun } from '../../lib/db/types'
import { PlayExerciseLive } from '../play/PlayExerciseLive'
import playStyles from '../play/PlayExercisePage.module.css'
import styles from './RoutineRunnerPage.module.css'

type Phase = 'play' | 'stepResult' | 'done'

export function RoutineRunnerPage() {
  const navigate = useNavigate()
  const { routineId } = useParams()
  const routine = routineId ? routineById(routineId) : undefined

  const [stepIndex, setStepIndex] = useState(0)
  const [phase, setPhase] = useState<Phase>('play')
  const [runs, setRuns] = useState<PlayRun[]>([])

  const handleStepComplete = useCallback((run: PlayRun) => {
    setRuns((prev) => [...prev, run])
    setPhase('stepResult')
  }, [])

  if (!routine) {
    return (
      <div className={styles.page}>
        <AppBar title="Routine" onClose={() => navigate('/tools/routines')} />
        <p className={styles.notFound}>Routine not found.</p>
      </div>
    )
  }

  const step = routine.steps[stepIndex]
  const exercise = exerciseById(step.exerciseId)
  const isLastStep = stepIndex === routine.steps.length - 1
  const lastRun = runs[runs.length - 1]

  function nextStep() {
    if (isLastStep) {
      setPhase('done')
    } else {
      setStepIndex(stepIndex + 1)
      setPhase('play')
    }
  }

  const avgScore = runs.length > 0 ? Math.round(runs.reduce((sum, r) => sum + r.score, 0) / runs.length) : 0

  return (
    <div className={styles.page}>
      <AppBar
        title={phase === 'done' ? 'Routine complete 🎉' : routine.title}
        subtitle={
          phase === 'play' && exercise ? `Step ${stepIndex + 1} of ${routine.steps.length} · ${exercise.title} · ♩=${step.tempo}` : undefined
        }
        onClose={() => navigate('/tools/routines')}
      />

      {phase === 'play' &&
        (exercise ? (
          <MicGate onContinueWithoutMic={() => navigate('/tools/routines')}>
            {(reading) => (
              <PlayExerciseLive
                key={stepIndex}
                exercise={exercise}
                reading={reading}
                tempo={step.tempo}
                onComplete={handleStepComplete}
              />
            )}
          </MicGate>
        ) : (
          <p className={styles.notFound}>Exercise not found for this step.</p>
        ))}

      {phase === 'stepResult' && lastRun && (
        <div className={styles.resultCol}>
          <Card className={styles.stepCard}>
            <p className={styles.stepLabel}>Step {stepIndex + 1} done</p>
            <div className={playStyles.statsRow}>
              <StatTile label="Clean" value={`${lastRun.notes.filter((n) => n.result === 'clean').length}/${lastRun.notes.length}`} />
              <StatTile label="Timing" value={`${lastRun.timingPct}%`} />
              <StatTile label="Score" value={String(lastRun.score)} />
            </div>
          </Card>
          <Button onClick={nextStep}>{isLastStep ? 'Finish routine ✓' : 'Next step →'}</Button>
        </div>
      )}

      {phase === 'done' && (
        <div className={styles.resultCol}>
          <div className={styles.doneIcon}>🎉</div>
          <h2 className={styles.doneTitle}>Nice session!</h2>
          <p className={styles.doneLead}>You completed all {routine.steps.length} steps of {routine.title}.</p>
          <div className={playStyles.statsRow}>
            <StatTile label="Steps" value={String(runs.length)} />
            <StatTile label="Avg score" value={String(avgScore)} />
          </div>
          <Button onClick={() => navigate('/tools/routines')}>Back to routines</Button>
        </div>
      )}
    </div>
  )
}
