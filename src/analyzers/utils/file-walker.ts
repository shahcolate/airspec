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
 * Convert a single .gitignore line to equivalent glob ignore patterns.
 *
 * gitignore and glob have different semantics, so a literal pass-through
 * gets several common cases wrong. The rules applied here:
 * - `!negations` are skipped (re-including files is not supported)
 * - a leading `/` anchors to the project root, so it is stripped
 * - a pattern without a slash matches at any depth, so it gets a `**\/` prefix
 * - a trailing `/` means "directory" — expanded to also exclude its contents
 * - a bare name can be a file OR a directory, so both variants are produced
 *
 * Returns an empty array for lines that produce no usable pattern.
 */
export function gitignoreLineToGlob(line: string): string[] {
  let pattern = line.trim();
  if (!pattern || pattern.startsWith('#') || pattern.startsWith('!')) {
    return [];
  }

  if (pattern.startsWith('/')) {
    pattern = pattern.slice(1);
  } else if (!pattern.slice(0, -1).includes('/')) {
    // No slash (ignoring a trailing one): matches at any depth per gitignore
    pattern = `**/${pattern}`;
  }

  if (pattern.endsWith('/')) {
    return [`${pattern}**`];
  }
  // Could name a file or a directory — exclude both the entry and any contents
  return [pattern, `${pattern}/**`];
}

/**
 * Read an ignore file (gitignore syntax) and return glob ignore patterns.
 * Returns an empty array if the file doesn't exist or can't be read.
 */
function readIgnoreFile(filePath: string): string[] {
  let content: string;
  try {
    content = fs.readFileSync(filePath, 'utf-8');
  } catch {
    return [];
  }
  return content.split('\n').flatMap(gitignoreLineToGlob);
}

/**
 * Collect all ignore patterns for a project: built-in exclusions plus
 * .gitignore and .airspecignore contents translated to glob syntax.
 */
function collectIgnorePatterns(projectDir: string): string[] {
  return [
    ...ALWAYS_EXCLUDE,
    ...readIgnoreFile(path.join(projectDir, '.gitignore')),
    ...readIgnoreFile(path.join(projectDir, '.airspecignore')),
  ];
}

/**
 * Walk source files in a project directory.
 * Returns file paths relative to the project root.
 *
 * Important: always respects .gitignore and .airspecignore. Never returns
 * files from node_modules, dist, build, .git, or .airspec directories.
 * Constraint: returned paths must be relative to projectDir, never absolute.
 */
export async function walkSourceFiles(projectDir: string): Promise<string[]> {
  const pattern = `**/*.{${SOURCE_EXTENSIONS.join(',')}}`;

  const files = await glob(pattern, {
    cwd: projectDir,
    ignore: collectIgnorePatterns(projectDir),
    nodir: true,
    dot: false,
    posix: true,
  });

  return files.sort();
}

/**
 * Walk all files in a project (not just source), respecting exclusions.
 * Useful for detecting config files, docs, etc.
 */
export async function walkAllFiles(projectDir: string): Promise<string[]> {
  const ignorePatterns = [
    ...ALWAYS_EXCLUDE,
    ...readIgnoreFile(path.join(projectDir, '.gitignore')),
  ];

  const files = await glob('**/*', {
    cwd: projectDir,
    ignore: ignorePatterns,
    nodir: true,
    dot: true,
    posix: true,
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
      posix: true,
    });
    allTests.push(...files);
  }
  return [...new Set(allTests)].sort();
}
