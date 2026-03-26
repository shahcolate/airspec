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

## Real-world examples

### Express.js — 44/100

We ran airspec against [Express](https://github.com/expressjs/express) — 141 source files, plain JavaScript, 15 years of history:

```
  ┌────────────────────────────────────────────────────┐
  │                                                    │
  │   airspec — AI Readability Score                   │
  │                                                    │
  │              44 / 100                              │
  │   ███████░░░░░░░░                                  │
  │                                                    │
  │   Documentation Coverage       50  █████░░░░░      │
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

Type coverage bottoms out at 0 — it's untyped JavaScript, so an AI agent has zero type information to work with. Test narration scores 67 thanks to 1,122 descriptively-named tests. Decision traceability is at 23 because 15 years of architectural decisions live in people's heads, not in the repo.

Full breakdown: [`examples/express/`](./examples/express/)

### OpenClaw (Moltbot) — 35/100

[OpenClaw](https://github.com/openclaw/openclaw) is an AI agent with 330k+ stars. Irony: its own codebase is hard for AI agents to read.

```
  ┌────────────────────────────────────────────────────┐
  │                                                    │
  │   airspec — AI Readability Score                   │
  │                                                    │
  │              35 / 100                              │
  │   █████░░░░░░░░░░                                  │
  │                                                    │
  │   Documentation Coverage        7  █░░░░░░░░░ ⚠    │
  │   Architecture Clarity         66  ███████░░░      │
  │   Decision Traceability        19  ██░░░░░░░░ ⚠    │
  │   Contract Explicitness        43  ████░░░░░░ ⚠    │
  │   Convention Consistency       47  █████░░░░░ ⚠    │
  │   Context Budget Efficiency    15  ██░░░░░░░░ ⚠    │
  │   Type Coverage                27  ███░░░░░░░ ⚠    │
  │   Test Narration               61  ██████░░░░      │
  │                                                    │
  └────────────────────────────────────────────────────┘
```

18,775 exported symbols, 7% have docs. 15 million tokens — no context window can hold that. The architecture is actually solid (66, domain-named modules), but everything else is fighting the agent. 2,086 `any` types, 292 circular import edges, zero ADRs.

Full breakdown: [`examples/openclaw/`](./examples/openclaw/)

### airspec vs itself — 61 → 80

We followed airspec's own recommendations to improve this repo's score. No refactoring, no rewrites — just the things airspec said were missing:

| What we did | Dimension | Before | After |
|---|---|---|---|
| Added 29 tests with behavioral names | Test Narration | 0 | 65 |
| Created 5 ADRs in `docs/adr/` | Decision Traceability | 10 | 55 |
| Added barrel exports for each module | Architecture Clarity | 68 | 80 |
| Added intent comments ("because...", "reason:...") | Contract Explicitness | 68 | 75 |

About 30 minutes of work. The score went from 61 to 80. That's the workflow — run the tool, follow the suggestions, rerun, see the number go up.

Full story: [`examples/airspec/`](./examples/airspec/)

## How it works

airspec uses the TypeScript Compiler API to parse your code into an AST. No tree-sitter, no regex soup — actual type-aware analysis. It reads your `tsconfig.json`, respects your `.gitignore`, and runs all 8 analyzers in parallel.

For decision traceability, it shells out to git and analyzes your commit messages. Repos with better commit hygiene score higher here, which makes sense — if an AI can't read your git history to understand *why* something was done, it's going to repeat your mistakes.

Token counting uses tiktoken (same tokenizer as GPT-4) with a character-based fallback if tiktoken isn't available.

## Enterprise adoption

Most orgs are spending real money on AI coding tools and getting inconsistent results across teams. One team gets great output from Copilot, another team gets garbage. The difference usually isn't the model or the tool — it's the codebase underneath.

**Start here (takes 10 minutes):**

Run `npx airspec score --json` across your top 5 repos. You'll immediately see which ones are set up for AI success and which ones are fighting it. No procurement, no vendor call, no API keys.

**Wire it into what you already have:**

```yaml
# Drop this into any existing GitHub Actions workflow
- run: npx airspec score --ci --min-score 60
```

Start the threshold low. 60 is fine. The point isn't to block PRs on day one — it's to make the number visible. Teams that can see a score start improving it on their own.

**Track it over time:**

Every run writes `.airspec/score.json` with a full dimension breakdown. Pipe that into whatever dashboard you already use — Datadog, Grafana, a spreadsheet, doesn't matter. The JSON is stable and includes timestamps. You can plot AI readability the same way you plot test coverage or deploy frequency.

**Where it pays off fast:**

- **Onboarding.** New engineers using AI tools ramp up faster on well-scored repos. If your docs dimension is at 30, that's why the new hire's Copilot keeps hallucinating internal APIs.
- **Monorepos.** Score individual packages. You'll find that the teams writing clean module boundaries (`architecture_clarity`) get dramatically better agent output than teams with circular imports everywhere.
- **Post-incident.** After an AI-assisted change causes a production issue, check `decision_traceability`. If it's low, the agent literally couldn't see why the previous approach existed. That's a systemic problem, not a model problem.
- **Vendor evaluation.** Trying a new AI coding tool? Run it against a high-scoring repo and a low-scoring repo. The delta tells you how much the tool depends on context quality vs. its own reasoning. Most of them depend on context more than they'd like to admit.

**Custom weights for your org:**

Different codebases care about different things. A library with a public API should weight `contract_explicitness` and `documentation_coverage` higher. An internal service might care more about `decision_traceability` and `architecture_clarity`.

```bash
airspec score --weights contract_explicitness=25,documentation_coverage=25,decision_traceability=20
```

Weights get normalized automatically. Set the ones you care about higher and airspec adjusts the rest.

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
