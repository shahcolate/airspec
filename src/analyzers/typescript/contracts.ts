/**
 * Dimension 7: Contract Explicitness
 * Measures cross-module type usage, shared type definitions, and invariant documentation.
 */
import ts from 'typescript';
import * as fs from 'node:fs';
import * as path from 'node:path';
import type { DimensionResult } from '../../types.js';
import { parseFile, extractImports } from '../utils/ast.js';

/** File names that indicate dedicated type definitions */
const TYPE_FILE_PATTERNS = [
  'types.ts', 'interfaces.ts', 'contracts.ts', 'types.d.ts',
  'types/index.ts', 'shared/types.ts',
];

/** Patterns indicating invariant/constraint documentation */
const INVARIANT_PATTERNS = [
  /\binvariant\b/i,
  /\bmust\b/i,
  /\bnever\b/i,
  /\balways\b/i,
  /\bconstraint\b/i,
  /\brequires\b/i,
  /\bensures\b/i,
  /@throws\b/,
  /@precondition\b/,
  /@postcondition\b/,
];

/**
 * Analyze contract explicitness.
 */
export async function analyzeContracts(
  projectDir: string,
  sourceFiles: string[]
): Promise<DimensionResult> {
  let crossModuleImports = 0;
  let typedCrossModuleImports = 0;
  let typeFileCount = 0;
  let invariantComments = 0;
  let totalModules = 0;

  // Identify modules
  const moduleSet = new Set<string>();
  for (const file of sourceFiles) {
    const parts = file.split('/');
    const startIdx = parts[0] === 'src' ? 1 : 0;
    if (parts.length > startIdx + 1) {
      moduleSet.add(parts[startIdx]);
    }
  }
  totalModules = moduleSet.size;

  // Check for type files
  for (const file of sourceFiles) {
    const basename = path.basename(file);
    if (TYPE_FILE_PATTERNS.some(p => file.endsWith(p) || basename === p)) {
      typeFileCount++;
    }
  }

  // Analyze imports and invariants
  let totalLines = 0;
  for (const file of sourceFiles) {
    const fullPath = path.join(projectDir, file);
    let content: string;
    try {
      content = fs.readFileSync(fullPath, 'utf-8');
    } catch {
      continue;
    }

    totalLines += content.split('\n').length;

    // Count invariant comments
    const comments = content.match(/\/\/.*|\/\*[\s\S]*?\*\//g) ?? [];
    for (const comment of comments) {
      if (INVARIANT_PATTERNS.some(p => p.test(comment))) {
        invariantComments++;
      }
    }

    // Analyze cross-module imports
    let sourceFile: ts.SourceFile;
    try {
      sourceFile = parseFile(fullPath);
    } catch {
      continue;
    }

    const parts = file.split('/');
    const startIdx = parts[0] === 'src' ? 1 : 0;
    if (parts.length <= startIdx + 1) continue;
    const fromModule = parts[startIdx];

    const imports = extractImports(sourceFile);
    for (const imp of imports) {
      if (!imp.path.startsWith('.')) continue;
      const resolved = path.resolve(path.dirname(fullPath), imp.path);
      const relative = path.relative(projectDir, resolved);
      const relParts = relative.split('/');
      const targetStartIdx = relParts[0] === 'src' ? 1 : 0;
      if (relParts.length <= targetStartIdx) continue;
      const toModule = relParts[targetStartIdx];

      if (fromModule !== toModule) {
        crossModuleImports++;
        if (imp.isTypeOnly) {
          typedCrossModuleImports++;
        }
      }
    }
  }

  // Cross-module type usage (40%)
  const typeUsageScore = crossModuleImports > 0
    ? Math.round((typedCrossModuleImports / crossModuleImports) * 100)
    : 80;

  // Shared type definitions (30%)
  const typeFileScore = totalModules > 0
    ? Math.min(100, Math.round((typeFileCount / Math.max(1, totalModules)) * 100))
    : 50;

  // Invariant documentation (30%)
  const linesPerK = totalLines / 1000;
  const invariantDensity = linesPerK > 0 ? invariantComments / linesPerK : 0;
  const invariantScore = Math.min(100, Math.round(invariantDensity * 20));

  const score = Math.round(
    typeUsageScore * 0.40 +
    typeFileScore * 0.30 +
    invariantScore * 0.30
  );

  return {
    score: Math.min(100, Math.max(0, score)),
    weight: 0.15,
    details: {
      cross_module_imports: crossModuleImports,
      typed_cross_module_imports: typedCrossModuleImports,
      type_files: typeFileCount,
      invariant_comments: invariantComments,
      total_modules: totalModules,
    },
  };
}
