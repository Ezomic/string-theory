import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Fretboard } from '../../components/Fretboard'
import { MicGate } from '../../components/mic/MicGate'
import { AnswerGrid, AppBar, Button, Card, NoteChip, PlayButton, StatTile, type NoteChipState } from '../../components/ui'
import { playbackEngine } from '../../lib/audio/playbackEngine'
import { lessonById, nextLesson, randomQuizFor, unitFor, type CurriculumLesson } from '../../lib/curriculum'
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

type LoopStep = 'read' | 'see' | 'hear' | 'play' | 'quiz' | 'complete'
const STEPS: { id: Exclude<LoopStep, 'complete'>; icon: string; label: string }[] = [
  { id: 'read', icon: '📖', label: 'Read' },
  { id: 'see', icon: '👁', label: 'See' },
  { id: 'hear', icon: '🔊', label: 'Hear' },
  { id: 'play', icon: '🎸', label: 'Play' },
  { id: 'quiz', icon: '❓', label: 'Quiz' },
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
  quiz: CurriculumLesson['quiz'][number]
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

// E1-E5 — the lesson loop, one screen with internal steps
export function LessonLoopPage() {
  const navigate = useNavigate()
  const { lessonId } = useParams()
  const lesson = lessonId ? lessonById(lessonId) : undefined
  const notationLabels = useAudioSettingsStore((state) => state.notationLabels)
  const activeInstrument = useInstrumentStore((state) => state.activeInstrument)
  const instrumentConfig = useInstrumentStore((state) => state.configs[state.activeInstrument])
  const leftHanded = instrumentConfig.leftHanded

  const [step, setStep] = useState<LoopStep>('read')
  const [hearingIndex, setHearingIndex] = useState<number | null>(null)
  const [notesCleanPct, setNotesCleanPct] = useState(0)
  const [streakCurrent, setStreakCurrent] = useState(0)
  const [finished, setFinished] = useState(false)
  // Picked once per lesson (not re-rolled on every render) so replaying a lesson can surface a different question.
  const quiz = useMemo(() => (lesson ? randomQuizFor(lesson) : undefined), [lesson])

  if (!lesson) {
    return (
      <div className={styles.page}>
        <AppBar title="Lesson" onClose={() => navigate('/path')} />
        <p className={styles.notFound}>Lesson not found.</p>
      </div>
    )
  }

  const typedLesson: CurriculumLesson = lesson
  const stepIndex = STEPS.findIndex((s) => s.id === step)
  const next = nextLesson(typedLesson)

  function playHearSequence() {
    const frequencies = typedLesson.hear.noteNames.map((note) => noteToHz(note, HEAR_OCTAVE))
    playbackEngine.play(frequencies, typedLesson.hear.mode)

    if (typedLesson.hear.mode === 'melodic') {
      typedLesson.hear.noteNames.forEach((_, index) => {
        setTimeout(() => setHearingIndex(index), index * HEAR_NOTE_STEP_MS)
      })
      setTimeout(
        () => setHearingIndex(null),
        typedLesson.hear.noteNames.length * HEAR_NOTE_STEP_MS + HEAR_NOTE_DURATION_MS,
      )
    } else {
      setHearingIndex(-1)
      setTimeout(() => setHearingIndex(null), HEAR_NOTE_DURATION_MS + 300)
    }
  }

  async function finishLesson(cleanPct: number) {
    if (finished) return
    setFinished(true)
    setNotesCleanPct(cleanPct)
    await completeLesson(typedLesson, cleanPct)
    const streak = await getOne('streak', 'current')
    setStreakCurrent(streak?.current ?? 0)
    setStep('complete')
  }

  const seeFormula =
    typedLesson.see.mode === 'scale'
      ? SCALES.find((s) => s.id === typedLesson.see.formulaId)!.formula
      : CHORDS.find((c) => c.id === typedLesson.see.formulaId)!.formula
  const seeNotes = notesForFormula(typedLesson.see.root, seeFormula)
  const seeTuning = instrumentConfig.tuning
  const seeMarkers = fretboardMarkersForNotes(
    seeTuning,
    12,
    seeNotes,
    typedLesson.see.root,
    typedLesson.see.mode,
    notationLabels,
  )
  const cleanNoteCount = Math.round((notesCleanPct / 100) * typedLesson.play.expectedNotes.length)

  return (
    <div className={styles.page}>
      <AppBar
        title=""
        subtitle={step === 'complete' ? undefined : `${typedLesson.title} · ${stepIndex + 1} of ${STEPS.length}`}
        onBack={() => (stepIndex > 0 ? setStep(STEPS[stepIndex - 1].id) : navigate(-1))}
        onClose={() => navigate('/path')}
      />

      {step !== 'complete' && (
        <div className={styles.stepRow}>
          {STEPS.map((s, index) => (
            <div
              key={s.id}
              className={[
                styles.stepChip,
                index === stepIndex ? styles.stepOn : '',
                index < stepIndex ? styles.stepDone : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <span className={styles.stepIcon}>{s.icon}</span>
              {s.label}
            </div>
          ))}
        </div>
      )}

      {step === 'read' && (
        <Card className={styles.conceptCard}>
          <h4 className={styles.conceptTitle}>{typedLesson.read.title}</h4>
          {typedLesson.read.paragraphs.map((paragraph, index) => (
            <p key={index} className={styles.conceptParagraph}>
              {paragraph}
            </p>
          ))}
          {typedLesson.read.formula && <div className={styles.formulaCallout}>{typedLesson.read.formula}</div>}
        </Card>
      )}

      {step === 'see' && (
        <Card className={styles.conceptCard}>
          <h4 className={styles.conceptTitle}>See it on the neck</h4>
          <p className={styles.conceptParagraph}>
            {typedLesson.see.root} {typedLesson.see.mode} — the <b className={styles.rootWord}>root</b> is
            highlighted in amber.
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
          <p className={styles.hearLabel}>{typedLesson.hear.label}</p>
          <div className={styles.chipRow}>
            {typedLesson.hear.noteNames.map((note, index) => (
              <NoteChip
                key={index}
                label={note}
                state={hearingIndex === index || hearingIndex === -1 ? 'now' : 'idle'}
              />
            ))}
          </div>
        </Card>
      )}

      {step === 'play' && (
        <MicGate
          onContinueWithoutMic={() => {
            setNotesCleanPct(0)
            setStep('quiz')
          }}
        >
          {(reading) => (
            <LessonPlayStep
              reading={reading}
              expectedNotes={typedLesson.play.expectedNotes}
              notationLabels={notationLabels}
              onComplete={(pct) => {
                setNotesCleanPct(pct)
                setStep('quiz')
              }}
              onSkip={() => {
                setNotesCleanPct(0)
                setStep('quiz')
              }}
            />
          )}
        </MicGate>
      )}

      {step === 'quiz' && (
        <LessonQuizStepView quiz={quiz!} onContinue={() => void finishLesson(notesCleanPct)} />
      )}

      {step === 'complete' && (
        <div className={styles.completeCol}>
          <div className={styles.completeIcon}>🎉</div>
          <h2 className={styles.completeTitle}>Lesson complete!</h2>
          <p className={styles.completeLead}>You went through the whole read → see → hear → play → quiz loop.</p>
          <div className={styles.statsRow}>
            <StatTile label="XP" value={`+${LESSON_XP}`} />
            <StatTile label="🔥 Day streak" value={String(streakCurrent)} />
            <StatTile label="Notes clean" value={`${cleanNoteCount}/${typedLesson.play.expectedNotes.length}`} />
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

      {step !== 'complete' && step !== 'play' && step !== 'quiz' && (
        <Button
          onClick={() => {
            const order: LoopStep[] = ['read', 'see', 'hear', 'play']
            setStep(order[stepIndex + 1])
          }}
        >
          {step === 'read' && 'Next: see it 👁'}
          {step === 'see' && 'Next: hear it 🔊'}
          {step === 'hear' && 'Next: play it 🎸'}
        </Button>
      )}
    </div>
  )
}
