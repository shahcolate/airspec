import { describe, it, expect } from 'vitest';
import * as path from 'node:path';
import * as fs from 'node:fs';
import * as os from 'node:os';
import { detectProject } from '../src/analyzers/project-detector.js';

function createTempProject(files: Record<string, string>): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'airspec-test-'));
  for (const [filePath, content] of Object.entries(files)) {
    const full = path.join(dir, filePath);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, content);
  }
  return dir;
}

describe('project detection', () => {
  it('should detect TypeScript when tsconfig.json is present', async () => {
    const dir = createTempProject({
      'tsconfig.json': '{}',
      'package.json': '{"dependencies":{}}',
      'src/index.ts': 'export const x = 1;',
    });
    const profile = await detectProject(dir);
    expect(profile.hasTypeScript).toBe(true);
    expect(profile.language).toBe('typescript');
    fs.rmSync(dir, { recursive: true });
  });

  it('should detect JavaScript when no tsconfig.json exists', async () => {
    const dir = createTempProject({
      'package.json': '{"dependencies":{}}',
      'src/index.js': 'module.exports = {};',
    });
    const profile = await detectProject(dir);
    expect(profile.hasTypeScript).toBe(false);
    expect(profile.language).toBe('javascript');
    fs.rmSync(dir, { recursive: true });
  });

  it('should detect Express framework from package.json dependencies', async () => {
    const dir = createTempProject({
      'package.json': '{"dependencies":{"express":"^4.18.0"}}',
      'src/app.js': 'const express = require("express");',
    });
    const profile = await detectProject(dir);
    expect(profile.framework).toBe('express');
    fs.rmSync(dir, { recursive: true });
  });

  it('should detect npm as package manager when package-lock.json exists', async () => {
    const dir = createTempProject({
      'package.json': '{"dependencies":{}}',
      'package-lock.json': '{}',
      'index.js': '',
    });
    const profile = await detectProject(dir);
    expect(profile.packageManager).toBe('npm');
    fs.rmSync(dir, { recursive: true });
  });

  it('should detect pnpm when pnpm-lock.yaml exists', async () => {
    const dir = createTempProject({
      'package.json': '{"dependencies":{}}',
      'pnpm-lock.yaml': '',
      'index.js': '',
    });
    const profile = await detectProject(dir);
    expect(profile.packageManager).toBe('pnpm');
    fs.rmSync(dir, { recursive: true });
  });

  it('should detect vitest as test framework from devDependencies', async () => {
    const dir = createTempProject({
      'package.json': '{"devDependencies":{"vitest":"^2.0.0"}}',
      'src/index.ts': 'export const x = 1;',
      'tsconfig.json': '{}',
    });
    const profile = await detectProject(dir);
    expect(profile.testFramework).toBe('vitest');
    fs.rmSync(dir, { recursive: true });
  });

  it('should identify src/ as a source root when it exists', async () => {
    const dir = createTempProject({
      'package.json': '{"dependencies":{}}',
      'src/index.ts': 'export const x = 1;',
      'tsconfig.json': '{}',
    });
    const profile = await detectProject(dir);
    expect(profile.sourceRoots).toContain('src/');
    fs.rmSync(dir, { recursive: true });
  });

  it('should count total source files accurately', async () => {
    const dir = createTempProject({
      'package.json': '{"dependencies":{}}',
      'tsconfig.json': '{}',
      'src/a.ts': '',
      'src/b.ts': '',
      'src/c.tsx': '',
    });
    const profile = await detectProject(dir);
    expect(profile.totalSourceFiles).toBe(3);
    fs.rmSync(dir, { recursive: true });
  });
});
