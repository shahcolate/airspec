/**
 * Plugin architecture interface for language-specific analyzers.
 */
import type { DimensionName, DimensionResult, ProjectProfile } from '../types.js';

/** Interface that all language analyzers must implement */
export interface LanguageAnalyzer {
  /** Analyze all dimensions for the detected project */
  analyze(projectDir: string, profile: ProjectProfile): Promise<Record<DimensionName, DimensionResult>>;
}
