---
title: "Phase 1: Toolkit skeleton and CLI shell"
status: todo
priority: P1
effort: "1-2d"
dependencies: []
---

# Phase 1: Toolkit skeleton and CLI shell

## Overview

Make `ds` a real, runnable binary with nothing behind it yet: argument dispatch, help, the actionable-error contract, environment detection, and the test and typecheck gates every later phase relies on. The phase opens with a spike, because ADR-012 removed the build step that ADR-007 assumed would inline the engine, and nothing else can be built until that hole is closed.

## Unblocked: ADR-012 rewritten 2026-08-05 — the toolkit builds through `prepare`

The red team refuted the original ADR-012, verified against `nodejs.org/api/typescript.html`: Node *"refuses to handle TypeScript files inside folders under a `node_modules` path"*, deliberately, with no override. Every install path puts `bin.ts` there, so "`ds --help` runs from a git install with no build step" was unachievable and gated all ten remaining phases.

**Resolved: `prepare` compiles the toolkit at install time.** `architecture.md` ADR-012 carries the full reasoning and the three rejected alternatives. What this phase must build differs from the original plan in five concrete ways:

- **`prepare` script** compiling engine and CLI to JavaScript; `bin` points at the compiled entry, not at `.ts`
- **TypeScript is a devDependency**, pinned per ADR-011, fetched at install time — npm installs devDependencies before running `prepare` on a git install (ADR-007)
- **`files` ships the build output plus `templates/`**; the compiled tree is gitignored and never committed
- **`--ignore-scripts` must fail legibly.** `npm ci --ignore-scripts` is common CI policy; `prepare` then never runs and the compiled entry is absent. This is the phase's sharpest new edge and it needs a real check, not a stack trace
- **`erasableSyntaxOnly` is retained** even though nothing now depends on it, so that dropping the build stays possible if Node's restriction is ever relaxed

The Node 24.12 floor stays at 24 LTS but is now a choice rather than a constraint — type stripping no longer justifies it. Do not lower it in this phase; it is a separate decision.

## The spike — still required, now about the built layout

**Question:** how does the compiled CLI entry import the compiled engine when the package is installed from a git URL?

The blocker changed the answer's shape but not the question: a workspace link still does not exist in an installed tarball. Subpath imports resolve identically for `.js`, so the recommendation below survives — but the `imports` map must point at **built** paths, and the spike must now confirm resolution *after* `prepare` has run, not in a source checkout.

The workspace link that makes `import { codegen } from "story-cli-kit-engine"` work in development does not exist in an installed tarball — npm installs the repository root, not the workspace graph. Three candidates:

- **Node subpath imports** — declare `"imports": { "#engine/*": "./packages/engine/src/*" }` in the root `package.json`. Resolves identically in the workspace and in `node_modules`, needs no build, and keeps the module boundary explicit and greppable. **Recommended.**
- Relative imports across package directories (`../../engine/src/index.ts`) — works, but erases the boundary the monorepo exists to express and makes an engine move a repo-wide edit.
- A `postinstall` that links the workspace — reintroduces the silent-install-hook failure mode ADR-012 rejected.

**Verify before writing anything else:** `npm pack`, install the tarball into a scratch directory, and run the binary from `node_modules/.bin`. Then repeat through a real git install (`npm i <local-clone-path>`, and `npx <git-url>` against a pushed branch) since git installs and tarball installs differ. If subpath imports fail under any of those, stop and report — the answer changes the repository shape, which is an ADR-level decision, not an implementation detail.

## Requirements

**Functional**

- `ds` runs from a git install, compiled by `prepare` at install time, with nothing generated committed (ADR-012)
- An install that skipped build scripts (`--ignore-scripts`) produces an instruction naming what happened and how to fix it, never a missing-module stack trace (NFR5)
- `ds --help` and `ds <command> --help` list commands and flags; unknown commands exit non-zero with a suggestion
- `ds` refuses to run `validate` / `update` / `migrate` transiently via `npx` when a `.designsystem/manifest.json` is present, and points at the local command instead (ADR-007)
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

**Dispatch is a switch.** `node:util` `parseArgs` per command with an explicit option spec; help text is a template literal. Five subcommands do not justify a CLI framework (code-standards §12).

## Related Code Files

- Modify: `package.json` — **exists already** as `name: "design-system-storybook", private: true`. Rename to `story-cli-kit`, **delete `private: true`** (a private package does not install, and `npx github:…` would fail at the last step), then add `bin` (pointing at the *compiled* entry), `imports` (pointing at *compiled* paths), `files` (build output + `templates/`), `engines.node >=24.12`, `scripts.prepare`, `dependencies: { "@clack/prompts": "^<current>" }` and `devDependencies: { typescript: "6.0.3" }`
- Create: `tsconfig.json` — strict, `erasableSyntaxOnly`, `verbatimModuleSyntax`, `noEmit`, `module: nodenext`. The checking config
- Create: `tsconfig.build.json` — extends the above, `noEmit: false`, `outDir`, excludes tests and fixtures. The emitting config, invoked by `prepare`
- Modify: `.gitignore` — the build output directory. Verify with `git check-ignore` after writing; per the standing git rules, `git add` on an ignored path is a silent no-op and the inverse mistake is just as quiet
- Create: `packages/cli/src/exit-codes.ts` — the exit-code contract, one place
- Create: `packages/cli/src/bin.ts`
- Create: `packages/cli/src/errors.ts`
- Create: `packages/cli/src/help.ts`
- Create: `packages/cli/src/ui/prompts.ts`, `packages/cli/src/ui/report.ts`
- Create: `packages/cli/src/env/node.ts`, `package-manager.ts`, `git.ts`, `workspace.ts`
- Create: `packages/cli/src/env/*.test.ts` (co-located, `node:test`)
- Modify: `INDEX.md` — new source directories
- Create: `update-logs/2026-08-04/NN-toolkit-skeleton.md`

## Implementation Steps

1. Root `package.json` (rename, drop `private`, add `prepare`, `bin`, `imports`, `files`, the TypeScript devDependency), both tsconfigs, and the `.gitignore` entry. Check `@clack/prompts` current version before adding it; do not guess (code-standards §12). Confirm with `npm pack --dry-run` that the rename took, that nothing refuses on `private`, and that the packed file list is the build output plus `templates/` — no fixtures, no tests, no `plans/`.
2. Run the spike, **after** `prepare` has run rather than in a source checkout. Record the result — including a negative result — in the update-log entry, since it either confirms or contradicts ADR-007's "one artifact" reasoning. Order is reversed from the original plan: the spike now needs a build to exist before it can answer anything.
3. `errors.ts` — `ActionableError` and the top-level handler. Tests assert the rendered shape of each field.
4. `env/node.ts` — version parse and floor check against 24.12. Test the boundaries: 24.11.x fails, 24.12.0 passes, 25.x passes.
5. `env/package-manager.ts` — read `npm_config_user_agent` first, fall back to `PATH` probing, return what is available plus which was detected. Never install anything (ADR-008).
6. `env/git.ts` — git present, **`user.name` and `user.email` configured**, target inside a repository, that repository's root, tree clean. Identity is not optional: a fresh macOS with Xcode CLT has git and no identity, and Phase 6 commits at step 6 of 8, so an identity failure discovered there lands after the whole project is on disk.
7. `env/workspace.ts` — does a parent declare `pnpm-workspace.yaml` or `package.json#workspaces`, and what line would register this directory. Returns the line; does not write it (ADR-010).
8. `ui/prompts.ts` — `text`, `select`, `confirm` wrappers with mandatory rollback-on-cancel.
9. `bin.ts` — dispatch, help, the npx-misuse guard, and stubs for all six commands that exit with "not implemented yet". Plus the **`--ignore-scripts` guard**: `bin` resolves to a file `prepare` produces, so an install that skipped build scripts leaves nothing to run and Node reports a missing module before any of this code is reached. Detect the absent build at the earliest point that still executes, and raise an `ActionableError` naming the cause (build scripts were skipped) and the fix (`npm rebuild story-cli-kit`, or reinstall without `--ignore-scripts`). Test by installing a tarball with `--ignore-scripts` and asserting the message rather than a stack trace.
10. Update-log entry; `INDEX.md` sync.

## Success Criteria

- [ ] `ds --help` runs from a tarball install and from a **real git install**, where `prepare` compiled it — the git path is the one that matters, since it is what `npx github:…` does
- [ ] **An `--ignore-scripts` install produces the actionable message**, not a missing-module stack trace. Verified by actually installing that way, not by unit-testing the branch
- [ ] `npm pack --dry-run` lists the build output and `templates/` and nothing else — no fixtures, no tests, no `plans/`
- [ ] Nothing generated is committed: `git status` is clean after a build, and `git check-ignore` confirms the output directory is ignored
- [ ] `tsc --noEmit` rejects a type imported as a value — proves `verbatimModuleSyntax` is on and doing work
- [ ] Exit codes are defined and asserted: success, validation failure, refusal, internal error
- [ ] `node --test` green; `tsc --noEmit` green
- [ ] `ds validate` run transiently via `npx` inside a directory holding a manifest prints the local-command redirect and exits non-zero
- [ ] Node 24.11 produces an instruction naming Node 24 LTS, not a stack trace
- [ ] Package-manager detection returns `npm` on a machine with only npm, attempting no installation
- [ ] No filesystem write appears anywhere in the call graph of `env/*`
- [ ] `INDEX.md` lists every new directory; update-log entry written

## Risk Assessment

**The spike fails and subpath imports do not resolve under git install.** Highest-impact risk in the plan, which is why it is step 1 of phase 1. Fallback order: relative cross-package imports, then flattening the workspace. Both are recoverable; both are ADR-level and go to the maintainer before proceeding.

**`@clack/prompts` pulls a larger tree than expected, or ships syntax Node cannot load directly.** Inspect the installed tree before committing. If it disappoints, the zero-dependency `readline/promises` path is still open at roughly 150 lines confined to `ui/prompts.ts` — the wrapper boundary is what makes that reversal cheap, and is reason to hold the boundary even though clack is expected to work.

**The build emits despite type errors.** `tsc` emits by default even when checking fails, so `prepare` can produce a working-looking install from source that does not typecheck. Set `noEmitOnError` in `tsconfig.build.json`, and keep `tsc --noEmit` as its own gate rather than assuming the build covers it — the build config excludes tests and fixtures, so it checks strictly less than the checking config does. Both enter CI in Phase 10 and the local loop now.

**`prepare` fails on the user's machine.** The new failure surface ADR-012 accepted: a TypeScript fetch that fails behind a proxy, a disk-space failure, or a Node version mismatch now breaks *installation* rather than execution, and npm's output for a failed lifecycle script is not friendly. Nothing in this phase can catch it — the code does not run — so the mitigations are indirect: keep the build fast and dependency-light, pin TypeScript (ADR-011), and make the `--ignore-scripts` guard's message good, since a skipped build and a failed build land the user in the same place.
