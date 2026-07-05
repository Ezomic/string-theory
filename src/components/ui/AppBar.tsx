import type { ReactNode } from 'react'
import styles from './AppBar.module.css'

interface AppBarProps {
  title: string
  onBack?: () => void
  onClose?: () => void
  trailing?: ReactNode
}

export function AppBar({ title, onBack, onClose, trailing }: AppBarProps) {
  return (
    <header className={styles.bar}>
      {onBack ? (
        <button type="button" className={styles.iconButton} onClick={onBack} aria-label="Back">
          ←
        </button>
      ) : (
        <span className={styles.spacer} />
      )}
      <span className={styles.title}>{title}</span>
      {onClose ? (
        <button type="button" className={styles.iconButton} onClick={onClose} aria-label="Close">
          ✕
        </button>
      ) : (
        (trailing ?? <span className={styles.spacer} />)
      )}
    </header>
  )
}
