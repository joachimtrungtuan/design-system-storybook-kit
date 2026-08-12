# Test Report — 2026-08-12 — Phase 1 toolkit skeleton

## Final result

**PASS, subject to the planned local commit gate.** Packaging, typecheck, tests, build fidelity, missing-target Git detection, invalid-option handling, documentation consistency, and project-local `npm exec` provenance (including a hoisted npm workspace) are green. `dist/` remains an unignored, rebuild-stable pending commit gate.

## Passed

- `npm run typecheck` — pass.
- `npm test` — final 23/23 pass: exit codes, actionable error rendering, Node 24.11/24.12 boundary, package-manager detection, Git/workspace detection, prompt rollback, transient guard, the `verbatimModuleSyntax` negative fixture, compiled-layout coverage, and hoisted-workspace provenance.
- `npm run build` — pass. Final SHA-256 manifest of `dist/` was identical before/after (`661563ae...84ca9`), so the current generated output is deterministic.
- CLI executable checks:
  - `node dist/packages/cli/src/bin.js --help` — pass.
  - `node dist/packages/cli/src/bin.js validate --help` — pass.
  - `node dist/packages/cli/src/bin.js valid` — refusal text suggests `ds validate`; exit 2.
  - With `npm_command=exec` and a temporary `.designsystem/manifest.json`, `ds validate` redirects to `npm run ds:validate`; exit 2.
- Node-floor test verifies `24.11.9` produces an actionable instruction naming Node 24 LTS and `nodejs.org/en/download`, without a raw stack.
- Tarball install: `npm install --ignore-scripts <temporary-pack-tarball>` linked `node_modules/.bin/ds`; `ds --help` passed.
- Local Git install: a temporary Git repository made from the packed artifact, installed with `npm install --ignore-scripts --allow-git=all git+file://...`, linked `ds`; `ds --help` passed. `--allow-git=all` was command-scoped because this environment defaults npm's Git gate to `none`.
- Static env audit: `rg` found no filesystem write APIs in `packages/cli/src/env/`; its calls are read/probe operations (`existsSync`, `readFileSync`, `accessSync`, and fixed read-only Git commands). The write APIs found are test-fixture setup outside `env/` runtime modules.
- `INDEX.md` lists `packages/cli/src/env/`, `packages/cli/src/ui/`, `dist/`, `migrations/`, and `skill/`; `git diff --check` passed.
- Repair regression: `npm pack --dry-run --json` contains exactly 39 package files under `package.json`, `dist/`, `templates/`, `migrations/`, `skill/`, and `docs/`. Both `migrations/README.md` and `skill/README.md` are now shipped; no unexpected package path was found.
- Commit gate: `git check-ignore -v dist` has no result, and the build-output SHA-256 manifest remained `661563ae...84ca9` before and after `npm run build`. `git status --short` still shows `?? dist/`, which is expected until the owner makes the focused commit.

## Code-review correction verification

- **PASS:** `inspectGit()` against a missing nested target inside a temporary Git repository resolved the nearest existing ancestor and reported the enclosing root, configured identity, and clean state.
- **PASS (final retest):** A temporary consumer installed from a local Git repository with `--ignore-scripts` linked `node_modules/.bin/ds`; `npm exec -- ds validate` returned the expected Phase 1 `not implemented yet` actionable refusal (exit 2), with no transient redirect. `EXECUTION_PACKAGE_ROOT` now resolves four levels above the compiled entry to the installed package root, and compiled-layout coverage protects that invariant.
- **PASS (workspace retest):** A real temporary npm workspace hoisted `story-cli-kit` to `<workspace>/node_modules` while the manifest lived at `<workspace>/apps/design-system/.designsystem/manifest.json`. From that app, `npm exec -- ds validate` reached the local Phase 1 stub (exit 2) without a transient redirect. A non-hoisted install did the same; executing the repository's distinct binary against the manifest correctly redirected as transient.
- **PASS:** Executing a different package root against the same manifest returned refusal exit 2 and a package-manager-neutral instruction containing npm, pnpm, and yarn forms.
- **PASS:** `ds validate --bogus` returned actionable help (`Run 'ds validate --help'`) with exit 2, not internal-error exit 70.
- **PASS:** `AGENTS.md`, `CLAUDE.md`, and `docs/code-standards.md` consistently describe verified root `dist/` as the sole generated-artifact commit exception.
- **PASS:** Final `npm run typecheck`, `npm test` (23/23, including compiled-layout and hoisted-workspace coverage), literal pack-surface assertion (39 entries; no missing or unexpected paths), `npm run build`, and `git diff --check` all pass. The current rebuild SHA-256 manifest is `661563ae...84ca9` before and after the build.

## Repaired criterion

The original package-surface failure is resolved by the Phase 1 responsibility READMEs in `migrations/` and `skill/`. Their content correctly defers substantive migration notes and `skill/SKILL.md` to their owning later phases.

## Commands and evidence

```text
npm run typecheck
npm test
npm run build
node dist/packages/cli/src/bin.js --help
node dist/packages/cli/src/bin.js validate --help
node dist/packages/cli/src/bin.js valid                    # exit 2
env npm_command=exec node <dist-bin> validate              # manifest temp cwd; exit 2
npm_config_cache=<temp> npm pack --dry-run --json
npm_config_cache=<temp> npm pack --pack-destination <temp>
npm_config_cache=<temp> npm install --ignore-scripts <tarball>
npm_config_cache=<temp> npm install --ignore-scripts --allow-git=all git+file://<temp-repo>
git init <temporary-repo>; node --input-type=module '<inspectGit missing nested target>'
npm exec -- ds validate                              # installed local package; reaches Phase 1 stub, exit 2
npm install --ignore-scripts --allow-git=all          # temporary npm workspace; package hoisted at root
node <different-package-root>/dist/packages/cli/src/bin.js validate
node dist/packages/cli/src/bin.js validate --bogus   # exit 2
node -e '<parse pack JSON; assert literal allowed package surfaces>'
git check-ignore -v dist
rg -n 'write(File|FileSync|Sync)|appendFile|mkdir|rm|unlink|rename|copyFile|chmod|open\\(' packages/cli/src/env --glob '*.ts'
git diff --check
```

The first isolated-cache install attempt could not resolve npm registry DNS in the sandbox. Re-running the same scoped install with approved network access passed; no user npm cache or configuration was changed.

## Phase-owned-later / handoff

- Command implementations beyond help/dispatch are correctly unimplemented in this phase; their `ActionableError` stubs are not failures.
- CI enforcement of the rebuild-diff check is Phase 10 follow-up per the update log. The Phase 1 source/build equality check itself was executed above.
- Add the verified `dist/` output to the upcoming focused local commit.
