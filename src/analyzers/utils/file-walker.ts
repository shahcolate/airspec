/**
 * Walks source files in a project directory, respecting .gitignore and common exclusions.
 */
import { glob } from 'glob';
import * as fs from 'node:fs';
import * as path from 'node:path';

/** Directories always excluded from analysis */
const ALWAYS_EXCLUDE = [
  'node_modules/**',
  'dist/**',
  'build/**',
  'out/**',
  '.next/**',
  '.nuxt/**',
  'coverage/**',
  '.git/**',
  '.airspec/**',
  '**/*.min.js',
  '**/*.bundle.js',
  '**/*.map',
  '**/package-lock.json',
  '**/yarn.lock',
  '**/pnpm-lock.yaml',
  '**/bun.lockb',
];

/** Source file extensions to include */
const SOURCE_EXTENSIONS = ['ts', 'tsx', 'js', 'jsx', 'mts', 'mjs', 'cts', 'cjs'];

/**
 * Walk source files in a project directory.
 * Returns file paths relative to the project root.
 */
export async function walkSourceFiles(projectDir: string): Promise<string[]> {
  const ignorePatterns = [...ALWAYS_EXCLUDE];

  // Read .gitignore if present
  const gitignorePath = path.join(projectDir, '.gitignore');
  if (fs.existsSync(gitignorePath)) {
    const gitignoreContent = fs.readFileSync(gitignorePath, 'utf-8');
    const lines = gitignoreContent
      .split('\n')
      .map(l => l.trim())
      .filter(l => l && !l.startsWith('#'));
    ignorePatterns.push(...lines);
  }

  // Read .airspecignore if present
  const airspecIgnorePath = path.join(projectDir, '.airspecignore');
  if (fs.existsSync(airspecIgnorePath)) {
    const content = fs.readFileSync(airspecIgnorePath, 'utf-8');
    const lines = content
      .split('\n')
      .map(l => l.trim())
      .filter(l => l && !l.startsWith('#'));
    ignorePatterns.push(...lines);
  }

  const pattern = `**/*.{${SOURCE_EXTENSIONS.join(',')}}`;

  const files = await glob(pattern, {
    cwd: projectDir,
    ignore: ignorePatterns,
    nodir: true,
    dot: false,
  });

  return files.sort();
}

/**
 * Walk all files in a project (not just source), respecting exclusions.
 * Useful for detecting config files, docs, etc.
 */
export async function walkAllFiles(projectDir: string): Promise<string[]> {
  const ignorePatterns = [...ALWAYS_EXCLUDE];

  const gitignorePath = path.join(projectDir, '.gitignore');
  if (fs.existsSync(gitignorePath)) {
    const gitignoreContent = fs.readFileSync(gitignorePath, 'utf-8');
    const lines = gitignoreContent
      .split('\n')
      .map(l => l.trim())
      .filter(l => l && !l.startsWith('#'));
    ignorePatterns.push(...lines);
  }

  const files = await glob('**/*', {
    cwd: projectDir,
    ignore: ignorePatterns,
    nodir: true,
    dot: true,
  });

  return files.sort();
}

/**
 * Walk test files based on detected patterns.
 */
export async function walkTestFiles(
  projectDir: string,
  patterns: string[]
): Promise<string[]> {
  const allTests: string[] = [];
  for (const pattern of patterns) {
    const files = await glob(pattern, {
      cwd: projectDir,
      ignore: ALWAYS_EXCLUDE,
      nodir: true,
    });
    allTests.push(...files);
  }
  return [...new Set(allTests)].sort();
}
