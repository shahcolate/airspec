import { describe, it, expect } from 'vitest';
import { calculateCompositeScore, applyWeightOverrides } from '../src/scoring/calculator.js';
import { generateRecommendations } from '../src/scoring/recommendations.js';
import { DEFAULT_PROFILE } from '../src/scoring/profiles/default.js';
import type { DimensionName, DimensionResult } from '../src/types.js';

function makeDimensions(overrides: Partial<Record<DimensionName, number>> = {}): Record<DimensionName, DimensionResult> {
  const defaults: Record<DimensionName, DimensionResult> = {
    documentation_coverage: { score: 50, weight: 0.15, details: {} },
    type_coverage: { score: 50, weight: 0.10, details: {} },
    convention_consistency: { score: 50, weight: 0.10, details: {} },
    test_narration: { score: 50, weight: 0.10, details: {} },
    context_budget_efficiency: { score: 50, weight: 0.10, details: {} },
    architecture_clarity: { score: 50, weight: 0.15, details: {} },
    contract_explicitness: { score: 50, weight: 0.15, details: {} },
    decision_traceability: { score: 50, weight: 0.15, details: {} },
  };

  for (const [key, value] of Object.entries(overrides)) {
    defaults[key as DimensionName].score = value;
  }

  return defaults;
}

describe('composite score calculation', () => {
  it('should return 50 when all dimensions score 50', () => {
    const dimensions = makeDimensions();
    expect(calculateCompositeScore(dimensions)).toBe(50);
  });

  it('should return 100 when all dimensions score 100', () => {
    const dimensions = makeDimensions({
      documentation_coverage: 100,
      type_coverage: 100,
      convention_consistency: 100,
      test_narration: 100,
      context_budget_efficiency: 100,
      architecture_clarity: 100,
      contract_explicitness: 100,
      decision_traceability: 100,
    });
    expect(calculateCompositeScore(dimensions)).toBe(100);
  });

  it('should return 0 when all dimensions score 0', () => {
    const dimensions = makeDimensions({
      documentation_coverage: 0,
      type_coverage: 0,
      convention_consistency: 0,
      test_narration: 0,
      context_budget_efficiency: 0,
      architecture_clarity: 0,
      contract_explicitness: 0,
      decision_traceability: 0,
    });
    expect(calculateCompositeScore(dimensions)).toBe(0);
  });

  it('should weight 15% dimensions more heavily than 10% dimensions', () => {
    // High score only on 15%-weight dimensions
    const highWeighted = makeDimensions({
      documentation_coverage: 100,
      architecture_clarity: 100,
      decision_traceability: 100,
      contract_explicitness: 100,
      type_coverage: 0,
      convention_consistency: 0,
      test_narration: 0,
      context_budget_efficiency: 0,
    });

    // High score only on 10%-weight dimensions
    const highLight = makeDimensions({
      documentation_coverage: 0,
      architecture_clarity: 0,
      decision_traceability: 0,
      contract_explicitness: 0,
      type_coverage: 100,
      convention_consistency: 100,
      test_narration: 100,
      context_budget_efficiency: 100,
    });

    expect(calculateCompositeScore(highWeighted)).toBeGreaterThan(calculateCompositeScore(highLight));
  });

  it('should clamp dimension scores to 0-100 before weighting', () => {
    const dimensions = makeDimensions({ documentation_coverage: 150 });
    const score = calculateCompositeScore(dimensions);
    // 150 clamped to 100, so same as if it were 100
    const expected = makeDimensions({ documentation_coverage: 100 });
    expect(score).toBe(calculateCompositeScore(expected));
  });

  it('should round the composite to the nearest integer', () => {
    const score = calculateCompositeScore(makeDimensions());
    expect(score).toBe(Math.round(score));
  });
});

describe('weight overrides', () => {
  it('should normalize custom weights to sum to 1.0', () => {
    const profile = applyWeightOverrides({ type_coverage: 50 });
    const sum = Object.values(profile.weights).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1.0, 5);
  });

  it('should increase the relative importance of overridden dimensions', () => {
    const profile = applyWeightOverrides({ type_coverage: 80 });
    expect(profile.weights.type_coverage).toBeGreaterThan(DEFAULT_PROFILE.weights.type_coverage);
  });
});

describe('recommendation generation', () => {
  it('should not recommend dimensions scoring 75 or above', () => {
    const dimensions = makeDimensions({
      documentation_coverage: 90,
      type_coverage: 80,
      convention_consistency: 75,
      test_narration: 30,
    });
    const recs = generateRecommendations(dimensions);
    const recDimensions = recs.map(r => r.dimension);
    expect(recDimensions).not.toContain('documentation_coverage');
    expect(recDimensions).not.toContain('type_coverage');
    expect(recDimensions).not.toContain('convention_consistency');
  });

  it('should mark scores below 40 as high priority', () => {
    const dimensions = makeDimensions({ test_narration: 20 });
    const recs = generateRecommendations(dimensions);
    const testRec = recs.find(r => r.dimension === 'test_narration');
    expect(testRec?.priority).toBe('high');
  });

  it('should sort recommendations by priority then by score ascending', () => {
    const dimensions = makeDimensions({
      documentation_coverage: 30,
      type_coverage: 60,
      test_narration: 20,
      decision_traceability: 55,
    });
    const recs = generateRecommendations(dimensions);
    const priorities = recs.map(r => r.priority);
    // All highs should come before mediums, mediums before lows
    const order = { high: 0, medium: 1, low: 2 };
    for (let i = 1; i < priorities.length; i++) {
      expect(order[priorities[i]]).toBeGreaterThanOrEqual(order[priorities[i - 1]]);
    }
  });

  it('should include an actionable suggestion for each recommendation', () => {
    const dimensions = makeDimensions({ documentation_coverage: 10 });
    const recs = generateRecommendations(dimensions);
    for (const rec of recs) {
      expect(rec.action.length).toBeGreaterThan(0);
      expect(rec.message.length).toBeGreaterThan(0);
    }
  });
});
