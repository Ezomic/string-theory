import type { SyncedStoreName } from './stores'

export interface AuthSession {
  userId: string
  email: string
  /** Opaque to the app: whatever the chosen backend needs to authenticate a request. */
  token: string
}

export type AuthErrorCode =
  | 'email_taken'
  | 'invalid_credentials'
  | 'weak_password'
  | 'invalid_email'
  | 'offline'
  | 'unknown'

/**
 * Auth failures the sign-up and login screens are expected to render inline
 * (ST-94), rather than letting a rejected promise surface as a crash.
 */
export class AuthError extends Error {
  readonly code: AuthErrorCode

  constructor(code: AuthErrorCode, message: string) {
    super(message)
    this.name = 'AuthError'
    this.code = code
  }
}

/** One record's state at a point in time, as it crosses the wire in either direction. */
export interface SyncRecord {
  store: SyncedStoreName
  key: string
  updatedAt: string
  /** The full record. Absent when the record was deleted on the origin device. */
  value: Record<string, unknown> | null
}

export interface PullResult {
  records: SyncRecord[]
  /** Server clock at the moment of the read, used as the next pull's cursor. */
  syncedAt: string
}

export interface PushResult {
  /**
   * Records the backend already held at a newer or equal updatedAt, so the push
   * was ignored for them. The engine reconciles these locally in ST-97.
   */
  rejected: SyncRecord[]
  syncedAt: string
}

/**
 * The seam between the app and whichever backend ends up behind it. Every
 * method may reject with an `AuthError`; transport failures reject with a
 * plain `Error` so callers can tell "you are offline" from "your password is
 * wrong".
 */
export interface SyncAdapter {
  signUp(email: string, password: string): Promise<AuthSession>
  signIn(email: string, password: string): Promise<AuthSession>
  signOut(): Promise<void>
  /** The persisted session if one survives an app restart, else null. */
  currentSession(): Promise<AuthSession | null>
  /** Records changed on the backend strictly after `since`; null pulls everything. */
  pull(since: string | null): Promise<PullResult>
  push(records: SyncRecord[]): Promise<PushResult>
}
