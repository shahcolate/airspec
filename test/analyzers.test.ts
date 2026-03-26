import { describe, it, expect } from 'vitest';
import * as path from 'node:path';
import * as fs from 'node:fs';
import * as os from 'node:os';
import { analyzeDocCoverage } from '../src/analyzers/typescript/doc-coverage.js';
import { analyzeTypeCoverage } from '../src/analyzers/typescript/type-coverage.js';
import { analyzeTestNarration } from '../src/analyzers/typescript/test-narration.js';

function createTempProject(files: Record<string, string>): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'airspec-test-'));
  for (const [filePath, content] of Object.entries(files)) {
    const full = path.join(dir, filePath);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, content);
  }
  return dir;
}

describe('documentation coverage analyzer', () => {
  it('should score 100 when all exports have JSDoc', async () => {
    const dir = createTempProject({
      'src/index.ts': `
/** Adds two numbers together. */
export function add(a: number, b: number): number { return a + b; }

/** A greeting message. */
export const greeting = "hello";
`,
    });
    const result = await analyzeDocCoverage(dir, ['src/index.ts']);
    expect(result.score).toBe(100);
    fs.rmSync(dir, { recursive: true });
  });

  it('should score 0 when no exports have JSDoc', async () => {
    const dir = createTempProject({
      'src/index.ts': `
export function add(a: number, b: number): number { return a + b; }
export const greeting = "hello";
`,
    });
    const result = await analyzeDocCoverage(dir, ['src/index.ts']);
    expect(result.score).toBe(0);
    fs.rmSync(dir, { recursive: true });
  });

  it('should return 50 for files with no ES module exports', async () => {
    const dir = createTempProject({
      'src/index.ts': `function internal() { return 1; }`,
    });
    const result = await analyzeDocCoverage(dir, ['src/index.ts']);
    expect(result.score).toBe(50);
    expect(result.details.note).toBe('no_es_exports_found');
    fs.rmSync(dir, { recursive: true });
  });

  it('should penalize trivial docs that just restate parameter names', async () => {
    const dir = createTempProject({
      'src/index.ts': [
        '/**',
        ' * @param a - the a',
        ' * @param b - the b',
        ' */',
        'export function add(a: number, b: number): number { return a + b; }',
        '/**',
        ' * @param name - the name',
        ' */',
        'export function greet(name: string): string { return name; }',
        '/**',
        ' * @param x - the x',
        ' */',
        'export function double(x: number): number { return x * 2; }',
      ].join('\n'),
    });
    const result = await analyzeDocCoverage(dir, ['src/index.ts']);
    // All docs are trivial, and >20% are trivial, so -10 penalty
    expect(result.score).toBeLessThan(100);
    fs.rmSync(dir, { recursive: true });
  });
});

describe('type coverage analyzer', () => {
  it('should score high when all function signatures are typed', async () => {
    const dir = createTempProject({
      'src/index.ts': `
export function add(a: number, b: number): number { return a + b; }
export function greet(name: string): string { return "hi " + name; }
`,
    });
    const result = await analyzeTypeCoverage(dir, ['src/index.ts']);
    expect(result.score).toBeGreaterThanOrEqual(85);
    fs.rmSync(dir, { recursive: true });
  });

  it('should not penalize inline arrow functions in callbacks', async () => {
    const dir = createTempProject({
      'src/index.ts': `
export function getNames(items: string[]): string[] {
  return items.map(x => x.toUpperCase()).filter(x => x.length > 0);
}
`,
    });
    const result = await analyzeTypeCoverage(dir, ['src/index.ts']);
    // The inline arrows should not count — only the named function
    expect(result.details.total_functions).toBe(1);
    fs.rmSync(dir, { recursive: true });
  });

  it('should count any types via AST not regex', async () => {
    const dir = createTempProject({
      'src/index.ts': `
// This comment mentions any but shouldn't count
const anything = "any string value";
export function process(data: any): any { return data; }
`,
    });
    const result = await analyzeTypeCoverage(dir, ['src/index.ts']);
    // Only the two type annotations should count, not "any" in comments or strings
    expect(result.details.any_count).toBe(2);
    fs.rmSync(dir, { recursive: true });
  });
});

describe('test narration analyzer', () => {
  it('should score high when tests use descriptive behavioral names', async () => {
    const dir = createTempProject({
      'src/math.test.ts': `
import { describe, it } from 'vitest';
describe('math utilities', () => {
  it('should return the sum of two positive numbers', () => {});
  it('should handle negative numbers correctly', () => {});
  it('should throw when dividing by zero', () => {});
  it('should round to the nearest integer when precision is 0', () => {});
});
`,
    });
    const result = await analyzeTestNarration(dir, ['**/*.test.ts']);
    expect(result.score).toBeGreaterThanOrEqual(60);
    expect(result.details.descriptive_tests).toBe(4);
    fs.rmSync(dir, { recursive: true });
  });

  it('should score 0 when no test files exist', async () => {
    const dir = createTempProject({
      'src/index.ts': 'export const x = 1;',
    });
    const result = await analyzeTestNarration(dir, ['**/*.test.ts']);
    expect(result.score).toBe(0);
    expect(result.details.total_tests).toBe(0);
    fs.rmSync(dir, { recursive: true });
  });
});
