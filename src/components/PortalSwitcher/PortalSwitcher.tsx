import { useEffect, useRef, useState } from 'react'
import {
  fetchPortalApps,
  fetchSession,
  portalSections,
  signInUrl,
  signOutOfPortal,
  type PortalData,
  type PortalSession,
} from '../../lib/portal/portal'
import { AppIcon } from './AppIcon'
import styles from './PortalSwitcher.module.css'

export function PortalSwitcher() {
  const dialog = useRef<HTMLDialogElement>(null)
  const [session, setSession] = useState<PortalSession | null>(null)
  const [data, setData] = useState<PortalData | null>(null)
  const [failed, setFailed] = useState(false)

  const signInFailed = new URLSearchParams(window.location.search).get('signin') === 'failed'

  useEffect(() => {
    void fetchSession().then(setSession)
  }, [])

  useEffect(() => {
    if (signInFailed && session?.configured && !session.user) dialog.current?.showModal()
  }, [signInFailed, session])

  if (!session?.configured) return null

  const open = () => {
    dialog.current?.showModal()
    if (session.user && !data) {
      setFailed(false)
      void fetchPortalApps().then((result) => (result ? setData(result) : setFailed(true)))
    }
  }

  const signOut = async () => {
    await signOutOfPortal()
    setSession({ ...session, user: null })
    setData(null)
    dialog.current?.close()
  }

  const sections = data ? portalSections(data) : []

  return (
    <>
      <button type="button" className={styles.trigger} onClick={open} aria-label="Thijssensoftware apps">
        <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor" aria-hidden="true">
          <rect x="1" y="1" width="6" height="6" rx="1.5" />
          <rect x="9" y="1" width="6" height="6" rx="1.5" />
          <rect x="1" y="9" width="6" height="6" rx="1.5" />
          <rect x="9" y="9" width="6" height="6" rx="1.5" />
        </svg>
      </button>

      <dialog ref={dialog} className={styles.dialog} onClick={(event) => event.target === dialog.current && dialog.current?.close()}>
        <header className={styles.header}>
          <h2 className={styles.title}>Your apps</h2>
          <button type="button" className={styles.close} onClick={() => dialog.current?.close()} aria-label="Close">
            ✕
          </button>
        </header>

        {!session.user ? (
          <div className={styles.message}>
            {signInFailed ? <p role="alert">Sign-in did not complete. Please try again.</p> : null}
            <p>Sign in with Thijssensoftware ID to see the apps you can open.</p>
            <a className={styles.primary} href={signInUrl(window.location.pathname)}>
              Sign in with Thijssensoftware ID
            </a>
          </div>
        ) : failed ? (
          <p className={styles.message}>Could not load your apps. Try again in a moment.</p>
        ) : !data ? (
          <p className={styles.message}>Loading...</p>
        ) : sections.length === 0 ? (
          <p className={styles.message}>No apps available.</p>
        ) : (
          sections.map((section) => (
            <section key={section.key}>
              {section.label ? <h3 className={styles.sectionLabel}>{section.label}</h3> : null}
              <div className={styles.grid}>
                {section.apps.map((app) =>
                  app.slug === data.currentSlug ? (
                    <div key={app.slug} className={`${styles.tile} ${styles.current}`} aria-current="page">
                      <AppIcon app={app} />
                      <span className={styles.name}>{app.name}</span>
                      <span className={styles.hint}>You are here</span>
                    </div>
                  ) : (
                    <a key={app.slug} className={styles.tile} href={app.launch_url}>
                      <AppIcon app={app} />
                      <span className={styles.name}>{app.name}</span>
                    </a>
                  ),
                )}
              </div>
            </section>
          ))
        )}

        {session.user ? (
          <footer className={styles.footer}>
            <span>{session.user.email}</span>
            <button type="button" className={styles.link} onClick={() => void signOut()}>
              Sign out
            </button>
          </footer>
        ) : null}
      </dialog>
    </>
  )
}
