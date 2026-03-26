/**
 * Dimension 2: Type Coverage
 * Measures explicit type annotations on function signatures.
 *
 * Important: we only count "signature-level" functions — named declarations,
 * methods, and variable-assigned arrows. Inline callbacks like .map(x => x+1)
 * are excluded because TypeScript infers their types from context, and
 * requiring annotations there would penalize idiomatic code.
 */
import ts from 'typescript';
import * as path from 'node:path';
import type { DimensionResult } from '../../types.js';
import { parseFile } from '../utils/ast.js';

/**
 * Check if a function node is a top-level or exported function signature
 * (not an inline callback or arrow function inside an expression).
 */
function isSignatureLevelFunction(node: ts.Node): boolean {
  // Named function declarations and method declarations always count
  if (ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node)) {
    return true;
  }

  // Arrow functions and function expressions only count if they're
  // assigned to a variable declaration (const handler = () => {})
  // not inline callbacks like .map(x => x + 1)
  if (ts.isArrowFunction(node) || ts.isFunctionExpression(node)) {
    const parent = node.parent;
    return !!parent && ts.isVariableDeclaration(parent);
  }

  return false;
}

/**
 * Count actual `any` type annotations in the AST, not regex matches.
 */
function countAnyTypes(sourceFile: ts.SourceFile): number {
  let count = 0;

  function visit(node: ts.Node): void {
    // Match `: any` type annotations
    if (node.kind === ts.SyntaxKind.AnyKeyword) {
      // Only count if it's actually a type annotation (parent is a type context)
      const parent = node.parent;
      if (
        parent &&
        (ts.isTypeReferenceNode(parent) ||
         ts.isParameter(parent) ||
         ts.isVariableDeclaration(parent) ||
         ts.isPropertyDeclaration(parent) ||
         ts.isPropertySignature(parent) ||
         ts.isFunctionDeclaration(parent) ||
         ts.isMethodDeclaration(parent) ||
         ts.isArrowFunction(parent) ||
         ts.isFunctionExpression(parent) ||
         ts.isTypeAliasDeclaration(parent) ||
         ts.isAsExpression(parent) ||
         ts.isArrayTypeNode(parent) ||
         ts.isUnionTypeNode(parent) ||
         ts.isIntersectionTypeNode(parent) ||
         ts.isParenthesizedTypeNode(parent) ||
         ts.isIndexSignatureDeclaration(parent))
      ) {
        count++;
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return count;
}

/**
 * Analyze type coverage across all source files.
 * Focuses on function signatures (not inline callbacks) per spec.
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

    // Count `any` via AST, not regex
    anyCount += countAnyTypes(sourceFile);

    visitNode(sourceFile);

    function visitNode(node: ts.Node): void {
      if (isSignatureLevelFunction(node) && (
        ts.isFunctionDeclaration(node) ||
        ts.isMethodDeclaration(node) ||
        ts.isArrowFunction(node) ||
        ts.isFunctionExpression(node)
      )) {
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
