# ADR-001: Use TypeScript Compiler API for AST Analysis

## Status
Accepted

## Context
airspec needs to parse TypeScript and JavaScript files to extract type information, exports, JSDoc comments, and import graphs. The two main options are:

1. **tree-sitter** — Fast, language-agnostic parser. Used by many code analysis tools.
2. **TypeScript Compiler API** (ts.createProgram, ts.createSourceFile) — The same parser TypeScript itself uses.

## Decision
We use the TypeScript Compiler API exclusively.

## Consequences
- We get type resolution, export detection, and JSDoc parsing for free — these are first-class features of the TS compiler.
- `ts.createSourceFile` with `allowJs: true` handles plain JavaScript files without a separate parser.
- We avoid adding tree-sitter as a native dependency, which complicates installation (binary compilation, platform-specific builds).
- The tradeoff is that we're coupled to TypeScript's AST representation. If we ever need to analyze non-JS/TS languages, we'll need a different approach for those.
- Performance is adequate — parsing 500 files takes under 5 seconds on modern hardware.
