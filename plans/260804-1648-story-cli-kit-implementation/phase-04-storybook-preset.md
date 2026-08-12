---
title: "Phase 4: Storybook preset"
status: completed
priority: P1
effort: "1-2d"
dependencies: [1, 2]
---

# Phase 4: Storybook preset

## Overview

Ship the Storybook wiring from the engine so a generated project's `.storybook/main.ts` is three lines importing a preset, and structural Storybook changes arrive as an engine bump requiring no user action. This is the concrete payoff of the engine/content boundary in `docs/architecture.md`, and the reason the contract can require **[V22]** and **[V23]**.

## Loading the preset is a check, not a spike

Under ADR-012 the engine ships **compiled JavaScript with declarations beside it**, produced by `prepare` at install time. Storybook and Vite loading built JavaScript from `node_modules` is the ordinary case every package in the ecosystem relies on, so there is no open question about whether the preset can be loaded at all.

**What is required instead is a check:** confirm during step 1 that the built preset resolves through all three consumption paths in a scratch project, and record the Storybook and Vite versions it was verified against — the stack table is dated for exactly this reason, and preset APIs are version-sensitive whatever they ship as.

- `main.ts` importing `story-cli-kit/preset` (Node side, Storybook's config loader)
- `preview.tsx` importing the engine preview (browser side, Vite pre-bundling)
- `vite.config.ts` if the preset contributes anything there

The build config must emit **declarations** for this surface. A consumer importing the preset gets no types otherwise, and V22–V23 push every generated project through this import — so a missing `.d.ts` degrades every project at once.

## Requirements

**Functional**

- `main.ts` factory: story globs, `@storybook/addon-docs`, `@storybook/react-vite` framework, Tailwind v4 through `@tailwindcss/vite`
- Local additions extend the preset rather than replacing it (**[V22]**)
- `preview.tsx` factory: parameters, docs config, and **brand surfaces read from `$meta.surfaces` in `tokens.json`** rather than hardcoded — each named entry carries a DTCG `color` reference plus optional `mode: "light" | "dark"`
- A generated project's `.storybook/main.ts` is three lines and passes V22 and V23
- Project-specific decorators can be appended without editing engine code

**Non-functional**

- The preset holds no brand values. Every colour it emits comes from parsed tokens (Phase 2)
- Framework-agnostic by construction where it costs nothing, so a Next.js template can be added later without redesign (ADR-002)

## Architecture

**Two factories, not two config objects.** `main(overrides)` and `preview(tokens, overrides)` return configuration with the project's additions merged in. Exporting frozen objects would force projects to spread and re-merge by hand, which is exactly the drift the preset exists to prevent — every project would spread slightly differently.

**Brand surfaces come from tokens.** The reference project hardcodes background hexes in `preview.tsx` and then string-matches them at runtime to decide whether a surface is light or dark. Instead, `$meta.surfaces.<name>` carries `color: "{color.path}"` and an optional explicit `mode`; the preview resolves the token and otherwise falls back to the relative-luminance contrast crossover. A rebrand is therefore a token edit and the light/dark decision is data rather than a lookup table of hex strings.

**Decorators stay in the project.** The reference project's preview wraps stories in `MemoryRouter`, a `SurfaceProvider` and a devtools toolbar. None of those belong in the engine: the router is an application dependency, the toolbar is project tooling. The preset provides the merge point; the template supplies its own decorators through it.

## Related Code Files

- Create: `packages/engine/src/preset/main.ts`
- Create: `packages/engine/src/preset/preview.ts` — emits the browser-side preview factory; the generated project consumes it from `.storybook/preview.tsx`
- Create: `packages/engine/src/preset/surfaces.ts` — token-derived background list
- Create: `packages/engine/src/preset/*.test.ts` — configuration shape and merge behaviour
- Modify: `package.json` — `exports` map for the preset entry points
- Create: `update-logs/<date>/NN-storybook-preset.md`

## Implementation Steps

1. Verify the three consumption paths against a **built, installed** preset, and record the Storybook and Vite versions verified against — the stack table is dated for exactly this reason. Confirm the build config emits declarations for the preset's public surface.
2. `main.ts` factory with merge semantics. Test: overrides add addons without dropping the preset's own.
3. `surfaces.ts` — build the background list from parsed tokens, including the light/dark classification, derived from the surface colour rather than a name match.
4. `preview.ts` factory with a decorator merge point. Test that an appended decorator does not displace the preset's.
5. `exports` map, verified from an installed tarball rather than from the workspace.
6. Smoke test: a scratch project whose `.storybook/main.ts` is three lines, booting Storybook against a handful of stories. Automate what is cheap; a manual boot is acceptable here and worth doing once regardless.
7. Update-log entry recording the verified versions.

## Success Criteria

- [x] All three consumption paths verified against a built, installed preset, with versions recorded
- [x] The preset's public surface ships `.d.ts` declarations — a consumer importing it gets types, not `any`
- [x] A three-line `.storybook/main.ts` boots Storybook in a scratch project
- [x] Preview background list is generated from `tokens.json`; no hex literal appears anywhere in `preset/`
- [x] Appending a decorator or addon in the project keeps every preset-supplied one
- [x] V22 and V23 pass against the scratch project's config
- [x] Preset resolves from an installed tarball, not only from the workspace

## Risk Assessment

**The `exports` map is wrong in a way the workspace hides.** The most likely failure in this phase. A workspace resolves paths that an installed package does not, so step 5's "verified from an installed tarball rather than from the workspace" is the guard, and it must be a real install after `prepare` — not a symlink.

**Storybook 10 preset APIs shift under a minor.** The preset is the most version-coupled surface in the toolkit. Mitigation is Phase 10's re-verification gate plus recording the verified version here.

**Surface classification from a colour is a judgement call.** Deciding light vs dark from a luminance threshold is fine and testable; it will occasionally disagree with a designer about a mid-tone. Allow the token file to state it explicitly and fall back to luminance, rather than making the threshold the only answer.
