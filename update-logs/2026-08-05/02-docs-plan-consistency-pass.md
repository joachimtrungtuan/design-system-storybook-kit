# Docs ↔ plan consistency pass before implementation

**What changed.** One full cross-read of `docs/` against `plans/260804-1648-story-cli-kit-implementation/`, looking only for places where two documents disagree. Findings in `plans/reports/review-260805-0744-docs-plan-consistency.md` (4 blocking, 6 high, 7 medium). Six needed a maintainer call; all six are resolved and every mechanical correction is applied.

**Why.** Implementation was about to start against a plan that contradicted the docs in four places, two of which would have been discovered only at release.

## Decisions

| # | Decision | Rejected |
| --- | --- | --- |
| 1 | Build output is a **single root `dist/`**; `bin` → `./dist/packages/cli/src/bin.js`, `#engine/*` → `./dist/packages/engine/src/*.js`, `files` = `dist` + `templates` | Per-package `dist/`, which multiplies the paths that must agree and gains nothing for a single-tarball distribution |
| 2 | **`ds update --to` fetches the target tag**, sharing one fetch module with `baseline.ts` | Dropping `--to` and requiring a devDependency bump first — the fetch module has to exist for `migrate` anyway, so the saving is one call site, not one mechanism |
| 3 | **`ds generate` is a documented command** — new FR2b in `requirements.md` | Leaving it plan-only, i.e. shipping a sixth command no requirement covers |
| 4 | **Tier barrels are generated files** | Leaving them template-shipped: `ds generate` appends a line, the checksum diverges, and every future `update` reports the barrel conflicted forever — the tool built to make a task easy would permanently break that file's update path |
| 5 | The no-client-data rule **covers `docs/`, not just fixtures** — ramp example renamed to a synthetic `deep-forest` | Fixtures-only, on a repo that must be public for `npx github:…`; a public doc leaks exactly as much as a public fixture |
| 6 | **Phase 10 no longer depends on Phase 8** — v0.1.0 ships without `ds migrate` | Holding six working commands for a seventh that has no taxonomy change to exercise |

## Mechanical corrections

- **Ramp count**: "twelve steps" → **eleven** (50, 100, 200 … 900, 950) in contract, architecture, phase 2. Rule 18's threshold reworded to "declares **every** step literally" — at twelve it was unreachable, so the one rule written to forbid hand-authored ramps would have passed all of them.
- **ADR-012 contradiction**: phase 10 asserted "no build" and "no `prepare` hook anywhere" in three places while ADR-012 mandates both. Rewritten, plus a success criterion for the `--ignore-scripts` guard.
- **Manifest schema** was specified nowhere it was owned. `architecture.md` now carries the full shape: `schemaVersion`, `engineVersion`, `createdWith`, `templateId`, `appliedMigrations`, per-file `sha256` and `mark` (`rendered` | `merged`), and the one-shared-normalisation-module rule.
- Update pipeline "four file categories" → six (adopt-merged, generated).
- Contract gained the generated tier barrel, declared story coverage via `subcomponents`, the `globals.css` exemption scoped to `@import`/`@font-face`, and the `[V]` token group-naming rule with its emit table.
- `update-and-migration.md` gained "Where the bytes come from" — both fetches, semver-validated refs, realpath-compared containment, refuse-don't-degrade offline; `--dry-run` creates no branch and regenerates in memory only.
- Phase table reordered to `1 → 2 → 4 → 3 → 5 → 6 → 7 → 9 → 11 → 10`, then 8 after v0.1.0. Phase 11 was absent from the sequencing graph; deps now `[3, 5, 6]`, phase 10 `[1–7, 9, 11]`.
- `phase-01` specifies `tsconfig.build.json` (`rootDir: "."`, `outDir: "dist"`, `declaration: true`, `noEmitOnError`); declarations are load-bearing for phase 4's preset.
- `pnpm ds:validate` → `ds validate` per ADR-008.

## Follow-ups

- Phase 10's CI gate must be `tsc --noEmit` over the whole workspace, not the build — `tsconfig.build.json` excludes tests and fixtures, so a type error confined to them ships clean.
- Contract is still silent on a `$overrides` entry at a ramp's anchor step; phase 2 flags it if a fixture reaches it rather than guessing.
