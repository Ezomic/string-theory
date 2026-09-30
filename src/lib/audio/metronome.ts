import { playbackEngine } from './playbackEngine'

/**
 * A lookahead scheduler, because a click fired from setInterval lands wherever the timer
 * happens to wake up, which drifts and stutters audibly. The timer here only books clicks on
 * the AudioContext clock a little ahead of time; each slot's time is computed from the start
 * rather than accumulated, so beat 1000 is as exact as beat 1.
 */
const SCHEDULE_EVERY_MS = 25
const LOOKAHEAD_SECONDS = 0.1
const START_DELAY_SECONDS = 0.1
const CLICK_SECONDS = 0.05
const ACCENT_HZ = 1500
const BEAT_HZ = 1000
const ACCENT_GAIN = 0.6
const BEAT_GAIN = 0.35

export type MetronomeContext = Pick<BaseAudioContext, 'currentTime' | 'destination' | 'createOscillator' | 'createGain'> & {
  readonly outputLatency?: number
}

export interface MetronomeHost {
  context: () => MetronomeContext
  setInterval: (callback: () => void, ms: number) => number
  clearInterval: (id: number) => void
  requestFrame: (callback: () => void) => number
  cancelFrame: (id: number) => void
}

export interface MetronomeRun {
  tempo: number
  beatsPerBar: number
  /** Slots per beat. Clicks sound on the beat; the UI is ticked on every slot. */
  subdivision: number
  /** Bars to play after the count-in. */
  bars: number
  countInBars: number
}

export interface MetronomeTick {
  countIn: boolean
  /** Bar within the count-in, or within the run once it has started. */
  bar: number
  beat: number
  sub: number
  /** When the slot sounds, on the AudioContext clock. */
  time: number
}

export interface MetronomeListener {
  onTick: (tick: MetronomeTick) => void
  onEnd: () => void
}

interface Click {
  oscillator: OscillatorNode
  gain: GainNode
  time: number
}

interface Session {
  context: MetronomeContext
  run: MetronomeRun
  listener: MetronomeListener
  startTime: number
  secondsPerSlot: number
  totalSlots: number
  nextSlot: number
  queue: MetronomeTick[]
  clicks: Click[]
  timerId: number | null
  frameId: number
}

const browserHost: MetronomeHost = {
  context: () => playbackEngine.context(),
  setInterval: (callback, ms) => window.setInterval(callback, ms),
  clearInterval: (id) => window.clearInterval(id),
  requestFrame: (callback) => window.requestAnimationFrame(() => callback()),
  cancelFrame: (id) => window.cancelAnimationFrame(id),
}

export class Metronome {
  private readonly host: MetronomeHost
  private session: Session | null = null

  constructor(host: MetronomeHost = browserHost) {
    this.host = host
  }

  get running(): boolean {
    return this.session !== null
  }

  /** Must be called from a user gesture the first time, so the browser lets the audio start. */
  start(run: MetronomeRun, listener: MetronomeListener): void {
    this.stop()
    const context = this.host.context()
    const slotsPerBar = run.beatsPerBar * run.subdivision
    const session: Session = {
      context,
      run,
      listener,
      startTime: context.currentTime + START_DELAY_SECONDS,
      secondsPerSlot: 60 / run.tempo / run.subdivision,
      totalSlots: (run.countInBars + run.bars) * slotsPerBar,
      nextSlot: 0,
      queue: [],
      clicks: [],
      timerId: null,
      frameId: 0,
    }
    this.session = session
    session.timerId = this.host.setInterval(this.schedule, SCHEDULE_EVERY_MS)
    this.schedule()
    session.frameId = this.host.requestFrame(this.frame)
  }

  stop(): void {
    const session = this.session
    if (!session) return
    this.session = null
    this.clearTimer(session)
    this.host.cancelFrame(session.frameId)
    const now = session.context.currentTime
    session.clicks
      .filter((click) => click.time + CLICK_SECONDS > now)
      .forEach((click) => {
        click.oscillator.stop(now)
        click.gain.disconnect()
      })
  }

  private readonly schedule = (): void => {
    const session = this.session
    if (!session) return
    const now = session.context.currentTime
    const horizon = now + LOOKAHEAD_SECONDS
    session.clicks = session.clicks.filter((click) => click.time + CLICK_SECONDS > now)
    while (session.nextSlot < session.totalSlots) {
      const time = session.startTime + session.nextSlot * session.secondsPerSlot
      if (time >= horizon) break
      const tick = this.tickFor(session, session.nextSlot, time)
      if (tick.sub === 0) this.click(session, time, tick.beat === 0)
      session.queue.push(tick)
      session.nextSlot += 1
    }
    if (session.nextSlot >= session.totalSlots) this.clearTimer(session)
  }

  private readonly frame = (): void => {
    const session = this.session
    if (!session) return
    const heard = session.context.currentTime - (session.context.outputLatency ?? 0)
    while (session.queue.length > 0 && session.queue[0].time <= heard) {
      session.listener.onTick(session.queue.shift()!)
      if (this.session !== session) return
    }
    const endTime = session.startTime + session.totalSlots * session.secondsPerSlot
    if (session.nextSlot >= session.totalSlots && session.queue.length === 0 && heard >= endTime) {
      this.session = null
      session.listener.onEnd()
      return
    }
    session.frameId = this.host.requestFrame(this.frame)
  }

  private tickFor(session: Session, slot: number, time: number): MetronomeTick {
    const { beatsPerBar, subdivision, countInBars } = session.run
    const slotsPerBar = beatsPerBar * subdivision
    const barFromStart = Math.floor(slot / slotsPerBar)
    const inBar = slot % slotsPerBar
    const countIn = barFromStart < countInBars
    return {
      countIn,
      bar: countIn ? barFromStart : barFromStart - countInBars,
      beat: Math.floor(inBar / subdivision),
      sub: inBar % subdivision,
      time,
    }
  }

  private click(session: Session, time: number, accent: boolean): void {
    const { context } = session
    const oscillator = context.createOscillator()
    const gain = context.createGain()
    oscillator.frequency.value = accent ? ACCENT_HZ : BEAT_HZ
    gain.gain.setValueAtTime(accent ? ACCENT_GAIN : BEAT_GAIN, time)
    gain.gain.exponentialRampToValueAtTime(0.001, time + CLICK_SECONDS)
    oscillator.connect(gain)
    gain.connect(context.destination)
    oscillator.start(time)
    oscillator.stop(time + CLICK_SECONDS)
    session.clicks.push({ oscillator, gain, time })
  }

  private clearTimer(session: Session): void {
    if (session.timerId === null) return
    this.host.clearInterval(session.timerId)
    session.timerId = null
  }
}
