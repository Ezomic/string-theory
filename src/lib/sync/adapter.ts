import { createLocalAdapter } from './localAdapter'
import type { SyncAdapter } from './types'

let override: SyncAdapter | null | undefined
let cached: SyncAdapter | null | undefined

/**
 * The backend the app talks to, or null when there isn't one.
 *
 * ST-93 hasn't picked a hosted backend yet, so the only implementation that
 * exists is the development stand-in. Production builds therefore report no
 * adapter, and the UI keeps offering the guest path rather than showing a
 * sign-up form that cannot work.
 */
export function getSyncAdapter(): SyncAdapter | null {
  if (override !== undefined) return override
  if (cached === undefined) {
    cached = import.meta.env.PROD ? null : createLocalAdapter()
  }
  return cached
}

export function accountsAvailable(): boolean {
  return getSyncAdapter() !== null
}

/** Test seam: pass an adapter to use, or undefined to fall back to the real lookup. */
export function setSyncAdapter(adapter: SyncAdapter | null | undefined): void {
  override = adapter
}
