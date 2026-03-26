/**
 * Analyzer module — detects project type and runs dimension analysis.
 */
export { detectProject } from './project-detector.js';
export { TypeScriptAnalyzer } from './typescript/index.js';
export type { LanguageAnalyzer } from './interfaces.js';
