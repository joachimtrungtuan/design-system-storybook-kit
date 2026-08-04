# Architecture

## Repository shape

This repo is the **toolkit**, not a generated project. It is a pnpm workspace:

```
packages/engine/          versioned npm package — the updatable surface
packages/cli/             ds command — create / validate / update / migrate
templates/storybook-vite/ the copied-at-init surface
docs/                     requirements, contract, ADRs
plans/                    work plans and reports
update-logs/              dated change log
```

Generated projects are outputs of this repo. Nothing here ships inside them except the engine package (as a dependency) and the template contents (as copied files).

## The engine / content boundary

This is the central decision. Everything about updating follows from it.

**Engine** — lives in `node_modules/@ds/engine`, never edited in a generated project:

- Storybook preset (`main.ts` / `preview.tsx` factories)
- Token codegen: `tokens.json` → `src/styles/tokens.css`
- Validator rules and CLI
- Story templates and scaffolding generators
- Contract documentation shipped for agent reference

**Content** — copied at init, owned by the project, freely editable:

- `tokens.json`
- `src/components/**`
- `src/stories/**`
- `src/pages/**`, `src/styles/globals.css`, assets

**Generated** — machine-written, never hand-edited, safe to overwrite always:

- `src/styles/tokens.css`

The consequence: a generated project's `.storybook/main.ts` is three lines importing the preset. Structural changes to Storybook wiring ship as an engine bump and require no user action. Structural changes to the *taxonomy* are a different matter — see below.

### Why not put components in the engine too

Because the maintainer edits components per brand. A component that cannot be edited in place forces every brand difference through a variant API designed in advance, which is speculative abstraction and would fail on the first unanticipated brand. Copying components is the deliberate trade: harder updates, real freedom.

### Why not copy everything

Because Storybook config, codegen and validator rules are pure infrastructure that the maintainer has no reason to edit and every reason to receive fixes for. Copying them means every project is frozen at its init date, which is the current problem.

## Manifest

Every generated project carries `.designsystem/manifest.json`:

```jsonc
{
  "engineVersion": "1.4.0",     // engine version at last successful update
  "templateId": "storybook-vite",
  "createdWith": "1.2.0",
  "files": {
    // path -> checksum AS SHIPPED by the template at the recorded version
    "src/components/atoms/button/Button.tsx": "sha256-...",
    "src/stories/foundations/Tokens.mdx": "sha256-..."
  }
}
```

The manifest answers the only two questions an update needs: *which version is this project on*, and *which shipped files has the user modified*. A file whose current checksum differs from its manifest entry is user-modified. A file absent from the manifest is user-created and is never touched.

The manifest is the mechanism that makes "flag potential mismatch or data loss" possible. Without it, an updater can only overwrite blindly or do nothing.

## Update pipeline

One pipeline, one policy flag — not two modes. The four file categories:

| Category | Detection | Behaviour |
| --- | --- | --- |
| Engine | in `node_modules` | always updated by version bump |
| Generated | on generated list | always overwritten |
| Shipped, unmodified | in manifest, checksum matches | updated automatically |
| Shipped, modified | in manifest, checksum differs | **policy applies** |
| User-created | absent from manifest | never touched |

Only the fourth row varies. `--on-conflict=skip` (default) leaves the file and reports it. `--on-conflict=migrate` hands it to an agent with the release's migration notes.

Framing this as two whole modes would mean two code paths that must stay in sync. They would not stay in sync. Full detail: [update-and-migration.md](update-and-migration.md).

## Taxonomy changes

The hardest update case: the boilerplate's *structure* changes (a tier is renamed, stories move). This cannot be handled by file-level checksums because it is a whole-tree operation.

Such changes ship as a **named structural migration** in the engine — an explicit, versioned, reversible transform with its own notes, run separately from routine updates. They are expected to be rare and are a deliberate cost, not an automatic convenience.

## Token pipeline

Single hand-edited source, everything else generated:

```
tokens.json  ──codegen──>  src/styles/tokens.css  ──@theme──>  Tailwind utilities
  anchors +      ramps                                      └─> CSS custom properties
  directives     expanded
```

Colour ramps are **derived at codegen, never materialised back** into `tokens.json`. The token file holds an anchor, a mode and any pinned overrides; the generated CSS holds the twelve steps. Writing ramps back would make `tokens.json` partly generated and destroy the single-hand-edited-source invariant this pipeline exists to protect.

Tailwind v4's `@theme` directive emits both the utility classes and the CSS variables from one declaration, so a single generated file serves both consumption paths. Verified against current Tailwind documentation.

This deliberately departs from the reference project, which maintains the same colour in three places (`tokens.json`, `globals.css` `:root`, `tailwind.config.ts`). That is a DRY violation and a live drift source. **No `tailwind.config.ts` in the template.**

`globals.css` remains hand-edited for font imports and base layer rules, and imports the generated `tokens.css`.

## Decisions

### ADR-001 — Hybrid distribution
Engine as npm package, components copied. Rejected: full package (blocks per-brand editing), pure copy (freezes infrastructure at init date). Accepted cost: conflicted-file updates need explicit resolution.

### ADR-002 — React + Vite only, first iteration
All four reference projects are Vite. Next.js needs a different Storybook framework package, routing decorator and image handling — roughly double the template surface. Deferred until the engine contract is proven against real projects. The engine is framework-agnostic by construction so a second template can be added without redesign.

### ADR-003 — Tailwind v4 CSS-first tokens
`@theme` in a generated CSS file. No JS Tailwind config. See token pipeline above.

### ADR-004 — Stories separated from components
`src/stories/**` mirrors `src/components/**` rather than co-locating `*.stories.tsx` next to each component. Co-location is the more common convention, but all three well-structured reference projects use separation, and it makes the story tree independently browsable and trivially validatable against the tier taxonomy. Consistency with existing work wins here.

### ADR-005 — Validator is deterministic, agent skill is a superset
The skill runs the script and treats its output as authoritative before adding semantic checks. A parallel agent-side reimplementation would eventually disagree with the script, and then neither would be trustworthy.

### ADR-006 — Colour ramps generated from an anchor, per-ramp colour mode
`$base` + `$anchor` + `$mode` (`oklch` | `hsl`) + optional `$overrides`, expanded at codegen. Rejected: hand-authored ramps as in the reference project — twelve values per colour, no stated relationship between them, and a rebrand means re-deriving every step by hand. Rejected: a single project-wide colour mode — a project routinely has one ramp that must match an existing spec (hsl) alongside others that should be perceptually even (oklch). Accepted cost: generated ramps are mathematically even, not automatically accessible; contrast remains a semantic `[S]` check.
