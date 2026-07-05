import styles from './PlayButton.module.css'

interface PlayButtonProps {
  playing: boolean
  onClick: () => void
}

export function PlayButton({ playing, onClick }: PlayButtonProps) {
  return (
    <button
      type="button"
      className={styles.button}
      onClick={onClick}
      aria-label={playing ? 'Pause' : 'Play'}
    >
      {playing ? '❚❚' : '▶'}
    </button>
  )
}
