import { useEffect, useRef, useState } from 'react'
import { useAudioSettingsStore } from '../../store/audioSettingsStore'
import { useMicPermissionStore } from '../../store/micPermissionStore'
import { PitchEngine, type PermissionState, type PitchReading } from './pitchEngine'

interface UsePitchEngineResult {
  permissionState: PermissionState
  reading: PitchReading | null
  requestAccess: () => Promise<void>
  setReference: (referencePitch: number) => void
}

/**
 * Owns a PitchEngine instance for the lifetime of the component using it. Each screen still
 * gets its own instance (and so still has to call getUserMedia again for its own MediaStream),
 * but if the browser already granted access earlier this session, access is re-requested
 * automatically on mount instead of making MicGate show the A4 explainer again.
 */
export function usePitchEngine(): UsePitchEngineResult {
  const engineRef = useRef<PitchEngine>(new PitchEngine())
  const previouslyGranted = useMicPermissionStore((state) => state.granted)
  const setGrantedThisSession = useMicPermissionStore((state) => state.setGranted)
  const [permissionState, setPermissionState] = useState<PermissionState>(
    previouslyGranted ? 'granted' : 'prompt',
  )
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
    setGrantedThisSession(state === 'granted')
  }

  // Only ever auto-requests once, right on mount — deliberately not reacting to
  // `previouslyGranted` changing later, which would re-trigger getUserMedia on this
  // screen every time some other screen's grant changes.
  useEffect(() => {
    if (previouslyGranted) void requestAccess()
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function setReference(referencePitch: number) {
    engineRef.current.setReference(referencePitch)
  }

  return { permissionState, reading, requestAccess, setReference }
}
