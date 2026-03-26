/**
 * Dimension 8: Decision Traceability
 * Measures ADR presence, commit message quality, and code comment intent.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import type { DimensionResult } from '../../types.js';
import { isGitRepo, getCommitLog } from '../../utils/git.js';

/** Directories that indicate ADR presence */
const ADR_DIRS = [
  'docs/adr', 'docs/decisions', 'docs/architecture-decisions', 'adr',
];

/** Files that indicate decision documentation */
const DECISION_FILES = [
  'DECISIONS.md', 'ARCHITECTURE.md',
];

/** Patterns indicating high-quality commit messages */
const HIGH_QUALITY_PATTERNS = [
  /\bbecause\b/i,
  /\bso that\b/i,
  /\bto prevent\b/i,
  /\bdue to\b/i,
  /\bin order to\b/i,
  /\bthis fixes\b/i,
  /^(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert)\(.+\):/,
];

/** Patterns indicating intent-explaining comments */
const INTENT_PATTERNS = [
  /\bbecause\b/i,
  /\breason:/i,
  /\bwhy:/i,
  /\bnote:/i,
  /\bimportant:/i,
  /\bcontext:/i,
];

/**
 * Analyze decision traceability.
 */
export async function analyzeDecisions(
  projectDir: string,
  sourceFiles: string[]
): Promise<DimensionResult> {
  // 1. ADR presence (30%)
  let adrScore = 0;
  let adrEntries = 0;
  for (const dir of ADR_DIRS) {
    const fullDir = path.join(projectDir, dir);
    if (fs.existsSync(fullDir) && fs.statSync(fullDir).isDirectory()) {
      adrScore = 50;
      try {
        const entries = fs.readdirSync(fullDir).filter(f => f.endsWith('.md'));
        adrEntries = entries.length;
        if (entries.length >= 5) adrScore = 100;
      } catch {
        // ignore
      }
      break;
    }
  }
  for (const file of DECISION_FILES) {
    if (fs.existsSync(path.join(projectDir, file))) {
      adrScore = Math.max(adrScore, 50);
    }
  }

  // 2. Commit message quality (30%)
  let commitScore = 50; // default if git is not available
  let totalCommits = 0;
  let highQualityCommits = 0;
  let lowQualityCommits = 0;

  const hasGit = await isGitRepo(projectDir);
  if (hasGit) {
    try {
      const log = await getCommitLog(projectDir, 200);
      totalCommits = log.all.length;

      for (const commit of log.all) {
        const msg = commit.message + (commit.body ?? '');
        if (msg.length < 10 || /^(fix|update|wip|stuff|changes|test|tmp|temp)$/i.test(msg.trim())) {
          lowQualityCommits++;
        } else if (HIGH_QUALITY_PATTERNS.some(p => p.test(msg))) {
          highQualityCommits++;
        }
      }

      commitScore = totalCommits > 0
        ? Math.round((highQualityCommits / totalCommits) * 100)
        : 50;
    } catch {
      // git operations failed, use default score
    }
  }

  // 3. PR description quality (20%) — use merge commit message length as proxy
  let prScore = 50;
  if (hasGit) {
    try {
      const { createGit } = await import('../../utils/git.js');
      const git = createGit(projectDir);
      const mergeLog = await git.log({ maxCount: 50, '--merges': null } as Record<string, unknown>);
      if (mergeLog.all.length > 0) {
        const avgLength = mergeLog.all.reduce((sum, c) => sum + (c.message?.length ?? 0), 0) / mergeLog.all.length;
        prScore = Math.min(100, Math.round(avgLength / 2));
      }
    } catch {
      // skip
    }
  }

  // 4. Code comment intent (20%)
  let totalCodeLines = 0;
  let intentComments = 0;
  let bareTodos = 0;
  let explainedTodos = 0;

  for (const file of sourceFiles) {
    const fullPath = path.join(projectDir, file);
    let content: string;
    try {
      content = fs.readFileSync(fullPath, 'utf-8');
    } catch {
      continue;
    }

    const lines = content.split('\n');
    totalCodeLines += lines.length;

    const comments = content.match(/\/\/.*|\/\*[\s\S]*?\*\//g) ?? [];
    for (const comment of comments) {
      if (INTENT_PATTERNS.some(p => p.test(comment))) {
        intentComments++;
      }
      if (/\bTODO\b|\bFIXME\b/i.test(comment)) {
        if (comment.length > 20) {
          explainedTodos++;
        } else {
          bareTodos++;
        }
      }
    }
  }

  const linesPerK = totalCodeLines / 1000;
  const intentDensity = linesPerK > 0 ? intentComments / linesPerK : 0;
  const commentScore = Math.min(100, Math.round(intentDensity * 15));

  const score = Math.round(
    adrScore * 0.30 +
    commitScore * 0.30 +
    prScore * 0.20 +
    commentScore * 0.20
  );

  return {
    score: Math.min(100, Math.max(0, score)),
    weight: 0.15,
    details: {
      adr_present: adrScore > 0,
      adr_entries: adrEntries,
      total_commits: totalCommits,
      high_quality_commits: highQualityCommits,
      low_quality_commits: lowQualityCommits,
      generic_commit_pct: totalCommits > 0 ? Math.round((lowQualityCommits / totalCommits) * 100) : 0,
      intent_comments: intentComments,
      bare_todos: bareTodos,
      explained_todos: explainedTodos,
    },
  };
}
