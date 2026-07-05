import { useEffect, useRef, useState } from 'react'
import { useAudioSettingsStore } from '../../store/audioSettingsStore'
import { PitchEngine, type PermissionState, type PitchReading } from './pitchEngine'

interface UsePitchEngineResult {
  permissionState: PermissionState
  reading: PitchReading | null
  requestAccess: () => Promise<void>
  setReference: (referencePitch: number) => void
}

/** Owns a PitchEngine instance for the lifetime of the component using it. */
export function usePitchEngine(): UsePitchEngineResult {
  const engineRef = useRef<PitchEngine>(new PitchEngine())
  const [permissionState, setPermissionState] = useState<PermissionState>('prompt')
  const [reading, setReading] = useState<PitchReading | null>(null)
  const micDeviceId = useAudioSettingsStore((state) => state.micDeviceId)

  useEffect(() => {
    const engine = engineRef.current
    const unsubscribe = engine.onPitch(setReading)
    return () => {
      unsubscribe()
      engine.stop()
    }
  }, [])

  async function requestAccess() {
    const state = await engineRef.current.start(micDeviceId)
    setPermissionState(state)
  }

  function setReference(referencePitch: number) {
    engineRef.current.setReference(referencePitch)
  }

  return { permissionState, reading, requestAccess, setReference }
}
