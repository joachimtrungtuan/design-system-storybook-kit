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
| `packages/cli/` | `ds` command — create, validate, update, migrate |

## Templates

| Path | What |
| --- | --- |
| `templates/storybook-vite/` | React + Vite template copied at init |

## Working files

| Path | What |
| --- | --- |
| `plans/` | work plans |
| `plans/reports/` | agent reports |
| `update-logs/` | dated change log |
| `update-logs/README.md` | log format and session-start protocol |

## Status

Scaffolding stage. `packages/` and `templates/` contain responsibility READMEs only — no implementation yet.
