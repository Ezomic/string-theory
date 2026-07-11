import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Fretboard } from '../../components/Fretboard'
import { MicGate } from '../../components/mic/MicGate'
import { AnswerGrid, AppBar, Button, Card, NoteChip, PlayButton, StatTile, type NoteChipState } from '../../components/ui'
import { playbackEngine } from '../../lib/audio/playbackEngine'
import {
  lessonById,
  nextLesson,
  unitFor,
  type CurriculumLesson,
  type LessonExercise,
  type LessonQuizStep,
} from '../../lib/curriculum'
import { getOne } from '../../lib/db/db'
import type { NotationLabels } from '../../lib/db/types'
import type { NoteName } from '../../lib/pitch/noteMath'
import { noteToHz } from '../../lib/pitch/noteMath'
import type { PitchReading } from '../../lib/pitch/pitchEngine'
import { applyReading, cleanPercentage, initialPlayMatchState, isComplete } from '../../lib/playMatcher'
import { completeLesson } from '../../lib/pathProgress'
import { CHORDS, SCALES, fretboardMarkersForNotes, noteLabelFor, notesForFormula } from '../../lib/theory'
import { useAudioSettingsStore } from '../../store/audioSettingsStore'
import { useInstrumentStore } from '../../store/instrumentStore'
import styles from './LessonLoopPage.module.css'

const LESSON_XP = 40
const HEAR_NOTE_DURATION_MS = 900
const HEAR_NOTE_STEP_MS = HEAR_NOTE_DURATION_MS * 0.6
const HEAR_OCTAVE = 4

type Phase = 'read' | 'see' | 'hear' | 'exercise' | 'complete'
type LearnStep = Extract<Phase, 'read' | 'see' | 'hear'>
const LEARN_STEPS: { id: LearnStep; icon: string; label: string }[] = [
  { id: 'read', icon: '📖', label: 'Read' },
  { id: 'see', icon: '👁', label: 'See' },
  { id: 'hear', icon: '🔊', label: 'Hear' },
]

interface LessonPlayStepProps {
  reading: PitchReading | null
  expectedNotes: NoteName[]
  notationLabels: NotationLabels
  onComplete: (cleanPct: number) => void
  onSkip: () => void
}

/** Owns the match state itself and reacts to `reading` via effect — never sets state during render. */
function LessonPlayStep({ reading, expectedNotes, notationLabels, onComplete, onSkip }: LessonPlayStepProps) {
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
  onContinue: () => void
}

function LessonQuizStepView({ quiz, onContinue }: LessonQuizStepProps) {
  const [selected, setSelected] = useState<string | null>(null)

  return (
    <Card className={styles.conceptCard}>
      <h4 className={styles.conceptTitle}>Quick check</h4>
      <p className={styles.conceptParagraph}>{quiz.question}</p>
      <AnswerGrid choices={quiz.choices} correctLabel={quiz.correctLabel} selected={selected} onSelect={setSelected} />
      {selected !== null && <Button onClick={onContinue}>Continue</Button>}
    </Card>
  )
}

interface LessonHearExerciseProps {
  item: Extract<LessonExercise, { kind: 'hear' }>
  onContinue: () => void
}

function LessonHearExerciseView({ item, onContinue }: LessonHearExerciseProps) {
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
      {selected !== null && <Button onClick={onContinue}>Continue</Button>}
    </Card>
  )
}

export function LessonLoopPage() {
  const navigate = useNavigate()
  const { lessonId } = useParams()
  const lesson = lessonId ? lessonById(lessonId) : undefined
  const notationLabels = useAudioSettingsStore((state) => state.notationLabels)
  const activeInstrument = useInstrumentStore((state) => state.activeInstrument)
  const instrumentConfig = useInstrumentStore((state) => state.configs[state.activeInstrument])
  const leftHanded = instrumentConfig.leftHanded

  const [step, setStep] = useState<Phase>('read')
  const [hearingIndex, setHearingIndex] = useState<number | null>(null)
  const [exerciseIndex, setExerciseIndex] = useState(0)
  const [cleanNotesAccum, setCleanNotesAccum] = useState(0)
  const [streakCurrent, setStreakCurrent] = useState(0)
  const [finished, setFinished] = useState(false)

  if (!lesson) {
    return (
      <div className={styles.page}>
        <AppBar title="Lesson" onClose={() => navigate('/path')} />
        <p className={styles.notFound}>Lesson not found.</p>
      </div>
    )
  }

  const typedLesson: CurriculumLesson = lesson
  const learn = typedLesson.learn
  const exercises = typedLesson.exercises
  const currentExercise = exercises[exerciseIndex]
  const totalPlayNotes = exercises.reduce(
    (sum, exercise) => (exercise.kind === 'play' ? sum + exercise.expectedNotes.length : sum),
    0,
  )
  const learnIndex = LEARN_STEPS.findIndex((s) => s.id === step)
  const next = nextLesson(typedLesson)

  function playHearSequence() {
    const frequencies = learn.hear.noteNames.map((note) => noteToHz(note, HEAR_OCTAVE))
    playbackEngine.play(frequencies, learn.hear.mode)

    if (learn.hear.mode === 'melodic') {
      learn.hear.noteNames.forEach((_, index) => {
        setTimeout(() => setHearingIndex(index), index * HEAR_NOTE_STEP_MS)
      })
      setTimeout(() => setHearingIndex(null), learn.hear.noteNames.length * HEAR_NOTE_STEP_MS + HEAR_NOTE_DURATION_MS)
    } else {
      setHearingIndex(-1)
      setTimeout(() => setHearingIndex(null), HEAR_NOTE_DURATION_MS + 300)
    }
  }

  async function finishLesson(cleanPct: number) {
    if (finished) return
    setFinished(true)
    await completeLesson(typedLesson, cleanPct)
    const streak = await getOne('streak', 'current')
    setStreakCurrent(streak?.current ?? 0)
    setStep('complete')
  }

  /** Advance to the next exercise, folding in any clean play notes; finish once the list is exhausted. */
  function advanceExercise(cleanNotesToAdd: number) {
    const nextAccum = cleanNotesAccum + cleanNotesToAdd
    setCleanNotesAccum(nextAccum)
    if (exerciseIndex + 1 < exercises.length) {
      setExerciseIndex(exerciseIndex + 1)
    } else {
      const pct = totalPlayNotes > 0 ? Math.round((nextAccum / totalPlayNotes) * 100) : 100
      void finishLesson(pct)
    }
  }

  function handleBack() {
    if (step === 'exercise') {
      setExerciseIndex(0)
      setCleanNotesAccum(0)
      setStep('hear')
      return
    }
    if (learnIndex > 0) {
      setStep(LEARN_STEPS[learnIndex - 1].id)
      return
    }
    navigate(-1)
  }

  const seeFormula =
    learn.see.mode === 'scale'
      ? SCALES.find((s) => s.id === learn.see.formulaId)!.formula
      : CHORDS.find((c) => c.id === learn.see.formulaId)!.formula
  const seeNotes = notesForFormula(learn.see.root, seeFormula)
  const seeTuning = instrumentConfig.tuning
  const seeMarkers = fretboardMarkersForNotes(seeTuning, 12, seeNotes, learn.see.root, learn.see.mode, notationLabels)

  const headerSubtitle =
    step === 'complete'
      ? undefined
      : step === 'exercise'
        ? `${typedLesson.title} · Exercise ${exerciseIndex + 1} of ${exercises.length}`
        : `${typedLesson.title} · ${learnIndex + 1} of ${LEARN_STEPS.length}`

  return (
    <div className={styles.page}>
      <AppBar title="" subtitle={headerSubtitle} onBack={handleBack} onClose={() => navigate('/path')} />

      {step !== 'complete' && (
        <div className={styles.stepRow}>
          {LEARN_STEPS.map((s, index) => (
            <div
              key={s.id}
              className={[
                styles.stepChip,
                step === s.id ? styles.stepOn : '',
                step === 'exercise' || index < learnIndex ? styles.stepDone : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <span className={styles.stepIcon}>{s.icon}</span>
              {s.label}
            </div>
          ))}
          <div
            className={[styles.stepChip, step === 'exercise' ? styles.stepOn : ''].filter(Boolean).join(' ')}
          >
            <span className={styles.stepIcon}>🎯</span>
            Exercises
          </div>
        </div>
      )}

      {step === 'read' && (
        <Card className={styles.conceptCard}>
          <h4 className={styles.conceptTitle}>{learn.read.title}</h4>
          {learn.read.paragraphs.map((paragraph, index) => (
            <p key={index} className={styles.conceptParagraph}>
              {paragraph}
            </p>
          ))}
          {learn.read.formula && <div className={styles.formulaCallout}>{learn.read.formula}</div>}
        </Card>
      )}

      {step === 'see' && (
        <Card className={styles.conceptCard}>
          <h4 className={styles.conceptTitle}>See it on the neck</h4>
          <p className={styles.conceptParagraph}>
            {learn.see.root} {learn.see.mode} — the <b className={styles.rootWord}>root</b> is highlighted in amber.
          </p>
          <Fretboard
            instrument={activeInstrument}
            tuning={seeTuning}
            frets={12}
            markers={seeMarkers}
            labelMode={notationLabels === 'names' ? 'names' : 'intervals'}
            leftHanded={leftHanded}
          />
        </Card>
      )}

      {step === 'hear' && (
        <Card className={styles.hearCard}>
          <h4 className={styles.conceptTitle}>Hear it</h4>
          <p className={styles.conceptParagraph}>Listen, then move on when you've got the sound in your ear.</p>
          <div className={styles.playWrap}>
            <PlayButton playing={false} onClick={playHearSequence} />
          </div>
          <p className={styles.hearLabel}>{learn.hear.label}</p>
          <div className={styles.chipRow}>
            {learn.hear.noteNames.map((note, index) => (
              <NoteChip
                key={index}
                label={note}
                state={hearingIndex === index || hearingIndex === -1 ? 'now' : 'idle'}
              />
            ))}
          </div>
        </Card>
      )}

      {step === 'exercise' &&
        currentExercise &&
        (currentExercise.kind === 'play' ? (
          <MicGate onContinueWithoutMic={() => advanceExercise(0)}>
            {(reading) => (
              <LessonPlayStep
                key={exerciseIndex}
                reading={reading}
                expectedNotes={currentExercise.expectedNotes}
                notationLabels={notationLabels}
                onComplete={(pct) => advanceExercise(Math.round((pct / 100) * currentExercise.expectedNotes.length))}
                onSkip={() => advanceExercise(0)}
              />
            )}
          </MicGate>
        ) : currentExercise.kind === 'quiz' ? (
          <LessonQuizStepView key={exerciseIndex} quiz={currentExercise} onContinue={() => advanceExercise(0)} />
        ) : (
          <LessonHearExerciseView key={exerciseIndex} item={currentExercise} onContinue={() => advanceExercise(0)} />
        ))}

      {step === 'complete' && (
        <div className={styles.completeCol}>
          <div className={styles.completeIcon}>🎉</div>
          <h2 className={styles.completeTitle}>Lesson complete!</h2>
          <p className={styles.completeLead}>You worked through the Learn phase and every exercise.</p>
          <div className={styles.statsRow}>
            <StatTile label="XP" value={`+${LESSON_XP}`} />
            <StatTile label="🔥 Day streak" value={String(streakCurrent)} />
            <StatTile
              label="Notes clean"
              value={totalPlayNotes > 0 ? `${cleanNotesAccum}/${totalPlayNotes}` : '—'}
            />
          </div>
          {next && (
            <Card className={styles.unlockedCard}>
              <span className={styles.unlockedPill}>Unlocked</span>
              <p className={styles.unlockedTitle}>{next.title}</p>
              <p className={styles.unlockedSub}>Next lesson in {unitFor(next).title}</p>
            </Card>
          )}
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

      {(step === 'read' || step === 'see' || step === 'hear') && (
        <Button
          onClick={() => {
            if (step === 'read') setStep('see')
            else if (step === 'see') setStep('hear')
            else setStep('exercise')
          }}
        >
          {step === 'read' && 'Next: see it 👁'}
          {step === 'see' && 'Next: hear it 🔊'}
          {step === 'hear' && 'Next: exercises 🎯'}
        </Button>
      )}
    </div>
  )
}
