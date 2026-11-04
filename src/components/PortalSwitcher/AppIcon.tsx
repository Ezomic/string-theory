import { useState } from 'react'
import { faviconCandidates, type PortalApp } from '../../lib/portal/portal'
import styles from './PortalSwitcher.module.css'

export function AppIcon({ app }: { app: PortalApp }) {
  const candidates = faviconCandidates(app.launch_url)
  const [index, setIndex] = useState(0)
  const src = candidates[index]

  const miss = () => setIndex((current) => current + 1)

  if (!src) {
    return (
      <span className={styles.icon} style={{ backgroundColor: app.accent ?? '#6b7280', color: '#fff' }}>
        {app.initials}
      </span>
    )
  }

  return (
    <span className={styles.icon}>
      <img
        src={src}
        alt=""
        className={styles.iconImage}
        onError={miss}
        onLoad={(event) => {
          if (event.currentTarget.naturalWidth === 0) miss()
        }}
      />
    </span>
  )
}
