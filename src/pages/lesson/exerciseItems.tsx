import { useEffect, useState } from 'react'
import { AnswerGrid, Button, Card, NoteChip, PlayButton, type NoteChipState } from '../../components/ui'
import { playbackEngine } from '../../lib/audio/playbackEngine'
import type { LessonExercise, LessonQuizStep } from '../../lib/curriculum'
import type { NotationLabels } from '../../lib/db/types'
import type { NoteName } from '../../lib/pitch/noteMath'
import { noteToHz } from '../../lib/pitch/noteMath'
import type { PitchReading } from '../../lib/pitch/pitchEngine'
import { applyReading, cleanPercentage, initialPlayMatchState, isComplete } from '../../lib/playMatcher'
import { noteLabelFor } from '../../lib/theory'
import styles from './LessonLoopPage.module.css'

export const HEAR_OCTAVE = 4
/** A Play exercise counts as passed once notes-clean reaches this (Practice phase). */
export const PLAY_CLEAN_PASS_PCT = 70

interface LessonPlayStepProps {
  reading: PitchReading | null
  expectedNotes: NoteName[]
  notationLabels: NotationLabels
  onComplete: (cleanPct: number) => void
  onSkip: () => void
}

/** Owns the match state itself and reacts to `reading` via effect — never sets state during render. */
export function LessonPlayStep({ reading, expectedNotes, notationLabels, onComplete, onSkip }: LessonPlayStepProps) {
  const root = expectedNotes[0]
  const [playState, setPlayState] = useState(initialPlayMatchState())

  useEffect(() => {
    setPlayState((prev) => applyReading(prev, expectedNotes, reading))
    // `expectedNotes` comes from the static curriculum module (stable reference for a
    // given lesson) — this still only actually re-runs when `reading` changes.
  }, [reading, expectedNotes])

  useEffect(() => {
    if (isComplete(playState, expectedNotes)) {
      const timeout = setTimeout(() => onComplete(cleanPercentage(playState)), 400)
      return () => clearTimeout(timeout)
    }
  }, [playState, expectedNotes, onComplete])

  const cents = reading?.cents ?? 0

  return (
    <Card className={styles.hearCard}>
      <h4 className={styles.conceptTitle}>Now you play it 🎤</h4>
      <p className={styles.conceptParagraph}>I'll follow along as you play.</p>
      <div className={styles.playNote}>
        {reading ? (
          <>
            {reading.note}
            <small>{reading.octave}</small>
          </>
        ) : (
          '—'
        )}
      </div>
      <p className={styles.playState}>
        {reading
          ? `${Math.abs(cents) <= 5 ? 'In tune ✓' : cents > 0 ? 'Sharp ♯' : 'Flat ♭'} · note ${Math.min(playState.matchedCount + 1, expectedNotes.length)} of ${expectedNotes.length}`
          : 'Play a note'}
      </p>
      <div className={styles.chipRow}>
        {expectedNotes.map((note, index) => {
          const result = playState.results[index]
          // applyReading only ever produces clean/sharp/flat; 'missed' never occurs here.
          const state: NoteChipState =
            result && result !== 'missed' ? result : index === playState.matchedCount ? 'now' : 'idle'
          return <NoteChip key={index} label={noteLabelFor(notationLabels, root, note)} state={state} />
        })}
      </div>
      <Button variant="ghost" onClick={onSkip}>
        Skip — I'll play later
      </Button>
    </Card>
  )
}

interface LessonQuizStepProps {
  quiz: LessonQuizStep
  onAnswered: (correct: boolean) => void
}

export function LessonQuizStepView({ quiz, onAnswered }: LessonQuizStepProps) {
  const [selected, setSelected] = useState<string | null>(null)

  return (
    <Card className={styles.conceptCard}>
      <h4 className={styles.conceptTitle}>Quick check</h4>
      <p className={styles.conceptParagraph}>{quiz.question}</p>
      <AnswerGrid choices={quiz.choices} correctLabel={quiz.correctLabel} selected={selected} onSelect={setSelected} />
      {selected !== null && <Button onClick={() => onAnswered(selected === quiz.correctLabel)}>Continue</Button>}
    </Card>
  )
}

interface LessonHearExerciseProps {
  item: Extract<LessonExercise, { kind: 'hear' }>
  onAnswered: (correct: boolean) => void
}

export function LessonHearExerciseView({ item, onAnswered }: LessonHearExerciseProps) {
  const [selected, setSelected] = useState<string | null>(null)

  return (
    <Card className={styles.hearCard}>
      <h4 className={styles.conceptTitle}>Name what you hear</h4>
      <p className={styles.conceptParagraph}>{item.prompt}</p>
      <div className={styles.playWrap}>
        <PlayButton
          playing={false}
          onClick={() => playbackEngine.play(item.noteNames.map((note) => noteToHz(note, HEAR_OCTAVE)), item.mode)}
        />
      </div>
      <AnswerGrid choices={item.choices} correctLabel={item.correctLabel} selected={selected} onSelect={setSelected} />
      {selected !== null && <Button onClick={() => onAnswered(selected === item.correctLabel)}>Continue</Button>}
    </Card>
  )
}
