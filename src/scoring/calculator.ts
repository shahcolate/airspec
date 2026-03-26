/**
 * Weighted composite score calculation.
 */
import type { DimensionName, DimensionResult, ScoringProfile } from '../types.js';
import { DEFAULT_PROFILE } from './profiles/default.js';

/**
 * Calculate the weighted composite score from dimension results.
 */
export function calculateCompositeScore(
  dimensions: Record<DimensionName, DimensionResult>,
  profile: ScoringProfile = DEFAULT_PROFILE
): number {
  let total = 0;

  for (const [name, weight] of Object.entries(profile.weights)) {
    const dim = dimensions[name as DimensionName];
    if (dim) {
      const clamped = Math.min(100, Math.max(0, dim.score));
      total += clamped * weight;
    }
  }

  return Math.round(total);
}

/**
 * Apply custom weight overrides to the default profile.
 */
export function applyWeightOverrides(
  overrides: Record<string, number>
): ScoringProfile {
  const weights = { ...DEFAULT_PROFILE.weights };

  for (const [key, value] of Object.entries(overrides)) {
    if (key in weights) {
      weights[key as DimensionName] = value / 100; // Accept 0-100, normalize to 0-1
    }
  }

  // Renormalize weights to sum to 1.0
  const sum = Object.values(weights).reduce((a, b) => a + b, 0);
  if (sum > 0) {
    for (const key of Object.keys(weights)) {
      weights[key as DimensionName] /= sum;
    }
  }

  return { weights };
}
