/**
 * Dimension 4: Test Narration Quality
 * Measures how descriptive and well-organized tests are.
 *
 * Context: AI agents use test names to learn behavioral contracts. A test named
 * "should reject expired tokens" teaches an agent what the function does and
 * what invariants it enforces. A test named "test1" teaches nothing.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import type { DimensionResult } from '../../types.js';
import { walkTestFiles } from '../utils/file-walker.js';

/**
 * Check if a test name is descriptive (behavioral).
 */
function isDescriptiveTestName(name: string): boolean {
  const behavioral = /\b(should|when|returns|throws|handles|creates|deletes|updates|renders|navigates|validates|rejects|accepts|emits|triggers)\b/i;
  if (behavioral.test(name)) return true;
  // At least 4 words indicates some descriptive intent
  const words = name.trim().split(/\s+/);
  return words.length >= 4;
}

/**
 * Analyze test narration quality.
 */
export async function analyzeTestNarration(
  projectDir: string,
  testPatterns: string[]
): Promise<DimensionResult> {
  const testFiles = await walkTestFiles(projectDir, testPatterns);

  if (testFiles.length === 0) {
    return {
      score: 0,
      weight: 0.10,
      details: {
        test_files: 0,
        total_tests: 0,
        descriptive_tests: 0,
        tests_in_describe: 0,
        describe_blocks: 0,
      },
    };
  }

  let totalTests = 0;
  let descriptiveTests = 0;
  let testsInDescribe = 0;
  let describeBlocks = 0;

  for (const file of testFiles) {
    const fullPath = path.join(projectDir, file);
    let content: string;
    try {
      content = fs.readFileSync(fullPath, 'utf-8');
    } catch {
      continue;
    }

    // Extract test names: test('name', ...) or it('name', ...)
    const testNameRegex = /\b(?:test|it)\s*\(\s*(['"`])(.*?)\1/g;
    let match: RegExpExecArray | null;
    while ((match = testNameRegex.exec(content)) !== null) {
      totalTests++;
      if (isDescriptiveTestName(match[2])) {
        descriptiveTests++;
      }
    }

    // Count describe blocks
    const describeRegex = /\bdescribe\s*\(/g;
    let descMatch: RegExpExecArray | null;
    while ((descMatch = describeRegex.exec(content)) !== null) {
      describeBlocks++;
    }

    // Estimate tests inside describe blocks (rough heuristic)
    const describeTestRegex = /describe\s*\([^)]*,\s*(?:function\s*\(\)|(?:\(\)\s*=>))\s*\{[^}]*\b(?:test|it)\s*\(/gs;
    let dtMatch: RegExpExecArray | null;
    while ((dtMatch = describeTestRegex.exec(content)) !== null) {
      // Count test/it calls inside each describe
      const testInBlock = (dtMatch[0].match(/\b(?:test|it)\s*\(/g) ?? []).length;
      testsInDescribe += testInBlock;
    }
  }

  if (totalTests === 0) {
    return {
      score: 0,
      weight: 0.10,
      details: { test_files: testFiles.length, total_tests: 0, descriptive_tests: 0, tests_in_describe: 0, describe_blocks: 0 },
    };
  }

  // Descriptive test names (40%)
  const nameScore = Math.round((descriptiveTests / totalTests) * 100);

  // Test organization — describe blocks (30%)
  // If most tests are in describes, good organization
  const orgScore = describeBlocks > 0
    ? Math.min(100, Math.round((testsInDescribe / totalTests) * 100))
    : 0;

  // Assertion messages (30%) — proxy: use descriptive matcher presence
  // We'll give a base score since this is hard to measure precisely
  const assertionScore = nameScore > 60 ? 60 : 30;

  const score = Math.round(nameScore * 0.40 + orgScore * 0.30 + assertionScore * 0.30);

  return {
    score: Math.min(100, Math.max(0, score)),
    weight: 0.10,
    details: {
      test_files: testFiles.length,
      total_tests: totalTests,
      descriptive_tests: descriptiveTests,
      tests_in_describe: testsInDescribe,
      describe_blocks: describeBlocks,
      opaque_tests: totalTests - descriptiveTests,
    },
  };
}
