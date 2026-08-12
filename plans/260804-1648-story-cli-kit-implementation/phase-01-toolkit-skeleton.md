---
title: "Phase 1: Toolkit skeleton and CLI shell"
status: completed
priority: P1
effort: "1-2d"
dependencies: []
---

# Phase 1: Toolkit skeleton and CLI shell

## Overview

Make `ds` a real, runnable binary with nothing behind it yet: argument dispatch, help, the actionable-error contract, environment detection, and the test and typecheck gates every later phase relies on. The phase opens with a spike, because the compiled CLI must resolve the compiled engine from an installed git tarball and nothing else can be built until that is proven.

## The toolkit ships precompiled

Node *"refuses to handle TypeScript files inside folders under a `node_modules` path"* (`nodejs.org/api/typescript.html`), deliberately and with no override, and every install path puts `bin.ts` there. A toolkit that ships unbuilt TypeScript therefore cannot run at all. The distribution spike also proved that `--ignore-scripts` prevents both the build and the `ds` bin link when `bin` points into an absent `dist/`. ADR-012 therefore requires maintainers to compile before GitHub delivery. Five consequences land in this phase:

- **Maintainer build** compiling engine and CLI to JavaScript before delivery; `bin` points at the compiled entry, not at `.ts`
- **TypeScript is a contributor devDependency**, pinned per ADR-011; users execute shipped JavaScript and do not compile the toolkit
- **`files` ships the build output plus the four asset directories** — `templates/`, `migrations/`, `skill/`, `docs/`; the compiled tree is committed and verified against source
- **`--ignore-scripts` remains runnable.** It must execute the same precompiled binary because no lifecycle build is required
- **`erasableSyntaxOnly` is retained** even though nothing now depends on it, so that dropping the build stays possible if Node's restriction is ever relaxed

The Node 24.12 floor stays at 24 LTS but is now a choice rather than a constraint — type stripping no longer justifies it. Do not lower it in this phase; it is a separate decision.

## The spike — the built layout

**Question:** how does the compiled CLI entry import the compiled engine when the package is installed from a git URL?

The blocker changed the answer's shape but not the question: a workspace link still does not exist in an installed tarball. Subpath imports resolve identically for `.js`, so the recommendation below survives — but the `imports` map must point at **built** paths, and the spike confirms resolution from committed `dist/`, not from a source checkout.

The workspace link that makes `import { codegen } from "story-cli-kit-engine"` work in development does not exist in an installed tarball — npm installs the repository root, not the workspace graph. Three candidates:

- **Node subpath imports** — declare `"imports": { "#engine/*": "./dist/packages/engine/src/*.js" }` in the root `package.json`. Resolves identically in the workspace and in `node_modules`, and keeps the module boundary explicit and greppable. **Recommended.**
- Relative imports across package directories (`../../engine/src/index.ts`) — works, but erases the boundary the monorepo exists to express and makes an engine move a repo-wide edit.
- A `postinstall` that links the workspace — reintroduces the silent-install-hook failure mode ADR-012 rejected.

**Verify before writing anything else:** `npm pack`, install the tarball into a scratch directory, and run the binary from `node_modules/.bin`. Then repeat through a real git install (`npm i <local-clone-path>`, and `npx <git-url>` against a pushed branch) since git installs and tarball installs differ. If subpath imports fail under any of those, stop and report — the answer changes the repository shape, which is an ADR-level decision, not an implementation detail.

## Requirements

**Functional**

- `ds` runs from a git install using committed, precompiled JavaScript (ADR-012)
- An install that skips lifecycle scripts still runs `ds --help`; users never compile the toolkit during init or upgrade
- `ds --help` and `ds <command> --help` list commands and flags; unknown commands exit non-zero with a suggestion
- `ds` refuses to run `validate` / `update` / `migrate` / `guard` transiently via `npx` when a `.designsystem/manifest.json` is present, and points at the local command instead (ADR-007)
- Node below 24.12 fails with an instruction naming Node 24 LTS and where to get it (NFR5)
- Package manager, git presence, git repository ancestry and parent workspace declarations are all detectable as pure functions

**Non-functional**

- `erasableSyntaxOnly: true` — no enums, namespaces, parameter properties, import aliases or decorators anywhere in toolkit source. Nothing depends on this now that the toolkit compiles, but it keeps a build-free future reachable (ADR-012)
- **`verbatimModuleSyntax: true`** — `erasableSyntaxOnly` does *not* enforce `import type`, so a type imported as a value throws at runtime while `tsc --noEmit` stays green. This is the option that actually closes it, and it matters under any resolution of the ADR-012 blocker above
- A defined **exit-code contract**: 0 success, distinct non-zero codes for validation failure, refusal (gate not met), and internal error. CI and the agent skill both branch on these; describing failures only in prose leaves the codes to accumulate by accident
- `strict: true`, no `any`, no non-null assertion where a guard is possible (code-standards §5)
- `node --test` and `tsc --noEmit` both runnable from the repo root and both green

## Architecture

**Errors are a type, not a convention.** `ActionableError` carries three fields — what is wrong, what to do about it, and where to get it — and the top-level handler is the only place that writes to stderr. Any error that is not an `ActionableError` reaching the top level is itself a bug and prints as one ("this is a bug in story-cli-kit, please report"), never as a raw stack. This is NFR5 made structural instead of aspirational; a message-quality rule that lives only in prose gets forgotten by the fourth command.

**Detection never mutates.** Everything under `env/` answers questions — which package manager, is git installed, is this path inside a repository, does a parent declare workspaces — and writes nothing. `create` decides what to do with the answers. This keeps detection testable without a filesystem fixture per case, and it is what makes ADR-010's "reports what the parent needs, does not edit the file" hold by construction rather than by discipline.

**Prompts are wrapped, never called directly.** `ui/prompts.ts` is the only module importing `@clack/prompts`. Every wrapper handles `isCancel` by invoking a caller-supplied rollback and exiting cleanly. Commands that call clack directly will eventually forget the cancel branch, and that is the failure that leaves a half-written project on disk.

**Dispatch is a switch.** `node:util` `parseArgs` per command with an explicit option spec; help text is a template literal. Seven subcommands do not justify a CLI framework (code-standards §12).

## Related Code Files

- Modify: `package.json` — **exists already** as `name: "design-system-storybook", private: true`. Rename to `story-cli-kit`, **delete `private: true`** (a private package does not install, and `npx github:…` would fail at the last step), then add `engines.node >=24.12`, an explicit build script, `dependencies: { "@clack/prompts": "^<current>" }`, `devDependencies: { typescript: "6.0.3" }`, and the build shape ADR-012 fixes:

  ```jsonc
  "bin":     { "ds": "./dist/packages/cli/src/bin.js" },
  "imports": { "#engine/*": "./dist/packages/engine/src/*.js" },
  "files":   ["dist", "templates", "migrations", "skill", "docs"]
  ```


- Create: `tsconfig.json` — strict, `erasableSyntaxOnly`, `verbatimModuleSyntax`, `noEmit`, `module: nodenext`. The checking config
- Create: `tsconfig.build.json` — extends the above, `noEmit: false`, `noEmitOnError`, `rootDir: "."`, `outDir: "dist"`, `declaration: true`, excludes tests and fixtures. Declarations matter beyond this phase: Phase 4's preset is imported by every generated project, and a missing `.d.ts` degrades all of them at once
- Modify: `.gitignore` — ensure `dist/` is not ignored so verified build output can be committed
- Create: `packages/cli/src/exit-codes.ts` — the exit-code contract, one place
- Create: `packages/cli/src/bin.ts`
- Create: `packages/cli/src/errors.ts`
- Create: `packages/cli/src/help.ts`
- Create: `packages/cli/src/ui/prompts.ts`, `packages/cli/src/ui/report.ts`
- Create: `packages/cli/src/env/node.ts`, `package-manager.ts`, `git.ts`, `workspace.ts`
- Create: `packages/cli/src/env/*.test.ts` (co-located, `node:test`)
- Modify: `INDEX.md` — new source directories
- Create: `update-logs/<date>/NN-toolkit-skeleton.md`

## Implementation Steps

1. Root `package.json` (rename, drop `private`, add `build`, `bin`, `imports`, `files`, the TypeScript devDependency), both tsconfigs, and remove the `dist/` ignore. Check `@clack/prompts` current version before adding it; do not guess (code-standards §12). Confirm with `npm pack --dry-run` that the rename took, that nothing refuses on `private`, and that the packed file list is exactly `dist/`, `templates/`, `migrations/`, `skill/` and `docs/` — no `packages/`, no fixtures, no tests, no `plans/`, no `update-logs/`.
2. Run the spike from committed build output. Record the result — including the initial negative `--ignore-scripts` result that selected precompiled distribution — in the update-log entry.
3. `errors.ts` — `ActionableError` and the top-level handler. Tests assert the rendered shape of each field.
4. `env/node.ts` — version parse and floor check against 24.12. Test the boundaries: 24.11.x fails, 24.12.0 passes, 25.x passes.
5. `env/package-manager.ts` — read `npm_config_user_agent` first, fall back to `PATH` probing, return what is available plus which was detected. Never install anything (ADR-008).
6. `env/git.ts` — git present, **`user.name` and `user.email` configured**, target inside a repository, that repository's root, tree clean. Identity is not optional: a fresh macOS with Xcode CLT has git and no identity, and Phase 6 commits at step 6 of 8, so an identity failure discovered there lands after the whole project is on disk.
7. `env/workspace.ts` — does a parent declare `pnpm-workspace.yaml` or `package.json#workspaces`, and what line would register this directory. Returns the line; does not write it (ADR-010).
8. `ui/prompts.ts` — `text`, `select`, `confirm` wrappers with mandatory rollback-on-cancel.
9. `bin.ts` — dispatch, help, the npx-misuse guard, and stubs for all seven commands (`create`, `adopt`, `generate`, `validate`, `update`, `migrate`, `guard`) that exit with "not implemented yet". Verify the committed binary executes from a Git install with lifecycle scripts disabled.
10. Update-log entry; `INDEX.md` sync.

## Success Criteria

- [x] `ds --help` runs from a tarball install and from a **real git install** using committed `dist/` — the git path is the one that matters, since it is what `npx github:…` does
- [x] **An `--ignore-scripts` Git install still runs `ds --help`** because toolkit compilation is a maintainer responsibility
- [x] `npm pack --dry-run` lists `dist/`, `templates/`, `migrations/`, `skill/` and `docs/` and nothing else — no `packages/`, no fixtures, no tests, no `plans/`, no `update-logs/`. Asserted as a literal list, not eyeballed
- [x] `dist/` is committed and a clean rebuild produces no diff
- [x] `tsc --noEmit` rejects a type imported as a value — proves `verbatimModuleSyntax` is on and doing work
- [x] Exit codes are defined and asserted: success, validation failure, refusal, internal error
- [x] `node --test` green; `tsc --noEmit` green
- [x] `ds validate` run transiently via `npx` inside a directory holding a manifest prints the local-command redirect and exits non-zero
- [x] Node 24.11 produces an instruction naming Node 24 LTS, not a stack trace
- [x] Package-manager detection returns `npm` on a machine with only npm, attempting no installation
- [x] No filesystem write appears anywhere in the call graph of `env/*`
- [x] `INDEX.md` lists every new directory; update-log entry written

## Risk Assessment

**The spike fails and subpath imports do not resolve under git install.** Highest-impact risk in the plan, which is why it is step 1 of phase 1. Fallback order: relative cross-package imports, then flattening the workspace. Both are recoverable; both are ADR-level and go to the maintainer before proceeding.

**`@clack/prompts` pulls a larger tree than expected, or ships syntax Node cannot load directly.** Inspect the installed tree before committing. If it disappoints, the zero-dependency `readline/promises` path is still open at roughly 150 lines confined to `ui/prompts.ts` — the wrapper boundary is what makes that reversal cheap, and is reason to hold the boundary even though clack is expected to work.

**The build emits despite type errors.** `tsc` emits by default even when checking fails, so a maintainer build can produce working-looking output from source that does not typecheck. Set `noEmitOnError` in `tsconfig.build.json`, and keep `tsc --noEmit` as its own gate rather than assuming the build covers it — the build config excludes tests and fixtures, so it checks strictly less than the checking config does. Both enter CI in Phase 10 and the local loop now.

**Committed output drifts from source.** Precompiled distribution moves build failure from the user to the maintainer but creates a stale-artifact risk. Phase 1 requires a clean rebuild before completion; Phase 10 makes the same check mandatory in CI before release.
