# airspec

Lighthouse, but for AI readability.

## The problem

You gave Cursor your whole repo and it still wrote the wrong abstraction. You pasted 4 files into Claude and it missed the one convention that would've saved you an hour. The model isn't the bottleneck — your codebase is.

AI agents are only as good as the context they get. Most repos are optimized for humans who already know where things are. airspec tells you how well an AI can actually read yours.

## Screenshot

```
  ┌────────────────────────────────────────────────────┐
  │                                                    │
  │   airspec — AI Readability Score                   │
  │                                                    │
  │              72 / 100                              │
  │   ███████████░░░░                                  │
  │                                                    │
  │   Documentation Coverage       82  ████████░░      │
  │   Architecture Clarity         71  ███████░░░      │
  │   Decision Traceability        34  ███░░░░░░░ ⚠    │
  │   Contract Explicitness        78  ████████░░      │
  │   Convention Consistency       63  ██████░░░░      │
  │   Context Budget Efficiency    58  ██████░░░░ ⚠    │
  │   Type Coverage                91  █████████░      │
  │   Test Narration               44  ████░░░░░░ ⚠    │
  │                                                    │
  └────────────────────────────────────────────────────┘

  ⚠ 3 areas need attention:

  1. Decision Traceability (34/100)
     87% of commits use generic messages ("fix", "update").
     AI agents can't recover why decisions were made.
     → Write commit messages that explain WHY, not just WHAT.

  2. Test Narration (44/100)
     61 tests use opaque names (test1, test2, testAuth).
     AI agents can't learn behavioral contracts from tests.
     → Use descriptive names: "should reject expired tokens"

  3. Context Budget Efficiency (58/100)
     ~340K tokens to represent this repo. 42% is boilerplate.
     AI agents waste context window on noise.
     → Add .airspecignore for generated/vendored files.
```

## Quick start

```bash
npx airspec score
```

That's it. No config, no setup. Works on any TypeScript or JavaScript project.

## What it measures

airspec scores 8 dimensions of how well an AI agent can understand your code:

| Dimension | Weight | What it checks |
|---|---|---|
| Documentation Coverage | 15% | Do your exports have JSDoc? Are the docs actually useful? |
| Architecture Clarity | 15% | Can an agent figure out your module boundaries? Are imports unidirectional? |
| Decision Traceability | 15% | Can an agent tell *why* you made a choice, not just *what* you chose? |
| Contract Explicitness | 15% | Are cross-module dependencies typed? Do you have boundary type files? |
| Convention Consistency | 10% | Is naming consistent? Do similar files follow similar patterns? |
| Context Budget Efficiency | 10% | How many tokens does your repo burn? How much is signal vs noise? |
| Type Coverage | 10% | Are function signatures typed? How many `any` types are lurking? |
| Test Narration | 10% | Can an agent learn behavior from your test names? |

The composite score is a weighted average, 0–100. Each dimension gets its own breakdown so you know exactly what to fix.

## CI integration

```yaml
# .github/workflows/airspec.yml
name: AI Readability Check
on: [pull_request]
jobs:
  airspec:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npx airspec score --ci --min-score 70
```

`--ci` outputs JSON and exits with code 1 if the score is below `--min-score`. Treat AI readability like you treat test coverage.

## CLI options

```bash
airspec score                        # Pretty terminal output
airspec score --json                 # Raw JSON to stdout
airspec score --ci --min-score 70    # CI mode with threshold
airspec score --dir /path/to/repo    # Score a different directory
airspec score --weights type_coverage=20,test_narration=5  # Custom weights
```

## How it works

airspec uses the TypeScript Compiler API to parse your code into an AST. No tree-sitter, no regex soup — actual type-aware analysis. It reads your `tsconfig.json`, respects your `.gitignore`, and runs all 8 analyzers in parallel.

For decision traceability, it shells out to git and analyzes your commit messages. Repos with better commit hygiene score higher here, which makes sense — if an AI can't read your git history to understand *why* something was done, it's going to repeat your mistakes.

Token counting uses tiktoken (same tokenizer as GPT-4) with a character-based fallback if tiktoken isn't available.

## The bigger idea

A mediocre agent with great context outperforms a brilliant agent with bad context. We've all experienced this — the model is smart enough, it just doesn't know your codebase. Context is the bottleneck, not capability.

airspec makes AI-readability something you can measure, track over time, and enforce in CI. The same way Lighthouse made web performance a first-class engineering concern, airspec does that for AI readability.

## vs. other tools

| | airspec | Repomix | AGENTS.md | Qodo |
|---|---|---|---|---|
| Scores your repo | Yes | No | No | No |
| Zero config | Yes | Yes | Manual | No |
| CI integration | Yes | No | No | Yes |
| Actionable recommendations | Yes | No | No | Partial |
| Tracks over time | Yes (score.json) | No | No | No |
| Works without an API key | Yes | Yes | Yes | No |

The difference: other tools help you *give* context to AI. airspec tells you how good your context *already is* — and what to fix.

## Roadmap

- `airspec init` — generate layered context docs (overview → architecture → module deep-dives → decisions)
- `airspec archaeology` — mine git history for architectural decisions that never got documented
- `airspec export` — export to CLAUDE.md, .cursorrules, AGENTS.md, or raw system prompts
- `airspec drift` — detect when your code drifts from documented conventions

## Contributing

Issues and PRs welcome. This is early — the scoring heuristics will get refined as more repos get scored.

```bash
git clone https://github.com/shahcolate/airspec.git
cd airspec
npm install
npm run build
node dist/cli/index.js score --dir /path/to/some/repo
```

## License

Apache-2.0
