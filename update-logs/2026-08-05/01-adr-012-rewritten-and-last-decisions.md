# 01 — ADR-012 rewritten: the toolkit builds through `prepare`; last three red-team decisions closed

**What:** ADR-012 replaced in `docs/architecture.md`, and the final three of entry 13's six open decisions resolved. All six are now closed and Phase 1 is unblocked.

**Why:** ADR-012 gated all ten remaining phases. The other two were the last undefined behaviours in the plan.

## ADR-012 — no build step → build at install time

The original decision had `bin` pointing at a `.ts` entry, relying on Node's native type stripping so nothing compiled. Refuted by Node's own documentation (entry 13): Node *"refuses to handle TypeScript files inside folders under a `node_modules` path"*, deliberately, to discourage publishing TypeScript. No override. Every install path lands there — devDependency directly, `npx` via `~/.npm/_npx/<hash>/node_modules/` — so the toolkit worked in a checkout and failed for every real user.

**Decided: a `prepare` script compiles the toolkit at install time.** ADR-007 already verified the mechanism — npm installs devDependencies and runs `prepare` before packing on git installs — so this was documented as viable a month before it was needed.

The uncomfortable part, recorded because it matters: the original ADR-012 **considered `prepare` and rejected it**, on the grounds that npm runs it silently and a first `npx` becomes a half-minute of apparent hang, which is the NFR5 failure at the worst possible moment. That objection was correct and still is. It is adopted anyway because the option it was rejected in favour of does not exist. This is a decision made on a shrunken option set, not a reversal on new evidence, and it should be revisited if the registry ever becomes acceptable.

Rejected, with reasons:

- **Commit the built JavaScript.** Fast, no hooks, ADR-007 untouched — but contradicts the standing "never commit `dist/`" rule, puts generated files in every diff, and lets shipped JS drift from its source.
- **Write the shipped code in JavaScript with JSDoc.** Satisfies the no-build goal literally. The pain lands precisely where this codebase is most typed: token schema, manifest, update classification, all generic-heavy and all badly served by JSDoc.
- **Publish to npm.** Cleanest by a distance — build once at publish, no install hook, no artifacts in git, faster installs. Rejected only because it reverses ADR-007's "no npm account and none is required". ADR-007 already records that the same bundle publishes unchanged, so this stays the documented upgrade path. Phase 10 now measures first-run install time specifically so that conversation can happen on evidence.

Consequences now written into the plan:

- **`--ignore-scripts` breaks the install** and is common CI policy. `prepare` never runs, the compiled entry is absent, and Node reports a missing module before any toolkit code executes. Phase 1 owns a guard that catches the absent build and names the fix; Phase 10 treats it as a release-blocking test. This is the sharpest new edge and it is not hypothetical.
- **Every install pays for a build**, including each CI reinstall of every generated project — a recurring cost borne by users rather than a one-time cost borne by the maintainer. The inverse of the usual arrangement, and the strongest argument for the registry later.
- **`noEmitOnError` in the build config**, because `tsc` emits by default even when checking fails — otherwise `prepare` produces a working-looking install from source that does not typecheck. `tsc --noEmit` stays a separate gate: the build config excludes tests and fixtures, so it checks strictly less.
- **The Node 24.12 floor is now a choice.** It was binding only because type stripping needed it; the dependency floor alone allows 22.13. Retained at 24 LTS on its own merits, and flagged as revisitable without touching anything else.
- **Phase 4's spike is superseded.** It asked whether Storybook could load *unbuilt* TypeScript from `node_modules`, with a `.js` + `.d.ts` fallback. That fallback is now the baseline for the whole toolkit, and loading built JavaScript from `node_modules` was never in doubt. What survives is a version-verification check, plus a requirement that the build emit declarations — rules 22–23 push every generated project through the preset import, so a missing `.d.ts` degrades every project at once.
- **Phase 1's spike survives but inverts its order**: it now runs *after* `prepare`, because the `imports` map must resolve built paths and there is nothing to resolve in a source checkout.

## Rules 9/11 vs grouped stories — `Meta.subcomponents`

`Meta.component` is singular, so a grouped story file covering three components gave rule 9 nothing to match on, while Phase 5 ships grouped stories deliberately. **Rule 9 now checks the union of `component` and Storybook's native `subcomponents`.** Rule 11 unchanged, so a grouped file still declares a primary subject rather than becoming a bag of unrelated components.

The reason this one is native rather than invented: `subcomponents` already exists in Storybook's `Meta`, so coverage becomes a declaration the author makes and the validator reads, with no project-specific convention to learn.

Rejected: inferring coverage from what a file imports and renders — fragile in both directions, passing a component merely mentioned in passing and failing one rendered through a helper. Rejected: forbidding grouped story files, which is trivially checkable but splits documentation pages that are more useful together.

## `create` into a non-empty directory — refuse on collision, not on emptiness

Previously undefined. **Decided: a non-empty target is allowed; a colliding one is refused**, naming the colliding paths and pointing at `ds adopt`.

Refusing every non-empty target is simpler but breaks a case Phase 6 explicitly supports — scaffolding into the current directory — because a bare `.git`, `README.md` or `LICENSE` makes a directory non-empty without being in the template's way. Comparing the template's file list against the target is the precise question; emptiness was a proxy for it.

Rejected: prompting to overwrite. It puts a destructive default one keystroke away in the first command a new user runs, and ADR-013 already rejected exactly this for `adopt` when it removed `--force`. A toolkit whose central claim is that it never silently overwrites user work does not get an exception for its friendliest command.

The gate lives in `create/plan.ts` — it is a comparison of two file lists, not a mutation — and it does not replace the rollback ledger. The gate stops collisions before any write; the ledger's created-vs-overwrote distinction protects the files the gate deliberately allows past.

## Follow-ups

- `docs/design-system-contract.md` owes four edits, all landing in Phase 3 step 9 with the validator and template together: rule 9's `subcomponents`, rule 12's `globals.css` narrowing, `ds validate` replacing `pnpm ds:validate` (`:148`), and rule 24. Deliberately not made now — `CLAUDE.md` requires contract, validator and template to change in one move.
- `docs/update-and-migration.md` documents neither resolution of `--to`; Phase 7 changes it with whichever it picks.
- `docs/requirements.md` FR3 does not say where the agent skill lives or how it ships. Phase 11 step 8.
- Effort estimates were left un-rebaselined pending ADR-012 (entry 13, Rejected). That blocker is gone, and `prepare` adds work to Phases 1, 4 and 10, so the estimates are now stale in a knowable direction.
