---
title: "Phase 3: Validator"
status: in-progress
priority: P1
effort: "2-3d"
dependencies: [1, 2, 4]
---

# Phase 3: Validator

## Overview

Implement every `[V]` rule in `docs/design-system-contract.md` as a deterministic check, and wire them to `ds validate` with a non-zero exit on any violation. This is the phase that makes the project's central claim true: consistency is enforced, not requested. `CLAUDE.md` states it plainly — a rule that exists only in prose is a suggestion, and suggestions produced the drift this project exists to end.

The validator is written before the template so the template is built against a running check. It is also the artefact the agent skill wraps and treats as authoritative (ADR-005), so its output format is a contract of its own, not incidental formatting.

## Requirements

**Functional — the complete `[V]` set, extracted from the contract**


| ID | Rule | Source |
| --- | --- | --- |
| V1 | No directory directly under `src/components/` other than the four tiers | layout |
| V2 | `src/stories/` subdirectories are exactly the tier names plus `foundations` and `pages` | layout |
| V3 | A tier imports from lower tiers only | tiers |
| V4 | Component directories are `kebab-case` | naming |
| V5 | Component files are `PascalCase.tsx` matching their directory name | naming |
| V6 | Non-component modules are `kebab-case.ts` | naming |
| V7 | Every component directory has an `index.ts` re-exporting its public surface | naming |
| V8 | Every tier directory has an `index.ts` re-exporting its component barrels | naming |
| V9 | Every component is covered by **at least one** story file in the *same tier directory* under `src/stories/`, as that story's `component` or one of its `subcomponents` | stories |
| V10 | Story `title` is `<Tier>/<Name>` with the tier matching the directory | stories |
| V11 | Every story file default-exports `title` + `component` typed `Meta`, plus ≥1 named `StoryObj` | stories |
| V12 | `tokens.json` is the only file holding a raw colour, font family or type-scale value — **except `src/styles/globals.css`, for `@import` and `@font-face` only** | tokens |
| V13 | No hex / `rgb()` / `hsl()` in `src/components/**`, `src/pages/**`, `.storybook/**` | tokens |
| V14 | No arbitrary Tailwind values for tokenised properties; non-tokenised one-offs allowed | tokens |
| V15 | `src/styles/tokens.css` matches current codegen output | tokens |
| V16 | Every ramp declares `$base`, `$anchor`, `$mode` | tokens |
| V17 | The anchor step of a generated ramp equals `$base` | tokens |
| V18 | No ramp declares every step literally | tokens |
| V19 | `color.semantic.*` entries reference another token, never a raw value | tokens |
| V20 | `foundations/` contains at least `Colors`, `Typography`, `Spacing`, `Elevation`, `Motion` `.mdx` | docs |
| V21 | `Introduction.mdx` exists and declares `<Meta title="Introduction" />` | docs |
| V22 | `.storybook/main.ts` imports the engine preset rather than declaring `stories` / `addons` / `framework` inline | config |
| V23 | `preview.tsx` imports the engine preview and spreads it | config |
| V24 | Every top-level `tokens.json` group is a Tailwind v4 `@theme` namespace, camelCase, or `$`-prefixed | tokens |
| V25 | Agent hook configuration is present and invokes `ds` commands rather than inlining checks | ownership |
| V26 | `AGENTS.md` exists at the project root and `CLAUDE.md` mirrors it | ownership |

V16–V19 are already enforced at parse time by Phase 2's schema module; the validator calls that module rather than reimplementing them (DRY, and ADR-005's reasoning applied internally).

**IDs are the citation surface.** Violations, plans, migration notes and skill findings name `V9`, never a contract line number — the six line citations this plan carried into Phase 11 were all stale within a day of being written. IDs are append-only: a retired rule keeps its number.

**V25 and V26 are implemented in Phase 12, not here** — they check for files Phase 12 defines. Phase 3 reserves the IDs and leaves the two rule modules unwritten, so the contract's list and the validator's list stay one-to-one at the moment Phase 12 lands rather than diverging in between.

**V24 governs token group naming.** The reference project ships five groups the contract does not name (`icon`, `breakpoint`, `container`, `zIndex`, `meta`); all five are adopted — see Phase 5 for the table — under a naming rule rather than a fixed list, so a future group is checkable without amending the validator each time. The rule needs the Tailwind namespace list as data: `color`, `font`, `text`, `fontWeight`, `tracking`, `leading`, `breakpoint`, `container`, `spacing`, `radius`, `shadow`, `insetShadow`, `dropShadow`, `blur`, `perspective`, `aspect`, `ease`, `animate`. Verify that list against the installed Tailwind version at implementation time rather than trusting it here — it is version-bound, and the stack table's verification date applies to it too.

**Non-functional**

- Each rule is a separate module with its own test, so a new rule is a new file, not an edit to a growing switch
- Violations report file, line where meaningful, the rule, and what to change — the same instruction standard as NFR5
- `--json` output for the agent skill to consume
- No rule may be weakened to make a check pass (`CLAUDE.md`, standing prohibition)

## Architecture

**A rule is a function from a project snapshot to violations.** Read the tree once into a snapshot — file list, parsed token file, parsed story metadata — and hand the same snapshot to every rule. Rules that each walk the filesystem independently get slow and, worse, disagree about what they saw.

**Import-direction checking (V3) needs real parsing, not a regex.** A regex over import statements gets `import type` wrong, misses re-exports through a barrel, and produces false positives inside strings and comments. The honest options are TypeScript's own compiler API — already a dependency of every generated project — or a small purpose-built import extractor. Recommendation: use the TypeScript API, since it is present anyway and correctness here is what makes V3 trustworthy. Same machinery serves V11, which must read the shape of a default export.

**V14 needs a list of tokenised properties.** "No arbitrary values for tokenised properties" is only checkable against a definition of which properties are tokenised — colour, font-size, spacing, radius, shadow, and the transition set, derived from the token groups present. `w-[37rem]` stays legal because width is not tokenised. Derive the list from the parsed token file rather than hardcoding it, so adding a token group extends the rule automatically.

**V15 is a byte comparison** against Phase 2's codegen output. This is why Phase 2 comes first, and why its determinism guarantee is load-bearing rather than decorative.

**V9's mapping is component → covered by, not one file per component — and coverage is declared, not inferred.** A story file may group related components, but `Meta.component` is singular, so a grouped file covering three components gives a `component`-only check nothing to match on. Storybook's `Meta` has the answer natively: **`subcomponents`**, beside `component`. V9 checks each component against the union of the two:

```ts
const meta = {
  title: "Molecules/Cards",
  component: Card,
  subcomponents: { CardHeader, CardFooter },
} satisfies Meta<typeof Card>;
```

V11 is untouched — `component` is still required, so a grouped file still has a primary subject rather than becoming a bag of unrelated components.

**Matching is tier-level, not filename-level.** V9 searches `src/stories/<tier>/` for any story declaring the component, whatever the filename, and requires at least one. A per-file rule — "exactly one story file at the mirrored path" — would contradict grouping twice over: a grouped file is one file covering several components, so no per-component mirrored path exists, and "exactly one" forbids a second story file that legitimately covers the same component from another angle. Filename mirroring stays the convention and is what `ds generate` emits — it is simply not what V9 checks, because the check that fits the file layout the contract actually permits is a coverage check.

Rejected: strict filename mirroring with a declared exception list for grouped files — a second surface to keep in sync, and the drift it invites is the kind V9 exists to catch. Rejected: inferring coverage from what a file imports and renders. It asks the validator to reconstruct intent from render calls, which is fragile in both directions — it passes a component merely mentioned in passing, and it fails one rendered indirectly through a helper. Rejected: forbidding grouped story files entirely. Trivially checkable, but it overrides Phase 5's deliberate design and splits documentation pages that are more useful together.

## Related Code Files

- Create: `packages/engine/src/validator/index.ts` — snapshot builder, rule runner, exit code
- Create: `packages/engine/src/validator/snapshot.ts`
- Create: `packages/engine/src/validator/rules/` — one file per rule group: `layout.ts`, `tiers.ts`, `naming.ts`, `stories.ts`, `tokens.ts`, `docs.ts`, `config.ts`
- Create: `packages/engine/src/validator/report.ts` — human and `--json` output
- Create: `packages/engine/src/validator/__fixtures__/` — one minimal compliant project, plus one seeded violation per rule
- Create: `packages/engine/src/validator/rules/*.test.ts`
- Modify: `packages/cli/src/commands/validate.ts` — replace the Phase 1 stub
- Create: `update-logs/<date>/NN-validator.md`

## Implementation Steps

1. Build the compliant fixture project first — a minimal tree satisfying V1–V24. It doubles as the shape Phase 5 fills out, and writing it surfaces contract ambiguities early, while they are cheap.
2. `snapshot.ts` — one filesystem pass, one token parse, one TypeScript program.
3. Rules in contract order, each with a passing case and a seeded failing case. Layout and naming first (cheapest, catch most), then stories, then tokens, then docs and config.
4. V3 via the TypeScript API. Test the cases a regex fails: `import type`, barrel re-export, a matching string inside a comment.
5. V15 wired to Phase 2 codegen. Test: edit `tokens.json` without regenerating, expect a violation.
6. `report.ts`, human and JSON. Fix the JSON shape now — the agent skill will depend on it. **Every violation carries its rule ID** as a field of its own, not embedded in the message: it is what Phase 11's skill matches on and what a user searches the contract for.
7. `ds validate` wiring, exit codes, and a `--json` flag.
8. Run the validator against the maintainer's existing pre-contract project and record what it reports. That project predates the contract, so a long violation list is the expected and useful result — it is the first real measurement of the drift this toolkit exists to end.
9. Contract doc sync. All four points below are already stated in `docs/design-system-contract.md`; this step verifies that the validator matches them, and is not an authoring step. **V9 accepts `subcomponents` and matches tier-level** — a component is covered when it is the `component` or one of the `subcomponents` of any story file in its tier directory. **V12 is narrowed**: `src/styles/globals.css` may name a font family inside an `@import` or an `@font-face` block, and nowhere else. A font *source* is not a font *token* — the family name in a webfont URL is how the file is fetched, while the token is how the design system refers to it, and `globals.css` is already the one hand-edited style file by design (`architecture.md`, *Engine / content boundary*). Without this the template's own file violates the contract and Phase 5's "zero violations" is unreachable. Rejected: modelling webfont URLs and `@font-face` descriptors as tokens, which gives codegen a shape it has no good emission for; and demoting V12 to `[S]`, which moves a rule from enforced to suggested — the exact direction this project exists to reverse. **The validation entry point is `ds validate`, not `pnpm ds:validate`**: ADR-008 says the project follows whichever package manager was detected, so a pnpm-specific command cannot be the contract's name for the check. The generated `package.json` still carries a `ds:validate` script, run under the user's own manager. **V24's naming rule** sits in the token-structure section.
10. Update-log entry; sync any further contract wording the implementation clarified.

## Success Criteria

- [x] V1–V24 implemented, each with a passing and a failing fixture
- [x] `ds validate` exits zero on the compliant fixture, non-zero on every seeded violation
- [x] Every violation names the file and what to change; no violation reports only a rule ID
- [x] `--json` output parses and carries file, **rule ID**, message per violation
- [x] V3 correctly ignores `import type` and correctly catches a barrel re-export crossing tiers
- [x] V15 fails on a stale `tokens.css` and passes immediately after regeneration
- [x] V12 passes a `globals.css` carrying an `@import` webfont URL and an `@font-face` block, and still fails the same font family written into a component or into a `globals.css` custom property — the exemption is scoped to two at-rules, not to the file
- [x] V9 passes a grouped story file declaring `subcomponents`, passes a component whose story file is named differently from it but sits in the same tier directory, and still fails a component that appears in neither `component` nor `subcomponents` of any story in its tier — coverage is the declaration, not the filename
- [x] Zero rules reimplement schema checks Phase 2 already owns
- [ ] The run against the pre-contract project completes without crashing and produces a readable report — pending because the private local project path is intentionally absent from this public repository and was not supplied in the current session
- [x] The `[V]` list in `docs/design-system-contract.md` and the implemented rule list are one-to-one for V1–V24, verified by counting both; **V25 and V26 are reserved, listed in the contract, and unimplemented until Phase 12** — the count reconciles when Phase 12 lands, and Phase 12's own criteria assert it

## Risk Assessment

**A contract rule turns out to be ambiguous once it must be executed.** Likely — this is the first time the prose meets a machine. V12 and V9 both hit it already and are resolved above; V14 (which properties are tokenised) is the next probable candidate. Do not resolve by narrowing the rule until it passes: that is the prohibited move. Name the ambiguity, propose wording, get a decision, change contract and validator together. V12's narrowing qualifies because it was decided against a case the contract genuinely had not considered — a font source is not a font token — not because a check was failing and the rule was in the way.

**The TypeScript API is heavier than expected in a CLI startup path.** Measure once during step 4. If `ds validate` becomes slow enough to be annoying, lazy-load the program so only V3 and V11 pay for it.

**Rules pass on the fixture and fail on a real project for uninteresting reasons.** Step 8 exists precisely to find that before Phase 5 depends on it.
