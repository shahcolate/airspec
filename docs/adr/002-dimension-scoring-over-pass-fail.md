# ADR-002: Continuous Scoring (0–100) Over Pass/Fail

## Status
Accepted

## Context
Early prototypes used a pass/fail approach per dimension — either your docs are "good enough" or they aren't. This felt binary and unhelpful. Teams couldn't tell if they were at 20% or 80%.

## Decision
Every dimension scores 0–100 as a continuous value. The composite score is a weighted average. CI mode uses a configurable threshold, not a fixed pass/fail.

## Consequences
- Teams can set their own thresholds and raise them over time. Start at 50, move to 60, eventually enforce 70.
- The weighted average means no single dimension can tank the score by itself — but heavily weighted dimensions (15%) matter more than lightly weighted ones (10%).
- Recommendations are sorted by impact: low-scoring dimensions with high weights surface first.
- The downside is score inflation/deflation — a repo can game specific dimensions. We accept this because the goal is to incentivize improvement, not to be an adversarial audit.
