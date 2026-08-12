# 03 — Token engine

**What:** Added the engine token schema, colour conversion, 50–950 ramp generation, semantic-reference resolution, deterministic Tailwind `@theme` codegen, synthetic fixtures, and focused tests. Moved the shared `ActionableError` and bounded exit-code contract into the engine while preserving the CLI exports.

**Why:** Phase 2 supplies the deterministic core that the preset, validator, template, and update flow import directly. The ramp uses a 1.15-power lightness curve between fixed endpoints while preserving `$base` byte-for-byte at its anchor; gamut clipping reduces chroma and is reported by the API.

**Alternative considered:** A colour-science dependency was rejected because the required sRGB, HSL, and OKLCH conversions fit in one focused module with round-trip coverage. Linear interpolation was considered, but the mild 1.15 curve gives more separation near the base without introducing mode-specific tuning. Silent anchor override precedence was rejected; non-anchor direct hex overrides remain supported inside `tokens.json`, while an anchor override is contradictory and fails with its path.

**Follow-ups:** Phase 3 imports schema and codegen for V15–V19. Phase 5 should diff real reference ramps against this curve and record how many exact overrides are needed.
