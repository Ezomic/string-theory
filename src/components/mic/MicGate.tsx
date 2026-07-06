import type { ReactNode } from 'react'
import { usePitchEngine } from '../../lib/pitch/usePitchEngine'
import type { PitchReading } from '../../lib/pitch/pitchEngine'
import { MicDenied } from './MicDenied'
import { MicPermissionPrompt } from './MicPermissionPrompt'

interface MicGateProps {
  children: (reading: PitchReading | null) => ReactNode
  onContinueWithoutMic: () => void
}

/**
 * Wraps any mic-dependent screen with the shared A4/A5 permission flow
 * (spec ground rule: every mic screen must handle denial gracefully, never dead-end).
 */
export function MicGate({ children, onContinueWithoutMic }: MicGateProps) {
  const { permissionState, reading, requestAccess } = usePitchEngine()

  if (permissionState === 'denied') {
    return <MicDenied onRetry={requestAccess} onContinueWithoutMic={onContinueWithoutMic} />
  }

  if (permissionState === 'prompt') {
    return <MicPermissionPrompt onEnable={requestAccess} />
  }

  return <>{children(reading)}</>
}
