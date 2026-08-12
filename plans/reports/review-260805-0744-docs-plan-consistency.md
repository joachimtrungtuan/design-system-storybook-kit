# Requirements ↔ plan consistency review — 2026-08-05

Scope: `docs/{requirements,architecture,design-system-contract,update-and-migration,code-standards}.md`, `plans/260804-1648-story-cli-kit-implementation/{plan.md,phase-01..11}`. Question asked: does anything conflict, and is the set implementation-ready.

Verdict: **not yet — 4 blocking contradictions.** All four are fallout from the ADR-012 rewrite (2026-08-05) and the red team's ramp-count finding not being propagated. None require re-deciding anything; each is a stale line to correct. Ten further items are stale-doc or ownership gaps that will bite mid-implementation.

## Blocking — two authoritative sources say opposite things

### B1. Phase 10 forbids the build ADR-012 mandates

- `phase-10:36` (Architecture): *"the tagged commit must be installable exactly as it stands: **no build**, correct `files`"*
- `phase-10:72` (Success criteria): *"No `dist/`, no build artefact, **no `prepare` hook anywhere**"*
- vs `architecture.md` ADR-012 + `phase-10:30` in the *same file*: *"produced by `prepare` at install time … a `prepare` hook is now required rather than forbidden"*

Phase 10 contradicts itself and the ADR. Its release gate as written would fail every correct build. Fix: rewrite `:36` and `:72` to the post-rewrite position (build output gitignored and absent from git; `prepare` present and required; the release test is that `prepare` runs on a real git install).

### B2. What ships in the tarball is specified three different ways

| Source | Claims `files` ships |
| --- | --- |
| `plan.md:75` | `[packages, templates]` |
| `phase-10:24,56,68` | `packages/` and `templates/` |
| `phase-01:74,105` | build output + `templates/`; `phase-10:81` adds *"no `src/`"* |

If `outDir` is outside `packages/`, shipping `packages/` ships source and not the binary; if `outDir` is inside it, `files: [packages]` ships source *and* build. Nobody has stated the output directory. Fix: name `outDir` once (Phase 1), then state the packed list identically in `plan.md`, `phase-01` and `phase-10`, and assert it in CI rather than describing it in three places.

### B3. The `imports` map points at source in one place, compiled in another

- `plan.md:75`: `imports: { "#engine/*": "./packages/engine/src/*" }`
- `phase-01:74`: *"`imports` (pointing at **compiled** paths)"*; `phase-01:33`: *"the `imports` map must point at built paths"*

`plan.md`'s architecture sketch is the pre-rewrite version. It is also the first thing an implementer reads. Fix `plan.md`.

### B4. Ramp step count — the docs still say twelve, and rule 18 is unreachable

Phase 2 corrected the count to **11** (50,100,…,900,950) and reworded rule 18 to *"declares **every** step literally"*. Neither correction reached the docs:

- `design-system-contract.md:120`: *"No ramp declares **all twelve steps** literally"* — a threshold no ramp can reach, so the one rule written to forbid hand-authored ramps passes every one of them. This is the exact defect the red team flagged, still live in the authoritative doc.
- `architecture.md:107`: *"the generated CSS holds the **twelve** steps"*.

Fix both, in the same change, before Phase 2 starts — the contract is what Phase 3 implements against.

## High — stale docs and unowned decisions

**H1. Four accepted contract changes are not in the contract.** `plan.md:151` records them as owed to Phases 3 and 5, which is a deliberate choice, but it means `design-system-contract.md` is currently *wrong* on four points and any agent reading it as authority gets the old answer:
- rule 12 `globals.css` `@import`/`@font-face` exemption (`contract:77` still absolute)
- rule 9 accepting `subcomponents` (`contract:65–71` silent)
- `pnpm ds:validate` → `ds validate` (`contract:148`)
- rule 24, token-group naming (absent entirely)

Recommend landing all four now rather than in-phase. They are settled, they cost ten minutes, and they remove the only period in which the contract lies.

**H2. `update-and-migration.md` documents neither the old-tag fetch nor `--to`.** `phase-07:36` says so explicitly. `--to` also has no chosen resolution yet ("the phase must pick one before step 4") — that is an open decision sitting inside a P1 phase, not a documented design.

**H3. The manifest schema in `architecture.md:56–69` is obsolete.** It shows a flat `path → checksum` map. The phases add: a **schema version** (6, 7), a *rendered* mark (6), a *merged* mark (9), and an **applied-migrations record** (`phase-08` step 6). No phase owns updating that section, so the architecture doc will describe a structure that never existed.

**H4. Tier barrels as generated files is an unowned doc change.** `phase-06:70` recommends reclassifying tier `index.ts` as generated. That changes `architecture.md`'s **Generated** list, which today contains exactly one entry (`src/styles/tokens.css`), and touches the contract's file-category model. Phase 6 owns the code decision; nothing owns the doc edit. Decide it before Phase 6 — it also changes what Phase 7 classifies.

**H5. `ds generate` has no requirements owner.** `architecture.md:11` and `requirements.md` describe five commands (`create`/`adopt`/`validate`/`update`/`migrate`). `plan.md:15` says "all five commands", then Phase 6 builds a sixth and `phase-01:98` stubs "all six". `generate` is implied by NFR4 but named in no FR. Either add it to the docs or state it as an internal convenience — right now it is a whole command with no specification.

**H6. Phase 11 is missing from the sequencing and dependency graph.** `plan.md:205`'s corrected order stops at 10. `phase-10`'s frontmatter deps are `[1..9]` — but Phase 11 modifies `docs/requirements.md`, and Phase 10 step 7 is the final docs reconciliation, so 10 must follow 11 or the reconciliation misses it. Phase 11's own deps `[3,5]` omit 6 despite step 7 modifying `packages/cli/src/create/apply.ts`.

## Medium

**M1.** `architecture.md:77` says *"The four file categories"* above a five-row table, and the table predates the adopt-merged class that `phase-07:51` requires the pipeline to honour. Six classes now exist; the doc names four.

**M2. Reference brand names are still in committed text.** `phase-02:55` decides fixtures use synthetic values so *"no client hex or brand ramp name is committed to a repository that must be public"* — then `phase-02:73` names `cal-poly-green` and `yellow-green` as success criteria, and `contract:106,124` carry `cal-poly-green`/`#194B2C` and "Cal Poly Green"/"Yellow Green" in the public doc. Either the rule extends to docs and the examples get renamed, or the rule is narrowed to hex values only and the fixture note says so. Currently the plan states a rule it breaks two lines later.

**M3. In-project report paths are undefined.** `update-and-migration.md:55` has `ds update` writing `update-logs/<date>/NN-…md` into the generated project; ADR-013 has `adopt` leaving a report "in the project"; the contract's directory layout — *"the structure every generated project must hold"* — mentions neither. Not a validator violation, but two commands write to paths the contract does not define.

**M4.** `phase-10:32`: *"CI must fail on a type error — **under type stripping**, nothing else catches one."* Stale rationale; the reason now is that `tsconfig.build.json` excludes tests and fixtures, so it checks strictly less.

**M5. Release is gated on the lowest-priority phase.** Phase 10 depends on 8 (P3) and 9 (P2). If P3 means "can slip", the dependency should be soft, or Phase 8's mechanism ships without the worked example. As written, P3 blocks P1 goal 1.

**M6.** `phase-07`'s criterion *"Adopt-merged files are reported and never rewritten"* cannot be exercised until Phase 9 exists. Mark it as deferred-verified there rather than leaving a criterion that cannot pass when its phase closes.

**M7. `Meta.subcomponents` is unverified against Storybook 10.5.6.** Contract rule 9 now depends on it. Phase 3 already applies this discipline to the Tailwind namespace list; apply it here too — it is a contract-level rule resting on one version-bound API.

## What is consistent

Checked and found coherent: the `[V]`/`[S]` split (23 `[V]` in the contract + rule 24 = Phase 3's 24; 5 `[S]` = Phase 11's five, contract line citations all resolve correctly); the engine/content/generated boundary across architecture, contract and Phases 6–7; NFR1 reversibility as branch-only, consistently applied in 6/7/8/9 with no competing undo mechanism; the no-force-flag rule in `update` and `adopt`; ADR-008 package-manager handling across FR6, ADR-008 and Phase 6; the Node 24.12 floor and its now-a-choice status; ADR-011's TypeScript 6 pin and the `typescript-eslint` constraint behind it; the corrected 1→2→4→3→5 sequencing and each phase's frontmatter deps; code-standards §9 vs the `.gitignore`d build output.

## Recommendation

Do B1–B4 and H1 as one docs-correction change before Phase 1 — all five are corrections of settled decisions, no new judgement needed. Take H2's `--to` question, H4's tier-barrel question and M5's dependency question to a decision now rather than mid-phase; each changes a doc and each currently sits inside a phase as an unresolved fork. H3, H6, M1, M3, M4 are edits with no decision attached. Then implementation is clear.

## Unresolved questions for the maintainer

1. `--to` (Phase 7): fetch the target tag, or drop the flag and require a devDependency bump first?
2. Tier barrels (Phase 6): reclassify as generated files, or have `generate` leave them alone?
3. Do the brand-name-in-public-repo rule (`phase-02:55`) apply to `docs/` as well as fixtures, or only to hex values?
4. Is `ds generate` a documented command (needs an FR) or an internal convenience?
5. Should Phase 10 hard-depend on Phase 8 (P3), given that P1 goal 1 is release?
