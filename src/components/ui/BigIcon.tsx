import type { CSSProperties, ReactNode } from 'react'
import styles from './BigIcon.module.css'

interface BigIconProps {
  children: ReactNode
  tone?: 'default' | 'bad' | 'good'
}

const TONE_STYLE: Record<NonNullable<BigIconProps['tone']>, CSSProperties> = {
  default: {},
  bad: { borderColor: 'var(--bad-border)', background: 'var(--bad-soft)' },
  good: { borderColor: 'var(--good-border)', background: 'var(--good-soft)' },
}

export function BigIcon({ children, tone = 'default' }: BigIconProps) {
  return (
    <div className={styles.icon} style={TONE_STYLE[tone]}>
      {children}
    </div>
  )
}
