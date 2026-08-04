# 02 — Ramp generation + example completeness

**What:** Resolved both open questions from `01`. Added ramp schema and rules to `docs/design-system-contract.md`, ADR-006 and the derived-ramp note to `docs/architecture.md`, resolved-decisions section to `docs/requirements.md`, plus responsibility updates in the engine and template READMEs.

**Why:** Both questions blocked template design — ramp shape determines `tokens.json` schema, completeness rule determines template scope.

## Decisions

**Colour ramps are an engine utility, generated from an anchor.** `$base` + `$anchor` + `$mode` (`oklch` | `hsl`) + optional `$overrides`, expanded at codegen. *Alternative:* hand-authored ramps as in WIN Flavor — rejected, twelve values per colour with no stated relationship, and a rebrand means re-deriving every step by hand. *Alternative:* per-project colour mode — rejected, projects routinely mix one ramp that must match an existing spec (hsl) with others that should be perceptually even (oklch), so mode is per-ramp.

**Ramps derived, never materialised back into `tokens.json`.** Anchors and directives live in the token file; the twelve steps live in generated `tokens.css`. *Why:* writing ramps back would make `tokens.json` partly generated and break the single-hand-edited-source invariant.

**`$overrides` included from the start.** Deliberate exception to YAGNI — a brand mandating an exact tint at one step is not speculative, it is the normal case, and without overrides the first such brand abandons generation entirely.

**Anchor is per-colour, not fixed at 500.** WIN Flavor anchors Cal Poly Green at 950 and Yellow Green at 500. Assuming 500 would corrupt every dark brand colour.

**Anchor step must reproduce `$base` exactly** — a `[V]` rule. A generator that shifts the approved brand colour is a bug, not a rounding artefact.

**Example components ship complete.** All size variants, all interaction states, all tone variants, each documented. Depth over breadth — a few components per tier realised fully rather than many realised partly. *Why:* the template is the reference later components are copied from; a half-built example propagates as a half-built pattern.

**Contrast stays `[S]`, not `[V]`.** Generation guarantees mathematical evenness, not accessibility. Semantic pairs (text on background in `color.semantic.*`) are agent-reviewed. *Alternative:* automated contrast gate — deferred, would need a defined pairing map that does not exist yet.

## Follow-ups

- Contrast checking could become `[V]` once `color.semantic.*` pairings are formally declared.
- No open questions remain. Next: build `templates/storybook-vite` and engine token codegen (incl. ramp generation) together, so the contract is exercised before the validator is written against it.
