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

## Real-world scores

We scored 6 well-known open-source repos. None of them broke 60.

| Repo | Score | Stars | Language |
|---|---|---|---|
| Express | 44 | 65k+ | JavaScript |
| Hono | 45 | 20k+ | TypeScript |
| Ky | 37 | 12k+ | TypeScript |
| OpenClaw (Moltbot) | 35 | 330k+ | TypeScript |
| Zod | 34 | 35k+ | TypeScript |
| Fastify | 30 | 33k+ | JavaScript |

This isn't a bug in the scoring. The JS/TS ecosystem just doesn't optimize for AI readability. Almost no project documents architectural decisions. JSDoc on exports is rare outside of published library APIs. `import type` for cross-module boundaries is uncommon. These are all things that would genuinely help AI agents, and almost nobody does them.

Full breakdowns: [`examples/express/`](./examples/express/) | [`examples/openclaw/`](./examples/openclaw/)

### What happens when you follow the suggestions

We ran airspec on itself, got a 61, and followed the recommendations. The score went to 80. Here's what was genuine and what was gaming the metric:

**Structural improvements (actually help AI agents):**

| What we did | Dimension | Before | After |
|---|---|---|---|
| Added 29 tests with behavioral names | Test Narration | 0 | 65 |
| Created 5 ADRs documenting real decisions | Decision Traceability | 10 | 55 |
| Added barrel exports for each module | Architecture Clarity | 68 | 80 |

**Gaming the score (hit patterns the analyzer looks for):**

| What we did | Dimension | Effect |
|---|---|---|
| Added comments starting with "Reason:", "Note:", "Important:" | Contract Explicitness | +7 |
| Wrote a commit message containing "because" | Decision Traceability | +6 |

We knew the scoring heuristics and placed keywords to trigger them. The comments aren't useless — they do explain things — but we wouldn't have written them in that style without knowing the analyzer checks for those exact words.

This is the same problem code coverage has. Once you know how the metric works, you can inflate the number without proportionally improving quality. We think the right response is to be upfront about it rather than pretending the number is pure.

Full story with honest breakdown: [`examples/airspec/`](./examples/airspec/)

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

## Limitations

airspec uses static heuristics. Like any heuristic-based tool, it can be gamed.

- **The score is gameable.** If you know the analyzer checks for "Reason:" in comments, you can add "Reason:" to every comment. If you know it checks for "because" in commit messages, you can stuff "because" into every commit. The score goes up without proportional improvement in AI readability. [We did this ourselves](./examples/airspec/) and gained ~6 points from keyword placement alone.
- **Decision traceability is harsh.** Almost no open-source project has ADRs. The commit quality classifier looks for specific causal words. This means most repos score below 30 on this dimension regardless of how well-reasoned their actual decisions are — if the reasoning isn't written down in a way the analyzer can find, it scores low.
- **CommonJS is a blind spot.** The doc coverage analyzer checks for JSDoc on `export` statements. CommonJS repos using `module.exports` get a neutral 50 instead of a real score because the analyzer can't detect their exports.
- **Single-word file names confuse the convention classifier.** `types.ts`, `git.ts`, `utils.ts` — the naming classifier can't tell if these are kebab-case, camelCase, or something else. This drags convention consistency down on well-named codebases.

The score is most useful as a directional signal: find what's missing, not hit a target number. A repo at 30 has genuinely worse AI readability than a repo at 60. The difference between 75 and 80 might just be comment keywords.

The recommendations are more valuable than the composite score.

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
