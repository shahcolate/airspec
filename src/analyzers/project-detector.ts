/**
 * Auto-detects project language, framework, package manager, and other metadata.
 * Works with zero configuration.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import type { ProjectProfile } from '../types.js';
import { walkSourceFiles } from './utils/file-walker.js';

/** Framework detection rules: dependency name → framework label */
const FRAMEWORK_DETECTORS: Array<{ dep: string; label: string }> = [
  { dep: 'next', label: 'next' },
  { dep: '@nestjs/core', label: 'nest' },
  { dep: 'fastify', label: 'fastify' },
  { dep: 'express', label: 'express' },
  { dep: 'hono', label: 'hono' },
  { dep: 'koa', label: 'koa' },
  { dep: 'react', label: 'react' },
  { dep: 'vue', label: 'vue' },
  { dep: 'svelte', label: 'svelte' },
  { dep: '@angular/core', label: 'angular' },
  { dep: 'remix', label: 'remix' },
  { dep: 'astro', label: 'astro' },
  { dep: 'electron', label: 'electron' },
];

/** Test framework detection: dependency name → label */
const TEST_FRAMEWORK_DETECTORS: Array<{ dep: string; label: string; patterns: string[] }> = [
  { dep: 'vitest', label: 'vitest', patterns: ['**/*.test.ts', '**/*.test.tsx', '**/*.spec.ts', '**/*.spec.tsx'] },
  { dep: 'jest', label: 'jest', patterns: ['**/*.test.ts', '**/*.test.tsx', '**/*.test.js', '**/*.test.jsx', '**/*.spec.ts', '**/*.spec.js'] },
  { dep: 'mocha', label: 'mocha', patterns: ['test/**/*.ts', 'test/**/*.js', '**/*.spec.ts', '**/*.spec.js'] },
  { dep: 'playwright', label: 'playwright', patterns: ['**/*.spec.ts', 'tests/**/*.ts', 'e2e/**/*.ts'] },
  { dep: '@testing-library/react', label: 'testing-library', patterns: ['**/*.test.tsx', '**/*.test.ts'] },
];

/**
 * Detect the project profile for a given directory.
 */
export async function detectProject(projectDir: string): Promise<ProjectProfile> {
  const pkgJsonPath = path.join(projectDir, 'package.json');
  let pkgJson: Record<string, unknown> = {};
  if (fs.existsSync(pkgJsonPath)) {
    pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf-8'));
  }

  const deps = {
    ...(pkgJson.dependencies as Record<string, string> ?? {}),
    ...(pkgJson.devDependencies as Record<string, string> ?? {}),
  };

  const hasTypeScript = fs.existsSync(path.join(projectDir, 'tsconfig.json'));
  const tsConfigPath = hasTypeScript ? path.join(projectDir, 'tsconfig.json') : null;

  // Detect language
  const sourceFiles = await walkSourceFiles(projectDir);
  const tsFiles = sourceFiles.filter(f => /\.(ts|tsx|mts|cts)$/.test(f));
  const jsFiles = sourceFiles.filter(f => /\.(js|jsx|mjs|cjs)$/.test(f));

  let language: 'typescript' | 'javascript' | 'mixed';
  if (tsFiles.length > 0 && jsFiles.length === 0) {
    language = 'typescript';
  } else if (tsFiles.length === 0 && jsFiles.length > 0) {
    language = 'javascript';
  } else if (tsFiles.length > jsFiles.length) {
    language = hasTypeScript ? 'typescript' : 'mixed';
  } else {
    language = hasTypeScript ? 'mixed' : 'javascript';
  }

  // Detect framework
  let framework: string | null = null;
  for (const detector of FRAMEWORK_DETECTORS) {
    if (deps[detector.dep]) {
      framework = detector.label;
      break;
    }
  }

  // Detect package manager
  let packageManager: 'npm' | 'yarn' | 'pnpm' | 'bun' = 'npm';
  if (fs.existsSync(path.join(projectDir, 'bun.lockb'))) {
    packageManager = 'bun';
  } else if (fs.existsSync(path.join(projectDir, 'pnpm-lock.yaml'))) {
    packageManager = 'pnpm';
  } else if (fs.existsSync(path.join(projectDir, 'yarn.lock'))) {
    packageManager = 'yarn';
  }

  // Detect test framework
  let testFramework: string | null = null;
  let testPatterns: string[] = ['**/*.test.ts', '**/*.test.js', '**/*.spec.ts', '**/*.spec.js', '**/__tests__/**'];
  for (const detector of TEST_FRAMEWORK_DETECTORS) {
    if (deps[detector.dep]) {
      testFramework = detector.label;
      testPatterns = detector.patterns;
      break;
    }
  }

  // Also check for config files
  if (!testFramework) {
    if (fs.existsSync(path.join(projectDir, 'vitest.config.ts')) || fs.existsSync(path.join(projectDir, 'vitest.config.js'))) {
      testFramework = 'vitest';
    } else if (fs.existsSync(path.join(projectDir, 'jest.config.ts')) || fs.existsSync(path.join(projectDir, 'jest.config.js'))) {
      testFramework = 'jest';
    }
  }

  // Detect source roots
  const sourceRoots: string[] = [];
  for (const dir of ['src', 'lib', 'app', 'packages', 'apps']) {
    if (fs.existsSync(path.join(projectDir, dir)) && fs.statSync(path.join(projectDir, dir)).isDirectory()) {
      sourceRoots.push(dir + '/');
    }
  }
  if (sourceRoots.length === 0) {
    sourceRoots.push('./');
  }

  return {
    language,
    framework,
    packageManager,
    testFramework,
    hasTypeScript,
    tsConfigPath,
    sourceRoots,
    testPatterns,
    totalSourceFiles: sourceFiles.length,
  };
}
