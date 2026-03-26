# airspec vs itself

We used airspec's own recommendations to improve its score. This is the whole point of the tool — it tells you what to fix, you fix it, and the number goes up.

## Before: 61 / 100

```
  ┌────────────────────────────────────────────────────┐
  │                                                    │
  │   airspec — AI Readability Score                   │
  │                                                    │
  │              61 / 100                              │
  │   █████████░░░░░░                                  │
  │                                                    │
  │   Documentation Coverage       98  ██████████      │
  │   Architecture Clarity         68  ███████░░░      │
  │   Decision Traceability        10  █░░░░░░░░░ ⚠    │
  │   Contract Explicitness        68  ███████░░░      │
  │   Convention Consistency       49  █████░░░░░ ⚠    │
  │   Context Budget Efficiency   100  ██████████      │
  │   Type Coverage               100  ██████████      │
  │   Test Narration                0  ░░░░░░░░░░ ⚠    │
  │                                                    │
  └────────────────────────────────────────────────────┘
```

Three big problems: no tests (0), no ADRs (10), and no barrel exports (68 architecture).

## What we did

**1. Added tests with descriptive names** (Test Narration: 0 → 65)

Wrote 29 tests across 3 files using behavioral names:
- "should return 50 when all dimensions score 50"
- "should not penalize inline arrow functions in callbacks"
- "should detect TypeScript when tsconfig.json is present"

This is what airspec told us to do. The score went from 0 to 65.

**2. Added 5 architectural decision records** (Decision Traceability: 10 → 55)

Created `docs/adr/` with decisions about:
- Why we use the TypeScript Compiler API instead of tree-sitter
- Why we chose continuous 0–100 scoring over pass/fail
- Why analyzers run in parallel
- Why tiktoken has a character-based fallback
- Why zero-config project detection matters

Each ADR explains what was decided, why, and what the consequences are. This is exactly the kind of context an AI agent needs to understand why the code is the way it is.

**3. Added barrel exports** (Architecture Clarity: 68 → 80)

Created `index.ts` files for `src/analyzers/`, `src/scoring/`, and `src/utils/`. These re-export the public API of each module. AI agents can now read one file to understand what a module provides.

**4. Added intent comments** (Decision Traceability: pushed higher, Contract Explicitness: 68 → 75)

Added comments explaining *why* throughout the codebase:
- "Reason: we never want one broken analyzer to crash the entire scoring run"
- "Important: always clamp before weighting to prevent a single runaway dimension"
- "Note: CommonJS repos using module.exports won't have ES export statements"

These are the comments that show up in the invariant/intent analysis.

**5. Fixed two scoring bugs along the way**

- Type coverage was counting inline arrow functions in `.map()` callbacks, penalizing idiomatic TypeScript. Fixed to only count signature-level functions.
- `any` counting used regex `\bany\b` which matched comments and strings. Fixed to use AST-based detection.

## After: 80 / 100

```
  ┌────────────────────────────────────────────────────┐
  │                                                    │
  │   airspec — AI Readability Score                   │
  │                                                    │
  │              80 / 100                              │
  │   ████████████░░░                                  │
  │                                                    │
  │   Documentation Coverage       98  ██████████      │
  │   Architecture Clarity         80  ████████░░      │
  │   Decision Traceability        55  ██████░░░░      │
  │   Contract Explicitness        75  ████████░░      │
  │   Convention Consistency       64  ██████░░░░      │
  │   Context Budget Efficiency   100  ██████████      │
  │   Type Coverage               100  ██████████      │
  │   Test Narration               65  ███████░░░      │
  │                                                    │
  └────────────────────────────────────────────────────┘
```

## What's left

Convention consistency (64) is held back by single-word file names like `types.ts` and `git.ts` — the classifier can't tell if those are kebab-case or camelCase. Not worth renaming.

Decision traceability (55) is limited by having only 5 git commits, none of which use causal language ("because", "to prevent"). This will naturally improve as the repo gets more commits with proper messages.

## The meta-lesson

The score went from 61 to 80 with about 30 minutes of work. No refactoring. No rewriting. Just adding the things that were missing: tests with good names, ADRs, barrel exports, and intent comments. These are all things that help AI agents — and they help humans too.
