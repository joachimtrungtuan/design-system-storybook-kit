# Phase 6 progress — `ds create` and `ds generate`

**Date:** 2026-08-17
**Plan:** `plans/260804-1648-story-cli-kit-implementation/`
**Phase:** 6 — `ds create` and `ds generate`
**Status:** Implementation complete; real npm installation and production builds are verified, while dev-server startup and expanded interaction evidence remain pending.

## Verified

- `node_modules/.bin/tsc --noEmit -p tsconfig.json` passes.
- `node_modules/.bin/tsc -p tsconfig.build.json` passes and the committed `dist/` surface was regenerated.
- Full source suite passes: 120/120 tests.
- `git diff --check` passes.
- Compiled `ds create <temp> --no-install --yes --package-manager npm` writes token CSS and a manifest with `appliedMigrations: []`, creates the initial git commit, and prints both deferred install/validate commands.
- Unit coverage verifies non-empty README/LICENSE preservation, `src/` collision refusal, normalized checksums, rendered `package.json`, all four generated tiers, rollback of owned paths, staged-path reset on enclosing commit failure, partial git-init cleanup, and retained scaffolds after install failure.
- Disposable generated project completed a real npm install: 180 packages added, 182 audited, 0 vulnerabilities.
- Installed `npm exec -- ds validate --json` passes after fixing local package-root detection for the package's ESM-only `exports` map.
- Disposable project passes `npm run build` and `npm run build-storybook`.

## Pending evidence

- The automatic `create`-owned install retry stalled in npm registry resolution; manual npm installation of the same generated project completed and validated successfully.
- Vite and Storybook dev-server startup remain unverified because the sandbox rejects localhost listeners with `EPERM`; two elevated approval attempts timed out before launch. Production builds are green.
- Prompt cancellation and injected failure coverage is strong for core rollback paths but not exhaustive for every prompt and every materialisation/codegen stage.
- pnpm wrapper commands remain blocked by the environment's read-only SQLite store; direct installed Node/TypeScript binaries provide the available verification.
- The delegated code-review and project-management capabilities hung during bounded retries and returned no report; no delegated edits were applied. The implementation was manually rechecked against their requested acceptance surfaces.

## Next action

Run the automatic create-owned install plus Vite/Storybook dev-server acceptance on an environment that permits localhost listeners, then mark Phase 6 complete only if those checks pass. The plan index was reindexed into a writable temporary `AGENTKIT_HOME`; repository Markdown remains canonical in this sandbox.
