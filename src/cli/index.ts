#!/usr/bin/env node
/**
 * airspec CLI entry point.
 * AI Readability Score — Lighthouse, but for how well AI agents can understand your repo.
 */
import { Command } from 'commander';
import { runScore } from './commands/score.js';

const program = new Command();

program
  .name('airspec')
  .description('AI Readability Score — Lighthouse, but for how well AI agents can understand your repo')
  .version('0.1.0');

program
  .command('score')
  .description('Score your codebase\'s AI readability')
  .option('--json', 'Output raw JSON to stdout', false)
  .option('--ci', 'CI mode: JSON output, exit 1 if below threshold', false)
  .option('--min-score <score>', 'Minimum score threshold (used with --ci)', parseFloat)
  .option('--dir <path>', 'Directory to score', '.')
  .option('--weights <pairs>', 'Custom weights as key=value pairs (e.g., type_coverage=20,test_narration=5)')
  .action(async (opts) => {
    const weights = opts.weights ? parseWeights(opts.weights) : null;
    await runScore({
      dir: opts.dir,
      json: opts.json,
      ci: opts.ci,
      minScore: opts.minScore ?? null,
      weights,
    });
  });

program.parse();

/**
 * Parse weight overrides from CLI string.
 */
function parseWeights(input: string): Record<string, number> {
  const weights: Record<string, number> = {};
  for (const pair of input.split(',')) {
    const [key, value] = pair.split('=');
    if (key && value) {
      weights[key.trim()] = parseFloat(value.trim());
    }
  }
  return weights;
}
