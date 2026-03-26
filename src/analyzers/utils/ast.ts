/**
 * Shared TypeScript AST helpers for dimension analyzers.
 * Uses the TypeScript Compiler API for analysis.
 */
import ts from 'typescript';
import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * Parse a single source file into a TypeScript AST.
 */
export function parseFile(filePath: string): ts.SourceFile {
  const content = fs.readFileSync(filePath, 'utf-8');
  const isJsx = filePath.endsWith('.tsx') || filePath.endsWith('.jsx');
  return ts.createSourceFile(
    filePath,
    content,
    ts.ScriptTarget.Latest,
    true,
    isJsx ? ts.ScriptKind.TSX : undefined
  );
}

/**
 * Check if a node has the `export` keyword modifier.
 */
export function isExported(node: ts.Node): boolean {
  const modifiers = ts.canHaveModifiers(node) ? ts.getModifiers(node) : undefined;
  if (modifiers) {
    return modifiers.some(m => m.kind === ts.SyntaxKind.ExportKeyword);
  }
  return false;
}

/**
 * Check if a node is a default export.
 */
export function isDefaultExport(node: ts.Node): boolean {
  const modifiers = ts.canHaveModifiers(node) ? ts.getModifiers(node) : undefined;
  if (modifiers) {
    return modifiers.some(m => m.kind === ts.SyntaxKind.DefaultKeyword);
  }
  return false;
}

/**
 * Get the JSDoc comment text for a node, if any.
 */
export function getJSDocComment(node: ts.Node, sourceFile: ts.SourceFile): string | null {
  const fullText = sourceFile.getFullText();
  const ranges = ts.getLeadingCommentRanges(fullText, node.getFullStart());
  if (!ranges) return null;

  for (const range of ranges) {
    const text = fullText.substring(range.pos, range.end);
    if (text.startsWith('/**')) {
      return text;
    }
  }
  return null;
}

/**
 * Extract JSDoc @param descriptions from a JSDoc comment.
 */
export function extractParamDescriptions(jsDoc: string): Array<{ name: string; description: string }> {
  const params: Array<{ name: string; description: string }> = [];
  const paramRegex = /@param\s+(?:\{[^}]*\}\s+)?(\w+)\s*[-–—]?\s*(.*)/g;
  let match: RegExpExecArray | null;
  while ((match = paramRegex.exec(jsDoc)) !== null) {
    params.push({ name: match[1], description: match[2].trim() });
  }
  return params;
}

/**
 * Check if a JSDoc param description is trivial (just restates the param name).
 */
export function isTrivialParamDoc(paramName: string, description: string): boolean {
  if (!description) return true;
  const lower = description.toLowerCase();
  const nameLower = paramName.toLowerCase();
  if (lower === nameLower) return true;
  if (lower === `the ${nameLower}` || lower === `a ${nameLower}` || lower === `an ${nameLower}`) return true;
  if (lower === `the ${nameLower}.` || lower === `a ${nameLower}.` || lower === `an ${nameLower}.`) return true;

  // Simple Levenshtein distance check
  if (levenshtein(lower, nameLower) < 3) return true;
  return false;
}

/**
 * Simple Levenshtein distance calculation.
 */
function levenshtein(a: string, b: string): number {
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b[i - 1] === a[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

/**
 * Collect all exported declarations from a source file.
 */
export function collectExports(sourceFile: ts.SourceFile): ts.Node[] {
  const exports: ts.Node[] = [];

  function visit(node: ts.Node): void {
    if (
      ts.isFunctionDeclaration(node) ||
      ts.isClassDeclaration(node) ||
      ts.isInterfaceDeclaration(node) ||
      ts.isTypeAliasDeclaration(node) ||
      ts.isEnumDeclaration(node) ||
      ts.isVariableStatement(node)
    ) {
      if (isExported(node)) {
        exports.push(node);
      }
    }

    // Handle export default
    if (ts.isExportAssignment(node)) {
      exports.push(node);
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return exports;
}

/**
 * Get the name of a declaration node.
 */
export function getNodeName(node: ts.Node): string | null {
  if (
    ts.isFunctionDeclaration(node) ||
    ts.isClassDeclaration(node) ||
    ts.isInterfaceDeclaration(node) ||
    ts.isTypeAliasDeclaration(node) ||
    ts.isEnumDeclaration(node)
  ) {
    return node.name?.text ?? null;
  }
  if (ts.isVariableStatement(node)) {
    const decl = node.declarationList.declarations[0];
    if (ts.isIdentifier(decl.name)) {
      return decl.name.text;
    }
  }
  return null;
}

/**
 * Create a TypeScript program from a list of file paths.
 * Useful for getting type information and cross-file analysis.
 */
export function createProgram(
  filePaths: string[],
  projectDir: string,
  tsConfigPath: string | null
): ts.Program {
  let compilerOptions: ts.CompilerOptions = {
    target: ts.ScriptTarget.Latest,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Node16,
    allowJs: true,
    checkJs: false,
    noEmit: true,
    skipLibCheck: true,
  };

  if (tsConfigPath) {
    const configFile = ts.readConfigFile(tsConfigPath, ts.sys.readFile);
    if (!configFile.error) {
      const parsed = ts.parseJsonConfigFileContent(
        configFile.config,
        ts.sys,
        projectDir
      );
      compilerOptions = { ...parsed.options, noEmit: true, skipLibCheck: true };
    }
  }

  return ts.createProgram(filePaths, compilerOptions);
}

/**
 * Extract all import paths from a source file.
 */
export function extractImports(sourceFile: ts.SourceFile): Array<{ path: string; isTypeOnly: boolean }> {
  const imports: Array<{ path: string; isTypeOnly: boolean }> = [];

  ts.forEachChild(sourceFile, node => {
    if (ts.isImportDeclaration(node) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
      const isTypeOnly = node.importClause?.isTypeOnly ?? false;
      imports.push({ path: node.moduleSpecifier.text, isTypeOnly });
    }
  });

  return imports;
}
