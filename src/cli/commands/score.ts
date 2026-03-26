/**
 * `airspec score` command implementation.
 * The viral hook — must work flawlessly on any TS/JS repo with zero config.
 */
import * as path from 'node:path';
import type { ScoreOptions, ScoreReport } from '../../types.js';
import { detectProject } from '../../analyzers/project-detector.js';
import { TypeScriptAnalyzer } from '../../analyzers/typescript/index.js';
import { calculateCompositeScore, applyWeightOverrides } from '../../scoring/calculator.js';
import { generateRecommendations } from '../../scoring/recommendations.js';
import { DEFAULT_PROFILE } from '../../scoring/profiles/default.js';
import { getRepoName } from '../../utils/git.js';
import { writeJson } from '../../utils/fs.js';
import { renderScoreCard } from '../renderer.js';

/**
 * Execute the score command.
 */
export async function runScore(options: ScoreOptions): Promise<void> {
  const projectDir = path.resolve(options.dir);

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
    version: '0.1.0',
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

  // 7. Write score.json
  const outputPath = path.join(projectDir, '.airspec', 'score.json');
  writeJson(outputPath, report);

  // 8. Output
  if (options.json || options.ci) {
    process.stdout.write(JSON.stringify(report, null, 2) + '\n');
  } else {
    console.log(renderScoreCard(report));
  }

  // 9. CI mode: exit with error if below threshold
  if (options.ci && options.minScore !== null && compositeScore < options.minScore) {
    console.error(
      `\nScore ${compositeScore} is below minimum threshold of ${options.minScore}`
    );
    process.exit(1);
  }
}
