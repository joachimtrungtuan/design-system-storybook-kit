---
title: Phase 4 Storybook preset
date: 2026-08-12
summary: "Implemented and verified shared Storybook factories, token-derived surfaces, and installed package exports."
---

# Phase 4 Storybook preset

## What happened
Phase 4 added typed `main()` and `preview(tokens)` factories, Tailwind's Vite plugin, additive project overrides, `$meta.surfaces`, package exports, peer contracts, and precompiled output. An installed-tarball check found that Phase 2 discarded `$`-prefixed configuration; parsing now retains it separately from codegen's token root, preserving deterministic CSS while making preview metadata available.

## Decisions
Surface declarations live at `$meta.surfaces.<name>` with a DTCG colour reference and optional explicit light/dark mode. Automatic mode uses relative luminance at the black/white contrast crossover. The engine preview stays `.ts` because it contains no JSX and must run under Node's native TypeScript tests; generated projects still use `.storybook/preview.tsx`. Generated Storybook config spreads factory results so Storybook's static parser sees object expressions.

## Verification
The full suite passed 57/57 with typecheck, build, and diff hygiene green. A fresh tarball exposed typed `story-cli-kit/preset` and `/preview` entries, matched all 9 preset artifacts, installed into a scratch Storybook 10.5.7 project, typechecked, built with Vite 8.2.1 and Tailwind 4.3.3, booted on localhost, and served the expected story index. Independent review scored 9.5/10 with no critical issue or side effect.

## Next steps
Implement Phase 3 Validator, including V22/V23 against the spread-based config shape. Phase 5 should supply neutral `$meta.surfaces` declarations and generated config that spreads both factories.

> Historical work record — not durable authority. Prefer docs/specs/ADRs for current decisions.
