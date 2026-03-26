/**
 * Default 2026 scoring weights for airspec dimensions.
 */
import type { ScoringProfile } from '../../types.js';

export const DEFAULT_PROFILE: ScoringProfile = {
  weights: {
    documentation_coverage: 0.15,
    architecture_clarity: 0.15,
    decision_traceability: 0.15,
    contract_explicitness: 0.15,
    convention_consistency: 0.10,
    context_budget_efficiency: 0.10,
    type_coverage: 0.10,
    test_narration: 0.10,
  },
};
