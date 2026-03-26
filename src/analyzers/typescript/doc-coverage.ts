/**
 * Dimension 1: Documentation Coverage
 * Measures what percentage of exported symbols have JSDoc comments.
 */
import * as path from 'node:path';
import type { DimensionResult } from '../../types.js';
import { parseFile, collectExports, getJSDocComment, extractParamDescriptions, isTrivialParamDoc } from '../utils/ast.js';

/**
 * Analyze documentation coverage across all source files.
 */
export async function analyzeDocCoverage(
  projectDir: string,
  sourceFiles: string[]
): Promise<DimensionResult> {
  let totalExports = 0;
  let documentedExports = 0;
  let trivialDocs = 0;

  for (const file of sourceFiles) {
    const fullPath = path.join(projectDir, file);
    let sourceFile;
    try {
      sourceFile = parseFile(fullPath);
    } catch {
      continue;
    }

    const exports = collectExports(sourceFile);
    for (const exp of exports) {
      totalExports++;
      const jsDoc = getJSDocComment(exp, sourceFile);
      if (jsDoc) {
        documentedExports++;
        // Check for trivial docs
        const params = extractParamDescriptions(jsDoc);
        const trivialCount = params.filter(p => isTrivialParamDoc(p.name, p.description)).length;
        if (params.length > 0 && trivialCount === params.length) {
          trivialDocs++;
        }
      }
    }
  }

  if (totalExports === 0) {
    return {
      score: 100,
      weight: 0.15,
      details: { total_exports: 0, documented_exports: 0, trivial_docs: 0, coverage_pct: 100 },
    };
  }

  const coveragePct = (documentedExports / totalExports) * 100;
  const trivialRatio = totalExports > 0 ? trivialDocs / totalExports : 0;
  let score = Math.round(coveragePct);

  // Penalize if >20% of docs are trivial
  if (trivialRatio > 0.2) {
    score = Math.max(0, score - 10);
  }

  return {
    score: Math.min(100, Math.max(0, score)),
    weight: 0.15,
    details: {
      total_exports: totalExports,
      documented_exports: documentedExports,
      trivial_docs: trivialDocs,
      coverage_pct: Math.round(coveragePct * 100) / 100,
    },
  };
}
