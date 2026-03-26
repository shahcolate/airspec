/**
 * Dimension 2: Type Coverage
 * Measures explicit type annotations on function signatures.
 */
import ts from 'typescript';
import * as path from 'node:path';
import type { DimensionResult } from '../../types.js';
import { parseFile } from '../utils/ast.js';

/**
 * Analyze type coverage across all source files.
 */
export async function analyzeTypeCoverage(
  projectDir: string,
  sourceFiles: string[]
): Promise<DimensionResult> {
  let typedParams = 0;
  let totalParams = 0;
  let explicitReturns = 0;
  let totalFunctions = 0;
  let anyCount = 0;

  for (const file of sourceFiles) {
    const fullPath = path.join(projectDir, file);
    let sourceFile: ts.SourceFile;
    try {
      sourceFile = parseFile(fullPath);
    } catch {
      continue;
    }

    const fullText = sourceFile.getFullText();
    // Count 'any' usage
    const anyMatches = fullText.match(/\bany\b/g);
    if (anyMatches) {
      anyCount += anyMatches.length;
    }

    visitNode(sourceFile);

    function visitNode(node: ts.Node): void {
      if (
        ts.isFunctionDeclaration(node) ||
        ts.isMethodDeclaration(node) ||
        ts.isArrowFunction(node) ||
        ts.isFunctionExpression(node)
      ) {
        totalFunctions++;

        // Check return type
        if (node.type) {
          explicitReturns++;
        }

        // Check parameters
        for (const param of node.parameters) {
          totalParams++;
          if (param.type) {
            typedParams++;
          }
        }
      }

      ts.forEachChild(node, visitNode);
    }
  }

  if (totalFunctions === 0 && totalParams === 0) {
    return {
      score: 100,
      weight: 0.10,
      details: { typed_params: 0, total_params: 0, explicit_returns: 0, total_functions: 0, any_count: 0 },
    };
  }

  // Score based on typed params and explicit returns
  const paramScore = totalParams > 0 ? (typedParams / totalParams) * 100 : 100;
  const returnScore = totalFunctions > 0 ? (explicitReturns / totalFunctions) * 100 : 100;
  let score = Math.round((paramScore + returnScore) / 2);

  // Penalty for excessive `any` usage
  if (anyCount > 10) {
    score = Math.max(0, score - 15);
  }

  return {
    score: Math.min(100, Math.max(0, score)),
    weight: 0.10,
    details: {
      typed_params: typedParams,
      total_params: totalParams,
      explicit_returns: explicitReturns,
      total_functions: totalFunctions,
      any_count: anyCount,
    },
  };
}
