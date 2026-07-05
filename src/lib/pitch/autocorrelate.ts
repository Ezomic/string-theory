/**
 * Autocorrelation-based fundamental frequency detector (ACF2+ variant).
 * Returns the detected frequency in Hz, or -1 if no confident pitch was found.
 */
export function autocorrelate(buffer: Float32Array, sampleRate: number): number {
  const size = buffer.length

  let rms = 0
  for (let i = 0; i < size; i += 1) {
    rms += buffer[i] * buffer[i]
  }
  rms = Math.sqrt(rms / size)
  if (rms < 0.01) {
    return -1
  }

  let trimStart = 0
  let trimEnd = size - 1
  const threshold = 0.2
  while (trimStart < size / 2 && Math.abs(buffer[trimStart]) < threshold) {
    trimStart += 1
  }
  while (trimEnd > size / 2 && Math.abs(buffer[trimEnd]) < threshold) {
    trimEnd -= 1
  }

  const trimmed = buffer.slice(trimStart, trimEnd)
  const trimmedSize = trimmed.length
  if (trimmedSize < 2) {
    return -1
  }

  const correlations = new Array<number>(trimmedSize).fill(0)
  for (let lag = 0; lag < trimmedSize; lag += 1) {
    let sum = 0
    for (let i = 0; i < trimmedSize - lag; i += 1) {
      sum += trimmed[i] * trimmed[i + lag]
    }
    correlations[lag] = sum
  }

  // Skip the descending slope of the zero-lag peak to reach the first trough,
  // then the true fundamental-period peak lies somewhere after it.
  let troughLag = 0
  while (
    troughLag < trimmedSize - 1 &&
    correlations[troughLag] > correlations[troughLag + 1]
  ) {
    troughLag += 1
  }

  let bestLag = -1
  let bestCorrelation = -Infinity
  for (let lag = troughLag; lag < trimmedSize; lag += 1) {
    if (correlations[lag] > bestCorrelation) {
      bestCorrelation = correlations[lag]
      bestLag = lag
    }
  }

  if (bestLag <= 0) {
    return -1
  }

  // Parabolic interpolation around the peak for sub-sample lag precision.
  const t0 = correlations[Math.max(bestLag - 1, 0)]
  const t1 = correlations[bestLag]
  const t2 = correlations[Math.min(bestLag + 1, trimmedSize - 1)]
  const denominator = t0 - 2 * t1 + t2
  const shift = denominator !== 0 ? (0.5 * (t0 - t2)) / denominator : 0
  const refinedLag = bestLag + shift

  return sampleRate / refinedLag
}
