---
title: "Phase 11: Agent skill and the [S] rules"
status: todo
priority: P2
effort: "2-3d"
dependencies: [3, 5]
---

# Phase 11: Agent skill and the `[S]` rules

## Overview

Build the half of FR3 that Phases 1–10 reference and never construct. `docs/design-system-contract.md:5` divides every rule in two: `[V]` rules are machine-checked, `[S]` rules are *"semantic — the agent skill reviews them; a script cannot."* Phase 3 builds all 24 `[V]` rules. Nothing anywhere builds the skill, so the five `[S]` rules ship as prose with no reviewer — which is precisely the failure mode `CLAUDE.md` names: *a rule that exists only in prose is a suggestion, and suggestions produced the drift this project exists to end.*

Added 2026-08-04 after the red team found the gap. The plan referenced the skill three times — `phase-01:55` (exit codes it branches on), `phase-03:15` (its authoritative input), `phase-03:56` (`--json` built for it to consume) — and built it nowhere. Three phases were designing against a consumer that did not exist.

## Why this is a separate phase, not part of Phase 3

Phase 3 is deterministic code with fixtures and exact assertions. This is a prompt-shaped artefact whose output is judgement, tested by running it against known-bad projects and reading what it says. Different discipline, different failure modes, different review standard — and merging them would let the softer half set the standard for the harder one. ADR-005's boundary is the same boundary: *the script is the floor; the skill is the ceiling*, and a ceiling is built after the floor holds.

## Requirements

**Functional**

- A skill that runs `ds validate --json` **first**, treats its result as authoritative, and reviews the `[S]` rules only after (ADR-005, `contract:148`)
- Non-zero exit from `ds validate` is reported as-is and stops the semantic pass — a project failing the floor does not get a ceiling review
- The five `[S]` rules each reviewed and each reported separately, so a run says which were checked rather than emitting undifferentiated prose:

| Source | The judgement |
| --- | --- |
| `contract:51` | Is this genuinely an atom rather than a molecule — a "Card" with three responsibilities should be split |
| `contract:73` | Do the stories cover the states that matter: variants, sizes, disabled, loading, long-content overflow, every brand surface |
| `contract:82` | Is the token name semantically honest — `--color-brand-primary` used by one button is a naming lie |
| `contract:130` | Is the generated ramp *usable*: sufficient contrast between the steps paired as text and background in `color.semantic.*` |
| `contract:137` | Do the foundations docs reflect the *current* tokens |

- **The skill never reimplements a `[V]` rule** (FR3, ADR-005). A parallel agent-side check eventually disagrees with the script, and then neither is trustworthy
- Findings are advisory and say so. `[S]` findings never fail a build; they are read by a person

**Non-functional**

- The skill is distributed with the toolkit, and `create` places it where the generated project's agents will find it
- Every finding cites the contract line it comes from, so a maintainer can check the rule rather than the reviewer
- Deterministic inputs: the skill reads the validator's JSON and the project tree, never a cached previous run

## Architecture

**The floor gate is structural, not advisory.** The skill's first action is `ds validate --json`; a non-zero exit ends the run with the validator's own report. Semantic review of a project that violates the mechanical contract produces findings about the wrong things — a component in the wrong tier makes every atom-vs-molecule judgement about it meaningless. This is why `phase-01`'s exit-code contract matters here: the skill branches on the codes, so "validation failure" and "internal error" must be distinguishable, or the skill treats a crash as a violation.

**`contract:130` is the one `[S]` rule with a computable core.** Contrast ratio between two colours is arithmetic, and ADR-006 explicitly accepted the cost: *generated ramps are mathematically even, not automatically accessible.* Split it: compute the ratios for every `color.semantic.*` text/background pairing using Phase 2's colour module, then have the skill judge what the numbers mean in context — a 3.1:1 pairing is a failure for body copy and fine for a 32px heading, which is the part arithmetic cannot settle. The computation belongs in the engine beside `color.ts`; only the judgement is the skill's.

**Do not promote the arithmetic to a `[V]` rule.** Tempting — it is deterministic and it would grow the enforced set. But a `[V]` rule fails the build, and a contrast threshold that fails the build makes the accessible-but-deliberate exception unexpressible, so the first project that hits one weakens the rule to pass. That is the prohibited move arriving by a side door. It stays `[S]`, with numbers supplied.

**One skill, not five.** The `[S]` rules share a project snapshot and read each other's context — a token-naming judgement (`:82`) depends on how the token is used, which is the same tree walk the atom-vs-molecule judgement (`:51`) needs. Five skills would each rebuild that and could reach contradictory conclusions in one run.

## Related Code Files

- Create: the skill definition — a `SKILL.md` plus supporting references, shipped inside the toolkit and placed into generated projects by `create`. **Resolve the location first** (step 1): it determines whether `create` writes it, whether the manifest tracks it, and whether `update` can ever overwrite it
- Create: `packages/engine/src/tokens/contrast.ts` — WCAG contrast ratios over `color.semantic.*` pairings, beside `color.ts` and using its conversions
- Create: `packages/engine/src/tokens/contrast.test.ts` — known pairs with published ratios, including the 4.5:1 and 3:1 boundaries exactly
- Create: `packages/engine/src/validator/__fixtures__/semantic/` — projects that pass every `[V]` rule and violate each `[S]` rule: a three-responsibility "atom", a story file covering only the default state, a dishonestly-named token, a low-contrast semantic pairing, foundations docs describing removed tokens
- Modify: `packages/cli/src/create/apply.ts` — place the skill in the generated project
- Modify: `docs/requirements.md` — FR3 currently describes the skill without saying where it lives or how it ships
- Create: `update-logs/2026-08-04/NN-agent-skill.md`

## Implementation Steps

1. **Decide where the skill lives and how it ships**, before writing any of it. Three questions with one answer each, and they interlock: is it a project-local file `create` writes, or a toolkit-level skill invoked against a project path; if project-local, is it manifest-tracked (and therefore updatable, and therefore conflictable); and does `ds validate` gain a flag that invokes it or does it stay a separate invocation. Recommend toolkit-level and invoked against a path — a project-local copy is a fork of the reviewer, and a hundred projects then hold a hundred drifting reviewers, which is this project's founding problem reproduced one level up.
2. `contrast.ts` with tests. Pure arithmetic, no judgement, no skill involvement — it ships and is useful whatever step 1 decided.
3. The `[S]` fixture projects. Write these before the skill: they are the only way to tell whether it reviews or merely agrees, and writing them first stops the skill being tuned to fixtures built to flatter it.
4. The skill itself — the floor gate, the five reviews, per-rule reporting, contract-line citations.
5. **Adversarial run: point it at a clean project.** It must find nothing and say so. A reviewer that always finds something is noise, and this is the failure mode that makes people stop reading a report.
6. Run against `win-ui-layout` (locally, committing nothing). Phase 3 step 8 gives the `[V]` baseline for the same project; this is the `[S]` counterpart and the pair is the first real measurement of the drift the toolkit exists to end.
7. Wire into `create` if step 1 chose project-local. Skip if toolkit-level.
8. `docs/requirements.md` FR3 sync — say where the skill lives and how it ships, which it does not currently say.
9. Update-log entry recording the step 1 decision and the reasoning, since it is the one choice here that is expensive to reverse later.

## Success Criteria

- [ ] The skill runs `ds validate --json` first, and a project failing a `[V]` rule gets the validator's report with **no** semantic pass attempted
- [ ] A validator *crash* is distinguished from a validator *violation* — the exit-code contract from Phase 1, exercised
- [ ] Each of the five `[S]` rules is reported separately, and a run states which were reviewed
- [ ] Every finding cites the contract line it derives from
- [ ] Each `[S]` fixture produces a finding on its seeded violation, and produces it on **that** rule rather than incidentally on another
- [ ] A clean project produces zero findings and says so plainly
- [ ] No `[V]` rule is re-checked anywhere in the skill — verified by reading it against the 24-rule table, not by assuming
- [ ] `contrast.ts` matches published WCAG ratios on known pairs, including exactly at the 4.5:1 and 3:1 boundaries
- [ ] Contrast findings carry the computed ratio and the pairing, not an unsupported verdict
- [ ] The `[V]`/`[S]` split in the contract is fully covered: 24 rules checked by Phase 3, 5 reviewed here, none unowned

## Risk Assessment

**The skill drifts into reimplementing `[V]` rules.** The most likely failure, because a semantic reviewer looking at a tree naturally notices mechanical problems. ADR-005 says exactly what breaks: two implementations that eventually disagree, after which neither is trustworthy. The step 7 read-through against the 24-rule table is the guard, and it is worth repeating whenever the skill is edited.

**Findings are unfalsifiable.** "This atom has too many responsibilities" with no cited rule and no named responsibility cannot be acted on or argued with. Contract-line citation is the minimum bar; naming the specific thing is the real one.

**The clean-project run finds something anyway.** Reviewers are biased toward output. If step 5 produces findings on a project built to satisfy the contract, the finding is about the skill, not the project — fix the skill.

**`[S]` rules quietly become blocking.** If CI ever gates on this, the pressure to weaken a semantic judgement to get a green build arrives immediately, and semantic rules have no principled threshold to weaken to. Keep it advisory and keep it out of the CI gate Phase 10 defines.
