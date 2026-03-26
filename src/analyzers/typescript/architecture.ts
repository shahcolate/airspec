/**
 * Dimension 6: Architecture Clarity
 * Measures directory coherence, import directionality, entry point discoverability,
 * and barrel exports.
 */
import ts from 'typescript';
import * as fs from 'node:fs';
import * as path from 'node:path';
import type { DimensionResult } from '../../types.js';
import { parseFile, extractImports } from '../utils/ast.js';

const GENERIC_DIR_NAMES = new Set([
  'utils', 'helpers', 'misc', 'common', 'shared', 'lib',
  'types', 'constants', 'config', 'assets', 'styles',
]);

const ENTRY_POINT_NAMES = new Set([
  'index.ts', 'index.js', 'index.tsx', 'index.jsx',
  'main.ts', 'main.js', 'app.ts', 'app.js', 'server.ts', 'server.js',
]);

/**
 * Analyze architecture clarity.
 */
export async function analyzeArchitecture(
  projectDir: string,
  sourceFiles: string[]
): Promise<DimensionResult> {
  // 1. Directory coherence (30%)
  const topDirs = new Set<string>();
  for (const file of sourceFiles) {
    const parts = file.split('/');
    // Look at first meaningful directory (skip 'src')
    const startIdx = parts[0] === 'src' ? 1 : 0;
    if (parts.length > startIdx + 1) {
      topDirs.add(parts[startIdx]);
    }
  }

  const domainDirs = [...topDirs].filter(d => !GENERIC_DIR_NAMES.has(d));
  const dirCoherenceScore = topDirs.size > 0
    ? Math.round((domainDirs.length / topDirs.size) * 100)
    : 50;

  // 2. Import directionality (30%)
  const moduleImports = new Map<string, Set<string>>();
  for (const file of sourceFiles) {
    const fullPath = path.join(projectDir, file);
    let sourceFile: ts.SourceFile;
    try {
      sourceFile = parseFile(fullPath);
    } catch {
      continue;
    }

    const parts = file.split('/');
    const startIdx = parts[0] === 'src' ? 1 : 0;
    if (parts.length <= startIdx + 1) continue;
    const fromModule = parts[startIdx];

    const imports = extractImports(sourceFile);
    for (const imp of imports) {
      if (!imp.path.startsWith('.')) continue;
      // Resolve the import to find which module it targets
      const resolved = path.resolve(path.dirname(fullPath), imp.path);
      const relative = path.relative(projectDir, resolved);
      const relParts = relative.split('/');
      const targetStartIdx = relParts[0] === 'src' ? 1 : 0;
      if (relParts.length <= targetStartIdx) continue;
      const toModule = relParts[targetStartIdx];

      if (fromModule !== toModule) {
        if (!moduleImports.has(fromModule)) moduleImports.set(fromModule, new Set());
        moduleImports.get(fromModule)!.add(toModule);
      }
    }
  }

  // Check for circular/bidirectional imports
  let totalEdges = 0;
  let bidirectionalEdges = 0;
  for (const [from, targets] of moduleImports) {
    for (const to of targets) {
      totalEdges++;
      if (moduleImports.get(to)?.has(from)) {
        bidirectionalEdges++;
      }
    }
  }
  const directionalityScore = totalEdges > 0
    ? Math.round(((totalEdges - bidirectionalEdges) / totalEdges) * 100)
    : 80; // neutral if no cross-module imports

  // 3. Entry point discoverability (20%)
  let hasEntryPoint = false;
  for (const name of ENTRY_POINT_NAMES) {
    if (fs.existsSync(path.join(projectDir, 'src', name)) || fs.existsSync(path.join(projectDir, name))) {
      hasEntryPoint = true;
      break;
    }
  }
  // Check package.json for main/exports
  let hasPackageEntry = false;
  try {
    const pkgJson = JSON.parse(fs.readFileSync(path.join(projectDir, 'package.json'), 'utf-8'));
    hasPackageEntry = !!(pkgJson.main || pkgJson.exports);
  } catch {
    // no package.json
  }
  const entryScore = (hasEntryPoint ? 50 : 0) + (hasPackageEntry ? 50 : 0);

  // 4. Barrel exports (20%)
  let modulesWithBarrel = 0;
  let totalModules = 0;
  for (const dir of topDirs) {
    totalModules++;
    const dirPaths = [
      path.join(projectDir, 'src', dir, 'index.ts'),
      path.join(projectDir, 'src', dir, 'index.js'),
      path.join(projectDir, dir, 'index.ts'),
      path.join(projectDir, dir, 'index.js'),
    ];
    if (dirPaths.some(p => fs.existsSync(p))) {
      modulesWithBarrel++;
    }
  }
  const barrelScore = totalModules > 0
    ? Math.round((modulesWithBarrel / totalModules) * 100)
    : 50;

  const score = Math.round(
    dirCoherenceScore * 0.30 +
    directionalityScore * 0.30 +
    entryScore * 0.20 +
    barrelScore * 0.20
  );

  return {
    score: Math.min(100, Math.max(0, score)),
    weight: 0.15,
    details: {
      total_modules: totalModules,
      domain_dirs: domainDirs.length,
      generic_dirs: topDirs.size - domainDirs.length,
      dir_coherence_score: dirCoherenceScore,
      total_import_edges: totalEdges,
      bidirectional_edges: bidirectionalEdges,
      directionality_score: directionalityScore,
      has_entry_point: hasEntryPoint,
      has_package_entry: hasPackageEntry,
      modules_with_barrel: modulesWithBarrel,
    },
  };
}
