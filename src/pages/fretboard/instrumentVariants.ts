export type FretboardVariant = 'guitar' | 'bass4' | 'bass5'

export const VARIANTS: Record<FretboardVariant, { label: string; tuning: string[] }> = {
  guitar: { label: 'Guitar', tuning: ['E', 'A', 'D', 'G', 'B', 'E'] },
  bass4: { label: 'Bass', tuning: ['E', 'A', 'D', 'G'] },
  bass5: { label: 'Bass 5', tuning: ['B', 'E', 'A', 'D', 'G'] },
}
