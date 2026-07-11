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
import {
  clearedCount,
  currentIndex as exerciseCurrentIndex,
  excuse,
  fail,
  initExercisePhase,
  isComplete as isPhaseComplete,
  isRetry,
  pass,
  type ExercisePhaseState,
} from '../../lib/exercisePhase'
import { varyExercise } from '../../lib/exerciseVariation'
import { mulberry32 } from '../../lib/shuffle'
import { completeLesson } from '../../lib/pathProgress'
import { CHORDS, SCALES, fretboardMarkersForNotes, noteLabelFor, notesForFormula } from '../../lib/theory'
import { useAudioSettingsStore } from '../../store/audioSettingsStore'
import { useInstrumentStore } from '../../store/instrumentStore'
import styles from './LessonLoopPage.module.css'

const LESSON_XP = 40
const HEAR_NOTE_DURATION_MS = 900
const HEAR_NOTE_STEP_MS = HEAR_NOTE_DURATION_MS * 0.6
const HEAR_OCTAVE = 4
/** A Play exercise counts as passed once notes-clean reaches this. */
const PLAY_CLEAN_PASS_PCT = 70

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
  onAnswered: (correct: boolean) => void
}

function LessonQuizStepView({ quiz, onAnswered }: LessonQuizStepProps) {
  const [selected, setSelected] = useState<string | null>(null)

  return (
    <Card className={styles.conceptCard}>
      <h4 className={styles.conceptTitle}>Quick check</h4>
      <p className={styles.conceptParagraph}>{quiz.question}</p>
      <AnswerGrid choices={quiz.choices} correctLabel={quiz.correctLabel} selected={selected} onSelect={setSelected} />
      {selected !== null && (
        <Button onClick={() => onAnswered(selected === quiz.correctLabel)}>Continue</Button>
      )}
    </Card>
  )
}

interface LessonHearExerciseProps {
  item: Extract<LessonExercise, { kind: 'hear' }>
  onAnswered: (correct: boolean) => void
}

function LessonHearExerciseView({ item, onAnswered }: LessonHearExerciseProps) {
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
      {selected !== null && (
        <Button onClick={() => onAnswered(selected === item.correctLabel)}>Continue</Button>
      )}
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
  const [phaseState, setPhaseState] = useState<ExercisePhaseState | null>(null)
  const [serveKey, setServeKey] = useState(0)
  const [attemptSeed, setAttemptSeed] = useState(0)
  const [playBest, setPlayBest] = useState<Record<number, number>>({})
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
  const currentExerciseIndex = phaseState ? exerciseCurrentIndex(phaseState) : null
  const currentExercise = currentExerciseIndex !== null ? exercises[currentExerciseIndex] : undefined
  // On a redo, serve a varied version (transposed / reordered) so it isn't the identical item.
  const servedExercise =
    currentExercise && phaseState && currentExerciseIndex !== null && phaseState.everFailed[currentExerciseIndex]
      ? varyExercise(currentExercise, mulberry32(attemptSeed + serveKey))
      : currentExercise
  const totalPlayNotes = exercises.reduce(
    (sum, exercise) => (exercise.kind === 'play' ? sum + exercise.expectedNotes.length : sum),
    0,
  )
  const cleared = phaseState ? clearedCount(phaseState) : 0
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

  function cleanPctFromBest(best: Record<number, number>): number {
    if (totalPlayNotes === 0) return 100
    const cleanNotes = exercises.reduce(
      (sum, exercise, index) =>
        exercise.kind === 'play' ? sum + Math.round(((best[index] ?? 0) / 100) * exercise.expectedNotes.length) : sum,
      0,
    )
    return Math.round((cleanNotes / totalPlayNotes) * 100)
  }

  function startExercises() {
    const seed = Date.now()
    setAttemptSeed(seed)
    setPhaseState(initExercisePhase(exercises.length, typedLesson.requiredPasses, mulberry32(seed)))
    setPlayBest({})
    setServeKey((key) => key + 1)
    setStep('exercise')
  }

  /** Commit the queue transition, then serve the next item or finish once the queue is empty. */
  function applyResult(state: ExercisePhaseState, best: Record<number, number>) {
    setPhaseState(state)
    if (isPhaseComplete(state)) {
      void finishLesson(cleanPctFromBest(best))
    } else {
      setServeKey((key) => key + 1)
    }
  }

  function answerExercise(correct: boolean) {
    const state = phaseState!
    applyResult(correct ? pass(state) : fail(state), playBest)
  }

  function completePlay(cleanPct: number) {
    const state = phaseState!
    const index = exerciseCurrentIndex(state)!
    const best = { ...playBest, [index]: Math.max(playBest[index] ?? 0, cleanPct) }
    setPlayBest(best)
    applyResult(cleanPct >= PLAY_CLEAN_PASS_PCT ? pass(state) : fail(state), best)
  }

  function excusePlay() {
    applyResult(excuse(phaseState!), playBest)
  }

  function handleBack() {
    if (step === 'exercise') {
      setPhaseState(null)
      setPlayBest({})
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
        ? `${typedLesson.title} · ${cleared} of ${exercises.length} cleared${phaseState && isRetry(phaseState) ? ' · redo' : ''}`
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
        servedExercise &&
        (servedExercise.kind === 'play' ? (
          <MicGate onContinueWithoutMic={excusePlay}>
            {(reading) => (
              <LessonPlayStep
                key={serveKey}
                reading={reading}
                expectedNotes={servedExercise.expectedNotes}
                notationLabels={notationLabels}
                onComplete={completePlay}
                onSkip={excusePlay}
              />
            )}
          </MicGate>
        ) : servedExercise.kind === 'quiz' ? (
          <LessonQuizStepView key={serveKey} quiz={servedExercise} onAnswered={answerExercise} />
        ) : (
          <LessonHearExerciseView key={serveKey} item={servedExercise} onAnswered={answerExercise} />
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
              value={totalPlayNotes > 0 ? `${cleanPctFromBest(playBest)}%` : '—'}
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
            else startExercises()
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
