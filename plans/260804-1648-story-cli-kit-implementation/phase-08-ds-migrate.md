---
title: "Phase 8: ds migrate"
status: pending
priority: P3
effort: "2d"
dependencies: [7]
---

# Phase 8: `ds migrate`

## Overview

Structural migrations: whole-tree transforms that file-level checksums cannot express, such as renaming a tier or relocating `src/stories/`. Named, explicitly invoked, never automatic, always reversible via branch. Expected to be rare — each one is a real cost paid by every existing project, which `docs/update-and-migration.md` notes is itself an argument for getting the taxonomy right early.

Lowest priority in the plan, and deliberately so: the first structural migration cannot be written until there is a taxonomy change to migrate. What this phase builds is the **mechanism plus one worked example**, so the machinery exists and is proven before it is urgently needed.

**Ships in v1.1.0, after the first release.** Phase 10 does not depend on this phase: `migrate` handles a taxonomy change that has not happened yet, so gating the first release on it would hold back six working commands for a seventh nothing can exercise. v1.0.0 releases without `ds migrate`; this phase lands in the next minor, and `ds migrate --list` on a project created before it simply reports no migrations.

## Requirements

**Functional**

- `ds migrate --name <migration-id> [--dry-run]`
- `ds migrate --list` shows migrations available for the project's engine version and which have already run
- Separate from `ds update`; never triggered by it
- Preflight identical to update: clean tree required, work on `ds-migrate/<name>`
- Dry run prints every intended move, rewrite and deletion, and writes nothing
- Import specifiers are rewritten alongside file moves — a tier rename that moves directories but leaves imports pointing at the old paths is a broken project, not a migration
- `ds validate` runs afterwards; a migration leaving the project invalid is reported as failed, not quietly accepted
- Report written to `update-logs/<date>/NN-migration-<name>.md`
- The manifest is rewritten to the post-migration paths, or the next `update` misclassifies every moved file

**Non-functional**

- A migration is a data-declared transform where possible, not bespoke code per release
- Reversible via branch; no custom undo (same reasoning as Phase 7)

## Architecture

**A migration declares moves and rewrites; the runner executes them.** Path moves, import-specifier rewrites, and content transforms as an ordered list, with the runner owning ordering, dry run, validation, manifest rewriting and reporting. Bespoke code per migration means each new one re-solves reporting and rollback, and the third one gets it wrong. Content transforms will occasionally need a real function — allow it as the exception, keep the declarative path as the default.

**The manifest rewrite is the step that is easy to forget and expensive to omit.** Every moved file's manifest key must move with it, keeping its checksum, or the next `update` sees the whole tree as user-created-plus-deleted and stops being useful. This is the phase's most important invariant and it gets its own test.

**Import rewriting needs the same parsing as validator rule 3.** Reuse that machinery. A regex over import paths will mangle a string that happens to look like a path.

**The worked example is a tier rename**, since that is the case both docs name. Build it as a fixture-driven test even if the real rename never happens: an unexercised mechanism is not a mechanism.

## Related Code Files

- Create: `packages/engine/src/migrations/runner.ts`
- Create: `packages/engine/src/migrations/types.ts` — the declarative transform shape
- Create: `packages/engine/src/migrations/registry.ts` — id → transform, with applicability by version
- Create: `packages/engine/src/migrations/__fixtures__/tier-rename/`
- Create: `packages/cli/src/commands/migrate.ts`
- Modify: `packages/engine/src/manifest/write.ts` — path rewriting
- Create: `update-logs/<date>/NN-structural-migrations.md`

## Implementation Steps

1. `types.ts` — the transform shape: moves, import rewrites, content transforms, plus applicability metadata.
2. `runner.ts` — preflight, dry-run print, apply, manifest rewrite, validate, report. Reuse Phase 7's preflight and report writers rather than copying them.
3. Manifest path rewriting with its own test: after a migration, every moved file's checksum entry is present at the new path and absent at the old.
4. Import rewriting through the validator's parsing machinery.
5. The tier-rename fixture and its end-to-end test: fixture project in, migrated project out, `ds validate` zero, manifest coherent.
6. `--list` and already-run tracking. Record applied migrations in the manifest, since a structural migration applied twice is not idempotent.
7. `migrate.ts` wiring and the refusal path for an unknown or inapplicable id.
8. Update-log entry.

## Success Criteria

- [ ] `--dry-run` prints every move and rewrite and changes nothing
- [ ] The tier-rename fixture migrates end to end and passes `ds validate` afterwards
- [ ] Every moved file's manifest entry moves with it, checksum intact
- [ ] Imports resolve after migration — a typecheck of the migrated fixture passes
- [ ] Applied migrations are recorded; re-running the same id refuses rather than reapplying
- [ ] A migration that leaves the project invalid is reported as failed
- [ ] Dirty tree refused; work isolated on `ds-migrate/<name>`

## Risk Assessment

**Building a mechanism with no real user.** The genuine risk in this phase — the first actual migration will want something the declarative shape does not express. Mitigation is honesty about scope: build what the tier-rename case needs, allow the escape hatch of a content-transform function, and resist generalising further until a second case exists. YAGNI applies hardest to the machinery whose users are hypothetical.

**Partial application leaves a project half-migrated.** The branch is the answer, plus applying moves only after every one has been computed. Compute the full plan, then execute.

**Manifest and tree diverge silently.** Caught by the coherence assertion in the success criteria, which should run as part of the migration itself and not only in tests.
