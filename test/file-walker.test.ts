/**
 * Tests for gitignore-to-glob pattern translation and source file walking.
 */
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { gitignoreLineToGlob, walkSourceFiles } from '../src/analyzers/utils/file-walker.js';

describe('gitignoreLineToGlob', () => {
  it('should skip blank lines, comments, and negations', () => {
    expect(gitignoreLineToGlob('')).toEqual([]);
    expect(gitignoreLineToGlob('   ')).toEqual([]);
    expect(gitignoreLineToGlob('# comment')).toEqual([]);
    expect(gitignoreLineToGlob('!keep-me.js')).toEqual([]);
  });

  it('should expand a directory pattern to also exclude its contents', () => {
    expect(gitignoreLineToGlob('generated/')).toEqual(['**/generated/**']);
  });

  it('should anchor patterns with a leading slash to the project root', () => {
    expect(gitignoreLineToGlob('/vendor')).toEqual(['vendor', 'vendor/**']);
  });

  it('should match slash-free patterns at any depth like gitignore does', () => {
    expect(gitignoreLineToGlob('*.gen.ts')).toEqual(['**/*.gen.ts', '**/*.gen.ts/**']);
  });

  it('should keep patterns containing a slash anchored to the root', () => {
    expect(gitignoreLineToGlob('src/generated/')).toEqual(['src/generated/**']);
  });
});

describe('walkSourceFiles with .gitignore directories', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'airspec-walker-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should exclude the contents of directories ignored via trailing-slash patterns', async () => {
    fs.mkdirSync(path.join(tmpDir, 'src'));
    fs.mkdirSync(path.join(tmpDir, 'generated'));
    fs.writeFileSync(path.join(tmpDir, 'src', 'index.ts'), 'export const a = 1;\n');
    fs.writeFileSync(path.join(tmpDir, 'generated', 'api.ts'), 'export const b = 2;\n');
    fs.writeFileSync(path.join(tmpDir, '.gitignore'), 'generated/\n');

    const files = await walkSourceFiles(tmpDir);
    expect(files).toEqual(['src/index.ts']);
  });

  it('should exclude gitignored directories at any depth', async () => {
    fs.mkdirSync(path.join(tmpDir, 'src', '__snapshots__'), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, 'src', 'index.ts'), 'export const a = 1;\n');
    fs.writeFileSync(path.join(tmpDir, 'src', '__snapshots__', 'x.js'), 'exports.x = 1;\n');
    fs.writeFileSync(path.join(tmpDir, '.gitignore'), '__snapshots__/\n');

    const files = await walkSourceFiles(tmpDir);
    expect(files).toEqual(['src/index.ts']);
  });
});
