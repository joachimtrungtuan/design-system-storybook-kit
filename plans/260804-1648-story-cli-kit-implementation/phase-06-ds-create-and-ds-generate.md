---
title: "Phase 6: ds create and ds generate"
status: todo
priority: P1
effort: "3-4d"
dependencies: [5]
---

# Phase 6: `ds create` and `ds generate`

## Overview

The command a user meets first. `create` resolves and confirms a target, gates prerequisites, runs conditional prompts, copies the template, generates tokens, writes the manifest, initialises git, installs dependencies, and ends with a project where two commands already work. `generate` is the small companion that scaffolds one component plus its story at contract-correct paths.

Everything about this phase is governed by a single sentence in FR6: a scaffold that ends by telling the user to go and install dependencies has not finished.

## Requirements

**Functional — `create`**

- Interactive by default; every flag overrides a prompt, no flag is a prerequisite (FR6)
- The install target is resolved to an absolute path and shown for confirmation before anything is written (FR1)
- Target may be the current directory, a new subdirectory, or a nested path inside an existing repository — all three equally supported
- Prerequisite gates before any write: Node ≥ 24.12, git present and identity configured, target free of collisions. Each failure is an instruction (NFR5)
- **A non-empty target is allowed; a colliding one is refused.** Decided 2026-08-05 — previously undefined. `create` refuses only when a path the template ships already exists, naming the colliding paths and pointing at `ds adopt`
- Package manager detected, never installed; generated scripts and lockfile match it (ADR-008)
- `git init` plus one commit containing the scaffold (ADR-009)
- **Inside an existing repository:** state which repository was detected, offer enclosing (default) or independent nested, and on independent report what the parent needs — a submodule entry or a `.gitignore` line (ADR-009)
- **Parent declares workspaces:** report that the directory should be registered and print the line. Do not edit the parent's file (ADR-010)
- Dependencies installed as part of `create`, skippable by flag for automated use
- `tokens.css` generated, `.designsystem/manifest.json` written with checksums as shipped
- `ds validate` passes on the result

**Functional — `generate`**

- `ds generate <tier> <name>` writes the component directory, `index.ts`, the tier barrel entry and the mirrored story file
- Refuses an unknown tier and a name that would violate the naming rules, with the rule quoted
- Output passes `ds validate` (NFR4: nothing beyond the component folder, its story and the barrel)

**Non-functional**

- Cancel at any prompt leaves nothing behind
- Prompts are conditional — a user scaffolding into an empty directory never sees a git-ancestry or workspace question (FR6)
- Every operation is documented well enough to be performed by hand (NFR2)

## Architecture

**Decide everything, then write.** `create` runs as two separated stages: a plan stage that gathers detection results and prompt answers into one description of intended work, and an apply stage that executes it. Interleaving prompts with writes is what produces half-written directories, and it makes the whole flow untestable — the plan stage is a pure function of environment plus answers, so it can be tested exhaustively without touching a disk.

**Rollback is a recorded list, not a heuristic — and each entry records the pre-state.** The apply stage appends every path it touches together with what was there before: *created* (nothing was there) or *overwrote* (bytes existed). Rollback removes only what was created and restores what was overwritten. The red team found the earlier "every path it creates" wording fatal in the adopt-adjacent case: `git init` runs *after* copy, so between those two steps there is no git history to recover from, and a ledger that cannot distinguish the two classes deletes pre-existing user files on Ctrl-C. Never a recursive delete of the target. If `git init` already ran and the commit landed, rollback stops and reports rather than deleting a repository.

**Emptiness is the wrong question; collision is the right one.** `create` into a non-empty directory was undefined until 2026-08-05. Refusing every non-empty target is simplest but breaks a case this phase explicitly supports — scaffolding into the current directory — because a bare `.git`, a `README.md` or a `LICENSE` is enough to make a directory non-empty, and none of them are in the template's way. So the gate compares the template's file list against the target: a `README.md` beside a scaffold is fine, an existing `src/` is not.

Refusal names the colliding paths and routes to `ds adopt`, which exists precisely for "there is already a project here" (ADR-013). Rejected: prompting to overwrite. It puts a destructive default one keystroke away during the first command a new user ever runs, and ADR-013 removed `--force` from `adopt` for the same reason — a toolkit whose central claim is that it never silently overwrites user work does not get to make an exception for its friendliest command.

This gate and the rollback ledger are separate defences and both are needed. The gate stops the collision before any write; the ledger's created-vs-overwrote distinction protects the files the gate deliberately allows past it.

**Git identity is a gate, not a discovery.** Phase 1's `env/git.ts` reports git *presence*; presence is not enough. A fresh macOS with Xcode command line tools has git and no `user.email`, and the commit is step 6 of 8 — so the failure lands after the entire project is on disk, where rollback must either delete a working project or leave a repository with no commit, with raw git stderr on the way out. That breaks NFR5 and ADR-009 in one move. Check `user.name` and `user.email` alongside the other preflight gates, and refuse early with the two `git config` commands that fix it.

**The manifest is written last, from what was actually copied.** Checksums are computed from the files on disk after copy, not from the template source, so the manifest describes reality. Everything `update` and `adopt` later do rests on that being true.

**Order matters and is fixed:** gates → prompts → copy → token codegen → manifest → `git init` and commit → install → validate. Install comes after the commit so the scaffold is recoverable before the slowest and most failure-prone step. Validate comes last so its result describes the finished project.

**`generate` shares the template's component scaffolds** rather than holding its own string templates. Two sources for the same shape drift, and the drift would be invisible until someone compared a generated component with a shipped one.

**Committing into an enclosing repository stages by explicit pathspec, on a clean tree.** When the user chooses the enclosing repository, a bare `git add -A` sweeps whatever they had in flight into the scaffold commit. Gate on a clean tree the same way `update` does, and stage only the paths the ledger recorded.

**Rendered files are their own manifest class.** `templates/storybook-vite/package.json` carries `{{placeholders}}`, and nothing in the plan owned the substitution until the review. Two consequences, both load-bearing: the renderer lives here, beside `apply.ts`; and the manifest records the checksum of **what was written**, with the entry marked *rendered*. Checksumming the rendered bytes while `update` compares against unrendered template bytes would mark `package.json` conflicted on the first update of every project ever created — a permanent false conflict in the file users are most likely to have legitimately edited.

**`generate` must not append to a checksum-managed barrel.** `ds generate` writes a tier barrel entry, and that barrel is a template-shipped file the manifest tracks — so the NFR4-blessed way to add a component guarantees a conflict on every future update of every project that ever used it. Resolve it here, one of two ways: make tier barrels generated files (regenerated from the directory contents, never checksum-compared, same class as `tokens.css`), or have `generate` stop touching them and require an explicit export. Recommend the first — the barrel is derivable from the tree, which is what makes it a generated file rather than a hand-edited one.

## Related Code Files

- Create: `packages/cli/src/commands/create.ts` — orchestration only
- Create: `packages/cli/src/create/plan.ts` — environment + answers → intended work
- Create: `packages/cli/src/create/apply.ts` — execution + rollback ledger
- Create: `packages/cli/src/create/prompts.ts` — the conditional prompt flow
- Create: `packages/cli/src/create/install.ts` — package-manager invocation, streamed output
- Create: `packages/cli/src/commands/generate.ts`
- Create: `packages/engine/src/manifest/{checksum,write,read}.ts`
- Create: `packages/cli/src/create/*.test.ts`
- Modify: `packages/cli/src/bin.ts` — replace stubs
- Create: `update-logs/2026-08-04/NN-create-command.md`

## Implementation Steps

1. `manifest/checksum.ts` and `write.ts` — sha256 per file, stable ordering, `engineVersion` / `templateId` / `createdWith`, plus a **manifest schema version** and the *rendered* / *merged* entry marks. Normalisation (line endings, trailing newline) lives in this one module and Phase 7 imports it rather than restating it; the schema version exists so that a future normalisation change is detectable instead of silently reclassifying every file.
2. `create/plan.ts` — pure, and the collision gate lives here since it is a comparison of two file lists, not a filesystem mutation. Tests cover the matrix that matters: empty directory, non-empty **without** collision, non-empty **with** collision, inside a repository, inside a workspace, nested inside both, npm-only machine, git absent, git identity unset.
3. `create/prompts.ts` — conditional flow. The test is as much about what is *not* asked: an empty-directory run asks nothing about git ancestry or workspaces.
4. `create/apply.ts` with the rollback ledger, **each entry carrying created-vs-overwrote**. Test rollback by injecting a failure at each stage and asserting the directory is as it was — including the case that matters most: a target directory holding a pre-existing file at a path the template also ships, cancelled mid-copy, where that file must survive byte-identical.
5. The `{{placeholder}}` renderer, and the manifest recording rendered bytes under a *rendered* mark.
6. Git handling: identity gate in preflight, `init`, initial commit, and the nested-repository branch — clean-tree gate, explicit pathspec staging, and the printed parent instruction.
7. `install.ts` — stream the package manager's own output rather than hiding it behind a spinner. A visible install is more reassuring than an opaque one, and it is the ADR-012 lesson applied to the other long wait.
8. Wire codegen and validate into the tail of the flow.
9. `generate.ts` against shared scaffolds; test that output passes validation for each tier. Resolve the tier-barrel question first (generated file, or `generate` leaves it alone) — it changes what both this command and Phase 7 do.
10. **End-to-end on a clean machine profile:** npm only, no pnpm, no corepack. This is the ADR-008 promise and it needs a real run, not a unit test.
11. Update-log entry.

## Success Criteria

- [ ] `create` into an empty directory asks no git-ancestry or workspace question
- [ ] **`create` into a directory holding only a `README.md`, a `LICENSE` and a `.git` succeeds** — non-emptiness alone never refuses
- [ ] **`create` into a directory holding an existing `src/` refuses**, names `src/` as the collision, points at `ds adopt`, and writes nothing
- [ ] `create` inside an existing repository asks once, defaults to the enclosing repository, and prints the parent instruction when independent is chosen
- [ ] `create` inside a workspace prints the registration line and edits no parent file
- [ ] Ctrl-C at every prompt in turn leaves no created path behind — verified per prompt
- [ ] A simulated failure at each apply stage rolls back cleanly
- [ ] End-to-end run on npm-only succeeds; no attempt to install a package manager
- [ ] After `create`: dependencies installed, Vite starts, Storybook starts, `ds validate` exits zero
- [ ] Manifest checksums match the files actually on disk, verified by recomputation
- [ ] Missing git produces an instruction naming where to get it, with no partial project written
- [ ] **Unset `user.email` is refused in preflight**, naming the two `git config` commands, with nothing written — not discovered at commit time with the project already on disk
- [ ] **A pre-existing file at a template path survives a cancelled `create` byte-identical** — the ledger's created-vs-overwrote distinction, tested directly
- [ ] Committing into an enclosing repository refuses a dirty tree and stages only ledger paths — the user's unrelated work in flight is never swept into the scaffold commit
- [ ] `package.json` is rendered from placeholders, and its manifest entry is marked *rendered* and matches the bytes on disk
- [ ] `ds generate atoms my-thing` produces a component, barrel entry and story that all pass validation — **and a subsequent `ds update` does not report the barrel as conflicted**

## Risk Assessment

**Rollback is the highest-risk code here.** It deletes things. The ledger design — remove only what was recorded, never a recursive wipe of the target — is the guard, and the "create into a non-empty directory, then cancel" test is the one that must never regress. Getting this wrong deletes a user's existing files, which is the worst outcome available anywhere in this toolkit.

**Install failure mid-flow.** Network, registry, or a lockfile conflict. The project is already committed by then, so the correct response is to keep the scaffold, report what failed, and print the exact command to retry. Do not roll back a valid project because a download failed.

**Three package managers, three install paths.** The accepted cost of ADR-008. npm is verified end to end; pnpm and yarn get at least a smoke run before release.

**Prompt flow grows past what a non-technical user tolerates.** Watch the count. FR6's rule is that prompts scale with the user's situation, not with the number of cases supported — if the empty-directory path ever exceeds about four questions, something has leaked into it that belongs behind a condition.
