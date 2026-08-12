# Review — 2026-08-12 — Phase 4 Storybook preset

## Verdict

**9.5/10 — APPROVE.** No critical implementation, contract, packaging, or regression issue was found. The Phase 4 diff is scoped to the engine preset, its required `$`-configuration parser seam, package distribution metadata, regenerated `dist/`, and durable documentation/records.

## Evidence reviewed

- Active plan and Phase 4 requirements: `plans/260804-1648-story-cli-kit-implementation/{plan.md,phase-04-storybook-preset.md}`.
- Architecture engine/content boundary, token pipeline, stack table, and additive-merge policy: `docs/architecture.md`.
- Contract Storybook requirements V22/V23 and `$meta.surfaces` schema: `docs/design-system-contract.md`.
- All pending and untracked Phase 4 paths, including source, generated output, package metadata/lockfile, docs, index, update log, plan update, and test report.
- Existing test evidence: `plans/reports/test-260812-phase-04-storybook-preset.md`.
- Independent commands: `npm run typecheck` (pass), `npm test` (57 pass, 0 fail), `git diff --check` (pass), production-only raw-colour scan (0 findings), and isolated-cache `npm pack --dry-run` (the public JS and declaration artifacts are included).

## Acceptance mapping

| Phase 4 criterion | Result | Review evidence |
| --- | --- | --- |
| Three installed-consumer paths and versions verified | PASS | Test report records installed `preset`, `preview`, and Vite/Storybook build use at Storybook 10.5.7, Vite 8.2.1, Tailwind 4.3.3; architecture stack table and update log record the same versions. |
| Public preset declarations ship | PASS | `exports` maps both `./preset` and `./preview` to colocated `.d.ts`; isolated `npm pack --dry-run` lists `main.d.ts` and `preview.d.ts`. Test report also records a fresh-tarball consumer typecheck. |
| Three-line scratch `main.ts` boots Storybook | PASS | Test report records a fresh installed-tarball static Storybook build and controller-observed live boot/index; the use of `export default { ...main() }` is parser-compatible. |
| Token-derived backgrounds, no production raw colours | PASS | `preview()` calls `parseTokens`; `buildBrandSurfaces()` resolves only `$meta.surfaces.*.color` DTCG references, including semantic aliases and generated ramps. Source and built preset scan found no hex, `rgb(a)`, or `hsl(a)` literals. |
| Decorator/addon additions preserve preset values | PASS | `main()` appends stories/addons and chains the Vite extension after Tailwind; `preview()` appends decorators and merges token backgrounds before local background options. Focused tests cover each merge. |
| V22/V23 pass in scratch config | PASS | Test report documents preset imports and spread consumption for both config files; static build and consumer typecheck pass. |
| Installed tarball resolves, not workspace only | PASS | Test report records `import.meta.resolve()` under the scratch `node_modules`; isolated `npm pack --dry-run` independently confirms all exported files are pack-listed. |

## Contract and blast-radius review

- **Token parsing/codegen:** `ParsedTokens.configuration` intentionally retains `$`-prefixed data while `generateTokensCss()` still exclusively traverses `tokens.root`. The Phase 2 byte-identical CSS and deterministic-codegen tests pass. Surface resolution rejects raw colours, missing paths, invalid generated steps, non-colours, and circular references; it resolves semantic references without recursion overflow.
- **CLI and existing behavior:** no CLI source or command contract changed. The full suite covers prior CLI/environment behavior as well as all preset and token tests.
- **Storybook configuration:** base stories, addon-docs, React-Vite framework, Tailwind Vite integration, and factory-shaped additive extensions match the plan. The factory result is spread by consumers, avoiding a direct-call config shape rejected by Storybook's parser.
- **Public/package contract:** exported paths are explicit, ESM-only as the package already is, and declaration targets exist in `dist/`. `@tailwindcss/vite` is a runtime dependency because preset code imports it; Storybook/Vite/Tailwind packages are peer dependencies and are duplicated in dev dependencies for repository validation. The lockfile root metadata matches `package.json`, with the resolved versions matching the re-verified architecture table. `ParsedTokens` gains a required field, but it is not reachable through the public package exports; internal producers and consumers were updated together.
- **Repo rules:** `INDEX.md` locates the new source directory, architecture and contract remain their owning authorities, the numbered update log records rationale and verified versions, and generated `dist/` plus `package-lock.json` are included. No manual generated-file divergence is apparent: compiled preset imports target compiled `.js`, declarations and source maps point to their corresponding sources.

## Critical issues

None.

## Warnings

1. The default user npm cache is root-owned in this environment, so an unqualified `npm pack --dry-run` fails with `EPERM`. The isolated-cache invocation succeeds, and the Phase 4 test report used an isolated cache for its actual pack/install check. This is an environment hygiene issue, not a repository/package defect.
2. The phase file remains marked `pending` with unchecked criteria at review time. That is expected until controller finalization, but plan sync must mark it complete only after all required workflow gates accept this review.

## Suggestions

1. In Phase 5's generated `.storybook/preview.tsx`, retain the verified spread form `export default { ...preview(tokens) }` and add project decorators/backgrounds through the factory override rather than replacing its parameters.
2. When Phase 3 implements V22/V23, add a negative fixture for a direct `main()`/`preview()` default export if the parser-compatible spread form is to remain a durable contract.

## HARD-GATE-NO-SIDE-EFFECTS assessment

**Not triggered.** The evidence shows no regression, broken workflow, unintended public-contract break, or new lint/type/build/test error. The only noted conditions are a local npm-cache permission problem and pending plan-status synchronization; neither changes application behavior or requires a user decision between remediation options.
