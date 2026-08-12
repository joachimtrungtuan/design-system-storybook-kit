# Test Report — 2026-08-12 — Phase 2 token engine

## Summary

- Result: PASS
- Scope: `packages/engine/src/tokens/` and the repository quality gates.
- Source or fixture files were not modified. The report is the only file created by this validation.

## Commands and results

| Command | Result | Evidence |
| --- | --- | --- |
| `node --test 'packages/engine/src/tokens/*.test.ts'` | PASS | 21 passed, 0 failed, 0 skipped; 134.07 ms. |
| `npm test` | PASS | 44 passed, 0 failed, 0 skipped; 835.19 ms. |
| `npm run typecheck` | PASS | `tsc -p tsconfig.json` exited 0. |
| `npm run build` | PASS | `tsc -p tsconfig.build.json` exited 0. |

## Phase 2 success-criteria evidence

| Criterion | Status | Evidence |
| --- | --- | --- |
| Anchor fidelity | PASS | Ramp test asserts generated `[anchor].hex === $base` and source `anchor` for both fixture ramps. |
| Eleven steps, both modes and anchor positions | PASS | Both fixture ramps have exactly `50..950`; HSL base at 500 and OKLCH base at 950 are exercised. The 950 test also proves its other ten steps are lighter. |
| Deterministic codegen | PASS | Codegen compares repeated runs and recursively reversed input key order byte-for-byte; expected CSS fixture also matches exactly. |
| Actionable schema errors | PASS | Missing `$mode` names `$.color.brand.signal.$mode`; malformed JSON retains its source; literal 11-step ramps and raw semantic hex values are rejected. |
| Semantic dangling references and cycles | PASS | Codegen tests assert source-bearing dangling-reference errors and cycle detection without recursion overflow. |
| No token-file write path | PASS | Test reads `schema.ts`, `color.ts`, `ramp.ts`, `codegen.ts`, and `index.ts`, asserting no `writeFile`, `createWriteStream`, or `appendFile` call. |
| Gamut notices | PASS | OKLCH conversion test reports clipping; ramp and codegen tests assert clipped generated steps appear through `gamutClips`. |

## Notes

- Non-anchor overrides are covered and win; an anchor override is deliberately rejected, preserving anchor fidelity.
- No test failures, type errors, or build errors observed.

## Exit-code regression retest

- Shared `EXIT_CODES` and `ExitCode` now originate in `packages/engine/src/exit-codes.ts`; the CLI re-exports them and `ActionableError.exitCode` is bounded to that union.
- `node --test 'packages/cli/src/errors.test.ts'`: PASS — 4 passed, including the new bounded exit-code regression; 0 failed, 0 skipped (96.95 ms).
- `node --test 'packages/engine/src/tokens/*.test.ts'`: PASS — 21 passed; 0 failed, 0 skipped (129.69 ms).
- `npm test`: PASS — 45 passed, 0 failed, 0 skipped (860.28 ms).
- `npm run typecheck`: PASS.
- `npm run build`: PASS.
