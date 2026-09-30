import { describe, expect, it } from 'vitest'
import { Metronome, type MetronomeContext, type MetronomeHost, type MetronomeTick } from './metronome'

class FakeParam {
  value = 0
  setValueAtTime(value: number) {
    this.value = value
  }
  exponentialRampToValueAtTime() {}
}

class FakeGain {
  gain = new FakeParam()
  connected = true
  connect() {}
  disconnect() {
    this.connected = false
  }
}

class FakeOscillator {
  frequency = new FakeParam()
  startAt: number | null = null
  stopAt: number | null = null
  connect() {}
  start(when: number) {
    this.startAt = when
  }
  stop(when = 0) {
    this.stopAt = when
  }
}

/** An AudioContext whose clock only moves when the test moves it. */
class FakeContext {
  currentTime = 0
  outputLatency: number | undefined = undefined
  destination = {}
  oscillators: FakeOscillator[] = []
  gains: FakeGain[] = []
  createOscillator() {
    const oscillator = new FakeOscillator()
    this.oscillators.push(oscillator)
    return oscillator
  }
  createGain() {
    const gain = new FakeGain()
    this.gains.push(gain)
    return gain
  }
}

/**
 * Drives the metronome the way a browser would: the audio clock advances in uneven steps,
 * and after each one the scheduler timer and the pending animation frame get to run.
 */
function harness() {
  const context = new FakeContext()
  let timer: (() => void) | null = null
  let frame: (() => void) | null = null
  const host: MetronomeHost = {
    context: () => context as unknown as MetronomeContext,
    setInterval: (callback) => {
      timer = callback
      return 1
    },
    clearInterval: () => {
      timer = null
    },
    requestFrame: (callback) => {
      frame = callback
      return 2
    },
    cancelFrame: () => {
      frame = null
    },
  }
  const jitter = [0.013, 0.031, 0.017, 0.026, 0.009, 0.022]
  let step = 0

  return {
    context,
    metronome: new Metronome(host),
    hasTimer: () => timer !== null,
    hasFrame: () => frame !== null,
    advance(seconds: number) {
      const until = context.currentTime + seconds
      while (context.currentTime < until) {
        context.currentTime = Math.min(until, context.currentTime + jitter[step++ % jitter.length])
        timer?.()
        const pending = frame
        frame = null
        pending?.()
      }
    },
  }
}

function listener() {
  const ticks: { tick: MetronomeTick; heardAt: number }[] = []
  let ended = 0
  return {
    ticks,
    ended: () => ended,
    attach(context: FakeContext) {
      return {
        onTick: (tick: MetronomeTick) => ticks.push({ tick, heardAt: context.currentTime }),
        onEnd: () => {
          ended += 1
        },
      }
    },
  }
}

const START_DELAY = 0.1

describe('Metronome', () => {
  it('lands every click exactly on the beat grid, with no drift after 64 beats', () => {
    const { context, metronome, advance } = harness()
    const events = listener()
    metronome.start({ tempo: 120, beatsPerBar: 4, subdivision: 2, bars: 16, countInBars: 1 }, events.attach(context))

    advance(40)

    const clicks = context.oscillators.map((o) => o.startAt!)
    expect(clicks).toHaveLength(4 + 64)
    clicks.forEach((time, beat) => expect(time).toBeCloseTo(START_DELAY + beat * 0.5, 9))
    expect(clicks[clicks.length - 1]).toBeCloseTo(START_DELAY + 67 * 0.5, 9)
  })

  it('accents the downbeat of every bar', () => {
    const { context, metronome, advance } = harness()
    metronome.start({ tempo: 100, beatsPerBar: 3, subdivision: 2, bars: 2, countInBars: 1 }, listener().attach(context))

    advance(10)

    const frequencies = context.oscillators.map((o) => o.frequency.value)
    const accent = frequencies[0]
    const beat = frequencies[1]
    expect(accent).toBeGreaterThan(beat)
    expect(frequencies).toEqual([accent, beat, beat, accent, beat, beat, accent, beat, beat])
  })

  it('counts in one bar before the run starts', () => {
    const { context, metronome, advance } = harness()
    const events = listener()
    metronome.start({ tempo: 60, beatsPerBar: 4, subdivision: 2, bars: 1, countInBars: 1 }, events.attach(context))

    advance(10)

    const beats = events.ticks.filter(({ tick }) => tick.sub === 0).map(({ tick }) => tick)
    expect(beats.slice(0, 4).map((t) => [t.countIn, t.bar, t.beat])).toEqual([
      [true, 0, 0],
      [true, 0, 1],
      [true, 0, 2],
      [true, 0, 3],
    ])
    expect(beats[4]).toMatchObject({ countIn: false, bar: 0, beat: 0 })
    expect(beats[4].time).toBeCloseTo(START_DELAY + 4, 9)
  })

  it('ticks the UI on every slot, only once the audio clock reaches it', () => {
    const { context, metronome, advance } = harness()
    const events = listener()
    metronome.start({ tempo: 90, beatsPerBar: 4, subdivision: 4, bars: 2, countInBars: 1 }, events.attach(context))

    advance(10)

    expect(events.ticks).toHaveLength(3 * 16)
    events.ticks.forEach(({ tick, heardAt }) => {
      expect(heardAt).toBeGreaterThanOrEqual(tick.time)
      expect(heardAt - tick.time).toBeLessThan(0.035)
    })
    const lastBar = events.ticks.slice(-16).map(({ tick }) => [tick.beat, tick.sub])
    expect(lastBar[5]).toEqual([1, 1])
  })

  it('holds the UI tick back by the output latency, so the light matches the sound', () => {
    const { context, metronome, advance } = harness()
    context.outputLatency = 0.2
    const events = listener()
    metronome.start({ tempo: 120, beatsPerBar: 4, subdivision: 2, bars: 1, countInBars: 1 }, events.attach(context))

    advance(6)

    events.ticks.forEach(({ tick, heardAt }) => expect(heardAt).toBeGreaterThanOrEqual(tick.time + 0.2))
  })

  it('never schedules more than the lookahead ahead of the clock', () => {
    const { context, metronome, advance } = harness()
    metronome.start({ tempo: 200, beatsPerBar: 4, subdivision: 4, bars: 8, countInBars: 1 }, listener().attach(context))

    for (let i = 0; i < 50; i += 1) {
      advance(0.05)
      context.oscillators.forEach((o) => expect(o.startAt!).toBeLessThan(context.currentTime + 0.1 + 1e-9))
    }
  })

  it('ends once, after the last bar, and releases its timers', () => {
    const { context, metronome, advance, hasTimer, hasFrame } = harness()
    const events = listener()
    metronome.start({ tempo: 120, beatsPerBar: 4, subdivision: 2, bars: 2, countInBars: 1 }, events.attach(context))

    advance(START_DELAY + 6 - 0.05)
    expect(events.ended()).toBe(0)

    advance(1)
    expect(events.ended()).toBe(1)
    expect(hasTimer()).toBe(false)
    expect(hasFrame()).toBe(false)
    expect(metronome.running).toBe(false)
  })

  it('stop() silences clicks already queued and schedules nothing more', () => {
    const { context, metronome, advance, hasTimer, hasFrame } = harness()
    const events = listener()
    metronome.start({ tempo: 120, beatsPerBar: 4, subdivision: 2, bars: 8, countInBars: 1 }, events.attach(context))

    // 1.05 s in, the click due at 1.1 s is already booked inside the lookahead window.
    advance(1.05)
    const queued = context.oscillators.filter((o) => o.startAt! > context.currentTime)
    expect(queued.length).toBeGreaterThan(0)
    metronome.stop()

    queued.forEach((o) => expect(o.stopAt).toBeLessThanOrEqual(context.currentTime))
    const clicks = context.oscillators.length
    const ticks = events.ticks.length
    advance(20)
    expect(context.oscillators).toHaveLength(clicks)
    expect(events.ticks).toHaveLength(ticks)
    expect(events.ended()).toBe(0)
    expect(hasTimer()).toBe(false)
    expect(hasFrame()).toBe(false)
  })

  it('lets a listener stop the run from inside a tick', () => {
    const { metronome, advance } = harness()
    const ticks: MetronomeTick[] = []
    metronome.start(
      { tempo: 120, beatsPerBar: 4, subdivision: 2, bars: 4, countInBars: 1 },
      {
        onTick: (tick) => {
          ticks.push(tick)
          if (ticks.length === 3) metronome.stop()
        },
        onEnd: () => {},
      },
    )

    advance(10)
    expect(ticks).toHaveLength(3)
  })
})
