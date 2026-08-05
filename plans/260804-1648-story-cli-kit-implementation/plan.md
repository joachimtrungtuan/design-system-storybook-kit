---
title: "story-cli-kit implementation"
description: "Implement the full toolkit — engine, template, validator and all five ds commands — against the design already settled in docs/."
status: pending
priority: P1
effort: ""
tags: [cli, engine, template, validator]
created: 2026-08-04
---

# story-cli-kit implementation

## Overview

`docs/` is complete and current: requirements, contract, architecture and thirteen ADRs all decided, stack versions verified 2026-08-04. Nothing is implemented — `packages/` and `templates/` hold responsibility READMEs and no code. This plan turns that specification into a working toolkit: the token engine, the Storybook preset, the neutral template, the validator, and all five `ds` commands (`create`, `adopt`, `validate`, `update`, `migrate`), plus the release path that makes `npx github:joachimtrungtuan/story-cli-kit` work.

The plan implements the docs. It does not re-decide them. Where implementation reveals that a doc is silent or self-contradictory, that is surfaced to the maintainer rather than resolved silently — four such gaps were known before a line was written and are now [resolved](#open-questions--all-four-resolved-2026-08-04), and two further ones (engine module resolution, preset consumption) are load-bearing enough that Phase 1 and Phase 4 each open with a spike.

## Decisions taken at planning time

| Decision | Choice | Rationale |
| --- | --- | --- |
| Plan scope | All five commands | Maintainer chose the full roadmap over a vertical slice. |
| CLI dependencies | `@clack/prompts` only | One focused dep for interaction; `node:util` `parseArgs` and hand-written help stay native. Uniform cancel handling at the moment `create` is mid-write is the deciding factor (NFR5, ADR-008, ADR-009). |
| Toolkit test runner | `node:test` | Runs the toolkit's TypeScript through Node's type stripping. No config, no second toolchain. Still correct after ADR-012's rewrite: stripping is unavailable under `node_modules`, and tests never run from there. Generated projects still get `vitest`. |
| Template source | Mirror `win-ui-layout` | Component set and token content derive in *structure only* from the maintainer's local `win-ui-layout` project — reference runs stay local, and Phase 5 step 3 neutralises every brand value before anything ships. Path deliberately not recorded here: this repo must be public for `npx github:…` to resolve. |

**What "mirror `win-ui-layout`" means, precisely.** Scouted 2026-08-04: that project supplies *content* — which components exist, what the token values are, what the type scale looks like. It cannot supply *structure*, because it does not satisfy the contract. Its atoms are grouped by category (`atoms/button/Button.tsx`, `atoms/misc/{Badge,Container,SlidingNumber}.tsx`) rather than one directory per component; its organisms are flat files; it ships one foundations MDX where the contract requires five; it has no `templates/` story directory; its `tokens.json` materialises full ramps that the contract forbids; and it carries a `tailwind.config.ts` that ADR-003 bans outright. Phase 5 is therefore a **translation**, not a copy, and that translation is the single largest piece of work in this plan.

## Goals

| # | Goal | Priority |
|---|------|----------|
| 1 | `npx github:joachimtrungtuan/story-cli-kit create` produces a runnable, validator-clean project on a machine with only Node and npm | P1 |
| 2 | The token pipeline is real: `tokens.json` → generated ramps → `tokens.css` `@theme`, deterministic and tested | P1 |
| 3 | Every `[V]` rule in the contract is machine-checked by `ds validate`; no rule exists in prose only | P1 |
| 4 | `ds update` classifies every file by manifest checksum and never silently overwrites user work | P1 |
| 5 | `ds adopt` merges into an existing React app with all five write classes and no force flag | P2 |
| 6 | `ds migrate` runs named structural transforms reversibly | P3 |

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
| 8 | [`ds migrate`](./phase-08-ds-migrate.md) | 7 | Pending |
| 9 | [`ds adopt`](./phase-09-ds-adopt.md) | 5, 6 | Pending |
| 10 | [Release, CI and distribution](./phase-10-release-ci-and-distribution.md) | 1–9 | Pending |
| 11 | [Agent skill and the `[S]` rules](./phase-11-agent-skill-and-semantic-rules.md) | 3, 5 | Pending — **added 2026-08-04** |

## Sequencing rationale

**The token engine precedes the validator** because one `[V]` rule — "`src/styles/tokens.css` matches codegen output from current `tokens.json`" — is unimplementable without codegen. The validator cannot be specified around a codegen that does not exist yet.

**The preset precedes the validator** — corrected by the red team. Phase 3's rules 22 and 23 check that `.storybook/main.ts` imports the engine preset and that `preview.tsx` spreads the engine preview, which cannot be validated against a preset that does not exist. Phase 4 also builds `surfaces.ts` from Phase 2's parsed tokens, so it was never independent of Phase 2 either.

**The validator precedes the template** so the template is built against a running check rather than declared correct and verified later. The template's acceptance criterion is `ds validate` exiting zero on it; that criterion needs the validator to exist first.

**The template precedes `create`** because `create` copies it and records its checksums. Building `create` first would mean testing it against a fixture that then gets replaced.

**`update` precedes `migrate` and `adopt`** because both reuse manifest classification. `migrate` is the whole-tree escalation of it; `adopt` is the same classification problem with a different write policy and an extra compatibility gate. Building either before `update` duplicates classification code that then has to be reconciled.

## Architecture at a glance

```text
package.json                    story-cli-kit — the single installable artifact
  bin: { ds: <compiled entry> }               built by `prepare` on install (ADR-012)
  imports: { "#engine/*": "./packages/engine/src/*" }   cross-package resolution
  dependencies: @clack/prompts                the only runtime dep
  files: [packages, templates]                what ships in the tarball

packages/cli/src/
  bin.ts                        parseArgs dispatch, help, npx-misuse guard (ADR-007)
  commands/{create,adopt,validate,generate,update,migrate}.ts
  ui/{prompts,report}.ts        clack wrappers, cancel-safe, classification tables
  errors.ts                     ActionableError — what is wrong / what to do / where (NFR5)
  env/{node,package-manager,git,workspace}.ts   detection, never mutation

packages/engine/src/
  tokens/{schema,ramp,codegen}.ts     tokens.json -> tokens.css @theme
  validator/{index,rules/*}.ts        every [V] rule
  manifest/{checksum,read,write,classify}.ts
  preset/{main,preview}.ts            Storybook wiring consumed by generated projects
  migrations/<version>.md             release migration notes

templates/storybook-vite/       the copied-at-init surface
```

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

## Risks

| Risk | Impact | Where handled |
| --- | --- | --- |
| Engine imports do not resolve from an installed git tarball | Nothing runs after install | Phase 1 spike, before any command is written |
| `prepare` fails or is skipped on a user's machine | `ds` has no entry point; installation breaks rather than execution | Phase 1 `--ignore-scripts` guard; Phase 10 release test |
| Old-tag fetch fails offline or the tag was deleted | `migrate` policy unavailable at the moment it is needed | Phase 7 — refuse with an instruction, never fall back to a weaker prompt |
| Reference tokens do not fit the contract schema | Phase 5 slips; translation is bigger than a copy | Phase 5, staged as its own step with tests |
| Stack table (verified 2026-08-04) drifts before release | Generated projects install versions nobody checked | Phase 10 re-verification gate |

## Open questions — all four resolved 2026-08-04

Resolved by the maintainer before Phase 1 started. Recorded here as decisions; each carries a doc change owned by the phase that implements it, so contract, validator and template still move together.

### 1. `update --on-conflict=migrate` fetches the old tag — Phase 7

The old shipped bytes are retrieved at migrate time from `story-cli-kit@<manifest.engineVersion>` into a temp directory, not stored in the project. One network call when the command runs, nothing at rest, no baseline copy to drift out of sync with the manifest. Offline migration fails with an instruction — acceptable for a command that is only ever invoked explicitly. `docs/update-and-migration.md` gains the retrieval step; `skip` is unaffected and still ships first.

### 2. Token group names follow Tailwind v4's `@theme` namespaces — Phase 5

*Delegated to the plan; decided on convention rather than preference.* The governing standard is the one the pipeline already compiles into: **a top-level token group is named for its Tailwind v4 `@theme` namespace where one exists, camelCase otherwise, and non-token keys carry the `$` prefix already reserved by ADR-006.** This makes codegen a namespace lookup instead of a translation table — and a translation table is a place for drift to live.

| Reference | Contract name | Emits | Why |
| --- | --- | --- | --- |
| `borderRadius` | `radius` | `--radius-*` | Tailwind's namespace is `--radius-`. Contract was already right. |
| `transition` | `motion` | `--ease-*`, `--animate-*` | Tailwind has no `--transition-` namespace. `motion` is the umbrella holding `duration` and `easing`; `transition` is a DTCG *type* name and misused as a group. |
| `breakpoint` | `breakpoint` | `--breakpoint-*` | Exact Tailwind namespace. **Adopted unchanged.** |
| `container` | `container` | `--container-*` | Exact Tailwind namespace. **Adopted unchanged.** |
| `zIndex` | `zIndex` | `--z-index-*` | No Tailwind namespace and no DTCG type; a `number` token. camelCase per the fallback rule. |
| `icon` (sizes) | `icon` | `--icon-*` | Dimension tokens, no namespace, camelCase fallback. |
| `icon.library` | `$meta.iconLibrary` | — | Configuration, not a token. A token group holds tokens. |
| `meta` | `$meta` | — | `$` marks reserved non-token keys, consistent with `$base` / `$anchor` / `$mode` / `$overrides`. |

All five previously-unnamed groups are **adopted**, three under their existing names. Nothing is dropped. The naming rule itself becomes a `[V]` validator rule — an unknown top-level group without a namespace or a `$` is a violation — because a rule that lives only in this table is a suggestion.

### 3. Template ships `@phosphor-icons/react` and `motion` — Phase 5

Two runtime dependencies inherited by every generated project. Phosphor is load-bearing: `$meta.iconLibrary` declares an icon set, and an `Icon` atom with no set behind it is a contract rule pointing at nothing. `motion` unlocks the reference's animated components, `SlidingNumber` among them. The other five reference deps (`embla-carousel-react`, `@splidejs/react-splide`, `react-router-dom`, `react-use-measure`, `lenis`) are **not** adopted and the components needing them are left out. Note the collision to avoid confusion: the npm package `motion` and the token group `motion` are unrelated namespaces.

### 4. The contract names `ds validate` — Phase 3

`pnpm ds:validate` cannot be the contract's name for the check when ADR-008 says the project follows whichever package manager was detected. The contract references the binary. Generated `package.json` still gets a `ds:validate` script for convenience, run under the user's own manager.

**Doc changes owed:** `docs/design-system-contract.md` (2, 3, 4), `docs/update-and-migration.md` (1). Each lands in the phase that implements it, with its own update-log entry.

## Red Team Review — 2026-08-04

Four adversarial reviewers, run sequentially: Security Adversary, Failure Mode Analyst, Assumption Destroyer, Contract Verifier. Reports under `plans/reports/redteam-260804-1648-*.md`. 45 raw findings, deduplicated and evidence-filtered to those below. Every accepted finding cites both sides of its mismatch; anything that could not name a concrete failing scenario was dropped.

### The one that stopped the plan — resolved 2026-08-05

**ADR-012 was refuted by Node's own documentation, not merely risky.** `nodejs.org/api/typescript.html` (Stability 2, stable since 24.12.0), verified directly 2026-08-04:

> To discourage package authors from publishing packages written in TypeScript, Node.js refuses to handle TypeScript files inside folders under a `node_modules` path.

No override flag exists; `--no-strip-types` disables stripping, it does not lift the restriction. Every install path puts `bin.ts` under `node_modules` — the project devDependency, and `npx`, which stages into `~/.npm/_npx/<hash>/node_modules/`. So Phase 1's success criterion ("`ds --help` runs from a git install, with no build step") is unachievable as written, and it gates all nine remaining phases.

Note what this was *not*: not the Phase 1 spike's question — that spike asks how the CLI resolves the engine, and none of its three candidate answers touches the blocker. Not fixable by switching to the npm registry either, since the restriction is about the *location*, not the source of the install. **The shipped artifact must be JavaScript.**

**Resolved: ADR-012 rewritten (`architecture.md`), the toolkit builds through `prepare` at install time.** Full reasoning and the three rejected alternatives live in the ADR; C1 below carries the summary. Both spikes are superseded — a JavaScript preset under `node_modules` was never in doubt, so Phase 4's question is answered too, and Phase 1's spike survives only as a check that the `imports` map resolves *built* paths after `prepare` has run.

### Accepted — Critical

| # | Finding | Where | Fix |
| --- | --- | --- | --- |
| C1 | ADR-012 refuted (above) | Node docs vs `architecture.md` ADR-012, `phase-01:13,25` | **Resolved 2026-08-05 — ADR-012 rewritten: the toolkit builds through `prepare` at install time.** `bin` points at compiled JavaScript, TypeScript becomes a devDependency, `files` ships build output + `templates/`, and nothing generated is committed. Reverses the original ADR's own rejection of `prepare` (npm runs it silently, so a first `npx` reads as a hang) — that objection still stands, but the option it was rejected in favour of does not exist. Rejected: committing built JS (contradicts "never commit `dist/`", and dist drifts from source); JSDoc-typed JavaScript (the pain lands exactly on the schema, manifest and classification generics); npm registry (cleanest, but reverses ADR-007 — kept as the documented upgrade path). New sharp edge: `--ignore-scripts` silently skips the build, so Phase 1 owns a guard and Phase 10 a release test. Phase 4's spike is superseded. Node floor stays 24 LTS but is now a choice, not a constraint |
| C2 | Phase 7 never rewrites the manifest — its file list creates `classify.ts` only, while 6, 8 and 9 all touch `manifest/write.ts` | `phase-07` Related Code Files | After one `ds update`, `engineVersion` and every checksum still describe the old version, so the next update classifies the whole shipped tree as conflicted. Add the manifest rewrite to Phase 7 as a step and a success criterion |
| C3 | `ds update --to <version>` has no path to the *new* template's bytes | `phase-07:33` | `update` runs from the project's own installed copy; `baseline.ts` fetches only the *old* tag; ADR-007 forbids `npx` for maintenance commands. Nothing produces the target version. Either `--to` fetches the target tag the same way `baseline.ts` fetches the old one, or `--to` is dropped and updating means bumping the devDependency first — decide in Phase 7 |
| C4 | `create` gates git presence but not identity | `phase-06` step order | Fresh macOS + Xcode CLT has git and no `user.email`. The commit is step 6 of 8, so failure lands after the whole project is on disk: rollback either deletes a working project or leaves a repo with no commit and raw git stderr. Breaks NFR5 and ADR-009 together. Gate identity with the other preflight checks |
| C5 | Rollback ledger does not distinguish "created" from "overwrote" | `phase-06`, security report | Ctrl-C can delete pre-existing user files, since `git init` runs after copy. Record the pre-state per path; only unwind what was created |

### Accepted — High

- **Phase 4 must precede Phase 3.** `plan.md` claimed Phase 4 independent of 2 and 3; false — `phase-04:47,62` builds `surfaces.ts` from Phase 2's parsed tokens, and Phase 3's rules 22–23 validate a `.storybook/main.ts` that imports a preset Phase 4 builds. Acting on the old claim yields a second `tokens.json` parser. **Sequencing corrected below.**
- **Ramp step count is wrong in the plan's own text.** `phase-02:23` says "12 steps: 50, 100, 200 … 900, 950" — that enumeration is **eleven** values. Rule 18 ("no ramp declares all twelve steps literally") then becomes a threshold no ramp reaches, so the one rule written to forbid hand-authored ramps passes them. Fix the count, then fix the rule to "declares every step literally".
- **`{{placeholders}}` have no renderer, and rendering breaks classification.** `phase-05:100` ships a templated `package.json`; no phase owns the substitution. Worse: Phase 6 checksums the *rendered* file while Phase 7 compares against *unrendered* template bytes, so `package.json` is conflicted on the first update of every project, forever. Checksum what was written, and record rendered files as a distinct manifest class.
- **`ds generate` appends to the manifest-tracked tier barrel**, so the NFR4-blessed way to add a component guarantees a permanent conflict on every future update. Either barrels become generated files (regenerated, never checksum-compared) or `generate` stops touching them.
- **Checksum normalisation appears in Phase 7 and not Phase 6**, with no manifest version field to detect the mismatch. Normalise in one shared module used by both; add a manifest schema version.
- **`--dry-run` creates a branch and regenerates `tokens.css`** while its success criterion is a tree hash blind to both. Dry run must precede branch creation and write nothing at all.
- **`baseline.ts` containment check fails on macOS.** `/var` → `/private/var` symlink means every extracted archive entry resolves outside the naive prefix check, so `migrate` never works on the maintainer's own machine — and the specified tests cover only negative cases, so none would catch it. Compare `realpath`s, and add a positive-path test.
- **`create` may commit into the user's enclosing repo** with no clean-tree gate and no staging pathspec, sweeping their WIP into the scaffold commit. Gate the tree, stage by explicit pathspec.
- **Client brand data as committed fixtures — partly overstated, resolved 2026-08-04.** The *template* was never at issue: Phase 5 step 3 neutralises everything, and shipping a neutral design system is the project. Phase 3's and Phase 9's reference runs are local, committing nothing. The real exposure was two lines in Phase 2 (`:55`, `:62`) proposing WIN Flavor's actual hex values and ramp names as committed engine fixtures. **Resolution: keep the reference for structure, use synthetic values in committed fixtures.** The test value is in the anchor *positions* — one ramp anchored at 950 (almost every step lighter than base) and one at 500 (spread both ways) from a single code path — and an invented dark green at 950 exercises that identically. Costs nothing, removes the question.
- **Contract rules 12 and 13 conflict with `globals.css` — resolved 2026-08-04.** `contract:77` made `tokens.json` the only file where a font family may appear; `architecture.md:113` has `globals.css` holding font imports, so the template's own file violated the contract and Phase 5's "zero violations" could not hold. **Rule 12 narrows: `globals.css` is exempt for `@import` and `@font-face` only.** A font *source* is not a font *token*, and `globals.css` is already the single hand-edited style file by design. Rejected: modelling webfont URLs and `@font-face` descriptors as tokens (messy, and codegen would own something it has no good shape for), and demoting the rule to `[S]` (moves a rule from enforced to suggested — the direction this project exists to reverse).
- **Rules 9 and 11 were mutually unsatisfiable for grouped stories — resolved 2026-08-05.** `Meta.component` is singular, so a grouped story file covering three components gave rule 9 nothing to match on, and `phase-05` ships that case deliberately. **Rule 9 now checks the union of `component` and Storybook's native `subcomponents`**; rule 11 is untouched, so a grouped file still has a primary subject. Coverage becomes a declaration rather than something the validator infers. Rejected: inferring coverage from what a file imports and renders (fragile both ways — passes an incidental mention, fails an indirect render); forbidding grouped files outright (trivially checkable, but splits documentation pages that are better together).
- **`verbatimModuleSyntax` is absent from the Phase 1 tsconfig.** `erasableSyntaxOnly` does not enforce `import type`; a value-imported type throws at runtime while `tsc --noEmit` stays green. Add it. (Survives whatever C1 resolves to.)
- **No exit-code contract anywhere.** Every command's failure modes are described in prose; nothing fixes the codes CI and the agent skill depend on. Define them in Phase 1.
- **`create` into a non-empty directory was undefined — resolved 2026-08-05.** **Allowed; refused only on collision.** `create` compares the template's file list against the target and refuses when a path the template ships already exists, naming the collisions and pointing at `ds adopt`. Refusing every non-empty target would have been simpler but breaks a case Phase 6 explicitly supports — scaffolding into the current directory — since a bare `.git`, `README.md` or `LICENSE` makes a directory non-empty without being in the way. Rejected: prompting to overwrite, which puts a destructive default one keystroke away in the first command a new user runs, and which ADR-013 already rejected for `adopt` when it removed `--force`.
- **All five `[S]` rules ended Phase 10 with no enforcement — resolved 2026-08-04 by adding Phase 11.** FR3's agent skill was referenced three times (`phase-01:55`, `phase-03:15`, `phase-03:56`) and built never, so three phases were designing against a consumer that did not exist, and the contract's whole `[S]` half would have shipped as prose with no reviewer — the exact condition `CLAUDE.md` names as the origin of drift. In scope: `phase-11-agent-skill-and-semantic-rules.md`, depending on 3 and 5, with the contrast arithmetic split into the engine and only the judgement left to the skill. Rejected: folding it into Phase 3 (deterministic code and a prompt-shaped artefact reviewed to one standard means the softer half sets it), and promoting the contrast ratio to a `[V]` rule (a build-failing threshold with a legitimate exception gets weakened by the first project that hits one).

### Rejected

- *Effort estimates understated ~50%* — the corrected figures (≈35–45d vs ≈23–30d) are plausible and Phase 5's in particular is well argued, but estimates are not defects and re-baselining before C1 is resolved would be re-baselining twice. Revisit once the ADR lands.
- *Reports may embed absolute paths / private registry hosts* — real but Medium, and the report writers do not exist yet. Handle as a review item in Phases 7 and 9 rather than a plan change now.
- *Validator rules 16–18 lack a ramp-vs-flat-colour discriminator* — accepted as a question, not a finding: the reference has flat `color.brand.white` alongside real ramps. Folded into Phase 2's schema work, where the discriminator belongs.

### Sequencing correction

Phase 4 moves ahead of Phase 3. New order: 1 → 2 → 4 → 3 → 5 → 6 → 7 → 8 → 9 → 10. Phase 3's dependency becomes `[1, 2, 4]`; Phase 5's becomes `[2, 3, 4]` unchanged in content. This is the only structural change the review produced.

<!-- slug: story-cli-kit-implementation -->
