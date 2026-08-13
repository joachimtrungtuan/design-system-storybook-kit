---
title: "Phase 5: Neutral template"
status: completed
priority: P1
effort: "4-6d"
dependencies: [2, 3, 4]
---

# Phase 5: Neutral template

## Overview

Build `templates/storybook-vite/` — the complete, runnable, contract-compliant project that `ds create` copies. Largest phase in the plan, and the one the whole toolkit is judged by: requirements.md criterion 5 says a fresh agent given only the repo should produce a component structurally indistinguishable from the maintainer's, and the template is what teaches it.

The template mirrors the reference project — the maintainer's existing pre-contract Storybook. Scouting established what that can and cannot mean.

## What mirroring actually involves

The reference project supplies content. It cannot supply structure, because it does not satisfy the contract — it predates it. Every difference below is work in this phase:

| Reference project | Contract requires | Work |
| --- | --- | --- |
| `atoms/button/Button.tsx`, `atoms/misc/{Badge,Container,SlidingNumber}.tsx` — atoms grouped by category | one directory per component, `kebab-case`, `PascalCase.tsx` matching | regroup every atom |
| `organisms/{Header,Footer,Sidebar}.tsx` — flat files | component directories with `index.ts` | restructure |
| `templates/RootLayout.tsx`, no `stories/templates/` | a templates tier with stories | author the missing stories |
| ramps materialised as twelve-value `scale` objects with `anchorStep` | `$base` / `$anchor` / `$mode` / `$overrides` | re-derive; pin only genuinely divergent steps |
| `color.semantic.*` as raw hex with a `comment` reading "→ brand.jet" | semantic entries referencing another token | convert comments into real references |
| one foundations MDX (`BrandSystem.mdx`) | five, plus `Introduction.mdx` | author six |
| `tailwind.config.ts` + postcss + autoprefixer | CSS-first `@theme`, no JS config | drop entirely (ADR-003) |
| brand values throughout | neutral, brand-free but complete | strip the reference brand identity, keep the structure |

The token translation in rows 4 and 5 is the most valuable single piece of work here: it is the first real test of whether ADR-006's anchor-plus-generation model reproduces a brand a designer actually approved.

## Requirements

**Functional**

- The full directory layout from the contract, complete
- Neutral `tokens.json`: brand-free but complete, every group populated, brand colours as ramps
- A few complete components per tier — every size variant, every interaction state (default, hover, active, focus, disabled), every tone variant, each documented in its story
- `Introduction.mdx` plus five foundations MDX docs: `Colors`, `Typography`, `Spacing`, `Elevation`, `Motion`
- `.storybook/main.ts` and `preview.tsx` importing the engine preset
- `globals.css` hand-edited, importing generated `tokens.css`
- Runs: one command starts Vite, one starts Storybook
- `ds validate` passes with zero violations

**Non-functional**

- No `tailwind.config.ts`, no committed generated file, no brand assets or real copy
- Depth over breadth — a few components realised completely, never many realised partly
- Template runtime dependencies stay minimal; every one is inherited by every project ever generated

## Token group naming

**Rule:** a top-level token group is named for its Tailwind v4 `@theme` namespace where one exists, camelCase otherwise, and non-token keys carry the `$` prefix ADR-006 already reserves. Codegen then becomes a namespace lookup rather than a translation table, and a translation table is where drift lives.

| Reference | Contract name | Emits |
| --- | --- | --- |
| `borderRadius` | `radius` | `--radius-*` |
| `transition` | `motion` (holding `duration`, `easing`) | `--ease-*`, `--animate-*` |
| `breakpoint` | `breakpoint` — unchanged | `--breakpoint-*` |
| `container` | `container` — unchanged | `--container-*` |
| `zIndex` | `zIndex` — unchanged | `--z-index-*` |
| `icon` sizes | `icon` — unchanged | `--icon-*` |
| `icon.library` | `$meta.iconLibrary` | — configuration, not a token |
| `meta` | `$meta` | — reserved non-token key |

All five previously-unnamed groups are adopted; nothing is dropped. Tailwind has no `--transition-` namespace, which is why `motion` is the umbrella and `transition` — a DTCG *type* name — is not a group name. `$meta` matches the existing `$base` / `$anchor` / `$mode` / `$overrides` reservation.

**This is [V24], implemented in Phase 3:** an unknown top-level group that is neither a Tailwind namespace nor `$`-prefixed is a violation. Contract, validator and template change together in this phase.

## Component set and dependencies

| Tier | Ship | Leave out, and why |
| --- | --- | --- |
| atoms | `button`, `input`, `textarea`, `badge`, `container`, `heading`, `text`, `image`, `icon`, `sliding-number` | — |
| molecules | `card`, `breadcrumb`, `pagination` | `blog-archive`, `product-archive`, `single-product` — the reference brand's domain, not neutral; `splide-carousel` — carousel dependency not adopted |
| organisms | `header`, `footer` | `sidebar` — arguably neutral; include if the maintainer wants three |
| templates | `page-shell` (from `RootLayout`) | — |
| pages | one composed example under `src/pages/` with a story under `stories/pages/` | the reference's four page groups are brand content |

The reference's `cards` folder holds `BlogCard`, `CategoryCard` and `ProductCard`. Neutrally that is one `card` component with variants, which is also the better teaching example — the contract explicitly permits a grouped `Cards.stories.tsx`.

**Runtime dependencies: `@phosphor-icons/react` and `motion`, and nothing else** beyond React, Vite, TypeScript, Tailwind v4, Storybook and the toolkit. Phosphor is load-bearing — `$meta.iconLibrary` declares an icon set, and an `icon` atom with no set behind it is a contract rule pointing at nothing. `motion` brings back `sliding-number` and gives the `motion` token group something that consumes it. Not adopted: `embla-carousel-react`, `@splidejs/react-splide`, `react-router-dom`, `react-use-measure`, `lenis`.

Naming collision worth stating once so nobody trips on it: the npm package `motion` and the token group `motion` are unrelated. The group emits `--ease-*` / `--animate-*`; the package animates components.

## The materialise harness

This phase's acceptance criteria say install, start Vite, start Storybook and `ds validate` against **a clean copy of the template**. A clean copy cannot do any of that. `package.json` carries `{{placeholders}}` for the project name and the package-manager scripts, so it is not valid JSON to npm; `src/styles/tokens.css` is generated and therefore absent; and the rendering that fixes both is `ds create`, which is Phase 6. Read literally, every runtime criterion here was unrunnable until a later phase.

**Phase 5 therefore ships the smallest thing that makes them runnable:** a materialise harness that renders the template's placeholders with fixed values into a `mkdtemp` directory, runs Phase 2's codegen to produce `tokens.css`, and returns the path. It installs nothing and prompts for nothing — it is the rendering step alone, not a preview of `create`.

- It lives with the template rather than in the CLI, because it exists to make the template testable.
- **Phase 6 consumes it rather than reimplementing it.** `ds create` is placeholder rendering plus target resolution, git, prompts, install and the manifest; the rendering half is this harness. Two implementations of one step is exactly how a template starts rendering differently in a test than it does for a user.
- **Phase 10's CI runs it too**, so "the template still boots" is a check on every commit rather than a thing verified once by hand.

Rejected: moving Phase 5's runtime gates into Phase 6, which leaves this phase — the largest in the plan — shipping a template nobody has ever run. Rejected: committing a rendered reference project beside the template, which puts a generated artefact under version control and guarantees it drifts from the template it mirrors.

## Architecture

**Neutral means a working reference implementation, not a stub.** A brand-free palette still has real ramps with real anchors; neutral typography is still a complete type scale. Someone should be able to run `create` and see a coherent design system that happens not to be anyone's brand.

**The type scale is worth lifting wholesale.** The reference project has fourteen font-size entries and a `type-scale.ts` helper beside its typography atoms — a real, considered scale. Keep the structure, neutralise the family.

**Every component is copied from here forever.** The completeness rule is not decoration: a half-built example propagates as a half-built pattern into every project. Budget accordingly — this is why the phase is 4–6 days and not 2.

## Related Code Files

- Create: `templates/storybook-vite/` — the full tree per the contract layout
- Create: `templates/storybook-vite/tokens.json` — neutral, contract-schema
- Create: `templates/storybook-vite/package.json` — with `{{placeholders}}` for name and package-manager scripts
- Create: `templates/storybook-vite/src/components/{atoms,molecules,organisms,templates}/**`
- Create: `templates/storybook-vite/src/stories/**` — mirrored stories plus six MDX docs
- Create: `templates/storybook-vite/src/styles/globals.css`
- Create: `templates/storybook-vite/.storybook/{main.ts,preview.tsx}`
- Create: `packages/engine/src/template/materialise.ts` — render placeholders + run codegen into a temp directory; consumed by Phase 6's `create` and Phase 10's CI
- Create: `packages/engine/src/template/materialise.test.ts`
- Modify: `templates/storybook-vite/README.md` — status no longer "not implemented"
- Modify: `INDEX.md`
- Create: `update-logs/<date>/NN-neutral-template.md`

## Implementation Steps

1. Land the contract change first: `docs/design-system-contract.md` gains the naming rule and the five adopted groups, Phase 3's validator gains the matching `[V]` rule, and only then is `tokens.json` written. All three together — the contract rule in CLAUDE.md is not negotiable here, and writing the template first would make the contract a description of whatever got built.
2. Translate tokens. Read the reference `tokens.json`, map every group, convert semantic entries from hex-plus-comment into real references, and **re-derive each ramp from its anchor** using Phase 2's generator. Diff generated steps against the reference's hand-authored values. Steps that differ meaningfully become `$overrides`; steps that differ imperceptibly do not. Record the override count in the update log — it is direct evidence about ADR-006's viability.
3. Neutralise: replace the reference brand's values with a neutral palette, keeping ramp structure, anchors and modes intact.
4. **Write the materialise harness now, before any component exists** — every later step runs `ds validate` against its output, so building it first is what makes steps 5–10 a continuous check rather than a final audit. Assert that a materialised copy has no `{{placeholder}}` left anywhere and that its `tokens.css` matches codegen byte for byte. Then scaffold the directory layout empty and run `ds validate` against a materialised copy of it. Expect a wall of violations; that wall is the phase's task list.
5. Atoms, complete, one at a time: component, `index.ts`, story covering every variant and state. Run `ds validate` after each — the contract is enforced continuously, not audited at the end.
6. Molecules, then organisms, then the template tier, same loop.
7. One composed page under `src/pages/` with its story.
8. Six MDX docs. Generate from tokens where practical (Colors, Spacing, Typography largely can be); prose sections stay hand-written.
9. `.storybook/` config against the Phase 4 preset; `globals.css` importing generated `tokens.css`.
10. Full run **against a materialised copy**: install, start Vite, start Storybook, `ds validate`. All four must succeed. The raw template is not runnable by design — it holds placeholders and no generated `tokens.css` — so the harness is the only honest way to run this gate before Phase 6 exists.
11. Update-log entry; `INDEX.md` and template README sync.

## Success Criteria

- [x] `ds validate` reports zero violations against a materialised copy
- [x] Vite dev server and Storybook both start from a materialised copy of the template
- [x] A materialised copy contains no unrendered `{{placeholder}}`, and its `tokens.css` is byte-identical to codegen output
- [x] Every shipped component documents every size, state and tone variant in its story
- [x] `tokens.json` contains no materialised full-scale ramp; every ramp is anchor-declared
- [x] Every `color.semantic.*` entry references another token; none holds a raw value
- [x] `src/styles/tokens.css` is generated, current, and not hand-edited
- [x] No `tailwind.config.ts`, no postcss config, no autoprefixer
- [x] Template `package.json` runtime dependencies are exactly `@phosphor-icons/react` and `motion` beyond the stack — verified by reading the file, not by intent
- [x] Every top-level `tokens.json` group is a Tailwind `@theme` namespace, camelCase, or `$`-prefixed; the validator rejects a seeded violation
- [x] `$meta.iconLibrary` names the shipped icon set and the `icon` atom uses it
- [x] No brand value, asset or copy from the reference project survives anywhere in the tree
- [x] Override count from the ramp re-derivation recorded in the update log

## Risk Assessment

**Ramp re-derivation needs so many overrides that ADR-006's mechanism looks pointless.** The real test of the anchor model, and step 2 measures it deliberately rather than discovering it later. If a brand needs eight overrides per ramp, that is a finding worth an ADR revisit — report it, do not paper over it by adding overrides quietly.

**"Neutral" drifts toward "empty".** The stated failure mode: a stub teaches the wrong lesson. Guard with the completeness criterion above, checked per component rather than at the end.

**Scope creep from the reference project.** It has far more components than the template should ship. The filter is neutrality plus dependency cost, and the proposed set above is the boundary — additions need a reason.

**Contract ambiguity discovered while building.** Expected, and better here than after ten projects exist. Contract, validator and template change together; never one alone.
