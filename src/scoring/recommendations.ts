/**
 * Generate actionable recommendations from dimension scores.
 */
import type { DimensionName, DimensionResult, Recommendation } from '../types.js';

/** Human-readable dimension labels */
const DIMENSION_LABELS: Record<DimensionName, string> = {
  documentation_coverage: 'Documentation Coverage',
  type_coverage: 'Type Coverage',
  convention_consistency: 'Convention Consistency',
  test_narration: 'Test Narration',
  context_budget_efficiency: 'Context Budget Efficiency',
  architecture_clarity: 'Architecture Clarity',
  contract_explicitness: 'Contract Explicitness',
  decision_traceability: 'Decision Traceability',
};

/**
 * Generate recommendations sorted by impact (lowest scores first, weighted by importance).
 */
export function generateRecommendations(
  dimensions: Record<DimensionName, DimensionResult>
): Recommendation[] {
  const recs: Recommendation[] = [];

  for (const [name, result] of Object.entries(dimensions)) {
    const dimName = name as DimensionName;
    const rec = buildRecommendation(dimName, result);
    if (rec) {
      recs.push(rec);
    }
  }

  // Sort by priority (high first), then by score (lowest first)
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  recs.sort((a, b) => {
    const pDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (pDiff !== 0) return pDiff;
    return (dimensions[a.dimension]?.score ?? 0) - (dimensions[b.dimension]?.score ?? 0);
  });

  return recs;
}

/**
 * Build a specific recommendation for a dimension based on its score and details.
 */
function buildRecommendation(
  name: DimensionName,
  result: DimensionResult
): Recommendation | null {
  // Only recommend for scores below 75
  if (result.score >= 75) return null;

  const priority = result.score < 40 ? 'high' : result.score < 60 ? 'medium' : 'low';
  const d = result.details;

  switch (name) {
    case 'documentation_coverage': {
      const undoc = (d.total_exports as number) - (d.documented_exports as number);
      return {
        dimension: name,
        priority,
        message: `${undoc} of ${d.total_exports} exported symbols lack JSDoc documentation. AI agents can't understand intent without docs.`,
        action: 'Add JSDoc comments to exported functions and types, starting with public API surfaces.',
        affected_count: undoc,
      };
    }

    case 'type_coverage': {
      const untypedParams = (d.total_params as number) - (d.typed_params as number);
      const anyCount = d.any_count as number;
      const msg = anyCount > 10
        ? `${anyCount} uses of \`any\` type found. ${untypedParams} parameters lack type annotations.`
        : `${untypedParams} function parameters lack explicit type annotations.`;
      return {
        dimension: name,
        priority,
        message: msg + ' AI agents rely on types to understand data flow.',
        action: 'Add explicit type annotations to function parameters and return types.',
        affected_count: untypedParams + anyCount,
      };
    }

    case 'convention_consistency':
      return {
        dimension: name,
        priority,
        message: 'Naming conventions are inconsistent across the codebase. AI agents struggle with inconsistent patterns.',
        action: 'Standardize naming: camelCase for functions/variables, PascalCase for classes/types, kebab-case for files.',
        affected_count: 0,
      };

    case 'test_narration': {
      const opaque = (d.opaque_tests as number) ?? 0;
      const total = d.total_tests as number;
      if (total === 0) {
        return {
          dimension: name,
          priority: 'high',
          message: 'No tests found. AI agents can\'t learn behavioral contracts without tests.',
          action: 'Add tests with descriptive names like "should reject expired tokens".',
          affected_count: 0,
        };
      }
      return {
        dimension: name,
        priority,
        message: `${opaque} tests use opaque names. AI agents can't learn behavioral contracts from tests.`,
        action: 'Use descriptive names: "should reject expired tokens" instead of "test1".',
        affected_count: opaque,
      };
    }

    case 'context_budget_efficiency': {
      const tokens = d.total_tokens as number;
      const noisePct = d.noise_ratio_pct as number;
      const tokenK = Math.round(tokens / 1000);
      return {
        dimension: name,
        priority,
        message: `~${tokenK}K tokens to represent this repo. ${noisePct}% is boilerplate/noise. AI agents waste context window on noise.`,
        action: 'Add .airspecignore for generated/vendored files. Mark generated files with header comments.',
        affected_count: Math.round(tokens * (noisePct / 100)),
      };
    }

    case 'architecture_clarity': {
      const bidir = d.bidirectional_edges as number;
      if (bidir > 0) {
        return {
          dimension: name,
          priority,
          message: `${bidir} circular import edges detected between modules. AI agents can't determine module boundaries.`,
          action: 'Refactor circular dependencies. Use dependency inversion or extract shared types.',
          affected_count: bidir,
        };
      }
      return {
        dimension: name,
        priority,
        message: 'Module structure lacks clarity. AI agents struggle to navigate the codebase.',
        action: 'Use domain-oriented directory names and add barrel exports (index.ts) for each module.',
        affected_count: 0,
      };
    }

    case 'contract_explicitness': {
      const crossModule = d.cross_module_imports as number;
      const typed = d.typed_cross_module_imports as number;
      const untyped = crossModule - typed;
      return {
        dimension: name,
        priority,
        message: `${untyped} cross-module imports use implementation types instead of explicit contracts.`,
        action: 'Create types.ts at module boundaries. Use `import type` for cross-module dependencies.',
        affected_count: untyped,
      };
    }

    case 'decision_traceability': {
      const genericPct = d.generic_commit_pct as number;
      if (genericPct > 50) {
        return {
          dimension: name,
          priority,
          message: `${genericPct}% of commits use generic messages ("fix", "update"). AI agents can't recover why decisions were made.`,
          action: 'Write commit messages that explain WHY, not just WHAT. Consider conventional commits.',
          affected_count: d.low_quality_commits as number,
        };
      }
      return {
        dimension: name,
        priority,
        message: 'Decision history is hard to trace. No ADRs or structured decision records found.',
        action: 'Create a docs/adr/ directory and document key architectural decisions.',
        affected_count: 0,
      };
    }
  }
}
