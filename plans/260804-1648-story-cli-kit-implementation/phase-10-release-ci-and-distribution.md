---
title: "Phase 10: Release, CI and distribution"
status: todo
priority: P2
effort: "1-2d"
dependencies: [1, 2, 3, 4, 5, 6, 7, 8, 9]
---

# Phase 10: Release, CI and distribution

## Overview

Make the thing installable and keep it honest. `npx github:joachimtrungtuan/story-cli-kit` has to work from a clean machine, semver tags have to resolve as ranges for generated projects, and the gates ADR-012 leaves exposed have to run in CI: `tsc --noEmit` checks strictly more than the build config does (the build excludes tests and fixtures), and `node --test` is not implied by anything compiling successfully.

The stack table in `docs/architecture.md` carries a verification date for a reason. A version table trusted without being current is worse than none, so re-verification is a release gate here, not an aspiration.

## Requirements

**Functional**

- `npx github:joachimtrungtuan/story-cli-kit create` works from a machine with only Node 24 LTS and npm
- Semver tag ranges resolve on git dependencies: a generated project depends on `github:joachimtrungtuan/story-cli-kit#semver:^1.0.0`, not a pinned commit (ADR-007)
- `package.json#files` ships `packages/` and `templates/` and nothing else — no fixtures, no tests, no plans
- CI on push and pull request: `tsc --noEmit`, `node --test`, and `ds validate` against the template
- A release checklist that includes writing `migrations/<version>.md` and re-verifying the stack table
- Repository README explaining install, the two entry commands, and what the toolkit is

**Non-functional**

- **No committed build artefacts.** The build output is gitignored and produced by `prepare` at install time (ADR-012, rewritten 2026-08-05). The standing "never commit `dist/`" rule holds; what changed is that a `prepare` hook is now required rather than forbidden
- **`--ignore-scripts` is a release-blocking test**, not an edge case. It is common CI policy, it silently skips the build, and `ds` is then missing its entry point. Phase 1 builds the guard; this phase verifies it survives a real release install
- CI must fail on a type error — under type stripping, nothing else catches one

## Architecture

**Semver on a git dependency needs tags that are real releases.** `#semver:^1.0.0` matches tags in the remote much as a registry range would, so the tag *is* the release. That means the tagged commit must be installable exactly as it stands: no build, correct `files`, correct `bin`, dependencies declared as `dependencies` rather than `devDependencies`. A tag that only works from a checkout is a broken release, and nothing in the repository catches that except an install test.

**The install test runs against a real git URL, not a local path.** `npm i /path/to/clone` behaves differently from `npm i github:user/repo` — different resolution, different file selection. Verify what users actually run.

**Re-verification is a checklist item with a date.** Every engine release re-checks the stack table against the registry and updates the date, or the table quietly rots and generated projects start installing versions nobody looked at. This is cheap to do and impossible to reconstruct later.

**Version bumps mean what `update-and-migration.md` says they mean**, defined by impact on a generated project rather than on the toolkit's internals. A new validator rule is a minor bump that can fail an existing project — intended, since the project was already violating a rule that had not been written yet, and the release notes must say so plainly rather than let it read as a regression.

## Related Code Files

- Create: `.github/workflows/ci.yml` — typecheck, test, validate template
- Create: `README.md` — repository README (install, commands, what this is)
- Create: `docs/releasing.md` — the release checklist
- Modify: `package.json` — `files`, `engines`, `version`, `repository`
- Modify: `docs/architecture.md` — stack table verification date at each release
- Modify: `INDEX.md`
- Create: `update-logs/2026-08-04/NN-release-pipeline.md`

## Implementation Steps

1. `package.json` finalisation: `files`, `version`, `repository`, `engines`. Confirm with `npm pack --dry-run` that the tarball contains `packages/` and `templates/` and excludes fixtures, tests and `plans/`.
2. CI workflow on Node 24 LTS: `tsc --noEmit`, `node --test`, then `ds create` into a temp directory followed by `ds validate` — an end-to-end smoke test is worth more here than any unit test.
3. Tag `v0.1.0` and run the real install test: `npx github:joachimtrungtuan/story-cli-kit --help` from a clean directory, on a machine with npm only.
4. Verify the semver-range form resolves: create a project, confirm its dependency is a range, and confirm a new tag is picked up by an install.
5. `docs/releasing.md`: bump rules, migration notes, stack re-verification, tag, install test. The checklist is the release process; there is no other one.
6. Repository README.
7. Final docs sync — reconcile every doc against what was actually built, especially anything the implementation phases clarified.
8. Update-log entry, and an end-of-session note if the maintainer asks for one.

## Success Criteria

- [ ] `npx github:joachimtrungtuan/story-cli-kit create` succeeds on a clean machine with only Node 24 LTS and npm
- [ ] `npm pack --dry-run` shows `packages/` and `templates/` and no fixtures, tests or plans
- [ ] CI fails on an introduced type error and on a failing test — verified by introducing each once
- [ ] CI's end-to-end job creates a project and validates it clean
- [ ] A generated project's toolkit dependency is a semver range, and a newly published tag is picked up
- [ ] No `dist/`, no build artefact, no `prepare` hook anywhere
- [ ] Stack table re-verified and its date updated
- [ ] Every doc reconciled with the implementation; open questions resolved or explicitly still open
- [ ] `INDEX.md` current

## Risk Assessment

**`npx` on a git URL is slower than a registry install, and ADR-012's rewrite made it slower again.** npm clones the repository, then installs TypeScript and runs `prepare` — the build is back, and it is the larger part of the wait. ADR-012 accepted this knowingly and named the npm registry as the documented upgrade path if it proves as annoying in practice as on paper. So measure it and record the number: a first-run figure is the evidence that decision gets revisited on, and without it the question stays a matter of opinion. Not a reason to reverse ADR-007 unilaterally.

**`files` omits something `prepare` needs, or ships something it should not.** The packed tarball is now a different shape from the source tree — build output plus `templates/`, no `src/`. Two failure directions and both are quiet: omitting a runtime asset breaks the installed package while the workspace keeps working, and over-including ships fixtures and tests to every user. `npm pack --dry-run` in CI, with the file list asserted rather than eyeballed.

**The tag is broken in a way the workspace hides.** The specific failure mode of this distribution model, and the reason step 3 installs from a real git URL rather than from a local path. Make it a release-checklist item, not a one-time check.

**Stack re-verification gets skipped under time pressure.** It is the cheapest item on the checklist and the one whose omission is invisible for months. Keeping the verification date visible in `architecture.md` is the guard — a stale date is legible, a stale table is not.
