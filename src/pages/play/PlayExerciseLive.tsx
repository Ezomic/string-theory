import { useEffect, useRef, useState } from 'react'
import { Card, NoteChip, TunerMeter, type NoteChipState } from '../../components/ui'
import type { Exercise } from '../../lib/exercises'
import type { PitchReading } from '../../lib/pitch/pitchEngine'
import { applyReading, initialPlayMatchState, isComplete } from '../../lib/playMatcher'
import { recordPlayRun } from '../../lib/playRuns'
import { timingPercentage } from '../../lib/timing'
import { noteLabelFor } from '../../lib/theory'
import type { PlayRun } from '../../lib/db/types'
import { useAudioSettingsStore } from '../../store/audioSettingsStore'
import styles from './PlayExercisePage.module.css'

interface PlayExerciseLiveProps {
  exercise: Exercise
  reading: PitchReading | null
  tempo: number
  onComplete: (run: PlayRun) => void
}

/** Owns the live match/timing state and reacts to `reading` via effects — never sets state during render. */
export function PlayExerciseLive({ exercise, reading, tempo, onComplete }: PlayExerciseLiveProps) {
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
