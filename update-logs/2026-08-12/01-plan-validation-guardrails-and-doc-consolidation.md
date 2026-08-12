# Plan validation, generated-project guardrails, and doc consolidation

**What changed.** Three things, in order: a critical-questions interview over the whole plan and `docs/` (12 decisions); a new scope area — guardrails and agent hooks for *generated* projects (ADR-014, V25/V26, S6, Phase 12); and a consolidation pass that removed dated decision archaeology from `docs/` and `plans/` so each document states its rules once, in the present tense.

**Why.** Implementation was about to start against a plan whose twelve open judgement calls were still implicit, and whose documents recorded *when* each rule was decided as prominently as the rule itself. History belongs here, in `update-logs/`; `docs/` and `plans/` are the current state.

## Decisions from the validation interview

| # | Decision | Rejected |
| --- | --- | --- |
| 1 | **First release is v1.0.0**, `migrate` ships in v1.1.0 | v0.1.0 — semver ranges on a git dependency (`#semver:^1.0.0`) behave very differently below 1.0.0, and the first thing generated projects depend on is that range |
| 2 | `files` = `["dist", "templates", "migrations", "skill", "docs"]` | `dist` + `templates` only: `tsc` copies no `.md`, so migration notes, the agent skill and the contract docs would ship in nothing and `migrate` would find no notes in an installed project |
| 3 | **Phase 5 owns a materialise harness** that renders `{{placeholders}}`, reused by Phase 6 and by CI | Rendering separately in each consumer — one substitution with three implementations is how a template renders differently in a test than for a user |
| 4 | **V9 checks story coverage at tier level (≥ 1)**, not per component | Per-component coverage, which is a real goal but not a mechanical rule — it fails legitimately and the pressure is then to weaken the rule |
| 5 | **`adopt` writes a full manifest and wires the host `package.json`** (toolkit devDependency + `ds:validate`) | Manifest-only: without a local binary an adopted project cannot validate or update itself at all, and ADR-007 forbids reaching for `npx` for maintenance commands |
| 6 | The no-client-data rule **covers `plans/` too** | Restricting it to `docs/` and fixtures on a repo that must be public |
| 7 | **Stable rule IDs (V1–V26, S1–S6) replace line-number citations** everywhere | `contract:148`-style references, which are wrong the next time the file is edited and silently point at the wrong rule rather than at nothing |
| 8 | Eight mechanical corrections applied across the phase files | Leaving them to be discovered during implementation |
| 9 | **`ds guard` reads the manifest** for its ownership classification | A static glob list in the project's agent instructions — stale the first time a component is added; `.gitattributes` plus a pre-commit hook — fires long after the agent built on top of the write |
| 10 | **Guardrails are `ds` subcommands with thin hook adapters** | Logic inside platform hook definitions: two copies that drift, in the mechanism whose whole job is preventing drift |
| 11 | **All four guardrail events ship in the first release** | A subset — the pre-write guard is the only one that acts before damage, and shipping the reporting events without it inverts the value |
| 12 | **`ds generate` is the only sanctioned creation path**, stated as a requirement in generated projects and backed by **[S6]** | Documenting it as a convenience, which is prose, which is the failure mode this project exists to end |

## New scope: generated-project guardrails

Raised mid-validation and now a full phase. Two failure modes, both structural:

- **An agent edits a file the toolkit owns.** It looks like ordinary source, the edit works, and the next `ds update` or codegen reverts it silently.
- **Compounding scaffolding drift.** An agent creates a component by copying the nearest sibling, inheriting whatever that sibling had already diverged into; the copy becomes the next agent's reference, and each generation compounds until the original is unrecoverable. This repository's founding problem, one level down.

**There is no engine directory to protect.** The engine ships as a dependency under `node_modules/`, so an agent editing it there is editing a package the next install replaces. Guarding a path that does not exist would have produced a rule nobody can violate and false confidence. What genuinely needs guarding is the surface that lives *in* the project, looks ordinary and is owned upstream: generated files and shipped files — exactly what the manifest already records.

Landed as: ADR-014 in `architecture.md`; the ownership table, **[V25]**, **[V26]** and **[S6]** in `design-system-contract.md`; the scaffolding-provenance requirement in `requirements.md` FR2b; and `plans/…/phase-12-generated-project-guardrails.md`, which ships `ds guard`, the Claude Code and Codex hook adapters, the generated project's `AGENTS.md`/`CLAUDE.md`, and the two validator rules.

Accepted limit, recorded rather than hidden: hooks are **cooperative**. They constrain agents that honour their platform's hook contract; an agent outside it, or a human with an editor, bypasses them. `ds validate` in CI remains the check that cannot be skipped.

## Consolidation pass

Every rule now reads as a standing requirement rather than as a record of the day it was agreed.

- Removed from `docs/architecture.md`: ADR-012's rewrite dateline, the `(decided 2026-08-05)` build-shape note, the `(corrected 2026-08-12)` `files` note, the Node-floor and stack-table datelines, and ADR-014's `*Decided 2026-08-12.*` line.
- `plan.md` rewritten: `## Open questions`, `## Red Team Review`, `## Consistency review` and `## Validation Log` dissolved into topic-grouped `## Decisions this plan owns`, a per-phase `## Constraints carried into phases` checklist, and `## Open items` (3 remaining, each assigned to a phase).
- All 29 `<!-- Updated: Validation Session 1 -->` markers stripped from the phase files, and every dated or red-team-attributed prose passage and heading rewritten in the present tense.
- **Verification timestamps are kept** — the stack table's "verified 2026-08-04" and `plan.md`'s `created:` frontmatter. A verification date is a claim about the world's current state and decays; a decision date is archaeology.

**Boundary this establishes.** `docs/` and `plans/` state the present rules once. History — what changed, why, what was rejected — lives in `update-logs/`. Version-scoped change notes belong in `migrations/<version>.md` when a release is closed, not in the evergreen documents.

## Follow-ups

- Phase order is now `1 → 2 → 4 → 3 → 5 → 6 → 7 → 9 → 12 → 11 → 10`, then 8 after v1.0.0. Phase 10 deps `[1–7, 9, 11, 12]`; Phase 11 deps `[3, 5, 6, 12]`; Phase 12 deps `[5, 6, 7]`.
- Phase 12 must verify **Codex's current hook configuration path and schema** against its documentation at implementation time; it is written as a fact to check, not a decision to make.
- Three open items remain, each owned by a phase: the TypeScript version an adopted project must satisfy (Phase 9), `$overrides` at the anchor step (Phase 2), and effort estimates carrying no total.
