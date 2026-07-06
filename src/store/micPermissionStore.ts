import { create } from 'zustand'

interface MicPermissionState {
  /** Whether any mic screen has successfully gotten a 'granted' PermissionState this session. */
  granted: boolean
  setGranted: (granted: boolean) => void
}

/**
 * Session-only (not persisted) — deliberately separate from audioSettingsStore, since this
 * tracks live getUserMedia() outcomes rather than a durable user preference. Lets a mic screen
 * skip MicGate's A4 explainer once another screen already got a real grant this session.
 */
export const useMicPermissionStore = create<MicPermissionState>((set) => ({
  granted: false,
  setGranted: (granted) => set({ granted }),
}))
