import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { MicGate } from '../../components/mic/MicGate'
import { AppBar, Button, Card, NoteChip, Pill, StatTile, TunerMeter, type NoteChipState } from '../../components/ui'
import type { PitchReading } from '../../lib/pitch/pitchEngine'
import { applyReading, initialPlayMatchState, isComplete } from '../../lib/playMatcher'
import { focusTipFor, scoreForRun } from '../../lib/playRuns'
import { recordRiffRun } from '../../lib/riffRuns'
import { riffById, type Riff } from '../../lib/riffs'
import { noteLabelFor } from '../../lib/theory'
import { timingPercentage } from '../../lib/timing'
import type { PlayNoteResult } from '../../lib/db/types'
import { useAudioSettingsStore } from '../../store/audioSettingsStore'
import playStyles from '../play/PlayExercisePage.module.css'
import styles from './RiffDetailPage.module.css'

interface RiffRun {
  notes: { name: string; result: PlayNoteResult; cents: number }[]
  timingPct: number
  score: number
}

interface RiffPlayLiveProps {
  riff: Riff
  reading: PitchReading | null
  onComplete: (run: RiffRun) => void
}

/** Owns the live match/timing state and reacts to `reading` via effects — never sets state during render. */
function RiffPlayLive({ riff, reading, onComplete }: RiffPlayLiveProps) {
  const notationLabels = useAudioSettingsStore((state) => state.notationLabels)
  const root = riff.notes[0]
  const [matchState, setMatchState] = useState(initialPlayMatchState())
  const [gaps, setGaps] = useState<number[]>([])
  const [noteCents, setNoteCents] = useState<number[]>([])
  const matchedCountRef = useRef(0)
  const lastMatchTimeRef = useRef<number | null>(null)
  const finishedRef = useRef(false)

  useEffect(() => {
    setMatchState((prev) => applyReading(prev, riff.notes, reading))
  }, [reading, riff.notes])

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
    if (!isComplete(matchState, riff.notes)) return

    const timingPct = timingPercentage(gaps, riff.tempo, riff.notes.length)
    const notes = riff.notes.map((name, index) => ({
      name,
      result: matchState.results[index],
      cents: noteCents[index] ?? 0,
    }))
    const timeout = setTimeout(() => {
      if (finishedRef.current) return
      finishedRef.current = true
      onComplete({ notes, timingPct, score: scoreForRun(notes.map((n) => n.result), timingPct) })
    }, 400)
    return () => clearTimeout(timeout)
  }, [matchState, riff, gaps, noteCents, onComplete])

  const cents = reading?.cents ?? 0
  const inTune = reading !== null && Math.abs(cents) <= 5
  const flat = reading !== null && cents < -5
  const sharp = reading !== null && cents > 5

  return (
    <>
      <Card className={playStyles.liveCard}>
        <p className={playStyles.liveLabel}>Current note · {riff.notes.length - matchState.matchedCount} to go</p>
        <div className={playStyles.liveNote}>
          {reading ? (
            <>
              {reading.note}
              <small>{reading.octave}</small>
            </>
          ) : (
            '—'
          )}
        </div>
        <p className={playStyles.liveState} data-tone={inTune ? 'good' : flat || sharp ? 'warn' : 'muted'}>
          {!reading && 'Play a note'}
          {inTune && 'In tune ✓'}
          {flat && `A touch flat ♭ ${cents}¢`}
          {sharp && `A touch sharp ♯ +${cents}¢`}
        </p>
        <TunerMeter cents={cents} />
      </Card>

      <p className={playStyles.sectionLabel}>The riff</p>
      <div className={playStyles.chipRow}>
        {riff.notes.map((note, index) => {
          const result = matchState.results[index]
          const state: NoteChipState =
            result && result !== 'missed' ? result : index === matchState.matchedCount ? 'now' : 'idle'
          return <NoteChip key={index} label={noteLabelFor(notationLabels, root, note)} state={state} />
        })}
      </div>
    </>
  )
}

interface RiffResultsProps {
  riff: Riff
  run: RiffRun
  onRetry: () => void
  onBack: () => void
}

function RiffResults({ riff, run, onRetry, onBack }: RiffResultsProps) {
  const notationLabels = useAudioSettingsStore((state) => state.notationLabels)
  const root = riff.notes[0]
  const cleanCount = run.notes.filter((n) => n.result === 'clean').length
  const focusTip = focusTipFor(run.notes)

  return (
    <>
      <div className={playStyles.statsRow}>
        <StatTile label="Clean notes" value={`${cleanCount}/${run.notes.length}`} />
        <StatTile label="Timing" value={`${run.timingPct}%`} />
        <StatTile label="Score" value={String(run.score)} />
      </div>
      <Card className={playStyles.notesCard}>
        <p className={playStyles.sectionLabel}>Note by note</p>
        <div className={playStyles.chipRow}>
          {run.notes.map((note, index) => (
            <NoteChip
              key={index}
              label={noteLabelFor(notationLabels, root, note.name as (typeof riff.notes)[number])}
              state={note.result as Exclude<PlayNoteResult, 'missed'>}
            />
          ))}
        </div>
      </Card>
      {focusTip && (
        <Card className={playStyles.focusCard}>
          <p className={playStyles.focusText}>{focusTip}</p>
        </Card>
      )}
      <Button onClick={onRetry}>Try again</Button>
      <Button variant="ghost" onClick={onBack}>
        Back to riffs
      </Button>
    </>
  )
}

type Step = 'detail' | 'play' | 'results'

export function RiffDetailPage() {
  const navigate = useNavigate()
  const { riffId } = useParams()
  const riff = riffId ? riffById(riffId) : undefined

  const [step, setStep] = useState<Step>('detail')
  const [run, setRun] = useState<RiffRun | null>(null)

  const handleComplete = useCallback(
    (completed: RiffRun) => {
      if (riff) void recordRiffRun(riff.id, completed.notes, completed.timingPct)
      setRun(completed)
      setStep('results')
    },
    [riff],
  )

  if (!riff) {
    return (
      <div className={styles.page}>
        <AppBar title="Riff" onClose={() => navigate('/tools/riffs')} />
        <p className={styles.notFound}>Riff not found.</p>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <AppBar
        title={step === 'results' ? 'Nice run 👏' : riff.title}
        subtitle={step === 'play' ? `listening 🎤 · ♩=${riff.tempo}` : riff.artist}
        onBack={() => (step === 'detail' ? navigate('/tools/riffs') : setStep('detail'))}
      />

      {step === 'detail' && (
        <>
          <Card className={styles.metaCard}>
            <div className={styles.metaRow}>
              <Pill variant={riff.difficulty === 'easy' ? 'good' : riff.difficulty === 'hard' ? 'warn' : 'default'}>
                {riff.difficulty}
              </Pill>
              <Pill>♩ = {riff.tempo} bpm</Pill>
              <Pill>🎸 {riff.instrument}</Pill>
            </div>
            <div className={styles.tags}>
              {riff.tags.map((tag) => (
                <span key={tag} className={styles.tag}>
                  #{tag}
                </span>
              ))}
            </div>
          </Card>

          <Card className={styles.notesCard}>
            <h4 className={styles.notesTitle}>The notes</h4>
            <div className={styles.chipRow}>
              {riff.notes.map((note, index) => (
                <NoteChip key={index} label={note} state="idle" />
              ))}
            </div>
          </Card>

          <Button onClick={() => setStep('play')}>Play along 🎤</Button>
        </>
      )}

      {step === 'play' && (
        <MicGate onContinueWithoutMic={() => setStep('detail')}>
          {(reading) => <RiffPlayLive riff={riff} reading={reading} onComplete={handleComplete} />}
        </MicGate>
      )}

      {step === 'results' && run && (
        <RiffResults
          riff={riff}
          run={run}
          onRetry={() => {
            setRun(null)
            setStep('play')
          }}
          onBack={() => navigate('/tools/riffs')}
        />
      )}
    </div>
  )
}
