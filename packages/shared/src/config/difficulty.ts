export const DIFFICULTY_THRESHOLDS = {
  ratio: { easy: 3, medium: 1.5 },
  difference: { easy: 30, medium: 10 },
} as const;

/** Minimum items for a metric to be offered (FR-028). */
export const MINIMUM_ITEMS = 150;
