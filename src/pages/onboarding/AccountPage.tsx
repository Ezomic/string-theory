import { useState, type FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { AppBar, Button } from '../../components/ui'
import { putOne } from '../../lib/db/db'
import { accountsAvailable } from '../../lib/sync/adapter'
import { useAccountStore } from '../../store/accountStore'
import styles from './OnboardingPage.module.css'

const LOCAL_USER_ID = 'local-guest'

type Mode = 'signUp' | 'signIn'

export function AccountPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const experienceIndex = (location.state as { experienceIndex?: number } | null)?.experienceIndex ?? 1

  const [mode, setMode] = useState<Mode>('signUp')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const signUp = useAccountStore((state) => state.signUp)
  const signIn = useAccountStore((state) => state.signIn)
  const clearError = useAccountStore((state) => state.clearError)
  const status = useAccountStore((state) => state.status)
  const error = useAccountStore((state) => state.error)

  // ST-93 hasn't picked a hosted backend yet, so production builds have no
  // adapter. The fields stay disabled there rather than pretending to work.
  const available = accountsAvailable()
  const busy = status === 'working'

  async function submit(event: FormEvent) {
    event.preventDefault()
    const ok = await (mode === 'signUp' ? signUp(email, password) : signIn(email, password))
    if (ok) navigate('/placement', { state: { experienceIndex } })
  }

  function switchMode(next: Mode) {
    clearError()
    setMode(next)
  }

  async function continueAsGuest() {
    await putOne('profile', {
      id: LOCAL_USER_ID,
      name: 'Guest',
      isGuest: true,
      createdAt: new Date().toISOString(),
      plan: 'free',
    })
    navigate('/placement', { state: { experienceIndex } })
  }

  return (
    <div className={styles.page}>
      <AppBar title="" subtitle="Step 2 of 2" onBack={() => navigate(-1)} />

      <h2 className={styles.heading}>Save your progress</h2>
      <p className={styles.subtext}>So your streak and lessons sync across devices.</p>

      <form onSubmit={submit}>
        <div className={styles.field}>
          <div className={styles.fieldLabel}>Email</div>
          <input
            className={styles.fieldInput}
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            disabled={!available || busy}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className={styles.field}>
          <div className={styles.fieldLabel}>Password</div>
          <input
            className={styles.fieldInput}
            type="password"
            autoComplete={mode === 'signUp' ? 'new-password' : 'current-password'}
            placeholder="••••••••"
            disabled={!available || busy}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {error ? (
          <p className={styles.formError} role="alert">
            {error}
          </p>
        ) : null}

        <Button type="submit" variant="ghost" disabled={!available || busy}>
          {available ? submitLabel(mode, busy) : 'Create account (coming soon)'}
        </Button>
      </form>

      {available ? (
        <button
          type="button"
          className={styles.modeSwitch}
          onClick={() => switchMode(mode === 'signUp' ? 'signIn' : 'signUp')}
        >
          {mode === 'signUp' ? 'Already have an account? Log in' : 'Need an account? Sign up'}
        </button>
      ) : null}

      <Button onClick={continueAsGuest} disabled={busy}>
        Continue as guest
      </Button>
      <p className={styles.guestNote}>
        {available
          ? 'Or keep everything on this device as a guest.'
          : "Accounts aren't available yet. Everything works fully as a guest, stored on this device."}
      </p>
    </div>
  )
}

function submitLabel(mode: Mode, busy: boolean): string {
  if (busy) return mode === 'signUp' ? 'Creating account…' : 'Logging in…'
  return mode === 'signUp' ? 'Create account' : 'Log in'
}
