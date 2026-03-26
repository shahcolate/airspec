/**
 * TypeScript/JavaScript analyzer entry point.
 * Orchestrates all 8 dimension analyzers.
 */
import type { DimensionName, DimensionResult, ProjectProfile } from '../../types.js';
import type { LanguageAnalyzer } from '../interfaces.js';
import { walkSourceFiles } from '../utils/file-walker.js';
import { analyzeDocCoverage } from './doc-coverage.js';
import { analyzeTypeCoverage } from './type-coverage.js';
import { analyzeConventions } from './conventions.js';
import { analyzeTestNarration } from './test-narration.js';
import { analyzeContextBudget } from './context-budget.js';
import { analyzeArchitecture } from './architecture.js';
import { analyzeContracts } from './contracts.js';
import { analyzeDecisions } from './decisions.js';

/**
 * TypeScript/JavaScript language analyzer implementing all 8 scoring dimensions.
 */
export class TypeScriptAnalyzer implements LanguageAnalyzer {
  /**
   * Run all 8 dimension analyzers against the given project.
   */
  async analyze(
    projectDir: string,
    profile: ProjectProfile
  ): Promise<Record<DimensionName, DimensionResult>> {
    const sourceFiles = await walkSourceFiles(projectDir);

    // Run analyzers in parallel where possible
    const [
      docCoverage,
      typeCoverage,
      conventions,
      testNarration,
      contextBudget,
      architecture,
      contracts,
      decisions,
    ] = await Promise.all([
      safeAnalyze('documentation_coverage', () => analyzeDocCoverage(projectDir, sourceFiles)),
      safeAnalyze('type_coverage', () => analyzeTypeCoverage(projectDir, sourceFiles)),
      safeAnalyze('convention_consistency', () => analyzeConventions(projectDir, sourceFiles)),
      safeAnalyze('test_narration', () => analyzeTestNarration(projectDir, profile.testPatterns)),
      safeAnalyze('context_budget_efficiency', () => analyzeContextBudget(projectDir, sourceFiles)),
      safeAnalyze('architecture_clarity', () => analyzeArchitecture(projectDir, sourceFiles)),
      safeAnalyze('contract_explicitness', () => analyzeContracts(projectDir, sourceFiles)),
      safeAnalyze('decision_traceability', () => analyzeDecisions(projectDir, sourceFiles)),
    ]);

    return {
      documentation_coverage: docCoverage,
      type_coverage: typeCoverage,
      convention_consistency: conventions,
      test_narration: testNarration,
      context_budget_efficiency: contextBudget,
      architecture_clarity: architecture,
      contract_explicitness: contracts,
      decision_traceability: decisions,
    };
  }
}

/**
 * Safely run an analyzer, returning a zero-score result if it throws.
 */
async function safeAnalyze(
  dimension: DimensionName,
  fn: () => Promise<DimensionResult>
): Promise<DimensionResult> {
  try {
    return await fn();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      score: 0,
      weight: 0,
      details: {
        error: `Analyzer failed: ${message}`,
      },
    };
  }
}
