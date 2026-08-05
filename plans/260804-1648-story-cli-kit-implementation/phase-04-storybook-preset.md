---
title: "Phase 4: Storybook preset"
status: todo
priority: P1
effort: "1-2d"
dependencies: [1, 2]
---

# Phase 4: Storybook preset

## Overview

Ship the Storybook wiring from the engine so a generated project's `.storybook/main.ts` is three lines importing a preset, and structural Storybook changes arrive as an engine bump requiring no user action. This is the concrete payoff of the engine/content boundary in `docs/architecture.md`, and the reason the contract can require rules 22 and 23.

## The spike is superseded — ADR-012 rewritten 2026-08-05

This phase originally opened with a spike asking whether Storybook could load a preset shipping as **unbuilt TypeScript** inside `node_modules`, with a `.js` + `.d.ts` fallback if the Node side failed and a stop-and-report if both sides did.

That question no longer exists. ADR-012's rewrite means the engine ships **compiled JavaScript with declarations beside it**, produced by `prepare` at install time — which was the spike's own fallback, now the baseline for the whole toolkit. Storybook and Vite loading built JavaScript from `node_modules` is the ordinary case every package in the ecosystem relies on, and it was never in doubt.

**What survives as a check rather than a spike:** confirm during step 1 that the built preset resolves through all three consumption paths in a scratch project, and record the Storybook and Vite versions it was verified against — the stack table is dated for exactly this reason, and preset APIs are version-sensitive whatever they ship as.

- `main.ts` importing `story-cli-kit/preset` (Node side, Storybook's config loader)
- `preview.tsx` importing the engine preview (browser side, Vite pre-bundling)
- `vite.config.ts` if the preset contributes anything there

The build config must emit **declarations** for this surface. A consumer importing the preset gets no types otherwise, and rules 22–23 push every generated project through this import — so a missing `.d.ts` degrades every project at once.

## Requirements

**Functional**

- `main.ts` factory: story globs, `@storybook/addon-docs`, `@storybook/react-vite` framework, Tailwind v4 through `@tailwindcss/vite`
- Local additions extend the preset rather than replacing it (contract rule 22)
- `preview.tsx` factory: parameters, docs config, and **brand surfaces read from `tokens.json`** rather than hardcoded — this is the stated fix over the reference project, which hardcodes hex values in `preview.tsx`
- A generated project's `.storybook/main.ts` is three lines and passes rules 22 and 23
- Project-specific decorators can be appended without editing engine code

**Non-functional**

- The preset holds no brand values. Every colour it emits comes from parsed tokens (Phase 2)
- Framework-agnostic by construction where it costs nothing, so a Next.js template can be added later without redesign (ADR-002)

## Architecture

**Two factories, not two config objects.** `main(overrides)` and `preview(overrides)` return configuration with the project's additions merged in. Exporting frozen objects would force projects to spread and re-merge by hand, which is exactly the drift the preset exists to prevent — every project would spread slightly differently.

**Brand surfaces come from tokens.** The reference project hardcodes background hexes in `preview.tsx` and then string-matches them at runtime to decide whether a surface is light or dark. Instead, surfaces are declared in `tokens.json` and the preview builds its background list from them, so a rebrand is a token edit and the light/dark decision is data rather than a lookup table of hex strings.

**Decorators stay in the project.** The reference project's preview wraps stories in `MemoryRouter`, a `SurfaceProvider` and a devtools toolbar. None of those belong in the engine: the router is an application dependency, the toolbar is project tooling. The preset provides the merge point; the template supplies its own decorators through it.

## Related Code Files

- Create: `packages/engine/src/preset/main.ts`
- Create: `packages/engine/src/preset/preview.tsx`
- Create: `packages/engine/src/preset/surfaces.ts` — token-derived background list
- Create: `packages/engine/src/preset/*.test.ts` — configuration shape and merge behaviour
- Modify: `package.json` — `exports` map for the preset entry points
- Create: `update-logs/2026-08-04/NN-storybook-preset.md`

## Implementation Steps

1. Verify the three consumption paths against a **built, installed** preset, and record the Storybook and Vite versions verified against — the stack table is dated for exactly this reason. Confirm the build config emits declarations for the preset's public surface.
2. `main.ts` factory with merge semantics. Test: overrides add addons without dropping the preset's own.
3. `surfaces.ts` — build the background list from parsed tokens, including the light/dark classification, derived from the surface colour rather than a name match.
4. `preview.tsx` factory with a decorator merge point. Test that an appended decorator does not displace the preset's.
5. `exports` map, verified from an installed tarball rather than from the workspace.
6. Smoke test: a scratch project whose `.storybook/main.ts` is three lines, booting Storybook against a handful of stories. Automate what is cheap; a manual boot is acceptable here and worth doing once regardless.
7. Update-log entry recording the verified versions.

## Success Criteria

- [ ] All three consumption paths verified against a built, installed preset, with versions recorded
- [ ] The preset's public surface ships `.d.ts` declarations — a consumer importing it gets types, not `any`
- [ ] A three-line `.storybook/main.ts` boots Storybook in a scratch project
- [ ] Preview background list is generated from `tokens.json`; no hex literal appears anywhere in `preset/`
- [ ] Appending a decorator or addon in the project keeps every preset-supplied one
- [ ] Contract rules 22 and 23 pass against the scratch project's config
- [ ] Preset resolves from an installed tarball, not only from the workspace

## Risk Assessment

**The `exports` map is wrong in a way the workspace hides.** Now the most likely failure here, since ADR-012's rewrite removed the loader risk this section used to lead with. A workspace resolves paths that an installed package does not, so step 5's "verified from an installed tarball rather than from the workspace" is the guard, and it must be a real install after `prepare` — not a symlink.

**Storybook 10 preset APIs shift under a minor.** The preset is the most version-coupled surface in the toolkit. Mitigation is Phase 10's re-verification gate plus recording the verified version here.

**Surface classification from a colour is a judgement call.** Deciding light vs dark from a luminance threshold is fine and testable; it will occasionally disagree with a designer about a mid-tone. Allow the token file to state it explicitly and fall back to luminance, rather than making the threshold the only answer.
