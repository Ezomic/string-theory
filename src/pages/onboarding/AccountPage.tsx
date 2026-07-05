import { useLocation, useNavigate } from 'react-router-dom'
import { AppBar, Button } from '../../components/ui'
import { putOne } from '../../lib/db/db'
import styles from './OnboardingPage.module.css'

const LOCAL_USER_ID = 'local-guest'

// A3 — sign up / log in. No backend exists yet, so only the guest path is
// real; the account fields are shown (matching the spec's screen) but
// disabled rather than silently pretending to create an account.
export function AccountPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const experienceIndex = (location.state as { experienceIndex?: number } | null)?.experienceIndex ?? 1

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

      <div className={styles.field}>
        <div className={styles.fieldLabel}>Email</div>
        <input className={styles.fieldInput} disabled placeholder="you@example.com" />
      </div>
      <div className={styles.field}>
        <div className={styles.fieldLabel}>Password</div>
        <input className={styles.fieldInput} disabled type="password" placeholder="••••••••" />
      </div>
      <Button variant="ghost" disabled>
        Create account (coming soon)
      </Button>

      <Button onClick={continueAsGuest}>Continue as guest</Button>
      <p className={styles.guestNote}>
        Accounts aren't available yet — everything works fully as a guest, stored on this device.
      </p>
    </div>
  )
}
