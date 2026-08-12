# AGENTS.md

Governing instructions for AI coding agents in this repo. This mirrors `CLAUDE.md`, which carries the same rules plus Claude Code-specific mechanics. **Any change to one must be mirrored in the other.**

## What this repo is

A toolkit that generates and maintains Storybook design-system projects. It is **not** a design system itself. Generated projects are outputs; this repo is the source of truth.

Read before non-trivial work — do not re-derive what these already decide:

| Doc | Owns |
| --- | --- |
| `docs/requirements.md` | goals, non-goals, what "consistent" means, success criteria |
| `docs/architecture.md` | monorepo shape, engine/content boundary, manifest, ADRs |
| `docs/design-system-contract.md` | the structure every generated project must hold |
| `docs/update-and-migration.md` | versioning, conflict policy, migration notes |
| `docs/code-standards.md` | how code is written; §9 is git |
| `INDEX.md` | where everything lives |

## The one rule everything serves

Consistency is guaranteed at the **contract level** — taxonomy, naming, story format, token pipeline, doc structure — and deliberately *not* at the implementation level. Component internals diverge per brand and that is correct. Never "fix" divergent internals in the name of consistency; never let taxonomy or naming drift in the name of freedom.

A rule that exists only in prose is a suggestion, and suggestions produced the drift this project exists to end. **New rule → add it to the validator.**

## Think before coding

State assumptions explicitly; if uncertain, ask. Multiple interpretations → present them, do not pick silently. Simpler approach exists → say so. Something unclear → stop, name it, ask.

Write the minimum code that solves the problem. No speculative features, no single-use abstractions, no unrequested flexibility, no error handling for impossible scenarios. If 200 lines could be 50, write 50.

**Surgical changes.** Every changed line traces to the request. Do not improve adjacent code, do not refactor what is not broken, match existing style. Clean up orphans *your* change created; mention pre-existing dead code rather than deleting it.

**Verifiable success criteria.** Define how the change will be checked before writing it, then verify. For multi-step work, state the plan as steps each with its own check.

## Context discipline (non-negotiable)

Context is scarce; flooding it causes thrashing — more searches, more noise, wrong or stuck.

- **Bounded search.** Cap search output at ~50 matches. More → refine the query (narrower path, narrower file glob, sharper pattern, result limit). "Too many results" means *be more specific*, not read further.
- **Bounded reads.** Small files whole; large files in ~100-line windows, targeting the range you need. Track line numbers as you read — editing lines 47–52 means referencing 47–52, not re-reading the file to count.
- **Never re-read a file already in context.**
- **Lint/typecheck after every edit.** Fix a syntax error before anything else, not after tests fail and ten steps are burned.

## Delegation

**Default: no delegation.** Keep work in the main context. Do not hand off because a task is broad, touches many files, or would finish faster in parallel. Time and speed rank below wise context use.

**Exception:** a large mechanical sweep, or a broad/unknown file surface needing more than about ten files at once. Then delegate reconnaissance to **one** sub-run on the cheapest capable model, returning only a distilled brief — paths, line ranges, specific facts. The cheap run **locates, collects, extracts**. It never does synthesis.

Root-cause analysis, design, integration, edits and decisions stay with the main agent. Surface already small and knowable → read it directly instead of delegating.

**One at a time.** Never run delegated sub-runs concurrently unless the maintainer explicitly asks and it is genuinely necessary. Sequential wins.

Scope every delegated prompt explicitly: task, files to read, files it may modify, acceptance criteria, constraints, and where to write its report (`plans/reports/`). Never pass full conversation history — summarise only what the subtask needs.

## Right-size the ceremony, never skip it

Plan → implement → simplify → test → review, update-log entries, and docs sync stay **mandatory**. What scales is their *depth*, not their existence. A one-line fix earns an update-log entry with a terse inline plan; a real feature warrants the full chain. Precision comes from *doing* each step, not from spending maximum effort on it.

## Keep `INDEX.md` current — non-negotiable

`INDEX.md` is the map every session reads before touching the tree. **Update it in the same change** that adds, moves, renames or deletes anything it lists. A stale index routes the next session to a path that no longer exists, costing more than the map ever saved.

It maps **location only**. Never copy content into it — link to the authoritative file, or you have created a second source of truth to drift.

## Update logs — non-negotiable

Before or immediately after any non-trivial change, add an entry at `update-logs/YYYY-MM-DD/NN-short-slug.md` — one folder per date, `NN` zero-padded and incrementing within that date. Create today's folder if it does not exist. Non-trivial = structural or architectural decision, contract rule change, token pipeline change, file split, tooling pick, scope interpretation, maintainer clarification, version bump, rollback. Trivial edits — typos, formatting, comment wording — need no entry.

Each entry states **what changed**, **why**, **what alternative was considered**, and any **follow-ups**. Grammar may be sacrificed for concision. Format: `update-logs/README.md`.

**End-of-session notes are triggered, not automatic** — only when the maintainer asks, or when a large uncovered span of work reaches a natural stop. One note covers the whole span since the last one, never one per task. A project running across many sessions does not need one per session.

**Session start:** read the most recent end-of-session note; **if none exists, fall back to the most recent numbered update-log entry** — mid-project sessions usually have no note and that is normal. Surface a one-line orientation; do not silently execute the pickup pointer. Once per session, not per task. Full protocol: `update-logs/README.md`.

## Git

**Conventional commits. No AI references of any kind** — no tool attribution in commit messages, no generated-by lines in PR bodies, no co-author trailers naming an AI. If your runtime adds any of these by default, suppress it. See `docs/code-standards.md` §9.

Scope commits to one package where possible. Never commit `.env`, `storybook-static/`, `node_modules/`, `.DS_Store`. The root `dist/` is the sole generated-artifact exception: ADR-012 requires the verified precompiled toolkit to ship from GitHub, so rebuild it and include it whenever toolkit source changes. **Always commit `pnpm-lock.yaml`** — verify it is not ignored rather than assuming; staging an ignored path silently does nothing. Do not commit or push unless asked.

## Working in this repo

- Markdown goes in `docs/` or `plans/` only, unless the maintainer asks otherwise. `CLAUDE.md`, `AGENTS.md`, `INDEX.md` and `update-logs/**` are the standing exceptions.
- Reports: `plans/reports/{type}-{YYMMDD-HHMM}-{slug}.md`.
- Never edit a generated file by hand — fix the generator.
- Never weaken a validator rule to make a check pass.
- Changing the contract means changing `docs/design-system-contract.md`, the validator, and the template together. Any one alone is a bug.
- Exclude `node_modules/` and `vendor/` from every search.
- Prefer purpose-built file-reading and search tooling over shell text utilities where your runtime offers it.
