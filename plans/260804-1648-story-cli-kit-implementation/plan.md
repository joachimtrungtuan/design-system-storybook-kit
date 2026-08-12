---
title: "story-cli-kit implementation"
description: "Implement the full toolkit — engine, template, validator, guardrails and all seven ds commands — against the design already settled in docs/."
status: pending
priority: P1
effort: ""
tags: [cli, engine, template, validator]
created: 2026-08-04
---

# story-cli-kit implementation

## Overview

`docs/` is complete and current: requirements, contract, architecture and fourteen ADRs all decided, stack versions verified 2026-08-04. Nothing is implemented — `packages/` and `templates/` hold responsibility READMEs and no code. This plan turns that specification into a working toolkit: the token engine, the Storybook preset, the neutral template, the validator, the generated-project guardrails, and all seven `ds` commands (`create`, `adopt`, `generate`, `validate`, `update`, `migrate`, `guard`), plus the release path that makes `npx github:joachimtrungtuan/story-cli-kit` work.

The plan implements the docs. It does not re-decide them. Where implementation reveals that a doc is silent or self-contradictory, that is surfaced to the maintainer rather than resolved silently; [Decisions this plan owns](#decisions-this-plan-owns) records every such resolution, and [Open items](#open-items) records the ones still outstanding.

## Scope

| Decision | Choice | Rationale |
| --- | --- | --- |
| Plan scope | All seven commands | The full roadmap over a vertical slice. |
| CLI dependencies | `@clack/prompts` only | One focused dep for interaction; `node:util` `parseArgs` and hand-written help stay native. Uniform cancel handling at the moment `create` is mid-write is the deciding factor (NFR5, ADR-008, ADR-009). |
| Toolkit test runner | `node:test` | Runs the toolkit's TypeScript through Node's type stripping. No config, no second toolchain. Stripping is unavailable under `node_modules` (ADR-012), and tests never run from there. Generated projects get `vitest`. |
| Template source | Mirror the reference project | Component set and token content derive in *structure only* from the maintainer's local reference UI project — reference runs stay local, and Phase 5 step 3 neutralises every brand value before anything ships. Neither the project name nor its path is recorded anywhere in this repository: it must be public for `npx github:…` to resolve, and a public plan leaks exactly as much as a public fixture. |

**What "mirror the reference project" means, precisely.** That project supplies *content* — which components exist, what the token values are, what the type scale looks like. It cannot supply *structure*, because it does not satisfy the contract. Its atoms are grouped by category (`atoms/button/Button.tsx`, `atoms/misc/{Badge,Container,SlidingNumber}.tsx`) rather than one directory per component; its organisms are flat files; it ships one foundations MDX where the contract requires five; it has no `templates/` story directory; its `tokens.json` materialises full ramps that the contract forbids; and it carries a `tailwind.config.ts` that ADR-003 bans outright. Phase 5 is therefore a **translation**, not a copy, and that translation is the single largest piece of work in this plan.

## Goals

| # | Goal | Priority |
|---|------|----------|
| 1 | `npx github:joachimtrungtuan/story-cli-kit create` produces a runnable, validator-clean project on a machine with only Node and npm | P1 |
| 2 | The token pipeline is real: `tokens.json` → generated ramps → `tokens.css` `@theme`, deterministic and tested | P1 |
| 3 | Every `[V]` rule in the contract is machine-checked by `ds validate`; no rule exists in prose only | P1 |
| 4 | `ds update` classifies every file by manifest checksum and never silently overwrites user work | P1 |
| 5 | `ds adopt` merges into an existing React app with all five write classes and no force flag | P2 |
| 6 | `ds migrate` runs named structural transforms reversibly — **ships v1.1.0, after the first release** | P3 |
| 7 | A generated project constrains its own agents: `ds guard` refuses writes to toolkit-owned files, hooks run the checks, and new components come from `ds generate` rather than from a sibling | P1 |

## Phases

| # | Phase | Depends on | Status |
|---|-------|-----------|--------|
| 1 | [Toolkit skeleton and CLI shell](./phase-01-toolkit-skeleton.md) | — | Pending |
| 2 | [Token engine: schema, ramps, codegen](./phase-02-token-engine-schema-ramps-codegen.md) | 1 | Pending |
| 4 | [Storybook preset](./phase-04-storybook-preset.md) | 1, 2 | Pending — **runs before 3** |
| 3 | [Validator](./phase-03-validator.md) | 1, 2, 4 | Pending |
| 5 | [Neutral template](./phase-05-neutral-template.md) | 2, 3, 4 | Pending |
| 6 | [`ds create` and `ds generate`](./phase-06-ds-create-and-ds-generate.md) | 5 | Pending |
| 7 | [`ds update`](./phase-07-ds-update.md) | 6 | Pending |
| 9 | [`ds adopt`](./phase-09-ds-adopt.md) | 5, 6, 7 | Pending |
| 12 | [Generated-project guardrails](./phase-12-generated-project-guardrails.md) | 5, 6, 7 | Pending |
| 11 | [Agent skill and the `[S]` rules](./phase-11-agent-skill-and-semantic-rules.md) | 3, 5, 6, 12 | Pending |
| 10 | [Release, CI and distribution](./phase-10-release-ci-and-distribution.md) | 1–7, 9, 11, 12 | Pending — **v1.0.0** |
| 8 | [`ds migrate`](./phase-08-ds-migrate.md) | 7 | Pending — **v1.1.0, after the first release** |

**Order: 1 → 2 → 4 → 3 → 5 → 6 → 7 → 9 → 12 → 11 → 10, then 8 after v1.0.0.**

## Sequencing rationale

**The token engine precedes the validator** because one `[V]` rule — "`src/styles/tokens.css` matches codegen output from current `tokens.json`" — is unimplementable without codegen. The validator cannot be specified around a codegen that does not exist yet.

**The preset precedes the validator.** V22 and V23 check that `.storybook/main.ts` imports the engine preset and that `preview.tsx` spreads the engine preview, which cannot be validated against a preset that does not exist. Phase 4 also builds `surfaces.ts` from Phase 2's parsed tokens, so it is not independent of Phase 2 either. Treating Phase 4 as independent yields a second `tokens.json` parser.

**The validator precedes the template** so the template is built against a running check rather than declared correct and verified later. The template's acceptance criterion is `ds validate` exiting zero on it; that criterion needs the validator to exist first.

**The template precedes `create`** because `create` copies it and records its checksums. Building `create` first would mean testing it against a fixture that then gets replaced.

**`update` precedes `migrate` and `adopt`** because both reuse manifest classification. `migrate` is the whole-tree escalation of it; `adopt` is the same classification problem with a different write policy and an extra compatibility gate. Building either before `update` duplicates classification code that then has to be reconciled.

**Guardrails precede the skill and the release.** Phase 12 ships `ds guard` and the hook adapters. It follows Phase 7 because the guard's classification *is* Phase 7's classifier — one module, or the guard would promise outcomes the update pipeline does not deliver — and precedes Phase 11 because the skill's `[S6]` review asks whether a component followed canonical scaffolding, which presupposes that the sanctioned path exists and is enforced.

**Release does not wait for `migrate`.** Gating Phase 10 on all of 1–9 would let the lowest-priority phase in the plan block the highest-priority goal. There is no taxonomy change to migrate on the day of the first release, so `migrate` is the one command with no user until one exists; Phase 8 ships as v1.1.0. Phase 11 runs ahead of Phase 10 instead, because it edits `docs/requirements.md` and Phase 10's last step is the final docs reconciliation.

## Architecture at a glance

```text
package.json                    story-cli-kit — the single installable artifact
  bin: { ds: "./dist/packages/cli/src/bin.js" }         built by `prepare` on install (ADR-012)
  imports: { "#engine/*": "./dist/packages/engine/src/*.js" }   cross-package resolution
  dependencies: @clack/prompts                the only runtime dep
  files: ["dist", "templates", "migrations", "skill", "docs"]   build output + shipped Markdown

packages/cli/src/
  bin.ts                        parseArgs dispatch, help, npx-misuse guard (ADR-007)
  commands/{create,adopt,validate,generate,update,migrate,guard}.ts
  ui/{prompts,report}.ts        clack wrappers, cancel-safe, classification tables
  errors.ts                     ActionableError — what is wrong / what to do / where (NFR5)
  env/{node,package-manager,git,workspace}.ts   detection, never mutation

packages/engine/src/
  tokens/{schema,ramp,codegen}.ts     tokens.json -> tokens.css @theme
  validator/{index,rules/*}.ts        every [V] rule
  manifest/{checksum,read,write,classify}.ts
  preset/{main,preview}.ts            Storybook wiring consumed by generated projects

templates/storybook-vite/       the copied-at-init surface
migrations/<version>.md         release migration notes — root, not under src/ (tsc drops .md)
skill/SKILL.md                  the agent skill — same reason
docs/                           contract, shipped for agent reference — same reason
```

## Decisions this plan owns

These are resolutions to points `docs/` left silent or self-contradictory. Each names the phase that implements it, so contract, validator and template still move together. Rejected alternatives are recorded because the reasoning is what stops the question being reopened.

### Distribution and versioning

**The first release is v1.0.0, not v0.1.0** — Phase 10. Generated projects depend on `#semver:^1.0.0` (ADR-007), a range no 0.x tag satisfies, and under 0.x semantics `^0.1.0` resolves to `>=0.1.0 <0.2.0` — so every project created at first release would be pinned out of reach of `ds migrate` and of every subsequent minor. The version number is not a maturity signal here; it is the mechanism `ds update` runs on. The contract and manifest schema *are* the product, and both are settled, so committing to them at release is honest. Rejected: v0.1.0 with a `>=0.1.0 <1.0.0` range (non-idiomatic, and 0.x minors are conventionally breaking, contradicting the versioning table); v0.1.0 with `^0.1.0` (silently defeats `update`).

**`files` ships five entries** — `["dist", "templates", "migrations", "skill", "docs"]`, those directories at the repository root — Phases 1 and 10. `tsc` copies no `.md`, so migration notes, the agent skill and the contract docs ship nowhere if they live under `src/` and `files` lists only build output. Rejected: a copy step inside `prepare` (omission is silent, and `dist/` would then hold two kinds of thing); moving them under `templates/` (that directory would then mean two things).

**`migrate` ships in the next minor**, v1.1.0. The first release ships six commands.

### The token pipeline

**Token group names follow Tailwind v4's `@theme` namespaces** — Phase 5. The governing standard is the one the pipeline already compiles into: **a top-level token group is named for its Tailwind v4 `@theme` namespace where one exists, camelCase otherwise, and non-token keys carry the `$` prefix already reserved by ADR-006.** This makes codegen a namespace lookup instead of a translation table — and a translation table is a place for drift to live.

| Reference | Contract name | Emits | Why |
| --- | --- | --- | --- |
| `borderRadius` | `radius` | `--radius-*` | Tailwind's namespace is `--radius-`. |
| `transition` | `motion` | `--ease-*`, `--animate-*` | Tailwind has no `--transition-` namespace. `motion` is the umbrella holding `duration` and `easing`; `transition` is a DTCG *type* name and misused as a group. |
| `breakpoint` | `breakpoint` | `--breakpoint-*` | Exact Tailwind namespace. Adopted unchanged. |
| `container` | `container` | `--container-*` | Exact Tailwind namespace. Adopted unchanged. |
| `zIndex` | `zIndex` | `--z-index-*` | No Tailwind namespace and no DTCG type; a `number` token. camelCase per the fallback rule. |
| `icon` (sizes) | `icon` | `--icon-*` | Dimension tokens, no namespace, camelCase fallback. |
| `icon.library` | `$meta.iconLibrary` | — | Configuration, not a token. A token group holds tokens. |
| `meta` | `$meta` | — | `$` marks reserved non-token keys, consistent with `$base` / `$anchor` / `$mode` / `$overrides`. |

All five reference groups that had no contract name are adopted, three under their existing names; nothing is dropped. The naming rule itself is a `[V]` validator rule — an unknown top-level group without a namespace or a `$` is a violation — because a rule that lives only in this table is a suggestion.

**A ramp has eleven steps** — 50, 100, 200 … 900, 950 — Phase 2. Any rule phrased as a step-count threshold must count eleven, or the one rule written to forbid hand-authored ramps passes them; **[V18]** is therefore phrased as "declares every step literally", not as a number.

**Committed fixtures use synthetic colour values** — Phase 2. The teaching value of the reference ramps is in the anchor *positions* — one ramp anchored at 950 (almost every step lighter than base) and one at 500 (spread both ways), from a single code path — and an invented dark green at 950 exercises that identically. Real brand hexes and ramp names in a public repository buy nothing and cost a question.

### The validator

**The contract names `ds validate`** — Phase 3. `pnpm ds:validate` cannot be the contract's name for the check when ADR-008 says the project follows whichever package manager was detected. The contract references the binary. Generated `package.json` still gets a `ds:validate` script for convenience, run under the user's own manager.

**Rules carry stable IDs** — `V1`…`V26`, `S1`…`S6` — Phases 3 and 11. Plans, validator output, skill findings and migration notes cite the ID. IDs are append-only. Line numbers into `docs/` are never load-bearing, and validator output gains a handle a user can search for. Rejected: refreshing line numbers (breaks on the next contract edit); citing section headings (imprecise where one section holds nine rules).

**Story coverage is tier-level, not filename-level** — Phase 3. A component is covered when it appears as `component` or in Storybook's native `subcomponents` of any story file **in its own tier directory**; **[V9]** requires at least one such file. `Meta.component` is singular, so a grouped story file covering three components gives a filename-mirroring rule nothing to match on — and Phase 5 ships that case deliberately. Filename mirroring stays a convention and is what `ds generate` emits. **[V11]** is unaffected, so a grouped file still has a primary subject; coverage becomes a declaration rather than something the validator infers. Rejected: strict filename mirroring with a declared exception list (a second surface to keep in sync); inferring coverage from what a file imports and renders (fragile both ways — passes an incidental mention, fails an indirect render); forbidding grouped files (trivially checkable, but splits documentation pages that are better together).

**`globals.css` is exempt from the font-family rule for `@import` and `@font-face` only** — Phase 3. **[V12]** otherwise makes `tokens.json` the only file where a font family may appear, while the token pipeline puts font imports in `globals.css` — so the template's own file would violate the contract and Phase 5's zero-violations gate could not hold. A font *source* is not a font *token*, and `globals.css` is already the single hand-edited style file by design. Rejected: modelling webfont URLs and `@font-face` descriptors as tokens (codegen would own something it has no good shape for); demoting the rule to `[S]` (moves a rule from enforced to suggested — the direction this project exists to reverse).

### The template

**Phase 5 ships a materialise harness** — renders `{{placeholders}}` with fixed values and runs codegen into a temp directory. Phase 5's own gate and Phase 10's CI both run against it. Without it Phase 5's acceptance criteria are unrunnable: the template on disk has unrendered placeholders and no `tokens.css`, so `ds validate` cannot pass on it. This pulls one small piece of Phase 6 forward rather than duplicating it. Rejected: moving the runtime gate to Phase 6 (Phase 5 then ships a template nobody ran); committing a rendered reference project (a generated artefact under version control).

**The template ships `@phosphor-icons/react` and `motion`** and nothing else — Phase 5. Two runtime dependencies inherited by every generated project. Phosphor is load-bearing: `$meta.iconLibrary` declares an icon set, and an `Icon` atom with no set behind it is a contract rule pointing at nothing. `motion` unlocks the reference's animated components. The other five reference deps (`embla-carousel-react`, `@splidejs/react-splide`, `react-router-dom`, `react-use-measure`, `lenis`) are not adopted and the components needing them are left out. Note the collision: the npm package `motion` and the token group `motion` are unrelated namespaces.

### Manifest, update and adopt

**Six file categories**, one pipeline: engine, generated, shipped-unmodified, shipped-modified, adopt-merged, user-created.

**Rendered files are their own manifest class** — Phases 6 and 7. Phase 6 checksums the *rendered* file; comparing against unrendered template bytes would conflict `package.json` on the first update of every project, forever. Checksum what was written.

**Checksum normalisation lives in one shared module** used by every phase that hashes, and the manifest carries a schema version so a mismatch is detectable rather than silent.

**Tier barrels are generated files** — Phase 6. `ds generate` must append to the tier barrel, so a checksum-compared barrel would make the NFR4-blessed way to add a component guarantee a permanent conflict on every future update. Barrels are regenerated from the directories present and never checksum-compared.

**`--on-conflict=migrate` fetches the old tag at migrate time** — Phase 7. The old shipped bytes are retrieved from `story-cli-kit@<manifest.engineVersion>` into a temp directory, not stored in the project: one network call when the command runs, nothing at rest, no baseline copy to drift out of sync with the manifest. Offline migration fails with an instruction — acceptable for a command only ever invoked explicitly. `skip` is unaffected and ships first.

**`ds update --to <version>` fetches the target tag through the same module** — Phase 7. One module, two call sites, both semver-validated and confined. `update` runs from the project's own installed copy and ADR-007 forbids `npx` for maintenance commands, so nothing else produces the target version's bytes.

**Phase 7 rewrites the manifest.** After an update, `engineVersion` and every checksum must describe the new version, or the next update classifies the whole shipped tree as conflicted. `createdWith` is never rewritten — it records origin, not current state.

**`ds adopt` writes a full manifest and wires the host `package.json`** — Phase 9 — adding the toolkit devDependency and the `ds:validate` script. Without both, an adopted project cannot run `validate` or `update` at all.

### `create`, `generate` and the guardrails

**`create` into a non-empty directory is allowed, and refused only on collision** — Phase 6. It compares the template's file list against the target and refuses when a path the template ships already exists, naming the collisions and pointing at `ds adopt`. Refusing every non-empty target breaks a case Phase 6 explicitly supports — scaffolding into the current directory — since a bare `.git`, `README.md` or `LICENSE` makes a directory non-empty without being in the way. Rejected: prompting to overwrite, which puts a destructive default one keystroke away in the first command a new user runs, and which ADR-013 already rejected for `adopt` when it removed `--force`.

**`create` gates git identity with the other preflight checks.** A fresh macOS + Xcode CLT install has git and no `user.email`; the commit is late in the sequence, so failing there either deletes a working project or leaves a repo with no commit and raw git stderr on stdout — breaking NFR5 and ADR-009 together.

**The rollback ledger records the pre-state per path.** `git init` runs after the copy, so an unwind that cannot distinguish "created" from "overwrote" can delete pre-existing user files. Only what was created is unwound.

**`ds generate` is the only sanctioned way to create a component** — Phases 6 and 12. It reads canonical scaffolding from the engine every time, so a new component inherits the template rather than whatever its sibling has drifted into. This is stated as a requirement in generated projects' agent instructions and backed by **[S6]**. Rejected: a structural conformance validator rule (needs a definition of component "shape" that does not constrain internals — which the contract deliberately leaves free; revisit if `[S6]` proves too soft); rules in `CLAUDE.md` alone (prose is advisory).

**`ds guard` reads the manifest** and returns the ownership class — generated → refuse, shipped → warn, user-created → allow — Phase 12, on Phase 7's classifier. Rejected: a static glob list in the project's agent instructions (stale the first time a component is added); `.gitattributes` plus a pre-commit hook (fires long after the agent built on top of the write).

**Guardrails are `ds` subcommands with thin hook adapters** — Phase 12. Logic lives in the commands; `.claude/settings.json` and the Codex equivalent only invoke them. One implementation, runnable by hand and in CI. Rejected: Claude Code only (the gap is real from day one); git hooks alone (too late to stop a pass already twenty files deep).

**All four guardrails ship in the first release**: pre-write scope guard, end-of-pass `ds validate`, end-of-pass lint and typecheck, git status reminder on completion.

### Repository hygiene

**No client project or brand data appears anywhere in this repository** — not in fixtures, not in `docs/`, not in `plans/`. The repository must be public for `npx github:…` to resolve, and a public plan leaks exactly as much as a public fixture. The reference project is referred to as "the reference project" throughout, and no step depends on its name.

## Constraints carried into phases

Requirements each phase must honour, gathered here so no phase quietly drops one.

- **Phase 1** — `verbatimModuleSyntax` in the tsconfig: `erasableSyntaxOnly` does not enforce `import type`, so a value-imported type throws at runtime while `tsc --noEmit` stays green. Phase 1 also fixes the **exit-code contract** for every command; CI and the agent skill depend on codes nothing else defines. And it guards `--ignore-scripts`, which silently skips the `prepare` build and leaves `ds` with no entry point.
- **Phase 6** — stage the scaffold commit by explicit pathspec and gate on a clean tree, or `create` inside an enclosing repository sweeps the user's WIP into it.
- **Phase 7** — `--dry-run` writes nothing at all: it runs before branch creation and does not regenerate `tokens.css`. A tree-hash success criterion is blind to both.
- **Phase 8** — the archive containment check compares `realpath`s. On macOS the `/var` → `/private/var` symlink makes every extracted entry resolve outside a naive prefix check, so a positive-path test is required alongside the negative ones.
- **Phase 10** — the stack table's re-verification gate, and a release test that a real install after `prepare` produces a working `ds`.

## Success criteria

- [ ] `ds validate` exits zero on a freshly created project and non-zero on every seeded contract violation
- [ ] Codegen is deterministic — same `tokens.json` produces byte-identical `tokens.css` across runs and machines (NFR3)
- [ ] A generated ramp's anchor step equals `$base` exactly, verified per ramp in tests
- [ ] `create` completes on a machine with npm only, no pnpm, no yarn, no corepack (ADR-008)
- [ ] Ctrl-C at any `create` prompt leaves no partial directory behind
- [ ] `update --dry-run` on a project with hand-modified components reports every file by category and writes nothing
- [ ] `adopt` refuses a Tailwind v3 project with an instruction, not a trace (ADR-013)
- [ ] Every failure path a first-time user can hit prints an instruction; no stack trace reaches stdout (NFR5)
- [ ] `tsc --noEmit` and `node --test` both pass in CI — checking is its own gate, since the build config excludes tests and fixtures and so checks strictly less
- [ ] Two projects created from different template versions still share taxonomy, story titles and pipeline shape (requirements.md criterion 2)
- [ ] `ds guard` refuses a write to a generated file and warns on a shipped one, using the same classifier `ds update` runs on
- [ ] `npm pack --dry-run` shows every shipped Markdown asset — a `migrate` run in an installed project finds its notes

## Risks

| Risk | Impact | Where handled |
| --- | --- | --- |
| Engine imports do not resolve from an installed git tarball | Nothing runs after install | Phase 1 spike, before any command is written |
| `prepare` fails or is skipped on a user's machine | `ds` has no entry point; installation breaks rather than execution | Phase 1 `--ignore-scripts` guard; Phase 10 release test |
| Old-tag fetch fails offline or the tag was deleted | `migrate` policy unavailable at the moment it is needed | Phase 7 — refuse with an instruction, never fall back to a weaker prompt |
| Reference tokens do not fit the contract schema | Phase 5 slips; translation is bigger than a copy | Phase 5, staged as its own step with tests |
| Stack table (verified 2026-08-04) drifts before release | Generated projects install versions nobody checked | Phase 10 re-verification gate |

## Open items

Unresolved and non-blocking. Each names the phase that will close it.

1. **What TypeScript version an adopted project must satisfy.** ADR-013 says "TypeScript present, within the ADR-011 range", but ADR-011 pins 6.0.3 for the *toolkit*, which is not a range and is not the same question. **Phase 9** resolves it against the peer ranges of the versions actually installed at implementation time — Phase 10's stack re-verification gate is the natural moment.
2. **`$overrides` at a ramp's anchor step** is contract-silent. **[V17]** says the anchor equals `$base`, so an override there is either redundant or a contradiction, and which one is a decision. **Phase 2** raises it if a fixture reaches it rather than guessing.
3. **Effort estimates have no total.** Per-phase figures predate ADR-012's build step and were never re-baselined. Not a defect — estimates are not deliverables — but the plan currently cannot answer "how long".

<!-- slug: story-cli-kit-implementation -->
