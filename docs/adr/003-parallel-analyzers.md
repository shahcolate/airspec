# ADR-003: Run Dimension Analyzers in Parallel

## Status
Accepted

## Context
The 8 dimension analyzers are independent — they each read files and produce a score without needing results from other analyzers. Running them sequentially on a large repo (500+ files) takes 15–20 seconds.

## Decision
Run all 8 analyzers via `Promise.all`. Each analyzer gets its own copy of the file list and operates independently.

## Consequences
- Score time dropped from ~18s to ~6s on a 400-file repo.
- Each analyzer must be stateless — no shared mutable state between analyzers. This is enforced by the interface: each receives `projectDir` and `profile` and returns a `DimensionResult`.
- If one analyzer throws, the `safeAnalyze` wrapper catches it and returns a score of 0 with an error detail. Other analyzers continue unaffected.
- Memory usage is higher because all analyzers parse files concurrently. On very large repos (5000+ files), this could be an issue. We accept this for now and will add streaming/sampling if needed.
