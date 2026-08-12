# Debug Report — 2026-08-12 — Phase 2 token engine

## Result

- No reproducible Phase 2 failure found in source or generated `dist`.
- Scope was read-only except this report and `/tmp/phase2-*-probe.json` comparison artifacts.

## Targeted probes

| Area | Result | Evidence |
| --- | --- | --- |
| Schema traversal and paths | PASS | An array at `$.spacing.x` throws `ActionableError` with resource `tokens.json#$.spacing.x`. |
| Extreme anchors | PASS | Direct probes for both `oklch` and `hsl` at anchors 50 and 950 each returned exactly the 11 contract steps and preserved `#336699` at the anchor. |
| Semantic aliases | PASS | A valid alias emits `var(--color-base-blue)`; dangling and cyclic references throw path-bearing `ActionableError`s rather than recursing. |
| Deterministic ordering | PASS | Semantically identical reversed group/key input emitted identical CSS. A `fooBar` / `foo-bar` CSS-variable collision is rejected. |
| Gamut notices | PASS | `#FF00FF` in OKLCH reports ten generated clipped steps through `gamutClips`; the anchor remains exact. |
| No write boundary | PASS | Neither source nor `dist` implementation modules (`schema`, `color`, `ramp`, `codegen`, `index`) imports filesystem APIs or contains write APIs. |
| `ActionableError` identity | PASS | In both source and compiled surfaces, CLI and engine export the same class; `handleCliError(new EngineError(...))` returns the actionable exit code. |
| Source/dist parity | PASS | Equivalent source and compiled probe payloads were byte-identical (1,076 bytes each), including CSS and gamut notices. |

## Exact negative reproductions

- Dangling `{color.base.absent}` in `probe.json` → `Semantic token reference color.base.absent does not exist.` with `probe.json#$.color.base.absent`.
- Cycle `{color.semantic.y}` ↔ `{color.semantic.x}` → `Semantic token reference cycle includes color.semantic.x.` with `probe.json#$.color.semantic.x`.
- `color.base.fooBar` plus `color.base.foo-bar` → `Multiple tokens emit --color-base-foo-bar.`

## Conclusion

The focused report’s passing results hold under additional parser, endpoint, collision, runtime-identity, and compiled-output probes. No implementation change is recommended from this investigation.
