/**
 * `airspec score` command implementation.
 * The viral hook — must work flawlessly on any TS/JS repo with zero config.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import type { ScoreOptions, ScoreReport } from '../../types.js';
import { detectProject } from '../../analyzers/project-detector.js';
import { TypeScriptAnalyzer } from '../../analyzers/typescript/index.js';
import { calculateCompositeScore, applyWeightOverrides } from '../../scoring/calculator.js';
import { generateRecommendations } from '../../scoring/recommendations.js';
import { DEFAULT_PROFILE } from '../../scoring/profiles/default.js';
import { getRepoName } from '../../utils/git.js';
import { writeJson } from '../../utils/fs.js';
import { VERSION } from '../../version.js';
import { InvalidOptionError } from '../options.js';
import { renderScoreCard } from '../renderer.js';

/**
 * Execute the score command.
 */
export async function runScore(options: ScoreOptions): Promise<void> {
  const projectDir = path.resolve(options.dir);
  assertScorableDirectory(projectDir);

  // 1. Detect project
  const profile = await detectProject(projectDir);

  // 2. Run analyzers
  const analyzer = new TypeScriptAnalyzer();
  const dimensions = await analyzer.analyze(projectDir, profile);

  // 3. Apply weight overrides if any
  const scoringProfile = options.weights
    ? applyWeightOverrides(options.weights)
    : DEFAULT_PROFILE;

  // Apply correct weights to dimension results
  for (const [name, weight] of Object.entries(scoringProfile.weights)) {
    const dim = dimensions[name as keyof typeof dimensions];
    if (dim) {
      dim.weight = weight;
    }
  }

  // 4. Calculate composite score
  const compositeScore = calculateCompositeScore(dimensions, scoringProfile);

  // 5. Generate recommendations
  const recommendations = generateRecommendations(dimensions);

  // 6. Build report
  const repoName = await getRepoName(projectDir);
  const report: ScoreReport = {
    version: VERSION,
    timestamp: new Date().toISOString(),
    composite_score: compositeScore,
    profile: 'default-2026',
    repository: {
      name: repoName,
      language: profile.language,
      framework: profile.framework,
      source_files: profile.totalSourceFiles,
      total_tokens: (dimensions.context_budget_efficiency.details.total_tokens as number) ?? 0,
    },
    dimensions,
    recommendations,
  };

  // Important: always write score.json even in CI mode, because downstream
  // tools may read it for dashboard reporting regardless of exit code.
  // A failed write (read-only checkout, sandboxed CI) must not kill the run —
  // the report still goes to stdout.
  const outputPath = path.join(projectDir, '.airspec', 'score.json');
  try {
    writeJson(outputPath, report);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Warning: could not write ${outputPath}: ${message}`);
  }

  // Note: --json and --ci both produce JSON to stdout. The reason --ci exists
  // separately is for the exit code behavior — --json always exits 0.
  if (options.json || options.ci) {
    process.stdout.write(JSON.stringify(report, null, 2) + '\n');
  } else {
    console.log(renderScoreCard(report));
  }

  // CI mode: fail if below threshold. This must come last because the
  // score.json and stdout output should always be written regardless of
  // whether the threshold check passes. Setting exitCode (instead of calling
  // process.exit) lets Node flush stdout before exiting, so piped JSON is
  // never truncated.
  if (options.ci && options.minScore !== null && compositeScore < options.minScore) {
    console.error(
      `\nScore ${compositeScore} is below minimum threshold of ${options.minScore}`
    );
    process.exitCode = 1;
  }
}

/**
 * Fail fast with a clear message when --dir points somewhere unusable.
 */
function assertScorableDirectory(projectDir: string): void {
  let stat: fs.Stats;
  try {
    stat = fs.statSync(projectDir);
  } catch {
    throw new InvalidOptionError(`Directory not found: ${projectDir}`);
  }
  if (!stat.isDirectory()) {
    throw new InvalidOptionError(`Not a directory: ${projectDir}`);
  }
}
