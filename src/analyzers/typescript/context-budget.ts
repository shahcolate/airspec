/**
 * Dimension 5: Context Budget Efficiency
 * Measures signal-to-noise ratio of the codebase in terms of tokens.
 *
 * Context: AI models have finite context windows. A repo with 500K tokens of source
 * can't fit in a single prompt. This dimension measures how efficiently the codebase
 * uses that budget — less noise means more room for actual code in the context window.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import type { DimensionResult } from '../../types.js';
import { countTokens } from '../../utils/tokens.js';
import { walkSourceFiles } from '../utils/file-walker.js';

/** Patterns indicating generated/noise files */
const NOISE_PATTERNS = [
  /\.generated\./,
  /\.min\.(js|css)$/,
  /\.bundle\./,
  /\.d\.ts$/,
  /\.map$/,
];

/** Header patterns indicating auto-generated content */
const GENERATED_HEADERS = [
  /auto-generated/i,
  /do not edit/i,
  /@generated/i,
  /this file is generated/i,
];

/**
 * Analyze context budget efficiency.
 */
export async function analyzeContextBudget(
  projectDir: string,
  sourceFiles: string[]
): Promise<DimensionResult> {
  let totalTokens = 0;
  let noiseTokens = 0;
  let largeGeneratedFiles = 0;
  let hasAirspecIgnore = fs.existsSync(path.join(projectDir, '.airspecignore'));
  let hasGitignore = fs.existsSync(path.join(projectDir, '.gitignore'));

  for (const file of sourceFiles) {
    const fullPath = path.join(projectDir, file);
    let content: string;
    try {
      content = fs.readFileSync(fullPath, 'utf-8');
    } catch {
      continue;
    }

    const tokens = await countTokens(content);
    totalTokens += tokens;

    // Check if it's a noise file
    const isNoise = NOISE_PATTERNS.some(p => p.test(file));
    const hasGeneratedHeader = GENERATED_HEADERS.some(p => {
      const firstLines = content.substring(0, 500);
      return p.test(firstLines);
    });

    if (isNoise || hasGeneratedHeader) {
      noiseTokens += tokens;
    }

    // Check for large files without generated markers
    const lineCount = content.split('\n').length;
    if (lineCount > 1000 && !hasGeneratedHeader && !isNoise) {
      // Could be a large generated file without markers
      largeGeneratedFiles++;
    }
  }

  // Base score from total token count
  let score: number;
  if (totalTokens < 50000) {
    score = 90 + Math.round((1 - totalTokens / 50000) * 10);
  } else if (totalTokens < 100000) {
    score = 75 + Math.round(((100000 - totalTokens) / 50000) * 15);
  } else if (totalTokens < 200000) {
    score = 55 + Math.round(((200000 - totalTokens) / 100000) * 20);
  } else if (totalTokens < 500000) {
    score = 35 + Math.round(((500000 - totalTokens) / 300000) * 20);
  } else {
    score = 15 + Math.round(Math.max(0, (1000000 - totalTokens) / 500000) * 20);
  }

  // Bonus for having ignore files
  if (hasGitignore || hasAirspecIgnore) {
    score = Math.min(100, score + 10);
  }

  // Penalty for large unmarked generated files
  if (largeGeneratedFiles > 0) {
    score = Math.max(0, score - 10);
  }

  const signalTokens = totalTokens - noiseTokens;
  const noiseRatio = totalTokens > 0 ? Math.round((noiseTokens / totalTokens) * 100) : 0;

  return {
    score: Math.min(100, Math.max(0, score)),
    weight: 0.10,
    details: {
      total_tokens: totalTokens,
      signal_tokens: signalTokens,
      noise_tokens: noiseTokens,
      noise_ratio_pct: noiseRatio,
      large_unmarked_files: largeGeneratedFiles,
      has_gitignore: hasGitignore,
      has_airspecignore: hasAirspecIgnore,
    },
  };
}
