---
title: Phase 2 deterministic token engine
date: 2026-08-12
summary: "Implemented and verified the token schema, colour ramps, semantic aliases, and Tailwind codegen."
---

# Phase 2 deterministic token engine

## What happened
Phase 2 added the engine-owned token schema, dependency-free HSL and OKLCH colour conversion, deterministic eleven-step ramp generation, DTCG semantic aliases, and Tailwind v4 theme codegen. Synthetic fixtures cover 500 and 950 anchors, direct-hex non-anchor overrides, semantic cycles, stable ordering, and reported gamut clipping.

## Decisions
Semantic aliases use DTCG brace paths. Non-anchor overrides may pin a six-digit hex inside tokens.json; the anchor remains exclusively owned by $base. The lightness curve uses a 1.15 exponent between fixed endpoints, and out-of-gamut OKLCH steps reduce chroma while reporting the emitted colour. The shared ActionableError preserves the closed CLI exit-code contract.

## Verification
Focused token tests passed 21/21, the complete suite passed 45/45, and typecheck plus production build passed. Tester, debugger, and independent review found no remaining Phase 2 defect. The repo has no configured lint script, which remains a pre-existing verification gap.

## Next steps
Implement the Storybook preset in Phase 4, then build the validator against this token engine. Phase 5 should compare approved reference ramps with the chosen curve and record the exact override count.

> Historical work record — not durable authority. Prefer docs/specs/ADRs for current decisions.
