---
title: "Phase 2: Token engine — schema, ramps, codegen"
status: pending
priority: P1
effort: "2-3d"
dependencies: [1]
---

# Phase 2: Token engine — schema, ramps, codegen

## Overview

The deterministic core: parse and validate `tokens.json`, expand each brand ramp from its anchor into a 50–950 scale, and emit `src/styles/tokens.css` as a Tailwind v4 `@theme` block. Everything downstream depends on this — one `[V]` validator rule is defined as "the generated file matches this codegen's output", the preset reads brand surfaces from parsed tokens, and the template's `tokens.json` is written against this schema.

This is the phase where a bug is most expensive and least visible: a ramp generator that shifts the approved brand colour by one perceptual step produces output that looks plausible and is wrong. The contract already names that failure — "a generator that shifts the approved brand colour is a bug, not a rounding artefact" — so the anchor-fidelity check is a test, not a review comment.

## Requirements

**Functional**

- Parse `tokens.json` and reject malformed input with an `ActionableError` naming the offending path
- Enforce, at parse time, every schema rule the contract states: `$base` / `$anchor` / `$mode` required per ramp, no ramp declaring every step literally, `color.semantic.*` referencing another token rather than a raw value
- Generate a 50–950 ramp (**11 steps**: 50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950) from `$base` + `$anchor` + `$mode`, in `oklch` or `hsl`, per ramp. The count matters: **[V18]** forbids a ramp declaring every step literally, and a rule phrased as a count of twelve is a threshold no ramp ever reaches, so the one rule written to forbid hand-authored ramps would pass them all. V18 is therefore worded "declares **every** step literally", which is correct regardless of the count
- `$overrides` win over generated steps
- The anchor step equals `$base` exactly — not approximately
- Emit `tokens.css`: an `@theme` block whose declarations produce both Tailwind utilities and CSS custom properties from one source (ADR-003)
- Resolve `color.semantic.*` references to the token they point at, and fail on a cycle or a dangling reference

**Non-functional**

- Deterministic: identical input produces byte-identical output, including key order (NFR3)
- Ramps are never written back into `tokens.json` — the file stays entirely hand-edited (ADR-006)
- No colour-science dependency unless writing it costs more than importing it (code-standards §12); oklch↔sRGB conversion is roughly 60 lines of documented matrix maths

## Architecture

**Three modules, one direction.** `schema.ts` parses and validates into a typed structure and knows nothing about colour. `ramp.ts` is pure maths — colour in, eleven colours out — and knows nothing about files. `codegen.ts` serialises. Each is independently testable, and the validator in Phase 3 imports `schema.ts` and `codegen.ts` directly rather than shelling out.

**Ramp generation is interpolation between fixed lightness endpoints, not a hue rotation.** In `oklch` mode, hold chroma and hue from `$base`, distribute lightness across the eleven steps on a curve, and place `$base` untouched at its anchor step. In `hsl` mode, the same shape with HSL lightness. The two modes exist because oklch gives perceptually even steps while hsl reproduces what design tools hand off (ADR-006), so they must be genuinely different code paths, not one converted into the other.

The interesting case is a low anchor: a dark brand green anchors at 950, so ten of eleven steps are lighter than `$base` and the curve is almost entirely on one side of it. A generator that assumes the anchor sits mid-scale corrupts every dark brand colour — the contract calls this out explicitly, and it is a fixture, not a footnote.

**Gamut clipping is a reported condition, not a silent clamp.** oklch can express colours sRGB cannot. When a generated step falls outside gamut, clip it and record that it was clipped, so codegen can surface it rather than quietly emitting a different colour than the maths produced.

**Output is sorted and stable.** Group order fixed by the contract's token structure, keys sorted within a group. Determinism is a stated NFR and it is also what makes the validator's "is `tokens.css` stale" check a byte comparison instead of a semantic diff.

## Related Code Files

- Create: `packages/engine/src/tokens/schema.ts` — types, parse, validation
- Create: `packages/engine/src/tokens/color.ts` — hex ↔ oklch ↔ hsl, gamut clip
- Create: `packages/engine/src/tokens/ramp.ts` — anchor expansion
- Create: `packages/engine/src/tokens/codegen.ts` — `@theme` emitter
- Create: `packages/engine/src/tokens/index.ts` — public surface
- Create: `packages/engine/src/tokens/*.test.ts`
- Create: `packages/engine/src/tokens/__fixtures__/` — valid and invalid token files. **Synthetic values only**: fixtures reproduce the reference project's *shape* — anchor positions, ramp structure, the flat-colour-beside-ramp case — with invented hexes and invented ramp names. The test value lives in the anchor positions, not the specific colour, so nothing is lost, and no client hex or brand ramp name is committed to a repository that must be public for `npx github:…`. The same rule governs `docs/` and `plans/`: a public doc leaks exactly as much as a public fixture
- Create: `update-logs/<date>/NN-token-engine.md`

## Implementation Steps

1. `color.ts` first, with tests, because everything else builds on it. Round-trip assertions: hex → oklch → hex is identity within one unit of 8-bit precision, for a spread of hues including near-black, near-white and full-chroma.
2. `schema.ts` — types and parse. Every contract rule gets a named error and a test that triggers it.
3. `ramp.ts` — anchor expansion for both modes. Two synthetic fixtures covering the two cases the contract names: a dark base anchored at **950** (almost every step lighter than `$base`) and a mid base anchored at **500** (steps spread both directions). These are the reference project's anchor positions with invented colours — the positions are what the expansion maths turns on.
4. **Anchor-fidelity test across every fixture ramp:** generated `[anchor] === $base`, exact string equality after normalisation. This is the test that catches the expensive bug.
5. `$overrides` application, with a test that an override at a non-anchor step wins and an override at the anchor step is refused or warned — pinning the anchor to something other than `$base` is a contradiction, and the contract does not say which way it resolves. Flag it if the fixture hits it.
6. `codegen.ts` — `@theme` emission. Byte-comparison test against a checked-in expected output.
7. Determinism test: generate twice, compare bytes; shuffle input key order, compare bytes again.
8. Semantic-reference resolution, with cycle and dangling-reference tests.
9. Update-log entry recording the ramp curve actually chosen, since it is a judgement call that later ramps will be compared against.

## Success Criteria

- [ ] Every fixture ramp reproduces `$base` exactly at its anchor step
- [ ] Both fixture ramps — a dark base anchored at 950 and a mid base anchored at 500 — generate usable eleven-step scales from the same code path
- [ ] Codegen output is byte-identical across two runs and across shuffled input ordering
- [ ] A ramp missing `$mode` fails parse with an error naming the ramp
- [ ] A ramp declaring every step literally is rejected (contract rule, not a warning)
- [ ] A `color.semantic.*` entry holding a raw hex is rejected
- [ ] A semantic reference cycle is reported, not stack-overflowed
- [ ] `tokens.json` is never written to — assert no write path exists in the module graph
- [ ] Out-of-gamut steps are reported by the API rather than silently clamped

## Risk Assessment

**The generated ramp is mathematically even but visually wrong for a given brand.** Expected and accepted by ADR-006 — `$overrides` is the designed escape hatch. Worth confirming during Phase 5 by generating the reference project's ramps from their anchors and diffing against the hand-authored values already in that project. That diff is real evidence about how many overrides a real brand needs, and it is cheap to produce here.

**Colour maths written by hand has subtle errors.** Round-trip tests catch conversion bugs; they do not catch a wrong lightness curve. Mitigate by generating a visual sheet of the fixture ramps once and looking at it — a one-off check, not a permanent artefact.

**Contract silence on an override at the anchor step.** Cheap to hit, unclear to resolve. Do not guess: flag it to the maintainer if a fixture reaches it.
