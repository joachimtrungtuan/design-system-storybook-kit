---
title: "Phase 7: ds update"
status: pending
priority: P1
effort: "3-4d"
dependencies: [6]
---

# Phase 7: `ds update`

## Overview

Move a generated project to a newer engine version without destroying local work. One pipeline, one policy flag, six file categories, and a written report. This is the phase that decides whether the whole engine/content boundary was worth drawing — the manifest exists to answer exactly two questions here, and if classification is wrong the project's central safety claim is false.

## Where the old bytes come from

`docs/update-and-migration.md` requires that `--on-conflict=migrate` hand the agent four things: the file as it stands, **the old shipped version**, the new shipped version, and the migration notes. The manifest stores checksums, not content, so the old version's bytes exist nowhere in the project.

**Decision: fetch the old tag at migrate time.** `baseline.ts` retrieves `story-cli-kit@<manifest.engineVersion>` — `git archive` against the tag, or the tarball — into a temp directory, reads the one file it needs, and discards the directory. One network call when the command runs, nothing at rest, and no baseline copy in the repository that could drift out of sync with the manifest and lie.

Rejected: keeping `.designsystem/baseline/` in every project (a full template copy per repo, forever, that must stay in sync with the manifest); and weakening the prompt to current + new + notes (the agent then cannot distinguish a user's local modification from an old shipped default, which is precisely the judgement the notes' rationale field exists to support).

**Consequences to build for.** The temp directory is a `mkdtemp` under the OS temp root, removed in a `finally`. Extraction is confined to that directory — an archive entry escaping it is refused, not sanitised. The version string comes from the manifest and reaches a git ref, so it is validated against a semver pattern before it is ever interpolated. Offline, or a deleted tag, means `migrate` **refuses with an instruction** naming the version it needed; it never silently degrades to the weaker prompt, because a migration that looks like it ran on full inputs and did not is worse than one that declined.

`--on-conflict=skip`, the default path, depends on none of this and ships first.

## Where the *new* bytes come from

The symmetrical problem: `ds update --to <version>` needs the target version's template, and nothing obvious supplies it. `update` runs from the project's own installed copy of the toolkit, so it has the version it already has; `baseline.ts` fetches only the *old* tag; and ADR-007 forbids running maintenance commands through `npx`.

**Decision: `--to` fetches the target tag**, through the same machinery as `baseline.ts` — one module, two call sites, both semver-validated and both confined to their temp directory. `update` then genuinely moves a project between versions on its own, rather than being a command whose central flag cannot do what it says.

Rejected: dropping `--to` and requiring the user to bump the toolkit devDependency first, so the installed version *is* the target. Simpler and honest about what the command can reach, but it turns every update into a two-step and pushes version selection into a file edit — and the fetch module has to exist for `migrate` regardless, so the saving is one call site, not one mechanism.

With no `--to`, no fetch happens and the installed copy is the target. `docs/update-and-migration.md` carries both fetches and their shared safety rules.

## Requirements

**Functional**

- `ds update [--to <version>] [--on-conflict=skip|migrate] [--dry-run]`
- Preflight: refuse unless the git tree is clean; create branch `ds-update/<version>` (NFR1)
- Classify every template-shipped file: **new** (absent locally, write), **unmodified** (checksum matches, overwrite), **conflicted** (checksum differs, policy applies), **user-created** (absent from manifest, never touched), **generated** (tier barrels and `tokens.css` — always regenerated, never conflicted), **adopt-merged** (marked by `adopt`, reported and never rewritten)
- Regenerate `src/styles/tokens.css` from the project's own `tokens.json`
- `skip` (default): leave the file, list it, quote the relevant migration notes
- `migrate`: hand each conflicted file to an agent with the release's notes; per-file and independent, so one failure does not roll back the others
- Run `ds validate` afterwards; report failures, never suppress them
- Write `update-logs/<date>/NN-engine-update-<version>.md` listing every file by category, every conflict and its resolution, every validator failure
- `--dry-run` performs preflight through regeneration and reports, writing nothing
- **Files merged by `adopt` are reported and never rewritten** (ADR-013) — the manifest marks them, and this pipeline must honour the mark even though `adopt` is built later
- No force flag, ever

**Non-functional**

- Original content recoverable from git at every step
- The report distinguishes migrated / skipped / failed
- A new validator rule failing an existing project is reported as a newly-written rule, not as a regression (versioning section)

## Architecture

**Classification is a pure function** of the manifest, the current tree and the incoming template. No writes, no prompts. `--dry-run` is then literally the same function with the apply stage omitted, which is what makes the dry run trustworthy — it cannot diverge from the real run, because it is the real run minus its last step.

**The branch is the rollback mechanism.** No custom undo, no snapshot directory. ADR-009 already rejected a second reversibility mechanism for `create`, and the same reasoning holds harder here: `update` touches a mature project, and the moment it needed its own undo would be the moment the least-tested path ran.

**Migration notes ship inside the engine** at `migrations/<version>.md`, one section per changed surface, each stating what changed, whether it breaks, the mechanical equivalent, and the rationale. The rationale is not documentation courtesy — it is the input that lets an agent decide whether a user's local modification still makes sense. A diff cannot express it, which is exactly why the notes exist.

**The report is written even when nothing changed.** An update that reports "forty conflicted files" three releases running is the signal that a project has drifted far enough to upstream its changes rather than keep migrating them. That signal only exists if the report is unconditional.

## Related Code Files

- Create: `packages/engine/src/manifest/classify.ts` — the pure classifier
- **Modify: `packages/engine/src/manifest/write.ts` — the post-update rewrite.** Load-bearing: without it `engineVersion` and every checksum still describe the *old* version after an update completes, so the next update classifies the entire shipped tree as conflicted and the toolkit is unusable after exactly one successful run. Rewrite `engineVersion` and every overwritten file's checksum; leave `createdWith` alone — it records the version a project was created with, not the version it currently runs — and leave conflicted, user-created and adopt-merged entries alone
- Create: `packages/engine/src/update/target.ts` — the *new* template's bytes: `--to` fetches that tag through the shared fetch module; without it, the installed copy is the target
- Create: `packages/engine/src/update/pipeline.ts` — preflight, classify, regenerate, apply, validate, report
- Create: `packages/engine/src/update/report.ts`
- Create: `packages/engine/src/update/baseline.ts` — old-version retrieval by tag fetch into a temp dir, with semver validation of the ref and confined extraction
- Create: `packages/engine/src/migrations/README.md` — the notes format
- Create: `packages/cli/src/commands/update.ts`
- Create: `packages/engine/src/update/__fixtures__/` — projects at a prior version with seeded modifications
- Create: `update-logs/<date>/NN-update-pipeline.md`

## Implementation Steps

1. `classify.ts` first, pure, with a fixture per category and per boundary: a file modified then reverted to its exact original (must classify unmodified), a file deleted locally, a file the user created at a path the new template also ships (a genuine collision worth its own decision — recommend treating it as conflicted).
2. Preflight: clean-tree check and branch creation, both refusing loudly.
3. `--dry-run` end to end. It ships before any write path exists, which is the right order — the expected first invocation is the dry run. **It runs before branch creation and regenerates nothing** — a dry run that creates a branch and rewrites `tokens.css` has written twice while reporting clean, and a tree hash is blind to both. Classify against an in-memory regeneration, print, exit.
4. `target.ts` — the `--to` fetch, sharing the tag-fetch module with `baseline.ts` rather than duplicating its semver validation and containment. With no `--to`, the installed copy is the target and no fetch runs.
5. Apply for new, unmodified and generated files. Conflicted files are listed and untouched under `skip`.
6. **Manifest rewrite**, with its own test: after a successful update, `engineVersion` matches the new version, every overwritten file's checksum matches its new bytes, and conflicted / user-created / adopt-merged entries are byte-identical to before. Then the round-trip assertion that actually proves it — run `update` twice against the same target; the second run must classify nothing as conflicted.
7. Token regeneration from the project's own `tokens.json`, never the template's.
8. Validate-and-report, including the new-rule wording.
9. Report writer, exercised against a fixture with at least one file in every category.
10. `baseline.ts` — tag fetch into `mkdtemp`, semver-validated ref, confined extraction, `finally` cleanup. **Containment compares `realpath`s, not string prefixes** — on macOS `mkdtemp` returns a path under `/var`, a symlink to `/private/var`, so a naive prefix check rejects every entry and `migrate` never works on the maintainer's own machine. Tests: a malformed `engineVersion` refused before any git invocation; an entry containing `..` refused; **a well-formed archive extracted successfully** — the positive case, and the only one that catches the symlink bug; temp directory gone after both success and failure.
11. The `migrate` policy over `baseline.ts`: per-file, independent, agent handed all four inputs. Offline and missing-tag both refuse with an instruction.
12. A refusal to move backwards without an explicit gesture.
13. Update-log entry documenting the notes format and the two tag fetches.

## Success Criteria

- [ ] Classification correct for all six categories — new, unmodified, conflicted, user-created, generated, adopt-merged — including the reverted-file and locally-deleted edge cases
- [ ] `--dry-run` writes nothing **and creates no branch** — verified by comparing the tree hash *and* `git branch --list` before and after. A tree hash alone would pass a run that created a branch and regenerated `tokens.css`
- [ ] After a successful update the manifest describes the **new** version: `engineVersion` bumped, overwritten checksums current, conflicted / user-created / adopt-merged entries untouched
- [ ] Running `update` twice against the same target classifies nothing as conflicted on the second run — the assertion that proves the manifest rewrite actually happened
- [ ] Checksum normalisation is the single shared module Phase 6 also uses, and the manifest carries a schema version so a normalisation change is detectable rather than silent
- [ ] A dirty tree is refused with an instruction
- [ ] `--to` and `baseline.ts` call one fetch module — a malformed version is refused identically on both paths
- [ ] Work happens on `ds-update/<version>`, never on the current branch
- [ ] User-created files are untouched, asserted by checksum across a full run
- [ ] Conflicted files under `skip` are byte-identical afterwards
- [ ] `tokens.css` is regenerated from the project's tokens, not the template's
- [ ] The report lists every file by category and every validator failure
- [ ] Adopt-merged files are reported and never rewritten
- [ ] No code path overwrites a conflicted file — grep the module for the absence of a force branch
- [ ] A newly-added validator rule failing an existing project is worded as a new rule, not a regression

## Risk Assessment

**Classification is subtly wrong and silently overwrites user work.** The one failure that would destroy trust in the toolkit permanently. Defence in depth: pure classifier with exhaustive fixtures, dry run as the default first invocation, branch isolation, and the absence of any overwrite path for conflicted files. Test the reverted-file case specifically — it is the case where a naive implementation guesses.

**Line-ending or trailing-newline differences make unmodified files look conflicted.** Common, annoying, and it turns a clean update into a wall of false conflicts. Normalise before hashing and record the normalisation in the manifest format so it stays stable across versions.

**The old tag is unreachable when `migrate` runs** — offline, deleted tag, or a repository made private. Refuse with an instruction naming the version needed and point at `skip`. The tempting failure is degrading to current + new + notes and not saying so; that produces a migration the user believes ran on full inputs. Never do it.

**`baseline.ts` is the one module that runs a network fetch and unpacks an archive.** Both the semver validation of the ref and the confinement of extraction are security boundaries, not tidiness — the version string originates in a file the user can edit. Keep them tested, and keep them in this module only.

**Migration notes get written carelessly at release time.** The format is the mechanism, but only discipline keeps it honest. Phase 10's release checklist includes writing them, and the rationale field is the one that must not be skipped.
