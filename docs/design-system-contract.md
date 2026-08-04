# Design System Contract

The structure every generated project must hold. This is the specification the template implements, the validator enforces, and agents must not reinterpret.

Rules marked **[V]** are machine-checked. Rules marked **[S]** are semantic — the agent skill reviews them; a script cannot.

## Directory layout

```
project/
├── .designsystem/manifest.json      engine version + shipped-file checksums
├── .storybook/
│   ├── main.ts                      imports engine preset
│   └── preview.tsx                  imports engine preview, adds project decorators
├── tokens.json                      ONLY hand-edited token source
├── src/
│   ├── components/
│   │   ├── atoms/<component>/       Button.tsx + index.ts
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

- **[V]** No directory may exist directly under `src/components/` other than the four tiers.
- **[V]** `src/stories/` subdirectories must be exactly the tier names plus `foundations` and `pages`.

## Tier definitions

| Tier | Composes | Test |
| --- | --- | --- |
| **atoms** | nothing from this system | Cannot be broken down without ceasing to be useful. Owns no layout beyond itself. |
| **molecules** | atoms only | A small, single-purpose group. Named for what it *is*, not where it sits. |
| **organisms** | molecules + atoms | A page section that stands alone and carries meaning. |
| **templates** | organisms + molecules + atoms | Page skeleton. Structure and slots, no real content. |
| **pages** | templates + everything | Concrete content in a template. Lives in `src/pages/`, documented under `stories/pages/`. |

- **[V]** A tier may import from lower tiers only. `atoms` importing from `molecules` is an error.
- **[S]** Whether something is genuinely an atom vs. a molecule. A script can check the import direction; only judgement can say a "Card" with three responsibilities should be split.

## Naming

- **[V]** Component directories: `kebab-case` (`product-card/`).
- **[V]** Component files: `PascalCase.tsx` (`ProductCard.tsx`), matching the directory name.
- **[V]** Non-component modules: `kebab-case.ts` (`use-draggable-marquee.ts`, `type-scale.ts`).
- **[V]** Every component directory has an `index.ts` re-exporting its public surface.
- **[V]** Every tier directory has an `index.ts` re-exporting all its component barrels.

PascalCase component files intentionally override the workspace-wide kebab-case default; React ecosystem convention and all four reference projects agree, and the language-convention escape hatch in the global rules covers it.

## Stories

**[V]** Every component in `src/components/**` has exactly one story file at the mirrored path under `src/stories/<tier>/`. A component with no story is an error — this is the single most important rule in the contract, because an undocumented component is how drift starts.

Story files may group related components (`Cards.stories.tsx` covering all card variants), so the mapping is component → *covered by* a story file, not one file per component.

**[V]** Story `title` must be `<Tier>/<Name>` with `<Tier>` matching the directory tier, capitalised (`Atoms/Button`, `Molecules/Cards`). A story under `stories/atoms/` titled `Molecules/...` is an error.

**[V]** Every story file exports a `default` object with `title` and `component`, typed with `Meta`, and at least one named story typed with `StoryObj`.

**[S]** Whether the stories cover the states that matter — variants, sizes, disabled, loading, long-content overflow, and every brand surface the component may sit on.

## Tokens

- **[V]** `tokens.json` is the only file where a raw colour value, font family, or type-scale value may appear.
- **[V]** No hex literal, `rgb()`, or `hsl()` in `src/components/**`, `src/pages/**`, or `.storybook/**`. Use token-derived utilities or `var(--...)`.
- **[V]** No arbitrary Tailwind values for tokenised properties — `bg-[#194B2C]` and `text-[13px]` are errors. Non-tokenised one-offs (`w-[37rem]`) are permitted.
- **[V]** `src/styles/tokens.css` matches codegen output from current `tokens.json`. A stale generated file is an error.

**[S]** Whether a token name is semantically honest. `--color-brand-primary` pointing at a value used only for one button is a naming lie the script cannot see.

### Token structure

`tokens.json` top-level groups, following the reference project:

```
color.brand.*        named brand colours, each declared as a ramp (below)
color.secondary.*    supporting palettes
color.grey.*         neutral scale
color.base.*         white / black / transparent
color.semantic.*     role-based aliases → reference other tokens, never raw values
typography.*         font-family, font-weight, font-size, letter-spacing, line-height
spacing.*            spacing scale
radius.*, shadow.*, motion.*
```

**[V]** `color.semantic.*` entries must reference another token, not a raw value. This is what makes rebranding a token-file edit rather than a codebase sweep.

### Colour ramps

A brand colour is declared by its **anchor**, not by twelve hand-picked values. The engine generates the 50–950 scale at codegen time.

```jsonc
"cal-poly-green": {
  "$base": "#194B2C",       // the approved brand value — never altered by the generator
  "$anchor": 950,           // which step $base occupies
  "$mode": "oklch",         // "oklch" | "hsl", chosen per ramp
  "$overrides": {           // optional, wins over generated output
    "500": "#84B797"
  }
}
```

`$`-prefixed keys are generator directives, not token values — consistent with the DTCG convention of `$value` / `$type`.

- **[V]** Every ramp declares `$base`, `$anchor` and `$mode`.
- **[V]** The anchor step of the generated ramp equals `$base` exactly. A generator that shifts the approved brand colour is a bug, not a rounding artefact.
- **[V]** No ramp declares all twelve steps literally — that is a hand-authored ramp and defeats the mechanism. Use `$overrides` for the steps that genuinely need pinning.

Rules that make this survive contact with real brands:

- **The anchor varies per colour.** The reference project anchors Cal Poly Green at 950 and Yellow Green at 500. Assuming 500 would corrupt every dark brand colour.
- **Ramps are derived, not materialised.** Generated steps land in `src/styles/tokens.css`, never written back into `tokens.json`. Writing them back would make `tokens.json` partly generated and break the single-hand-edited-source invariant.
- **`$overrides` exists because brands mandate exact values.** A designer specifying an exact tint at step 200 must be able to pin it without abandoning generation for the other eleven.

`$mode` per ramp, not per project: **oklch** gives perceptually even lightness steps and is the better default; **hsl** reproduces what design tools hand off and is the escape hatch when a ramp must match an existing spec. Mixing modes across ramps in one project is expected and permitted.

**[S]** Whether a generated ramp is actually usable — sufficient contrast between the steps paired as text and background in `color.semantic.*`. Generation guarantees mathematical evenness, not accessibility.

## Foundations documentation

- **[V]** `src/stories/foundations/` contains at minimum: `Colors.mdx`, `Typography.mdx`, `Spacing.mdx`, `Elevation.mdx`, `Motion.mdx`.
- **[V]** `src/stories/Introduction.mdx` exists and declares `<Meta title="Introduction" />`.

**[S]** Whether foundations docs reflect the *current* tokens. Generated-from-tokens where practical; prose sections are the agent's responsibility to keep true.

## Storybook configuration

- **[V]** `.storybook/main.ts` imports the engine preset rather than declaring `stories`, `addons` or `framework` inline. Local additions extend the preset; they do not replace it.
- **[V]** `preview.tsx` imports the engine preview and spreads it. Project-specific decorators and backgrounds are appended.

Brand surfaces (the background options a component must be legible on) are declared in `tokens.json` and consumed by the preview, so surfaces stay in the token contract rather than being hand-listed in config — a fix over the reference project, which hardcodes hex values in `preview.tsx`.

## Validation

`pnpm ds:validate` runs every **[V]** rule and exits non-zero on any violation. The agent skill runs that command first, treats its result as authoritative, then reviews the **[S]** rules. Neither path may weaken a rule to make a check pass.

Adding a rule means adding it to the validator. A rule that exists only in prose is a suggestion, and suggestions are what produced the current drift.
