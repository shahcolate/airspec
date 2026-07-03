/**
 * CLI option parsing and validation.
 * Every parser here throws InvalidOptionError with a human-readable message
 * instead of letting bad input flow through as NaN or silently dropping it.
 */
import { DEFAULT_PROFILE } from '../scoring/profiles/default.js';

/** Thrown when a CLI option fails validation. Rendered without a stack trace. */
export class InvalidOptionError extends Error {}

const VALID_DIMENSIONS = Object.keys(DEFAULT_PROFILE.weights);

/**
 * Parse weight overrides from a CLI string like "type_coverage=20,test_narration=5".
 * Rejects unknown dimension names and non-numeric or negative values so a typo
 * fails loudly instead of silently scoring with default weights.
 */
export function parseWeights(input: string): Record<string, number> {
  const weights: Record<string, number> = {};

  for (const pair of input.split(',')) {
    const trimmed = pair.trim();
    if (!trimmed) continue;

    const eq = trimmed.indexOf('=');
    if (eq === -1) {
      throw new InvalidOptionError(
        `Invalid --weights entry "${trimmed}". Expected key=value pairs, e.g. type_coverage=20,test_narration=5`
      );
    }

    const key = trimmed.slice(0, eq).trim();
    const rawValue = trimmed.slice(eq + 1).trim();

    if (!VALID_DIMENSIONS.includes(key)) {
      throw new InvalidOptionError(
        `Unknown dimension "${key}" in --weights. Valid dimensions: ${VALID_DIMENSIONS.join(', ')}`
      );
    }

    const value = Number(rawValue);
    if (!Number.isFinite(value) || value < 0) {
      throw new InvalidOptionError(
        `Invalid weight "${rawValue}" for "${key}". Weights must be non-negative numbers on a 0-100 scale.`
      );
    }

    weights[key] = value;
  }

  if (Object.keys(weights).length === 0) {
    throw new InvalidOptionError(
      'No valid --weights entries found. Expected key=value pairs, e.g. type_coverage=20,test_narration=5'
    );
  }

  return weights;
}

/**
 * Parse and validate a --min-score value. Must be a number between 0 and 100.
 */
export function parseMinScore(input: string): number {
  const value = Number(input);
  if (!Number.isFinite(value) || value < 0 || value > 100) {
    throw new InvalidOptionError(
      `Invalid --min-score "${input}". Expected a number between 0 and 100.`
    );
  }
  return value;
}
