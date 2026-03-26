# airspec vs Express.js

[Express](https://github.com/expressjs/express) is the most widely used Node.js web framework. It's been around since 2010, has 65k+ stars, and virtually every Node developer has touched it at some point. It's also plain JavaScript — no TypeScript, no type annotations, no `tsconfig.json`.

That makes it a good stress test for airspec. How well can an AI agent actually understand a codebase like this?

## Score: 52 / 100

```
  ┌────────────────────────────────────────────────────┐
  │                                                    │
  │   airspec — AI Readability Score                   │
  │                                                    │
  │              52 / 100                              │
  │   ████████░░░░░░░                                  │
  │                                                    │
  │   Documentation Coverage      100  ██████████      │
  │   Architecture Clarity         54  █████░░░░░      │
  │   Decision Traceability        23  ██░░░░░░░░ ⚠    │
  │   Contract Explicitness        33  ███░░░░░░░ ⚠    │
  │   Convention Consistency       66  ███████░░░      │
  │   Context Budget Efficiency    68  ███████░░░      │
  │   Type Coverage                 0  ░░░░░░░░░░ ⚠    │
  │   Test Narration               67  ███████░░░      │
  │                                                    │
  └────────────────────────────────────────────────────┘
```

## What the scores tell you

**Documentation Coverage — 100.** Express uses `module.exports` rather than ES module `export` statements, so airspec's export-based doc scanner doesn't find symbols to check. This is a known limitation with CommonJS codebases — the score here is vacuously perfect rather than earned.

**Type Coverage — 0.** This is the big one. Express is plain JavaScript. 3,699 function parameters across 3,093 functions, none of them typed. When an AI agent reads Express source, it has zero type information to work with — it has to infer everything from usage patterns and variable names. This is the single biggest thing holding back AI comprehension of this codebase.

**Convention Consistency — 66.** Function and variable naming are perfectly consistent (camelCase throughout), but file naming is mixed — some kebab-case, some camelCase, some single-word. The codebase sticks to its patterns within `lib/` but the test directory is a grab bag of naming styles.

**Test Narration — 67.** This is actually pretty solid. Express has 1,122 tests and almost all of them (1,121) use descriptive names. The test suite is organized into describe blocks. The reason it's not higher: test organization could be tighter, and there aren't many custom assertion messages. But if an AI agent reads Express's tests, it can learn what the framework is supposed to do.

**Context Budget Efficiency — 68.** 137K tokens to represent the whole repo. Not great, not terrible. There's essentially no noise (no generated files or boilerplate), but the raw size means an agent can't fit the whole thing in context. A couple of large files push this score down.

**Architecture Clarity — 54.** Express has a clear entry point (`lib/express.js`) and the middleware pattern is well-known, but the directory structure is fairly flat. There are no barrel exports, and the module boundaries aren't as explicit as they could be. An agent can figure out the architecture, but it takes some work.

**Contract Explicitness — 33.** No TypeScript means no `import type`, no interface files, no boundary contracts. The few invariant-documenting comments that exist ("must", "never") are sparse. Cross-module contracts are entirely implicit — you have to read the code to understand them.

**Decision Traceability — 23.** No ADR directory, no DECISIONS.md, no ARCHITECTURE.md. Express has 15 years of git history with decisions baked in, but they're not surfaced anywhere. Commit messages are decent quality (not one-worders), but very few explain *why* a change was made. An AI agent would have no way to recover the reasoning behind major design choices.

## Reproduce this

```bash
git clone --depth 50 https://github.com/expressjs/express.git /tmp/express
npx airspec score --dir /tmp/express
```

Or run the included script:

```bash
bash reproduce.sh
```

## Full JSON output

See [score.json](./score.json) for the complete machine-readable breakdown.
