import type { VoiceId } from '../db/types'
import { createPluckedStringBuffer } from './karplusStrong'

export interface VoiceInfo {
  id: VoiceId
  label: string
  description: string
}

export const VOICES: VoiceInfo[] = [
  { id: 'pluckGuitar', label: 'Guitar', description: 'Bright plucked string' },
  { id: 'pluckBass', label: 'Bass', description: 'Deep, slow-decaying pluck' },
  { id: 'pluckNylon', label: 'Nylon', description: 'Warm, muted pluck' },
  { id: 'sine', label: 'Sine', description: 'Pure, clean tone' },
  { id: 'triangle', label: 'Triangle', description: 'Soft, flute-like tone' },
  { id: 'sawtooth', label: 'Sawtooth', description: 'Bright, buzzy synth lead' },
  { id: 'square', label: 'Square', description: 'Hollow, retro tone' },
  { id: 'organ', label: 'Organ', description: 'Layered harmonic tone' },
  { id: 'bell', label: 'Bell', description: 'Metallic FM bell' },
  { id: 'pad', label: 'Pad', description: 'Slow, warm synth pad' },
]

export interface ScheduleArgs {
  context: BaseAudioContext
  destination: AudioNode
  frequency: number
  startTime: number
  durationSeconds: number
}

function schedulePluck(
  { context, destination, frequency, startTime, durationSeconds }: ScheduleArgs,
  options: { decay: number; filterHz?: number; gain: number; tailSeconds: number },
): void {
  const ringDuration = durationSeconds + options.tailSeconds
  const source = context.createBufferSource()
  source.buffer = createPluckedStringBuffer(context, frequency, ringDuration, options.decay)

  const gain = context.createGain()
  gain.gain.setValueAtTime(0, startTime)
  gain.gain.linearRampToValueAtTime(options.gain, startTime + 0.004)
  gain.connect(destination)

  let node: AudioNode = source
  if (options.filterHz) {
    const filter = context.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = options.filterHz
    node.connect(filter)
    node = filter
  }
  node.connect(gain)

  source.start(startTime)
  source.stop(startTime + ringDuration)
}

function scheduleOscillator(
  { context, destination, frequency, startTime, durationSeconds }: ScheduleArgs,
  options: { type: OscillatorType; gain: number; filterHz?: number },
): void {
  const oscillator = context.createOscillator()
  oscillator.type = options.type
  oscillator.frequency.value = frequency

  const gain = context.createGain()
  gain.gain.setValueAtTime(0, startTime)
  gain.gain.linearRampToValueAtTime(options.gain, startTime + 0.02)
  gain.gain.linearRampToValueAtTime(0, startTime + durationSeconds)
  gain.connect(destination)

  let node: AudioNode = oscillator
  if (options.filterHz) {
    const filter = context.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = options.filterHz
    node.connect(filter)
    node = filter
  }
  node.connect(gain)

  oscillator.start(startTime)
  oscillator.stop(startTime + durationSeconds + 0.02)
}

function scheduleOrgan(args: ScheduleArgs): void {
  const { context, destination, frequency, startTime, durationSeconds } = args
  const partials = [
    { ratio: 1, gain: 0.18 },
    { ratio: 2, gain: 0.09 },
    { ratio: 3, gain: 0.05 },
  ]
  partials.forEach(({ ratio, gain }) => {
    scheduleOscillator(
      { context, destination, frequency: frequency * ratio, startTime, durationSeconds },
      { type: 'sine', gain },
    )
  })
}

function scheduleBell({ context, destination, frequency, startTime, durationSeconds }: ScheduleArgs): void {
  const ringDuration = durationSeconds + 0.8
  const carrier = context.createOscillator()
  const modulator = context.createOscillator()
  const modulationGain = context.createGain()

  carrier.type = 'sine'
  carrier.frequency.value = frequency
  modulator.type = 'sine'
  modulator.frequency.value = frequency * 3.5
  modulationGain.gain.value = frequency * 1.5

  modulator.connect(modulationGain)
  modulationGain.connect(carrier.frequency)

  const gain = context.createGain()
  gain.gain.setValueAtTime(0, startTime)
  gain.gain.linearRampToValueAtTime(0.22, startTime + 0.005)
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + ringDuration)

  carrier.connect(gain)
  gain.connect(destination)

  carrier.start(startTime)
  modulator.start(startTime)
  carrier.stop(startTime + ringDuration)
  modulator.stop(startTime + ringDuration)
}

function schedulePad({ context, destination, frequency, startTime, durationSeconds }: ScheduleArgs): void {
  const attackSeconds = 0.18
  const releaseSeconds = 0.5

  const filter = context.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.value = 1200
  filter.connect(destination)

  const gain = context.createGain()
  gain.gain.setValueAtTime(0, startTime)
  gain.gain.linearRampToValueAtTime(0.16, startTime + attackSeconds)
  gain.gain.setValueAtTime(0.16, startTime + durationSeconds)
  gain.gain.linearRampToValueAtTime(0, startTime + durationSeconds + releaseSeconds)
  gain.connect(filter)

  // Two slightly detuned saws for a thicker, chorused pad sound.
  ;[-6, 6].forEach((cents) => {
    const oscillator = context.createOscillator()
    oscillator.type = 'sawtooth'
    oscillator.frequency.value = frequency
    oscillator.detune.value = cents
    oscillator.connect(gain)
    oscillator.start(startTime)
    oscillator.stop(startTime + durationSeconds + releaseSeconds + 0.05)
  })
}

export function scheduleVoice(voice: VoiceId, args: ScheduleArgs): void {
  switch (voice) {
    case 'pluckGuitar':
      return schedulePluck(args, { decay: 0.994, gain: 0.3, tailSeconds: 0.6 })
    case 'pluckBass':
      return schedulePluck(args, { decay: 0.9975, filterHz: 900, gain: 0.36, tailSeconds: 1 })
    case 'pluckNylon':
      return schedulePluck(args, { decay: 0.994, filterHz: 1800, gain: 0.3, tailSeconds: 0.7 })
    case 'sine':
      return scheduleOscillator(args, { type: 'sine', gain: 0.26 })
    case 'triangle':
      return scheduleOscillator(args, { type: 'triangle', gain: 0.24 })
    case 'sawtooth':
      return scheduleOscillator(args, { type: 'sawtooth', gain: 0.14, filterHz: 3000 })
    case 'square':
      return scheduleOscillator(args, { type: 'square', gain: 0.11, filterHz: 2200 })
    case 'organ':
      return scheduleOrgan(args)
    case 'bell':
      return scheduleBell(args)
    case 'pad':
      return schedulePad(args)
  }
}
