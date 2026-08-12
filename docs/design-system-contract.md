# Design System Contract

The structure every generated project must hold. This is the specification the template implements, the validator enforces, and agents must not reinterpret.

Rules marked **[V]** are machine-checked. Rules marked **[S]** are semantic — the agent skill reviews them; a script cannot.

**Every rule carries a stable ID** — `V1`…`V26`, `S1`…`S6`. Cite the ID, never a line number: validator output, skill findings, plan files and migration notes all use it, so a rule stays addressable across edits to this file. IDs are append-only; a retired rule keeps its number rather than freeing it for reuse.

## Directory layout

```text
project/
├── .designsystem/manifest.json      engine version + shipped-file checksums
├── .claude/settings.json            agent hooks — invoke ds guard / validate
├── AGENTS.md                        agent instructions; CLAUDE.md mirrors it
├── .storybook/
│   ├── main.ts                      imports engine preset
│   └── preview.tsx                  imports engine preview, adds project decorators
├── tokens.json                      ONLY hand-edited token source
├── src/
│   ├── components/
│   │   ├── atoms/<component>/       Button.tsx + index.ts
│   │   ├── atoms/index.ts           GENERATED — tier barrel, derived from the directories
│   │   ├── molecules/<component>/
│   │   ├── organisms/<component>/
│   │   └── templates/<component>/
│   ├── stories/
│   │   ├── Introduction.mdx
│   │   ├── foundations/             *.mdx — token & brand documentation
│   │   ├── atoms/                   *.stories.tsx
│   │   ├── molecules/
│   │   ├── organisms/
│   │   ├── templates/
│   │   └── pages/
│   ├── pages/                       composed pages (project content)
│   ├── styles/
│   │   ├── tokens.css               GENERATED — never hand-edit
│   │   └── globals.css              hand-edited; imports tokens.css
│   └── assets/
```

- **[V1]** No directory may exist directly under `src/components/` other than the four tiers.
- **[V2]** `src/stories/` subdirectories must be exactly the tier names plus `foundations` and `pages`.

## Tier definitions

| Tier | Composes | Test |
| --- | --- | --- |
| **atoms** | nothing from this system | Cannot be broken down without ceasing to be useful. Owns no layout beyond itself. |
| **molecules** | atoms only | A small, single-purpose group. Named for what it *is*, not where it sits. |
| **organisms** | molecules + atoms | A page section that stands alone and carries meaning. |
| **templates** | organisms + molecules + atoms | Page skeleton. Structure and slots, no real content. |
| **pages** | templates + everything | Concrete content in a template. Lives in `src/pages/`, documented under `stories/pages/`. |

- **[V3]** A tier may import from lower tiers only. `atoms` importing from `molecules` is an error.
- **[S1]** Whether something is genuinely an atom vs. a molecule. A script can check the import direction; only judgement can say a "Card" with three responsibilities should be split.

## Naming

- **[V4]** Component directories: `kebab-case` (`product-card/`).
- **[V5]** Component files: `PascalCase.tsx` (`ProductCard.tsx`), matching the directory name.
- **[V6]** Non-component modules: `kebab-case.ts` (`use-draggable-marquee.ts`, `type-scale.ts`).
- **[V7]** Every component directory has an `index.ts` re-exporting its public surface.
- **[V8]** Every tier directory has an `index.ts` re-exporting all its component barrels. **This file is generated**, derived from the directories present — see the generated-file list in [architecture.md](architecture.md). It is not hand-edited, and `ds update` overwrites it rather than treating an edit as a conflict.

PascalCase component files intentionally override the workspace-wide kebab-case default; React ecosystem convention and all four reference projects agree, and the language-convention escape hatch in the global rules covers it.

## Stories

**[V9]** Every component in `src/components/<tier>/` is covered by **at least one** story file under `src/stories/<tier>/` — the *same* tier directory, any filename. A component with no story is an error: this is the single most important rule in the contract, because an undocumented component is how drift starts.

Story files may group related components (`Cards.stories.tsx` covering all card variants), so the mapping is component → *covered by* a story file, not one file per component. **Mirroring is therefore tier-level, not filename-level.** Matching the filename to the component (`ProductCard.tsx` → `ProductCard.stories.tsx`) remains the convention for single-component files and is what `ds generate` emits, but it is not what V9 checks — a filename rule and a grouping allowance cannot both be enforced, and coverage is the property that matters.

**Coverage is declared, not inferred.** A component is covered when it is the story's `component` or one of its `subcomponents` — Storybook's native field, beside `component` in `Meta`:

```ts
const meta = {
  title: "Molecules/Cards",
  component: Card,
  subcomponents: { CardHeader, CardFooter },
} satisfies Meta<typeof Card>;
```

`Meta.component` is singular, so without `subcomponents` a grouped file would leave its other components uncovered. Inferring coverage from what a file imports or renders is rejected: it passes a component mentioned in passing and fails one rendered indirectly.

**[V10]** Story `title` must be `<Tier>/<Name>` with `<Tier>` matching the directory tier, capitalised (`Atoms/Button`, `Molecules/Cards`). A story under `stories/atoms/` titled `Molecules/...` is an error.

**[V11]** Every story file exports a `default` object with `title` and `component`, typed with `Meta`, and at least one named story typed with `StoryObj`.

**[S2]** Whether the stories cover the states that matter — variants, sizes, disabled, loading, long-content overflow, and every brand surface the component may sit on.

## Tokens

- **[V12]** `tokens.json` is the only file where a raw colour value, font family, or type-scale value may appear. **One exemption:** `src/styles/globals.css` may name a font family inside an `@import` or an `@font-face` block, and nowhere else — not in a custom property, not in a rule. A font *source* is not a font *token*: the family name in a webfont URL is how the file is fetched, while the token is how the design system refers to it. The exemption is scoped to those two at-rules, not to the file.
- **[V13]** No hex literal, `rgb()`, or `hsl()` in `src/components/**`, `src/pages/**`, or `.storybook/**`. Use token-derived utilities or `var(--...)`.
- **[V14]** No arbitrary Tailwind values for tokenised properties — `bg-[#194B2C]` and `text-[13px]` are errors. Non-tokenised one-offs (`w-[37rem]`) are permitted.
- **[V15]** `src/styles/tokens.css` matches codegen output from current `tokens.json`. A stale generated file is an error.

**[S3]** Whether a token name is semantically honest. `--color-brand-primary` pointing at a value used only for one button is a naming lie the script cannot see.

### Token structure

`tokens.json` top-level groups, following the reference project:

```text
color.brand.*        named brand colours, each declared as a ramp (below)
color.secondary.*    supporting palettes
color.grey.*         neutral scale
color.base.*         white / black / transparent
color.semantic.*     role-based aliases → DTCG brace references such as {color.brand.accent.500}, never raw values
typography.*         font-family, font-weight, font-size, letter-spacing, line-height
spacing.*            spacing scale
radius.*, shadow.*, motion.*
breakpoint.*, container.*, icon.*, zIndex.*
$meta.*              configuration, not tokens (e.g. $meta.iconLibrary)
```

**[V19]** `color.semantic.*` entries must hold a DTCG brace reference to another token, such as `{color.brand.accent.500}`, not a raw value. This is what makes rebranding a token-file edit rather than a codebase sweep.

**[V24] Group naming.** A top-level group is named for its Tailwind v4 `@theme` namespace where one exists, camelCase otherwise, and non-token keys carry the `$` prefix. An unknown top-level group that is neither a namespace nor `$`-prefixed is a violation. Codegen is then a namespace lookup rather than a translation table, and a translation table is where drift lives.

| Group | Emits | Why |
| --- | --- | --- |
| `radius` | `--radius-*` | Tailwind's namespace, not `borderRadius` |
| `motion` (holding `duration`, `easing`) | `--ease-*`, `--animate-*` | Tailwind has no `--transition-` namespace; `transition` is a DTCG *type* name, not a group name |
| `breakpoint`, `container` | `--breakpoint-*`, `--container-*` | exact Tailwind namespaces |
| `zIndex` | `--z-index-*` | no namespace, no DTCG type — camelCase fallback |
| `icon` | `--icon-*` | dimension tokens, camelCase fallback |
| `$meta` | — | configuration; a token group holds tokens |

The Tailwind namespace list is version-bound. Verify it against the installed Tailwind version at implementation time — the stack table's verification date applies to it too.

### Colour ramps

A brand colour is declared by its **anchor**, not by eleven hand-picked values. The engine generates the 50–950 scale — **eleven steps**: 50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950 — at codegen time.

```jsonc
"deep-forest": {
  "$base": "#1B4B33",       // the approved brand value — never altered by the generator
  "$anchor": 950,           // which step $base occupies
  "$mode": "oklch",         // "oklch" | "hsl", chosen per ramp
  "$overrides": {           // optional direct six-digit hex values; wins over generated output
    "500": "#84B797"
  }
}
```

`$`-prefixed keys are generator directives, not token values — consistent with the DTCG convention of `$value` / `$type`.

- **[V16]** Every ramp declares `$base`, `$anchor` and `$mode`.
- **[V17]** The anchor step of the generated ramp equals `$base` exactly. A generator that shifts the approved brand colour is a bug, not a rounding artefact.
- **[V18]** No ramp declares **every** step literally — that is a hand-authored ramp and defeats the mechanism. Use `$overrides` for the steps that genuinely need pinning. The rule is worded against *every* step rather than a fixed count, so it stays correct if the scale ever changes.

Rules that make this survive contact with real brands:

- **The anchor varies per colour.** A real reference project anchors its dark green at 950 and its mid lime at 500. Assuming 500 would corrupt every dark brand colour.
- **Ramps are derived, not materialised.** Generated steps land in `src/styles/tokens.css`, never written back into `tokens.json`. Writing them back would make `tokens.json` partly generated and break the single-hand-edited-source invariant.
- **`$overrides` exists because brands mandate exact values.** A non-anchor override is a direct six-digit hex value in `tokens.json`, so a designer can pin an exact tint at step 200 without abandoning generation for the other ten. An override targeting `$anchor` is rejected: `$base` exclusively owns the approved anchor value and its exact fidelity.
- **Raw hex stays inside `tokens.json`.** Within a ramp, `$base` and non-anchor `$overrides` are its raw hex values; raw hex remains forbidden outside that file.

`$mode` per ramp, not per project: **oklch** gives perceptually even lightness steps and is the better default; **hsl** reproduces what design tools hand off and is the escape hatch when a ramp must match an existing spec. Mixing modes across ramps in one project is expected and permitted.

**[S4]** Whether a generated ramp is actually usable — sufficient contrast between the steps paired as text and background in `color.semantic.*`. Generation guarantees mathematical evenness, not accessibility.

## Foundations documentation

- **[V20]** `src/stories/foundations/` contains at minimum: `Colors.mdx`, `Typography.mdx`, `Spacing.mdx`, `Elevation.mdx`, `Motion.mdx`.
- **[V21]** `src/stories/Introduction.mdx` exists and declares `<Meta title="Introduction" />`.

**[S5]** Whether foundations docs reflect the *current* tokens. Generated-from-tokens where practical; prose sections are the agent's responsibility to keep true.

## Storybook configuration

- **[V22]** `.storybook/main.ts` imports the engine preset rather than declaring `stories`, `addons` or `framework` inline. Local additions extend the preset; they do not replace it.
- **[V23]** `preview.tsx` imports the engine preview and spreads it. Project-specific decorators and backgrounds are appended.

Brand surfaces (the background options a component must be legible on) are declared in `tokens.json` and consumed by the preview, so surfaces stay in the token contract rather than being hand-listed in config — a fix over the reference project, which hardcodes hex values in `preview.tsx`.

## Ownership and agent guardrails

A generated project is edited mostly by agents, and two failure modes follow from that. Both are structural, so both get mechanism rather than advice.

### File ownership

Every path in a generated project falls into exactly one class, and the manifest is what decides — not a hand-maintained list, which would be stale the first time a component is added.

| Class | Examples | Agents may write? | What happens if they do |
| --- | --- | --- | --- |
| **generated** | `src/styles/tokens.css`, tier `index.ts` | **No** | Destroyed at the next codegen or `ds update`. The edit belongs in `tokens.json` or in the component directories the barrel is derived from. |
| **shipped** (manifest `mark: rendered`) | `.storybook/main.ts`, template component sources | Yes, with warning | The file becomes **conflicted** on every future `ds update`, permanently. Legitimate — that is the divergence this design protects — but it must be a decision, not an accident. |
| **adopt-merged** (`mark: merged`) | files reconciled by `ds adopt` | Yes, with warning | Never rewritten by `update` (ADR-013), so local edits are safe but receive no upstream fixes. |
| **user-created** | everything absent from the manifest | Yes | Nothing. This is where project work belongs. |

`ds guard <path>...` returns this classification and a non-zero exit for a refused write. It reads the manifest and nothing else, so it stays correct as the project grows.

**There is no engine directory to protect.** The engine ships as a dependency under `node_modules/`; an agent editing it there is editing a package that the next `npm install` replaces. The surface that genuinely needs guarding is the table above — files that live in the project, look ordinary, and are silently owned upstream.

- **[V25]** The project carries agent hook configuration wiring the guard and end-of-pass checks to the shipped `ds` commands — `.claude/settings.json` for Claude Code, the Codex equivalent alongside it. A project whose hooks were deleted or emptied is a project whose guarantees are advisory again.
- **[V26]** `AGENTS.md` exists and states the ownership table's refusal rule and the scaffolding rule below. `CLAUDE.md` may mirror it or reference it, matching this repository's own convention.

### Scaffolding provenance

New components are created by `ds generate`, never by copying a sibling.

This is the rule that prevents compounding drift. Copying an existing component inherits whatever has already diverged in it, and the copy becomes the next agent's reference — so a single unnoticed deviation propagates through every component created afterwards, and each generation makes the original harder to recover. `ds generate` reads canonical scaffolding from the engine every time, so drift cannot be inherited: each component starts from the same place regardless of what its neighbours became.

**[S6]** Whether a component's construction actually followed canonical scaffolding. A hand-built component that happens to satisfy every **[V]** rule can still carry structural habits from whatever it was copied from — an unnecessary wrapper, a prop-spreading convention nobody chose, a story shaped unlike every other. The script sees a compliant component; only review sees an inherited one.

## Validation

`ds validate` runs every **[V]** rule and exits non-zero on any violation. The contract names the binary, not a package-manager script: ADR-008 makes the project follow whichever package manager was detected, so a pnpm-specific command cannot be the contract's name for the check. Generated projects still carry a `ds:validate` script for convenience, run under the user's own manager. The agent skill runs that command first, treats its result as authoritative, then reviews the **[S]** rules. Neither path may weaken a rule to make a check pass.

Adding a rule means adding it to the validator, and giving it the next unused ID. A rule that exists only in prose is a suggestion, and suggestions are what produced the current drift.
