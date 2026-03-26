/**
 * Dimension 3: Convention Consistency
 * Measures naming, pattern, and file organization consistency.
 */
import ts from 'typescript';
import * as fs from 'node:fs';
import * as path from 'node:path';
import type { DimensionResult } from '../../types.js';
import { parseFile, collectExports, getNodeName } from '../utils/ast.js';

type NamingStyle = 'camelCase' | 'PascalCase' | 'snake_case' | 'SCREAMING_SNAKE' | 'kebab-case' | 'unknown';

/**
 * Classify a name into its naming convention style.
 */
function classifyName(name: string): NamingStyle {
  if (/^[A-Z][A-Z0-9_]*$/.test(name) && name.includes('_')) return 'SCREAMING_SNAKE';
  if (/^[A-Z][a-zA-Z0-9]*$/.test(name)) return 'PascalCase';
  if (/^[a-z][a-zA-Z0-9]*$/.test(name)) return 'camelCase';
  if (/^[a-z][a-z0-9_]*$/.test(name) && name.includes('_')) return 'snake_case';
  if (/^[a-z][a-z0-9-]*$/.test(name) && name.includes('-')) return 'kebab-case';
  return 'unknown';
}

/**
 * Score consistency within a group of names.
 */
function scoreConsistency(names: string[]): number {
  if (names.length <= 1) return 100;

  const styles = names.map(classifyName);
  const counts = new Map<NamingStyle, number>();
  for (const style of styles) {
    if (style !== 'unknown') {
      counts.set(style, (counts.get(style) ?? 0) + 1);
    }
  }

  if (counts.size === 0) return 50;
  const maxCount = Math.max(...counts.values());
  return Math.round((maxCount / names.length) * 100);
}

/**
 * Analyze convention consistency across all source files.
 */
export async function analyzeConventions(
  projectDir: string,
  sourceFiles: string[]
): Promise<DimensionResult> {
  const exportedFunctionNames: string[] = [];
  const exportedVarNames: string[] = [];
  const fileNames: string[] = [];

  for (const file of sourceFiles) {
    // Collect file names (without extension)
    const baseName = path.basename(file).replace(/\.[^.]+$/, '');
    fileNames.push(baseName);

    const fullPath = path.join(projectDir, file);
    let sourceFile: ts.SourceFile;
    try {
      sourceFile = parseFile(fullPath);
    } catch {
      continue;
    }

    const exports = collectExports(sourceFile);
    for (const exp of exports) {
      const name = getNodeName(exp);
      if (!name) continue;

      if (ts.isFunctionDeclaration(exp)) {
        exportedFunctionNames.push(name);
      } else if (ts.isVariableStatement(exp)) {
        exportedVarNames.push(name);
      }
    }
  }

  // Naming consistency (35%)
  const funcScore = scoreConsistency(exportedFunctionNames);
  const varScore = scoreConsistency(exportedVarNames);
  const fileScore = scoreConsistency(fileNames);
  const namingScore = Math.round((funcScore + varScore + fileScore) / 3);

  // Pattern consistency (35%) — check if similar files follow similar structure
  const patternFiles = sourceFiles.filter(f =>
    /\.(controller|service|repository|util|helper|model|middleware)\.(ts|js)$/.test(f)
  );
  const patternScore = patternFiles.length > 0
    ? Math.min(100, Math.round((patternFiles.length / sourceFiles.length) * 500))
    : 50; // neutral if no patterns detected

  // File organization consistency (30%)
  const topDirs = new Set<string>();
  for (const file of sourceFiles) {
    const parts = file.split('/');
    if (parts.length > 1) {
      topDirs.add(parts[0]);
    }
  }
  const domainDirs = [...topDirs].filter(d =>
    !['utils', 'helpers', 'misc', 'common', 'shared', 'lib', 'src', 'types'].includes(d)
  );
  const orgScore = topDirs.size > 0
    ? Math.round((domainDirs.length / topDirs.size) * 100)
    : 50;

  const score = Math.round(namingScore * 0.35 + patternScore * 0.35 + orgScore * 0.30);

  return {
    score: Math.min(100, Math.max(0, score)),
    weight: 0.10,
    details: {
      function_naming_score: funcScore,
      variable_naming_score: varScore,
      file_naming_score: fileScore,
      pattern_score: patternScore,
      organization_score: orgScore,
      exported_functions: exportedFunctionNames.length,
      exported_variables: exportedVarNames.length,
    },
  };
}
