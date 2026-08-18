# 01 — `ds update` (`--on-conflict=skip` path)

**What:** Implemented Phase 7's default update path end to end: `manifest/classify.ts` (six-category classifier — new, unmodified, conflicted, user-created, generated, adopt-merged), `manifest/write.ts` additions (`writeManifestObject`, `listProjectFiles`, `rewriteManifestAfterUpdate`), `engine/src/update/pipeline.ts` (`runUpdatePipeline`), `engine/src/update/report.ts` (`formatUpdateReport`/`writeUpdateReport`), and `cli/src/commands/update.ts` (`runUpdate`), wired into `bin.ts`/`help.ts`. 16 new tests across the three new test files, all passing; full repo suite (156 tests), typecheck, and build all clean.

**Why:** Phase 7's own doc names `skip` as the path that "depends on none of this and ships first" — no fetch module, no old-tag retrieval, no per-file agent hand-off. Shipping it alone first keeps the branch-isolation and no-overwrite safety properties (the phase's stated highest risk) testable without also building `baseline.ts`/`target.ts`/migration notes in the same pass.

**Alternative considered:** Building `--to` and `--on-conflict=migrate` in the same pass — rejected for scope; both need a shared tag-fetch module with semver validation and `realpath`-based archive containment (macOS `/var` → `/private/var` symlink risk, called out explicitly in the phase doc), which is real design and test surface on its own. `--to` and non-`skip` `--on-conflict` values are refused via `ActionableError` naming what's missing rather than silently no-op'ing.

**Design decisions made this pass:**
- No auto-rollback on a pipeline failure after branch creation — the branch (`ds-update/<version>`) is left intact with manual-discard instructions in the thrown error, matching the "no unrequested destructive git operations" system guidance and ADR-009/013's "branch is the rollback mechanism" philosophy. `create`'s `RollbackLedger` auto-rollback pattern was deliberately not reused here.
- `--dry-run` skips `validateProject` entirely (`validation: undefined`) rather than validating an unwritten tree, since that wouldn't reflect the actual post-update state.
- Fixed a pre-existing bug in `help.ts`'s generic `commandHelp` fallback while touching that function: a double-quoted string literal never interpolated `${command}`; changed to a template literal.

**Follow-ups:** `--to`/`baseline.ts`/`target.ts` (shared tag-fetch module), `--on-conflict=migrate` policy, `migrations/<version>.md` notes format, and the backwards-move refusal remain open — Phase 7 Implementation Steps 4, 10, 11, 12. The "new validator rule vs. regression" report wording (success criterion 15) also remains open pending a rule-version registry. Phase 7 status is "in progress", not "Completed", in `plan.md` and `phase-07-ds-update.md`.
