# airspec vs OpenClaw

[OpenClaw](https://github.com/openclaw/openclaw) (formerly Moltbot) is one of the biggest open-source AI agent projects out there — 330k+ stars, TypeScript, ~8,000 source files. It's a massive codebase that AI agents are expected to work with constantly. So how well can they actually read it?

## Score: 35 / 100

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

Not great. And this is ironic — OpenClaw is a tool that *is* an AI agent, and its own codebase is hard for AI agents to understand. Let's look at why.

## What the scores tell you

**Documentation Coverage — 7.** This is the headline number. Out of 18,775 exported symbols, only 1,338 have JSDoc comments. That's 7%. When an AI agent encounters an exported function in this codebase, 93% of the time it's working with nothing but the function name and signature. At this scale — 11,000+ exported functions — that's a lot of guesswork.

**Type Coverage — 27.** OpenClaw is TypeScript, but loosely typed. 24,406 function parameters have no type annotation. There are 2,086 uses of `any`. The return type situation is worse: out of 106,405 functions, only 21,705 have explicit return types. The rest are inferred, which is fine for the compiler but invisible to an AI agent reading the source.

**Context Budget Efficiency — 15.** Here's the real problem. This repo is ~15 million tokens. No AI model's context window can hold that. The noise ratio is actually low (1%), so it's not a bloat issue — the codebase is genuinely massive. There are 144 large files without generated-file markers, which means an agent can't easily tell what's hand-written vs auto-generated.

**Convention Consistency — 47.** Functions are consistently camelCase (score: 100), but variable naming is all over the place (score: 42) and file naming is inconsistent (score: 36). When you're working across 55 modules with different teams contributing, this kind of drift is expected, but it makes pattern-matching harder for agents.

**Contract Explicitness — 43.** There are 8,678 cross-module imports, but only 2,285 of them (26%) use `import type`. The repo does have 122 type definition files, which is decent for a project this size. But 6,393 cross-module imports pull in implementation details rather than contracted interfaces. An agent navigating module boundaries has to read through concrete implementations to understand what the contract actually is.

**Architecture Clarity — 66.** This is where OpenClaw does well. 51 out of 55 top-level modules have domain-oriented names (93% coherence). The directory structure tells you what things do. But there are 292 bidirectional import edges — circular dependencies between modules — which muddies the actual dependency flow. Only 3 modules have barrel exports.

**Test Narration — 61.** 23,802 tests across 2,918 test files. The vast majority (23,155) have descriptive names, which is good. 647 tests have opaque names. The test suite is organized with 5,215 describe blocks. Not bad — an agent reading the tests can learn a fair amount about expected behavior.

**Decision Traceability — 19.** No ADR directory. No DECISIONS.md. Commit messages are fine quality (none are one-word throwaway messages), but only 14 out of 50 recent commits explain *why* a change was made. For a project making dozens of architectural decisions a week, very little of that reasoning gets captured anywhere an agent could find it.

## The takeaway

OpenClaw's architecture is solid — good module names, clear entry points, domain-oriented structure. But the surface area is enormous and almost none of it is documented for AI consumption. The combination of 7% doc coverage, 15M tokens, and 27% type coverage means an AI agent working on this codebase is essentially flying blind most of the time.

The fix path would start with the highest-weighted low scorers: documentation coverage and decision traceability. Even getting docs on the top 500 most-imported symbols would meaningfully change how well agents navigate this codebase.

## Reproduce this

```bash
git clone --depth 50 https://github.com/openclaw/openclaw.git /tmp/openclaw
npx airspec score --dir /tmp/openclaw
```

Or run the included script:

```bash
bash reproduce.sh
```

Note: OpenClaw is a large repo (~10k files). The clone takes about a minute and the analysis runs for about 30 seconds.

## Full JSON output

See [score.json](./score.json) for the complete machine-readable breakdown.
