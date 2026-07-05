import styles from './BottomNav.module.css'

export type BottomNavTab = 'home' | 'path' | 'tools' | 'progress'

const TABS: { key: BottomNavTab; label: string }[] = [
  { key: 'home', label: 'Home' },
  { key: 'path', label: 'Path' },
  { key: 'tools', label: 'Tools' },
  { key: 'progress', label: 'Progress' },
]

interface BottomNavProps {
  active: BottomNavTab
  onSelect: (tab: BottomNavTab) => void
}

export function BottomNav({ active, onSelect }: BottomNavProps) {
  return (
    <nav className={styles.nav}>
      {TABS.map((tab) => (
        <button
          key={tab.key}
          type="button"
          className={[styles.tab, tab.key === active ? styles.active : '']
            .filter(Boolean)
            .join(' ')}
          onClick={() => onSelect(tab.key)}
        >
          <span className={styles.dot} />
          {tab.label}
        </button>
      ))}
    </nav>
  )
}
