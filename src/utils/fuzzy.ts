function normalizeFuzzyValue(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[.'’"`,;:!?()[\]{}]/g, " ")
    .replace(/[-_/]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function levenshteinDistance(left: string, right: string): number {
  const a = normalizeFuzzyValue(left);
  const b = normalizeFuzzyValue(right);

  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const matrix: number[][] = Array.from({ length: a.length + 1 }, () =>
    Array.from({ length: b.length + 1 }, () => 0)
  );

  for (let i = 0; i <= a.length; i += 1) {
    matrix[i][0] = i;
  }

  for (let j = 0; j <= b.length; j += 1) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;

      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  return matrix[a.length][b.length];
}

export function similarityScore(left: string, right: string): number {
  const a = normalizeFuzzyValue(left);
  const b = normalizeFuzzyValue(right);

  if (!a && !b) return 1;
  if (!a || !b) return 0;
  if (a === b) return 1;

  const distance = levenshteinDistance(a, b);
  const maxLength = Math.max(a.length, b.length);

  if (maxLength === 0) return 1;

  return 1 - distance / maxLength;
}

export interface FuzzyMatchResult {
  value: string;
  score: number;
}

export function findBestFuzzyMatch(
  input: string,
  candidates: string[],
  minimumScore = 0.72
): FuzzyMatchResult | null {
  const normalizedInput = normalizeFuzzyValue(input);

  if (!normalizedInput || !candidates.length) {
    return null;
  }

  let best: FuzzyMatchResult | null = null;

  for (const candidate of candidates) {
    const score = similarityScore(normalizedInput, candidate);

    if (!best || score > best.score) {
      best = {
        value: candidate,
        score,
      };
    }
  }

  if (!best || best.score < minimumScore) {
    return null;
  }

  return best;
}