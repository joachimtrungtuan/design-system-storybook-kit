# INDEX

Map of this repo. **Location only — no content.** Update in the same change that adds, moves, renames or deletes anything listed here.

## Governance

| Path | What |
| --- | --- |
| `CLAUDE.md` | agent instructions for Claude Code |
| `AGENTS.md` | mirrored instructions for other agents |
| `INDEX.md` | this map |

## Documentation

| Path | What |
| --- | --- |
| `docs/requirements.md` | problem, goals, non-goals, consistency definition, success criteria |
| `docs/architecture.md` | repo shape, engine/content boundary, manifest, update pipeline, ADRs |
| `docs/design-system-contract.md` | the structure every generated project must hold |
| `docs/update-and-migration.md` | versioning, conflict policy, migration notes, structural migrations |
| `docs/code-standards.md` | code conventions; §9 git |

## Packages

| Path | What |
| --- | --- |
| `packages/engine/` | versioned npm package — Storybook preset, token codegen, validator rules, story templates |
| `packages/engine/src/tokens/` | token schema, colour conversion, ramp generation, and Tailwind theme codegen |
| `packages/engine/src/preset/` | Storybook main/preview factories and token-derived brand surfaces |
| `packages/engine/src/template/` | materialisation boundary for the shipped Storybook template |
| `packages/engine/src/manifest/` | normalized checksums, generated-project manifest read/write primitives, and update-time file classification |
| `packages/engine/src/scaffold/` | canonical component/story scaffolds and generated tier barrels |
| `packages/engine/src/update/` | `ds update` pipeline (classify, apply, manifest rewrite) and report formatting |
| `packages/engine/src/validator/` | project snapshot, V1–V24 contract rules, reports, and compliant fixtures |
| `packages/cli/` | `ds` command — create, adopt, generate, validate, update, migrate, guard |
| `packages/cli/src/commands/` | command implementations, including `create`, `generate`, `validate`, and `update` |
| `packages/cli/src/create/` | create planning, prompts, rollback ledger, and apply pipeline |
| `packages/cli/src/env/` | read-only Node, package-manager, git, and workspace detection |
| `packages/cli/src/ui/` | prompt and reporting boundaries |
| `dist/` | committed, precompiled toolkit output shipped to users |

## Templates

| Path | What |
| --- | --- |
| `templates/storybook-vite/` | React + Vite template copied at init |

## Shipped guidance

| Path | What |
| --- | --- |
| `migrations/` | versioned structural migration notes shipped with the toolkit |
| `skill/` | installed agent skill and supporting references |

## Working files

| Path | What |
| --- | --- |
| `plans/` | work plans |
| `plans/reports/` | agent reports |
| `plans/journals/` | chronological technical journals |
| `update-logs/` | dated change log |
| `update-logs/README.md` | log format and session-start protocol |
