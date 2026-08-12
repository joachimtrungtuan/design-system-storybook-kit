---
title: "Phase 9: ds adopt"
status: pending
priority: P2
effort: "3-4d"
dependencies: [5, 6, 7]
---

# Phase 9: `ds adopt`

## Overview

Merge the design system into an **existing** React application. Same contract and same template as `create`, entirely different write logic — `create` writes into empty space, `adopt` writes into a tree someone else built, where every write is a potential act of destruction (ADR-013).

The command's shape follows from that: compatibility gates first and refusal on failure, then classification of every intended write into five classes, then the classification printed and confirmed, and only then any write at all. The dry run is the first half of the command, not a flag.

## Requirements

**Functional — gates, run before classification, failure is refusal**

- React 19
- Vite as the bundler — CRA, Next.js and webpack are out of scope (ADR-002) and are told so plainly
- **Tailwind v4, absolutely.** On v3 the token pipeline does not degrade, it does not exist (ADR-003)
- TypeScript present, at a version the toolkit and template both work against. ADR-011 pins 6.0.3 for the *toolkit*, which is not a range and is not the same question — **this phase decides what an adopted project must satisfy**, against the peer ranges of the versions actually installed at implementation time, and records the answer in ADR-013

**Functional — classification, five classes, only two of which write**

| Class | Condition | Behaviour |
| --- | --- | --- |
| `add` | no file at that path | written |
| `identical` | exists, checksum matches ours | no-op |
| `merge` | exists, additively mergeable | merged, additions listed line by line |
| `conflict` | exists, differs, not mergeable | **never written** |
| `skip` | exists and is the user's domain outright | untouched, reported |

**Functional — the rest**

- Mergeable means additive and structured, never textual: `package.json` dependencies and scripts, `tsconfig.json` entries we require, appended `.gitignore` lines, a `globals.css` `@import`. Anything not expressible as "these keys or lines were added" is a conflict
- No `--force`. `conflict` never self-resolves
- Full classification printed, then a confirmation prompt. `--dry-run` stops after printing
- NFR1 in full: clean tree required, work on a branch, `ds validate` afterwards
- A written record of every path and its classification, left in the project
- **Merged files are permanently user-owned** — recorded in the manifest as merged, never checksum-managed, never rewritten by `update`
- **`adopt` writes a full `.designsystem/manifest.json`** — `schemaVersion`, `engineVersion`, `createdWith`, `templateId`, `appliedMigrations: []`, and an entry per written file with its checksum and mark. An adopted project is a managed project, and `update`, `migrate` and `guard` all read this file; without it none of them can run
- **`adopt` wires the host `package.json`** — the toolkit devDependency at the current version range, and the `ds:validate` script. ADR-007 forbids reaching for `npx` for maintenance commands, so without the devDependency there is no local binary and the project cannot validate or update itself at all. Both go through the `package.json` merger like any other addition

## Architecture

**Classification reuses Phase 7's classifier where the question is the same** — has this file changed from what we shipped — and adds the merge analysis, which `update` does not need. What it must not do is fork the classifier; two classification implementations disagreeing about the same file is the failure that makes both untrustworthy.

**Each mergeable file type gets its own merger, and each is structured.** `package.json` merges through parsed JSON with dependency-conflict detection: our React 19 requirement against their existing range is a comparison, not a string edit. `tsconfig.json` merges named compiler options and paths. `.gitignore` appends lines that are not already present. `globals.css` inserts one `@import`. Four small mergers, each with its own tests, and no general-purpose merge engine — a general merger would have to guess, and guessing is what `conflict` exists to avoid.

**Why merged files can never be checksum-managed.** The manifest asks one question: has the user modified this since we wrote it. For a file we merged into, there is no "as shipped by us" baseline — the file is part theirs and part ours, and no checksum distinguishes their later edit from our original addition. Recording a checksum anyway would put the update pipeline's only reliable signal on a foundation that cannot carry it. So `update` reports them and stops, permanently.

**The report is a project artefact, not console output.** It is the record of what a tool did to someone else's repository, and it should still be readable in six months when the merge is being questioned.

## Related Code Files

- Create: `packages/cli/src/commands/adopt.ts`
- Create: `packages/engine/src/adopt/gates.ts` — compatibility detection and refusal messages
- Create: `packages/engine/src/adopt/classify.ts` — five-class classification over Phase 7's core
- Create: `packages/engine/src/adopt/mergers/{package-json,tsconfig,gitignore,globals-css}.ts`
- Create: `packages/engine/src/adopt/report.ts`
- Create: `packages/engine/src/adopt/__fixtures__/` — a compliant Vite+Tailwind4 app, a Tailwind v3 app, a Next.js app, a CRA app, an app with colliding component paths
- Modify: `packages/engine/src/manifest/write.ts` — the merged-file marking
- Create: `update-logs/<date>/NN-adopt-command.md`

## Implementation Steps

1. `gates.ts` first, with a fixture per failing case. Each refusal names what is wrong, what is required, and what to do — a Tailwind v3 project should learn that v4 is required and why, not that a check failed.
2. `classify.ts` over the shared classifier, with the merge analysis added.
3. The four mergers, each with tests including the awkward cases: an existing dependency at an incompatible range, a `tsconfig` option already set to a different value, a `.gitignore` line present in a different form.
4. Report writer, both the console table and the project artefact.
5. The confirmation flow: classify, print, ask, write. `--dry-run` stops after the print, and the print is identical either way.
6. Merged-file marking in the manifest, plus the Phase 7 assertion that `update` refuses to rewrite them. Then the rest of the manifest — the same writer Phase 6 uses, so an adopted project and a created one produce the same shape — and the `package.json` additions that make `ds` locally runnable.
7. End-to-end against every fixture, including a run against a copy of the maintainer's pre-contract reference project — Vite plus Tailwind v4 plus React 19, predating the contract, which makes it the most honest available test of what `adopt` reports.
8. Update-log entry.

## Success Criteria

- [ ] A Tailwind v3 project is refused with an instruction and nothing is written
- [ ] Next.js and CRA projects are refused, naming ADR-002's scope
- [ ] Every intended write is classified before any write happens
- [ ] No code path writes a `conflict`-classified file — verified by grep as well as by test
- [ ] `--dry-run` output is byte-identical to the confirmation-prompt output of a real run
- [ ] `package.json` merge detects an incompatible existing dependency range and reports it as a conflict rather than overwriting
- [ ] Merged files are marked in the manifest and `update` refuses to rewrite them
- [ ] An adopted project carries a manifest with the same fields a created one does, written by the same module — asserted by comparing the shapes
- [ ] After adoption, the host `package.json` carries the toolkit devDependency and the `ds:validate` script, and `ds validate` runs from the project without `npx`
- [ ] `ds validate` runs after adoption and its result is reported honestly, including failure
- [ ] The project artefact report lists every path and its class
- [ ] Adoption run against a copy of the reference project completes and produces a coherent, readable classification

## Risk Assessment

**A merge corrupts the user's config.** Highest-consequence risk. Guards: structured merging only, parsed-not-textual, per-type mergers with tests, and the branch. The rule that saves this is the one already in ADR-013 — if a change cannot be stated as "these specific keys or lines were added", it is not a merge.

**Classification is technically correct but overwhelming.** A real application will produce dozens of `skip` entries. Group the output by class with counts and detail on request; a wall of paths is not informative even when every line is accurate.

**Adoption succeeds and leaves the project not actually working.** The gates check compatibility, not correctness — a project can pass every gate and still fail to build after adoption. `ds validate` afterwards is necessary but not sufficient. Say so in the report: adoption is a merge, not a guarantee, and the user should build before committing.

**The reference project is the only real-world test available.** One data point, and the maintainer's own project. Enough to be worth doing, not enough to claim general safety.
