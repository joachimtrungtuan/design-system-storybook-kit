# Code Review — 2026-08-12 — Phase 2 token engine

## Findings

### P2 — Shared error constructor weakens the CLI exit-code contract — RESOLVED

- Paths: `packages/engine/src/errors.ts:4-11`, `packages/cli/src/errors.ts:30-32`.
- The moved `ActionableError.exitCode` is now `number`, whereas the prior CLI public class constrained it to `ExitCode`. `handleCliError` compensates only with an unchecked cast.
- Exact reproduction: `new ActionableError("probe", "fix", "resource", 99)` followed by `handleCliError(error, () => {})` returned `99`.
- Impact: TypeScript consumers and future engine callers can now produce an invalid process exit code while the CLI advertises an `ExitCode` return. The existing “exit codes are stable and distinct” test covers constants, not this boundary.
- Recommendation: preserve a shared bounded exit-code type or validate/map `error.exitCode` at the CLI boundary; add a regression test for an out-of-range supplied code.

#### Resolution retest — 2026-08-12

- `packages/engine/src/exit-codes.ts` now owns `EXIT_CODES` and the literal-union `ExitCode`; `packages/engine/src/errors.ts:7-13` applies it to the constructor and instance property. The CLI re-exports those symbols at `packages/cli/src/exit-codes.ts:1` and returns `error.exitCode` without a cast at `packages/cli/src/errors.ts:30-32`.
- Compile-time boundary: an isolated `tsc --noEmit` probe calling `new ActionableError(..., 99)` fails with `TS2345: Argument of type '99' is not assignable to parameter of type 'ExitCode | undefined'`.
- Runtime/import compatibility: both source and `dist` report `sameCodes: true`, `sameError: true`, and return validation exit code `1` for an engine-created error handled by the CLI.
- Focused regression test: `node --test 'packages/cli/src/errors.test.ts'` passes 4/4, including `an actionable error preserves the bounded exit-code contract`.
- No additional public-contract regression was found in the shared exports or emitted declarations.

### P3 — No lint gate is configured

- Path: `package.json` `scripts` (only `build`, `test`, and `typecheck`).
- `npm run lint` fails with `Missing script: "lint"`; therefore a lint-clean claim cannot be made. This is a verification gap, not a Phase 2 code failure.

## Acceptance-criteria review

| Criterion | Status | Evidence |
| --- | --- | --- |
| Parse malformed input with actionable path | PASS | `schema.ts:46-51, 233-245`; tests cover missing `$mode` and invalid JSON. |
| Enforce V16/V18/V19 | PASS | Ramp/schema checks at `schema.ts:63-152, 155-203`; focused tests cover all three. |
| Eleven-step HSL and OKLCH ramps; exact anchor; overrides | PASS | `ramp.ts:39-76`; tests cover 500 HSL, 950 OKLCH, exact anchors, and non-anchor overrides. |
| `@theme` codegen and semantic resolution | PASS | `codegen.ts:173-215`; expected CSS, aliases, dangling references, and cycles tested. |
| Deterministic output | PASS | Sorted schema traversal and declaration ordering at `schema.ts:196-202`, `codegen.ts:182-211`; repeated/reversed input tests pass. |
| Never write `tokens.json` | PASS | Engine implementation modules contain no filesystem/write APIs; test and debugger probe confirm. |
| Report gamut clipping | PASS | `color.ts:100-120`, `codegen.ts:120-126, 208-211`; focused and direct probes report clipped steps. |

## Regression and contract assessment

- CLI callers continue importing `ActionableError` through `packages/cli/src/errors.ts:1-4`; source and compiled CLI/engine exports have the same runtime identity, and the normal default refusal path passes the complete suite.
- The token public surface is additive through `packages/engine/src/tokens/index.ts:1-32`; no environment variables, configuration files, or existing token schema are changed.
- DTCG brace references are intentionally enforced at `schema.ts:167-175`; anchor overrides are intentionally rejected at `schema.ts:126-133`, both matching the phase update log.
- Strict TypeScript patterns are maintained: no `any`, explicit exported types, Node built-in tests, and successful source/dist builds. There are no new dependencies.

## Verification

- `npm test`: PASS — 44 passed, 0 failed, 0 skipped (906.85 ms).
- `npm run typecheck`: PASS — `tsc -p tsconfig.json` exited 0.
- `npm run build`: PASS — `tsc -p tsconfig.build.json` exited 0.
- `npm run lint`: unavailable — no configured script.

## Residual risks

- The accepted 1.15 lightness curve is mathematically tested but awaits the planned Phase 5 comparison against real approved ramps and semantic contrast review (contract S4).
- Gamut notices are exposed by the engine result but no Phase 2 CLI presentation exists yet; that is consistent with the phase boundary.
