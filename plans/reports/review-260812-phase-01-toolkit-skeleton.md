# Final code re-review — 2026-08-12 — Phase 1 toolkit skeleton

Verdict: **PASS, subject only to the authorized focused commit gate.** No actionable findings remain. All prior review findings are repaired, the source and precompiled artifact are byte-identical, and Phase 1's formal success criteria are evidenced or correctly classified as pending commit-only.

## Findings

**No actionable findings.**

## Prior-finding resolution

### Resolved — Missing-target Git ancestry

- `nearestExistingAncestor()` gives read-only Git probes a real `-C` context for a target that does not exist yet.
- A temporary repository integration check returned the enclosing root, configured identity, repository membership, and clean state for a missing nested target.

### Resolved — Project-local versus transient package provenance

- `resolveExecutionPackageRoot()` correctly walks four levels from `dist/packages/cli/src/bin.js` to the installed package root.
- `isProjectLocalInstallation()` now uses project-scoped `createRequire()` resolution for `story-cli-kit/package.json`, so it follows the dependency layout chosen by npm instead of assuming `<cwd>/node_modules/story-cli-kit`.
- Fresh non-hoisted and hoisted-workspace `npm exec` fixtures both reached the project-local Phase 1 stub with no transient redirect.
- A distinct repository binary executed against the same workspace manifest was refused as transient with exit 2 and the package-manager-neutral npm/pnpm/yarn recovery instruction.
- The updated tester report additionally records a real temporary npm workspace install whose dependency was hoisted to the workspace root; project-local provenance passed there.

### Resolved — Governance conflict over committed `dist/`

- `AGENTS.md:81`, `CLAUDE.md:81`, and `docs/code-standards.md:74` consistently make verified root `dist/` the sole generated-artifact commit exception required by ADR-012.
- The accepted precompiled-distribution decision is unchanged; no broader generated-artifact exception was introduced.

### Resolved — Invalid-option classification

- Expected `parseArgs` usage failures are translated to `ActionableError` refusals.
- `ds validate --bogus` exits 2 with the relevant help instruction rather than using internal-error exit 70.

## Spec-compliance verdict

Stage 1: **PASS.** The CLI shell, help/dispatch, Node floor, actionable errors, stable exit codes, pure environment detectors, prompt rollback boundary, transient-version guard, strict TypeScript configuration, installable package surface, and committed-precompile architecture match the Phase 1 plan. Command bodies remain correctly deferred.

Formal criteria are satisfied as follows:

| Criterion group | Result | Evidence |
| --- | --- | --- |
| Tarball and local-Git installs, including `--ignore-scripts` | PASS | Recorded real install checks link and execute `ds --help` without lifecycle compilation. |
| Package allowlist | PASS | 39 files under only `dist`, `docs`, `migrations`, `package.json`, `skill`, and `templates`; no source, fixtures, tests, plans, or logs. |
| Source/build fidelity | PASS | Fresh isolated build is byte-identical to `dist/`, including declarations and source maps. |
| `dist/` committed | PENDING COMMIT ONLY | Output is unignored, verified, and intentionally untracked until the requested focused commit is authorized. |
| TypeScript and test gates | PASS | Typecheck exit 0; 23/23 tests pass, including the negative type-import fixture and compiled-layout coverage. |
| Exit codes and NFR5 errors | PASS | Stable 0/1/2/70 constants; unsupported Node, invalid command/option, transient refusal, and unexpected errors use the required classifications without raw stacks. |
| Project-local provenance | PASS | Non-hoisted local, real hoisted npm workspace, and distinct transient package paths are all distinguished. |
| Pure detection and documentation sync | PASS | `env/*` remains read-only; missing-target Git and workspace detection pass; `INDEX.md`, governance files, and update log agree. |

## Quality, reliability, and security verdict

Stage 2: **PASS.** No breaking public-contract change exists beyond the explicit precompiled-distribution decision.

- Git subprocesses use `execFileSync` with fixed argument arrays, no shell, ignored stdin, and no write-capable operations.
- Package provenance compares resolved and real paths, covering symlinked and hoisted npm layouts without trusting launcher environment variables.
- Workspace and package-manager detectors remain read-only; prompt cancellation awaits rollback; unexpected errors suppress implementation details and stacks.
- The implementation remains small and direct: native argument parsing, one prompt dependency, explicit command dispatch, and no premature command implementations.
- The compiled CLI, declarations, and maps faithfully represent current source.

## Fresh independent verification

- `npm run typecheck` — exit 0.
- `npm test` — 23 tests, 23 pass, 0 fail.
- Isolated `tsc -p tsconfig.build.json` against an equivalent root layout — exit 0; `diff -qr` against `dist/` found no differences.
- `npm pack --dry-run --json` — 39 allowed files, no disallowed paths.
- `git diff --check` — exit 0.
- Non-hoisted local `npm exec` — reaches Phase 1 stub, exit 2, no transient redirect.
- Hoisted workspace local `npm exec` — reaches Phase 1 stub, exit 2, no transient redirect.
- Distinct package root — actionable transient refusal with neutral npm/pnpm/yarn recovery, exit 2.
- Updated tester evidence independently confirms a real temporary npm workspace hoist, real Git install, tarball install, deterministic rebuild, and the same 23-test result.

## Review disposition

Code review is approved. Phase 1 may proceed to the requested focused local commit when authorized, including the verified `dist/` tree and all coherent Phase 1 paths. Do not push or deploy. The pending commit is the sole remaining delivery state and is not a code or review finding.
