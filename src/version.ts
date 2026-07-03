/**
 * Single source of truth for the package version.
 * Read from package.json at runtime so the CLI, the score report, and npm
 * can never drift apart. Works from both src/ (tsx) and dist/ (compiled)
 * because both directories sit one level below the package root.
 */
import { readFileSync } from 'node:fs';

interface PackageJson {
  version: string;
}

const pkg = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf-8')
) as PackageJson;

export const VERSION: string = pkg.version;
