import type { HTMLAttributes } from 'react'
import styles from './Pill.module.css'

export type PillVariant = 'default' | 'accent' | 'good' | 'warn'

interface PillProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: PillVariant
}

export function Pill({ variant = 'default', className, ...props }: PillProps) {
  return (
    <span
      className={[styles.pill, styles[variant], className].filter(Boolean).join(' ')}
      {...props}
    />
  )
}
