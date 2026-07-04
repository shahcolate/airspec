#!/usr/bin/env node
/**
 * airspec CLI entry point.
 * AI Readability Score — Lighthouse, but for how well AI agents can understand your repo.
 */
import { Command } from 'commander';
import { VERSION } from '../version.js';
import { runScore } from './commands/score.js';
import { InvalidOptionError, parseMinScore, parseWeights } from './options.js';

const program = new Command();

program
  .name('airspec')
  .description('AI Readability Score — Lighthouse, but for how well AI agents can understand your repo')
  .version(VERSION);

program
  .command('score')
  .description('Score your codebase\'s AI readability')
  .option('--json', 'Output raw JSON to stdout', false)
  .option('--ci', 'CI mode: JSON output, exit 1 if below threshold', false)
  .option('--min-score <score>', 'Minimum score threshold (used with --ci)')
  .option('--dir <path>', 'Directory to score', '.')
  .option('--weights <pairs>', 'Custom weights as key=value pairs (e.g., type_coverage=20,test_narration=5)')
  .action(async (opts: { json: boolean; ci: boolean; minScore?: string; dir: string; weights?: string }) => {
    const weights = opts.weights ? parseWeights(opts.weights) : null;
    const minScore = opts.minScore !== undefined ? parseMinScore(opts.minScore) : null;

    if (minScore !== null && !opts.ci) {
      console.error('Warning: --min-score has no effect without --ci; the threshold will not be enforced.');
    }

    await runScore({
      dir: opts.dir,
      json: opts.json,
      ci: opts.ci,
      minScore,
      weights,
    });
  });

try {
  await program.parseAsync(process.argv);
} catch (error) {
  // Validation problems get a clean one-line message; anything else is a bug,
  // so keep the stack trace to make reports actionable.
  if (error instanceof InvalidOptionError) {
    console.error(`airspec: ${error.message}`);
  } else {
    console.error('airspec: unexpected error');
    console.error(error);
  }
  process.exitCode = 1;
}
