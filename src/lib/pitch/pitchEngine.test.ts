import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PitchEngine, type PitchReading } from './pitchEngine'

const SAMPLE_RATE = 44100

let signal: Float32Array
let frames: (() => void)[]
let contexts: FakeAudioContext[]

function sineWave(frequency: number, length = 2048): Float32Array {
  return Float32Array.from({ length }, (_, i) => Math.sin((2 * Math.PI * frequency * i) / SAMPLE_RATE))
}

class FakeAudioContext {
  sampleRate = SAMPLE_RATE
  closed = false
  constructor() {
    contexts.push(this)
  }
  createAnalyser() {
    return {
      fftSize: 0,
      getFloatTimeDomainData: (buffer: Float32Array) => buffer.set(signal.subarray(0, buffer.length)),
    }
  }
  createMediaStreamSource() {
    return { connect: () => undefined }
  }
  async close() {
    this.closed = true
  }
}

function fakeStream() {
  const track = { stop: vi.fn() }
  return { track, stream: { getTracks: () => [track] } }
}

function stubMic(getUserMedia: () => Promise<unknown>) {
  vi.stubGlobal('navigator', { mediaDevices: { getUserMedia: vi.fn(getUserMedia) } })
}

function runFrame(): void {
  frames.shift()?.()
}

beforeEach(() => {
  signal = new Float32Array(2048)
  frames = []
  contexts = []
  vi.stubGlobal('AudioContext', FakeAudioContext)
  vi.stubGlobal('requestAnimationFrame', (callback: () => void) => frames.push(callback))
  vi.stubGlobal('cancelAnimationFrame', () => {
    frames = []
  })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('PitchEngine', () => {
  it('reports denied and opens no audio context when the mic is refused', async () => {
    stubMic(() => Promise.reject(new Error('NotAllowedError')))
    const engine = new PitchEngine()

    expect(await engine.start()).toBe('denied')
    expect(engine.permissionState).toBe('denied')
    expect(contexts).toHaveLength(0)
  })

  it('asks for the chosen input device, or the default when none is set', async () => {
    const { stream } = fakeStream()
    stubMic(() => Promise.resolve(stream))
    const engine = new PitchEngine()

    await engine.start('usb-mic')
    await engine.start(null)

    const getUserMedia = vi.mocked(navigator.mediaDevices.getUserMedia)
    expect(getUserMedia).toHaveBeenNthCalledWith(1, { audio: { deviceId: { exact: 'usb-mic' } } })
    expect(getUserMedia).toHaveBeenNthCalledWith(2, { audio: true })
  })

  it('emits an A4 reading whose confidence grows over the smoothing window', async () => {
    const { stream } = fakeStream()
    stubMic(() => Promise.resolve(stream))
    signal = sineWave(440)
    const engine = new PitchEngine()
    const readings: (PitchReading | null)[] = []
    engine.onPitch((reading) => readings.push(reading))

    expect(await engine.start()).toBe('granted')
    for (let i = 0; i < 6; i += 1) runFrame()

    expect(readings[0]).toMatchObject({ note: 'A', octave: 4, confidence: 0.2 })
    expect(Math.abs(readings[0]!.cents)).toBeLessThan(10)
    expect(readings.at(-1)?.confidence).toBe(1)
  })

  it('emits null for silence and restarts smoothing afterwards', async () => {
    const { stream } = fakeStream()
    stubMic(() => Promise.resolve(stream))
    signal = sineWave(440)
    const engine = new PitchEngine()
    const readings: (PitchReading | null)[] = []
    engine.onPitch((reading) => readings.push(reading))

    await engine.start()
    runFrame()
    signal = new Float32Array(2048)
    runFrame()
    signal = sineWave(440)
    runFrame()

    expect(readings[1]?.confidence).toBe(0.4)
    expect(readings[2]).toBeNull()
    expect(readings[3]?.confidence).toBe(0.2)
  })

  it('reads notes against the configured reference pitch', async () => {
    const { stream } = fakeStream()
    stubMic(() => Promise.resolve(stream))
    signal = sineWave(432)
    const engine = new PitchEngine()
    engine.setReference(432)
    const readings: (PitchReading | null)[] = []
    engine.onPitch((reading) => readings.push(reading))

    await engine.start()
    runFrame()

    expect(readings[0]).toMatchObject({ note: 'A', octave: 4 })
    expect(Math.abs(readings[0]!.cents)).toBeLessThan(10)
    expect(engine.targetHz('A', 4)).toBe(432)
  })

  it('stops the tracks, closes the context and ends the frame loop on stop', async () => {
    const { stream, track } = fakeStream()
    stubMic(() => Promise.resolve(stream))
    const engine = new PitchEngine()
    const listener = vi.fn()
    engine.onPitch(listener)

    await engine.start()
    const callsBeforeStop = listener.mock.calls.length
    engine.stop()
    runFrame()

    expect(track.stop).toHaveBeenCalled()
    expect(contexts[0].closed).toBe(true)
    expect(listener).toHaveBeenCalledTimes(callsBeforeStop)
  })

  it('stops listening once a listener unsubscribes', async () => {
    const { stream } = fakeStream()
    stubMic(() => Promise.resolve(stream))
    const engine = new PitchEngine()
    const listener = vi.fn()
    const unsubscribe = engine.onPitch(listener)

    await engine.start()
    unsubscribe()
    runFrame()

    expect(listener).toHaveBeenCalledTimes(1)
  })

  // Known bug: start() does not check whether stop() ran while getUserMedia was pending.
  it.fails('releases the mic when stop() runs before the permission prompt resolves', async () => {
    const { stream, track } = fakeStream()
    let grant: (value: unknown) => void = () => undefined
    stubMic(() => new Promise((resolve) => (grant = resolve)))
    const engine = new PitchEngine()

    const starting = engine.start()
    engine.stop()
    grant(stream)
    await starting

    expect(track.stop).toHaveBeenCalled()
    expect(frames).toHaveLength(0)
  })

  // Known bug: a second start() overwrites the first stream and context without stopping them.
  it.fails('does not orphan the first stream when start() runs twice', async () => {
    const first = fakeStream()
    const second = fakeStream()
    const streams = [first.stream, second.stream]
    stubMic(() => Promise.resolve(streams.shift()))
    const engine = new PitchEngine()

    await engine.start()
    await engine.start()

    expect(first.track.stop).toHaveBeenCalled()
    expect(contexts[0].closed).toBe(true)
  })
})
