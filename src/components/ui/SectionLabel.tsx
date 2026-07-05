import type { HTMLAttributes } from 'react'
import styles from './SectionLabel.module.css'

export function SectionLabel({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return <span className={[styles.label, className].filter(Boolean).join(' ')} {...props} />
}
