# ADR-005: Zero-Config Project Detection

## Status
Accepted

## Context
`npx airspec score` needs to work on any TypeScript/JavaScript repo without configuration. If users have to write a config file before getting a score, most won't bother.

## Decision
Auto-detect everything from filesystem signals: `tsconfig.json` for TypeScript, `package.json` dependencies for framework/test framework, lock files for package manager, directory structure for source roots.

## Consequences
- Zero friction for first-time users. Clone, run, get a score.
- Detection can be wrong — a monorepo with multiple tsconfigs might pick up the wrong one. A project using an unusual test framework won't be detected. We handle this by falling back to sensible defaults (JavaScript mode, no framework, standard test patterns).
- There's no config file for airspec itself. Custom weights are passed via CLI flags. This keeps the tool simple but limits advanced use cases. If demand appears, we'll add `.airspecrc` later — but not before we need it.
