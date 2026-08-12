# Test Report — 2026-08-12 — Phase 4 Storybook preset

## Final result

**PASS — 7/7 Phase 4 success criteria passed; 0 failures; 4 non-blocking tool warnings.** The package was rebuilt, packed, installed from its fresh tarball, typechecked by a consumer, and statically built by Storybook. No repository source, generated output, plan, or documentation was modified by this validation; this report is the sole test-owned file.

## Repository gates

| Gate | Result | Evidence |
| --- | --- | --- |
| `npm run typecheck` | PASS | `tsc -p tsconfig.json` exited 0. |
| `npm test` | PASS | 57 passed, 0 failed, 0 skipped. The Phase 4 preset suite accounts for 9 focused tests; token/schema regression coverage also passed. |
| `npm run build` | PASS | `tsc -p tsconfig.build.json` exited 0 and regenerated `dist/`. |
| `git diff --check` | PASS | Exited 0 after the build and at final status check. |
| Fresh npm pack | PASS | `npm pack` with an isolated `/tmp` cache produced `story-cli-kit-0.0.0.tgz` containing both public preset JS and declaration entries. |
| Fresh-tarball consumer typecheck | PASS | Scratch project ran `tsc -p tsconfig.json --noEmit` against its installed tarball. |
| Fresh-tarball static Storybook build | PASS | Storybook 10.5.7 and Vite 8.2.1 built the scratch project to `/tmp/story-cli-kit-phase4.PZCss9/storybook-static-fresh-tarball-verified`; `index.html` was generated. |

## Phase 4 success criteria

| Criterion | Result | Evidence |
| --- | --- | --- |
| All three consumption paths verified against a built, installed preset, with versions recorded | PASS | Installed `story-cli-kit/preset` resolves to `node_modules/story-cli-kit/dist/.../main.js`; `story-cli-kit/preview` resolves to its installed `preview.js`; Vite executed the preset's `viteFinal` during static Storybook build. Verified stack: Storybook 10.5.7, Vite 8.2.1, Tailwind 4.3.3. |
| Public preset surface ships `.d.ts` | PASS | Fresh tarball contains `main.d.ts` and `preview.d.ts`; consumer typecheck passed. The installed copy and current `dist/` have the identical nine preset artifacts, including all three declarations. |
| Three-line `.storybook/main.ts` boots Storybook | PASS | Scratch `.storybook/main.ts` imports `main` from `story-cli-kit/preset` and exports `{ ...main() }`; the static Storybook build completed successfully. The controller separately verified the requested live boot/index path, so no server was started here. |
| Preview backgrounds come from `tokens.json`; no production raw colour literal | PASS | `preview()` parses token input, and `buildBrandSurfaces()` resolves `$meta.surfaces.<id>.color` through the parsed token root, including semantic references, ramp steps, explicit modes, and luminance fallback. A production-only scan of source and built preset found **0** hex, `rgb(a)`, or `hsl(a)` literals. |
| Project decorator/addon addition keeps preset configuration | PASS | `main()` appends local story and addon arrays after the base globs and `@storybook/addon-docs`; `viteFinal` installs Tailwind before calling a project extension. `preview()` accepts project decorators and merges project background options after token-derived entries. Focused tests cover these merges. |
| V22 and V23 pass for scratch configuration | PASS | V22: scratch `main.ts` imports the engine preset and declares no inline `stories`, `addons`, or framework. V23: scratch `preview.tsx` imports the engine preview and spreads `preview(tokens)`; the installed consumer typechecks and builds. |
| Preset resolves from installed tarball, not workspace | PASS | After a fresh local `npm pack` and isolated-cache install, `import.meta.resolve()` in the scratch project resolves both public paths under `/tmp/story-cli-kit-phase4.PZCss9/node_modules/story-cli-kit/dist/`, not the repository. |

## Contract and blast-radius assessment

- The public package contract is explicit: `./preset` exposes only `main` with `main.d.ts`; `./preview` exposes only `preview` with `preview.d.ts`. Both resolve in the workspace and from the tarball consumer.
- Runtime placement is correct: `@tailwindcss/vite` is a production dependency; Storybook, Vite, Tailwind, the React-Vite framework, and docs addon are declared peer dependencies and available to development tests.
- The shared token-parser addition stores `$`-prefixed configuration in `ParsedTokens.configuration` and leaves codegen's `tokens.root` traversal unchanged. Repository codegen determinism and all 57 tests passed; no CSS token output is affected by `$meta.surfaces`.
- Current `dist` was rebuilt before packaging. The fresh installed tarball matches all **9/9** current preset artifacts byte-for-byte (`main`, `preview`, and `surfaces`: JS, source map, declaration).
- Working tree review: Phase 4-owned preset source/build output, package metadata/lockfile, schema support, contract/docs/index, plan, and update log are pending as expected; this validation introduced only this report. No whitespace error was found.

## Warnings (4; no gate failures)

1. Storybook reports no files for the preset's optional `src/stories/**/*.mdx` glob; the scratch project intentionally contains a TSX story and nevertheless builds successfully.
2. Vite reports chunks over 500 kB in Storybook's generated docs runtime; this is a bundler advisory, not a build error or preset regression.
3. Storybook emits Node's `DEP0205` deprecation warning for `module.register()`; it originates in the upstream runtime.
4. The first offline refresh of the scratch tarball hit npm `ERESOLVE` while reporting already-installed peers as `undefined`. Repeating the same isolated-cache local tarball install with `--legacy-peer-deps` changed one package, then consumer typecheck and static build passed. This is an npm offline-resolution quirk, not a missing declared peer: the scratch manifest declares the exact verified peer versions.

## Commands

```text
npm run typecheck
npm test
npm run build
git diff --check
npm_config_cache=/tmp/story-cli-kit-phase4-npm-cache npm pack --pack-destination /tmp/story-cli-kit-phase4-pack
npm_config_cache=/tmp/story-cli-kit-phase4-npm-cache npm install --ignore-scripts --no-save --offline --legacy-peer-deps /tmp/story-cli-kit-phase4-pack/story-cli-kit-0.0.0.tgz
npm exec -- tsc -p tsconfig.json --noEmit                         # scratch project
npm exec -- storybook build --output-dir <scratch static output>  # scratch project
node --input-type=module -e 'import.meta.resolve(...)'            # workspace and installed tarball
rg -n -i --glob '*.ts' --glob '*.js' --glob '!*.test.*' '<raw-colour-pattern>' packages/engine/src/preset dist/packages/engine/src/preset
```
