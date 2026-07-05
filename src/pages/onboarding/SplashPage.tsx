import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getOne } from '../../lib/db/db'
import styles from './SplashPage.module.css'

const MIN_SPLASH_MS = 700
const LOCAL_USER_ID = 'local-guest'

// A1 — splash
export function SplashPage() {
  const navigate = useNavigate()

  useEffect(() => {
    let cancelled = false
    const start = Date.now()

    getOne('profile', LOCAL_USER_ID).then((profile) => {
      if (cancelled) return
      const elapsed = Date.now() - start
      const wait = Math.max(0, MIN_SPLASH_MS - elapsed)
      setTimeout(() => {
        if (cancelled) return
        navigate(profile ? '/home' : '/onboarding/instrument', { replace: true })
      }, wait)
    })

    return () => {
      cancelled = true
    }
  }, [navigate])

  return (
    <div className={styles.page}>
      <svg className={styles.mark} viewBox="0 0 44 44" fill="none">
        <path d="M8 34 C 18 34, 18 10, 36 10" stroke="#7c5cff" strokeWidth="2.6" fill="none" />
        <path d="M8 34 C 20 34, 20 16, 36 16" stroke="#9d86ff" strokeWidth="2.2" fill="none" />
        <path d="M8 34 C 22 34, 22 22, 36 22" stroke="#ff9e57" strokeWidth="2.2" fill="none" />
        <circle cx="8" cy="34" r="3" fill="#ff9e57" />
        <circle cx="36" cy="10" r="3" fill="#7c5cff" />
      </svg>
      <h1 className={styles.title}>
        String<span className={styles.accent}>Theory</span>
      </h1>
      <p className={styles.tagline}>Read it. See it. Hear it. Play it.</p>
    </div>
  )
}
