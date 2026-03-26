/**
 * File system helpers.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * Read a file as UTF-8 text, or return null if it doesn't exist.
 */
export function readFileOr(filePath: string): string | null {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch {
    return null;
  }
}

/**
 * Ensure a directory exists (recursive).
 */
export function ensureDir(dirPath: string): void {
  fs.mkdirSync(dirPath, { recursive: true });
}

/**
 * Write JSON to a file with pretty formatting.
 */
export function writeJson(filePath: string, data: unknown): void {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
}
