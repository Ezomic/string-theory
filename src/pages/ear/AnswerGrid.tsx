import styles from './AnswerGrid.module.css'

interface AnswerGridProps {
  choices: string[]
  correctLabel: string
  /** null = unanswered */
  selected: string | null
  onSelect: (choice: string) => void
}

export function AnswerGrid({ choices, correctLabel, selected, onSelect }: AnswerGridProps) {
  const answered = selected !== null

  return (
    <div className={styles.grid}>
      {choices.map((choice) => {
        const isCorrect = choice === correctLabel
        const isWrongPick = answered && choice === selected && !isCorrect
        const state = answered && isCorrect ? 'correct' : isWrongPick ? 'wrong' : 'default'

        return (
          <button
            key={choice}
            type="button"
            className={[styles.answer, styles[state]].join(' ')}
            disabled={answered}
            onClick={() => onSelect(choice)}
          >
            {choice}
            {answered && isCorrect && ' ✓'}
            {isWrongPick && ' ✕'}
          </button>
        )
      })}
    </div>
  )
}
