/**
 * Core type definitions for airspec.
 * All shared interfaces and types used across the codebase.
 */

/** Supported dimension names for scoring */
export type DimensionName =
  | 'documentation_coverage'
  | 'type_coverage'
  | 'convention_consistency'
  | 'test_narration'
  | 'context_budget_efficiency'
  | 'architecture_clarity'
  | 'contract_explicitness'
  | 'decision_traceability';

/** Result of analyzing a single dimension */
export interface DimensionResult {
  score: number;
  weight: number;
  details: Record<string, unknown>;
}

/** Full score report for a repository */
export interface ScoreReport {
  version: string;
  timestamp: string;
  composite_score: number;
  profile: string;
  repository: RepositoryInfo;
  dimensions: Record<DimensionName, DimensionResult>;
  recommendations: Recommendation[];
}

/** Basic repository information */
export interface RepositoryInfo {
  name: string;
  language: 'typescript' | 'javascript' | 'mixed';
  framework: string | null;
  source_files: number;
  total_tokens: number;
}

/** Actionable recommendation based on scores */
export interface Recommendation {
  dimension: DimensionName;
  priority: 'high' | 'medium' | 'low';
  message: string;
  action: string;
  affected_count: number;
}

/** Scoring profile with dimension weights */
export interface ScoringProfile {
  weights: Record<DimensionName, number>;
}

/** Detected project configuration */
export interface ProjectProfile {
  language: 'typescript' | 'javascript' | 'mixed';
  framework: string | null;
  packageManager: 'npm' | 'yarn' | 'pnpm' | 'bun';
  testFramework: string | null;
  hasTypeScript: boolean;
  tsConfigPath: string | null;
  sourceRoots: string[];
  testPatterns: string[];
  totalSourceFiles: number;
}

/** Options for the score command */
export interface ScoreOptions {
  dir: string;
  json: boolean;
  ci: boolean;
  minScore: number | null;
  weights: Record<string, number> | null;
}

/** Architectural decision mined from git history */
export interface ArchitecturalDecision {
  id: string;
  title: string;
  date: string;
  evidence: DecisionEvidence[];
  implication: string;
  confidence: number;
}

/** Evidence for an architectural decision */
export interface DecisionEvidence {
  type: 'commit' | 'revert' | 'cochange';
  ref: string;
  excerpt: string;
}

/** Commit classification for archaeology */
export type CommitQuality = 'high' | 'medium' | 'low';

/** Parsed commit info */
export interface CommitInfo {
  hash: string;
  date: string;
  message: string;
  body: string;
  files: string[];
  quality: CommitQuality;
}

/** Co-change relationship between files */
export interface CochangePair {
  fileA: string;
  fileB: string;
  frequency: number;
  commitCount: number;
}

/** Drift detection result */
export interface DriftResult {
  type: 'convention' | 'architecture' | 'decision';
  severity: 'high' | 'medium' | 'low';
  description: string;
  file: string;
  suggestion: string;
}
