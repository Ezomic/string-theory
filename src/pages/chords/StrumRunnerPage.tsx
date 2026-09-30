import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ChordDiagram } from '../../components/ChordDiagram'
import { AppBar, Button, Card, Pill, StatTile } from '../../components/ui'
import { Metronome, type MetronomeTick } from '../../lib/audio/metronome'
import { PROGRESSION_REPEATS, expandBars, progressionById, type TimelineBeat } from '../../lib/chordProgressions'
import { chordSymbol, voicingById } from '../../lib/chordVoicings'
import { getAll } from '../../lib/db/db'
import type { StrumRating, StrumRun, StrumRunKind } from '../../lib/db/types'
import {
  PATTERN_DRILL_BARS,
  PATTERN_DRILL_VOICING_ID,
  STRUM_PATTERNS,
  patternById,
  type StrumDifficulty,
  type StrumPattern,
} from '../../lib/strumPatterns'
import { bestByItem, recordStrumRun, type StrumBest } from '../../lib/strumRuns'
import { useInstrumentStore } from '../../store/instrumentStore'
import { StrumGrid } from './StrumGrid'
import styles from './StrumRunnerPage.module.css'

const MIN_TEMPO = 40
const MAX_TEMPO = 200
const TEMPO_STEP = 5
const COUNT_IN_BARS = 1

const RATINGS: { rating: StrumRating; label: string; hint: string }[] = [
  { rating: 'nailed', label: 'Nailed it', hint: 'Every change landed on the beat' },
  { rating: 'shaky', label: 'Shaky', hint: 'Got through, with a few late changes' },
  { rating: 'lost', label: 'Lost it', hint: 'Fell off the beat and could not get back on' },
]

const DIFFICULTY_VARIANT: Record<StrumDifficulty, 'good' | 'default' | 'warn'> = {
  easy: 'good',
  medium: 'default',
  hard: 'warn',
}

type Step = 'setup' | 'play' | 'rate' | 'result'

interface Result {
  run: StrumRun
  best: StrumBest
}

function clampTempo(tempo: number): number {
  return Math.min(MAX_TEMPO, Math.max(MIN_TEMPO, tempo))
}

/** The next chord change from where the run is now, counting the rest of the count-in if it is still going. */
function upcomingChange(timeline: TimelineBeat[], tick: MetronomeTick | null, beatsPerBar: number) {
  if (!tick || tick.countIn) {
    const first = timeline[0]?.nextChange
    const countInLeft = beatsPerBar - (tick ? tick.beat : 0)
    return first ? { ...first, inBeats: first.inBeats + countInLeft } : null
  }
  return timeline[tick.bar * beatsPerBar + tick.beat]?.nextChange ?? null
}

interface StrumRunnerPageProps {
  kind: StrumRunKind
}

export function StrumRunnerPage({ kind }: StrumRunnerPageProps) {
  const navigate = useNavigate()
  const { id = '' } = useParams()
  const leftHanded = useInstrumentStore((state) => state.configs[state.activeInstrument].leftHanded)
  const progression = kind === 'progression' ? progressionById(id) : undefined
  const drill = kind === 'pattern' ? patternById(id) : undefined
  const item = progression ?? drill
  const libraryRoute = `/tools/chords?tab=${kind === 'progression' ? 'progressions' : 'patterns'}`

  const [tempo, setTempo] = useState(item?.tempo ?? 80)
  const [patternId, setPatternId] = useState(progression?.patternId ?? drill?.id ?? '')
  const [step, setStep] = useState<Step>('setup')
  const [tick, setTick] = useState<MetronomeTick | null>(null)
  const [result, setResult] = useState<Result | null>(null)
  const [saving, setSaving] = useState(false)
  const metronome = useRef<Metronome | null>(null)

  useEffect(() => () => metronome.current?.stop(), [])

  const pattern = patternById(patternId)

  if (!item || !pattern) {
    return (
      <div className={styles.page}>
        <AppBar title="Chords" onClose={() => navigate(libraryRoute)} />
        <p className={styles.notFound}>{kind === 'progression' ? 'Progression' : 'Pattern'} not found.</p>
      </div>
    )
  }

  const bars = progression ? progression.bars : Array<string>(PATTERN_DRILL_BARS).fill(PATTERN_DRILL_VOICING_ID)
  const timeline = expandBars(bars, pattern.beatsPerBar, progression ? PROGRESSION_REPEATS : 1)
  const totalBars = timeline.length / pattern.beatsPerBar

  // Arrow functions, not declarations: a hoisted declaration would lose the `pattern` narrowing above.
  const start = () => {
    metronome.current ??= new Metronome()
    setTick(null)
    setStep('play')
    metronome.current.start(
      {
        tempo,
        beatsPerBar: pattern.beatsPerBar,
        subdivision: pattern.subdivision,
        bars: totalBars,
        countInBars: COUNT_IN_BARS,
      },
      { onTick: setTick, onEnd: () => setStep('rate') },
    )
  }

  const backToSetup = () => {
    metronome.current?.stop()
    setStep('setup')
  }

  const rate = async (rating: StrumRating) => {
    setSaving(true)
    const run = await recordStrumRun(kind, id, tempo, rating)
    const best = bestByItem(await getAll('strumRuns'), kind)[id]
    setResult({ run, best })
    setSaving(false)
    setStep('result')
  }

  const ratingLabel = RATINGS.find((r) => r.rating === result?.run.rating)?.label

  return (
    <div className={styles.page}>
      <AppBar
        title={step === 'rate' ? 'How did it go?' : step === 'result' && ratingLabel ? ratingLabel : item.name}
        subtitle={step === 'play' ? `♩ = ${tempo} · ${pattern.name}` : kind === 'progression' ? 'Progression' : 'Strum pattern'}
        onBack={() => (step === 'setup' ? navigate(libraryRoute) : backToSetup())}
      />

      {step === 'setup' && (
        <Setup
          progressionKey={progression?.key}
          numerals={progression?.numerals}
          difficulty={item.difficulty}
          bars={bars}
          repeats={progression ? PROGRESSION_REPEATS : 1}
          leftHanded={leftHanded}
          pattern={pattern}
          onPickPattern={progression ? setPatternId : undefined}
          tempo={tempo}
          onTempo={(next) => setTempo(clampTempo(next))}
          onStart={start}
        />
      )}

      {step === 'play' && (
        <Play
          timeline={timeline}
          tick={tick}
          totalBars={totalBars}
          pattern={pattern}
          leftHanded={leftHanded}
          showNext={Boolean(progression)}
          onStop={backToSetup}
        />
      )}

      {step === 'rate' && (
        <>
          <p className={styles.lead}>
            The mic can't hear a strummed chord, so your rating is the score. Nailed it counts 100, Shaky 60, Lost it 20.
          </p>
          {RATINGS.map(({ rating, label, hint }) => (
            <button
              key={rating}
              type="button"
              className={styles.rateOption}
              data-rating={rating}
              disabled={saving}
              onClick={() => void rate(rating)}
            >
              <span className={styles.rateLabel}>{label}</span>
              <span className={styles.rateHint}>{hint}</span>
            </button>
          ))}
        </>
      )}

      {step === 'result' && result && (
        <>
          <div className={styles.statsRow}>
            <StatTile label="Score" value={String(result.run.score)} />
            <StatTile label="Tempo" value={`♩ ${result.run.tempo}`} />
            <StatTile label={`Best, at ♩ ${result.best.tempo}`} value={String(result.best.score)} />
          </div>
          <Button onClick={() => setStep('setup')}>Go again</Button>
          <Button variant="ghost" onClick={() => navigate(libraryRoute)}>
            Back to {kind === 'progression' ? 'progressions' : 'patterns'}
          </Button>
        </>
      )}
    </div>
  )
}

interface SetupProps {
  progressionKey: string | undefined
  numerals: string[] | undefined
  difficulty: StrumDifficulty
  bars: string[]
  repeats: number
  leftHanded: boolean
  pattern: StrumPattern
  onPickPattern: ((patternId: string) => void) | undefined
  tempo: number
  onTempo: (tempo: number) => void
  onStart: () => void
}

function Setup({
  progressionKey,
  numerals,
  difficulty,
  bars,
  repeats,
  leftHanded,
  pattern,
  onPickPattern,
  tempo,
  onTempo,
  onStart,
}: SetupProps) {
  const chords = [...new Set(bars)].map((id) => voicingById(id)!)

  return (
    <>
      <Card className={styles.metaCard}>
        <div className={styles.metaRow}>
          <Pill variant={DIFFICULTY_VARIANT[difficulty]}>{difficulty}</Pill>
          {progressionKey && <Pill>Key of {progressionKey}</Pill>}
          <Pill>
            {bars.length} bars{repeats > 1 ? `, played ${repeats}×` : ''}
          </Pill>
        </div>
        {numerals && <p className={styles.numerals}>{numerals.join('  ')}</p>}
      </Card>

      <p className={styles.sectionLabel}>{chords.length > 1 ? 'The chords' : 'The chord'}</p>
      <div className={styles.chordRow}>
        {chords.map((voicing) => (
          <div key={voicing.id} className={styles.chordThumb}>
            <ChordDiagram voicing={voicing} leftHanded={leftHanded} size={64} />
            <span className={styles.chordThumbName}>{chordSymbol(voicing)}</span>
          </div>
        ))}
      </div>

      <p className={styles.sectionLabel}>Strum pattern</p>
      {onPickPattern && (
        <div className={styles.patternRow}>
          {STRUM_PATTERNS.map((option) => (
            <button
              key={option.id}
              type="button"
              className={[styles.patternPill, option.id === pattern.id ? styles.patternOn : ''].filter(Boolean).join(' ')}
              aria-pressed={option.id === pattern.id}
              onClick={() => onPickPattern(option.id)}
            >
              {option.name}
            </button>
          ))}
        </div>
      )}
      <Card>
        <StrumGrid pattern={pattern} />
      </Card>

      <p className={styles.sectionLabel}>Tempo</p>
      <Card className={styles.tempoCard}>
        <div className={styles.tempoRow}>
          <button type="button" className={styles.tempoButton} aria-label="Slower" onClick={() => onTempo(tempo - TEMPO_STEP)}>
            −
          </button>
          <span className={styles.tempoValue}>
            ♩ = {tempo}
            <small> bpm</small>
          </span>
          <button type="button" className={styles.tempoButton} aria-label="Faster" onClick={() => onTempo(tempo + TEMPO_STEP)}>
            +
          </button>
        </div>
        <input
          className={styles.slider}
          type="range"
          min={MIN_TEMPO}
          max={MAX_TEMPO}
          value={tempo}
          aria-label="Tempo in beats per minute"
          onChange={(event) => onTempo(Number(event.target.value))}
        />
      </Card>

      <p className={styles.lead}>No mic here: play along with the click, then rate your own run.</p>
      <Button onClick={onStart}>Start with a one-bar count-in</Button>
    </>
  )
}

interface PlayProps {
  timeline: TimelineBeat[]
  tick: MetronomeTick | null
  totalBars: number
  pattern: StrumPattern
  leftHanded: boolean
  showNext: boolean
  onStop: () => void
}

function Play({ timeline, tick, totalBars, pattern, leftHanded, showNext, onStop }: PlayProps) {
  const counting = !tick || tick.countIn
  const position = counting ? 0 : tick.bar * pattern.beatsPerBar + tick.beat
  const current = voicingById(timeline[position].voicingId)!
  const change = upcomingChange(timeline, tick, pattern.beatsPerBar)
  const nextVoicing = change ? voicingById(change.voicingId)! : null
  const beats = Array.from({ length: pattern.beatsPerBar }, (_, beat) => beat)

  return (
    <>
      <Card className={styles.nowCard}>
        <div className={styles.nowHeader}>
          <span className={styles.nowLabel}>
            {counting ? 'Count-in' : `Bar ${tick.bar + 1} of ${totalBars}`}
          </span>
          <span className={styles.beatDots}>
            {beats.map((beat) => (
              <span
                key={beat}
                className={styles.beatDot}
                data-state={tick?.beat === beat ? (counting ? 'count' : 'on') : 'off'}
              >
                {beat + 1}
              </span>
            ))}
          </span>
        </div>
        <div className={styles.nowBody}>
          <ChordDiagram voicing={current} leftHanded={leftHanded} size={124} />
          <div className={styles.nowText}>
            <span className={styles.nowSymbol}>{chordSymbol(current)}</span>
            <span className={styles.nowHint}>{counting ? 'Get this shape ready' : 'Strum along'}</span>
          </div>
        </div>
      </Card>

      {showNext && (
        <Card className={styles.nextCard} data-soon={change !== null && change.inBeats <= pattern.beatsPerBar}>
          {nextVoicing && change ? (
            <>
              <ChordDiagram voicing={nextVoicing} leftHanded={leftHanded} size={52} />
              <span className={styles.nextText}>
                <span className={styles.nextLabel}>Next</span>
                <span className={styles.nextSymbol}>{chordSymbol(nextVoicing)}</span>
              </span>
              <span className={styles.nextIn}>{change.inBeats === 1 ? 'next beat' : `in ${change.inBeats} beats`}</span>
            </>
          ) : (
            <span className={styles.nextLabel}>Last chord: hold it to the end</span>
          )}
        </Card>
      )}

      <Card>
        <StrumGrid pattern={pattern} activeSlot={counting ? null : tick.beat * pattern.subdivision + tick.sub} />
      </Card>

      <Button variant="ghost" onClick={onStop}>
        Stop
      </Button>
    </>
  )
}
