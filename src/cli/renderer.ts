/**
 * Terminal output rendering for the airspec score card.
 * Uses Unicode box-drawing characters and chalk colors.
 */
import chalk from 'chalk';
import type { DimensionName, DimensionResult, Recommendation, ScoreReport } from '../types.js';

/** Display order and labels for dimensions */
const DIMENSION_DISPLAY: Array<{ key: DimensionName; label: string }> = [
  { key: 'documentation_coverage', label: 'Documentation Coverage' },
  { key: 'architecture_clarity', label: 'Architecture Clarity' },
  { key: 'decision_traceability', label: 'Decision Traceability' },
  { key: 'contract_explicitness', label: 'Contract Explicitness' },
  { key: 'convention_consistency', label: 'Convention Consistency' },
  { key: 'context_budget_efficiency', label: 'Context Budget Efficiency' },
  { key: 'type_coverage', label: 'Type Coverage' },
  { key: 'test_narration', label: 'Test Narration' },
];

/**
 * Render the full score card to the terminal.
 */
export function renderScoreCard(report: ScoreReport): string {
  const lines: string[] = [];
  const width = 52;

  const border = chalk.gray;
  const top = border(`  ┌${'─'.repeat(width)}┐`);
  const bottom = border(`  └${'─'.repeat(width)}┘`);
  const side = (content: string): string => {
    // Strip ANSI for length calculation
    const stripped = stripAnsi(content);
    const padding = width - stripped.length;
    return border('  │') + ' ' + content + ' '.repeat(Math.max(0, padding - 1)) + border('│');
  };
  const empty = side(' '.repeat(width - 2));

  // Header
  lines.push('');
  lines.push(top);
  lines.push(empty);
  lines.push(side(`  ${chalk.cyan.bold('airspec')} ${chalk.white('— AI Readability Score')}`));
  lines.push(empty);

  // Composite score
  const scoreColor = getScoreColor(report.composite_score);
  lines.push(side(`             ${scoreColor(String(report.composite_score))} ${chalk.gray('/ 100')}`));

  // Progress bar for composite
  const compositeBar = renderBar(report.composite_score, 15);
  lines.push(side(`  ${compositeBar}`));
  lines.push(empty);

  // Dimension rows
  for (const dim of DIMENSION_DISPLAY) {
    const result = report.dimensions[dim.key];
    if (!result) continue;

    const score = result.score;
    const scoreStr = String(score).padStart(3);
    const color = getScoreColor(score);
    const bar = renderBar(score, 10);
    const warning = score < 50 ? chalk.yellow(' ⚠') : '  ';
    const label = dim.label.padEnd(28);

    lines.push(side(`  ${chalk.white(label)}${color(scoreStr)}  ${bar}${warning}`));
  }

  lines.push(empty);
  lines.push(bottom);

  // Recommendations
  const highPriorityRecs = report.recommendations.filter(r => r.priority === 'high' || r.priority === 'medium');
  if (highPriorityRecs.length > 0) {
    lines.push('');
    lines.push(`  ${chalk.yellow('⚠')} ${chalk.white.bold(`${highPriorityRecs.length} area${highPriorityRecs.length > 1 ? 's' : ''} need${highPriorityRecs.length === 1 ? 's' : ''} attention:`)}`);
    lines.push('');

    for (let i = 0; i < Math.min(5, highPriorityRecs.length); i++) {
      const rec = highPriorityRecs[i];
      const dimResult = report.dimensions[rec.dimension];
      const dimLabel = DIMENSION_DISPLAY.find(d => d.key === rec.dimension)?.label ?? rec.dimension;
      const scoreColor = getScoreColor(dimResult?.score ?? 0);

      lines.push(`  ${chalk.white.bold(`${i + 1}.`)} ${chalk.white.bold(dimLabel)} ${scoreColor(`(${dimResult?.score ?? 0}/100)`)}`);
      lines.push(`     ${chalk.gray(rec.message)}`);
      lines.push(`     ${chalk.cyan('→')} ${rec.action}`);
      lines.push('');
    }
  }

  return lines.join('\n');
}

/**
 * Render a progress bar.
 */
function renderBar(score: number, width: number): string {
  const filled = Math.round((score / 100) * width);
  const empty = width - filled;
  return chalk.cyan('█'.repeat(filled)) + chalk.gray('░'.repeat(empty));
}

/**
 * Get the chalk color function for a score value.
 */
function getScoreColor(score: number): (text: string) => string {
  if (score >= 75) return chalk.green;
  if (score >= 50) return chalk.yellow;
  return chalk.red;
}

/**
 * Strip ANSI escape codes from a string for length calculation.
 */
function stripAnsi(str: string): string {
  // eslint-disable-next-line no-control-regex
  return str.replace(/\x1b\[[0-9;]*m/g, '');
}
