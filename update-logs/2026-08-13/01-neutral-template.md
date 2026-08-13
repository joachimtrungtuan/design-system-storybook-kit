# 01 — Neutral template

**What:** Started the neutral Storybook Vite template with a materialisation boundary in the engine; completed the private pre-contract validator measurement and marked its already-implemented validator phase complete.

**Why:** The template must be runnable and continuously validated before `ds create` exists, while the source reference must remain private and never be copied into this public toolkit.

**Alternative considered:** Building `ds create` first was rejected because it would duplicate placeholder rendering and leave the template itself untestable.

**Ramp measurement:** The private reference has twelve materialised ramps. Re-deriving them with either supported engine mode matched only the twelve anchors exactly; 120 of 132 scale values differ. With the HSL generator, 18 values are within RGB distance 5 and 71 within 15, while the median distance is 14.46 and the maximum is 58.60. Exact pinning would need ten non-anchor overrides per ramp, so the maintainer must decide whether that fidelity is worth revisiting ADR-006 before any reference values are translated.

**Decision:** Keep the generated neutral ramps. The template is intentionally brand-free, so exact private-reference ramp values are neither copied nor encoded as overrides. Revisit ADR-006 before any future exact translation of that reference is attempted.

**Follow-ups:** Phase 6 reuses the materialisation boundary for `ds create`; ramp-fidelity work is deferred until an ADR-006 decision changes the generator or translation policy.
