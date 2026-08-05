# 13 — Red team review of the implementation plan; ADR-012 refuted

**What:** Four adversarial reviewers run sequentially over `plans/260804-1648-story-cli-kit-implementation/`. 45 raw findings → deduplicated, evidence-filtered, adjudicated. Five Critical accepted, fourteen High, three rejected with reasons. Reports at `plans/reports/redteam-260804-1648-{security-adversary,failure-modes,assumptions-and-scope,contract-fidelity}.md`.

**Why:** The plan was about to be executed. Every finding below would have been discovered mid-implementation at a much higher cost, and two of them only after shipping.

## ADR-012 is refuted — not risky, wrong

Verified directly against `nodejs.org/api/typescript.html` (Stability 2, stable since 24.12.0):

> To discourage package authors from publishing packages written in TypeScript, Node.js refuses to handle TypeScript files inside folders under a `node_modules` path.

No override flag. `--no-strip-types` disables stripping, it does not lift the restriction. Every install path puts `bin.ts` under `node_modules` — the project devDependency, and `npx`, which stages into `~/.npm/_npx/<hash>/node_modules/`. **The shipped artifact must be JavaScript.** Pending maintainer ADR decision; Phase 1 is blocked at step 2 until it lands.

Worth being precise about what went wrong here, because the same mistake is repeatable. ADR-012 was decided by reading the Node type-stripping documentation for the *stability* claim and stopping there. The paragraph that kills it is on the same page. Entry 11 then wrote two spikes probing the *consequences* of no-build without re-checking the premise — a spike is not a substitute for reading the source of the claim it rests on. This also supersedes both spikes: a JavaScript preset under `node_modules` was never in doubt, so resolving ADR-012 answers Phase 4's question too.

## Other Criticals, all applied to the phases

- **Phase 7 never rewrote the manifest.** Its file list created `classify.ts` only; Phases 6, 8 and 9 all touch `manifest/write.ts`. Without it `engineVersion` and every checksum still describe the old version after an update, so the *next* update classifies the whole shipped tree as conflicted. One successful `ds update` made the toolkit unusable. Fixed: manifest rewrite is now a step, a file, and two success criteria — including the round-trip that proves it (update twice, second run reports nothing conflicted).
- **`ds update --to <version>` had no path to the new template's bytes.** `update` runs from the project's installed copy; `baseline.ts` fetches only the *old* tag; ADR-007 forbids `npx` for maintenance commands. Symmetrical to the gap resolved in entry 12 and missed for the same reason. Two options recorded in Phase 7; recommend `target.ts` as the same fetch against a different ref.
- **`create` gated git presence, not identity.** Fresh macOS + Xcode CLT has git and no `user.email`; the commit is step 6 of 8, so it failed after the whole project was on disk, with rollback forced to choose between deleting a working project and leaving a repo with no commit. Identity moved into preflight (`env/git.ts`).
- **The rollback ledger did not distinguish *created* from *overwrote*.** `git init` runs after copy, so between them there is no history to recover from, and Ctrl-C deleted pre-existing user files. Ledger entries now carry the pre-state; the "cancel over a pre-existing file" test is a success criterion.

## Corrections to things the plan asserted

- **Phase 4 must precede Phase 3**, and was never independent of Phase 2. `phase-04:47,62` builds `surfaces.ts` from parsed tokens, and rules 22–23 validate an import of a preset Phase 4 builds. Order is now 1 → 2 → 4 → 3 → 5 → … The only structural change the review produced.
- **The ramp is 11 steps, not 12.** 50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950 — counted, eleven. Both this plan and `docs/design-system-contract.md:120` said twelve, which made rule 18 ("no ramp declares all twelve steps literally") a threshold no ramp reaches: the one rule written to forbid hand-authored ramps would have passed every one of them. Rule 18 reworded to "declares **every** step literally", correct at any count. Contract edit owed.
- **`{{placeholders}}` had no renderer**, and rendering silently breaks classification — Phase 6 would checksum rendered bytes while Phase 7 compared unrendered template bytes, marking `package.json` conflicted on the first update of every project forever. Renderer assigned to Phase 6; rendered files are their own manifest class.
- **`ds generate` appended to a checksum-managed tier barrel**, so the NFR4-blessed way to add a component guaranteed a permanent conflict. Recommend barrels become generated files — derivable from the tree, which is what makes a file generated rather than hand-edited.
- **`baseline.ts` containment would fail on macOS.** `mkdtemp` returns a path under `/var` → `/private/var`; a prefix check rejects every entry, so `migrate` would never work on this machine. Compare realpaths. The specified tests were all negative cases, so none would have caught it — a positive-path test is now required.
- **`--dry-run` created a branch and regenerated `tokens.css`** while its success criterion, a tree hash, was blind to both.
- **`verbatimModuleSyntax` was missing.** `erasableSyntaxOnly` does not enforce `import type`; a value-imported type throws at runtime while `tsc --noEmit` stays green.
- **No exit-code contract existed** anywhere, though CI and the agent skill both branch on it.

## Rejected

- *Effort understated ~50%* (≈23–30d → ≈35–45d). Plausible and Phase 5's case is well argued, but estimates are not defects and re-baselining before ADR-012 resolves means doing it twice.
- *Reports may embed absolute paths / private registry hosts.* Real, Medium, and the report writers do not exist yet. Review item in Phases 7 and 9.
- *Rules 16–18 lack a ramp-vs-flat-colour discriminator.* Accepted as a question rather than a finding — the reference has flat `color.brand.white` beside real ramps. Folded into Phase 2's schema work.

## Still open — maintainer decisions

*Items 2, 3 and 5 were resolved the same day; see entry 14. The list is kept as the review left it.*

1. **ADR-012**: what ships as JavaScript, and how.
2. **Repository visibility and WIN Flavor fixtures.** Phases 3, 5 and 9 test against client-derived material carrying `$meta.source` provenance, in a repo that must be public for `npx github:…`, with `files: ["packages","templates"]` including fixtures recursively. Until resolved: reference runs are local-only, nothing derived is committed.
3. **Contract rules 12/13 vs `globals.css`.** `contract:77` makes `tokens.json` the only file where a font family may appear; `architecture.md:113` puts font imports in `globals.css`. The template's own file violates the contract, so Phase 5's "zero violations" cannot hold.
4. **Rules 9/11 vs grouped stories.** `Meta.component` is singular; a grouped story file covering three components gives rule 9 nothing to match on — and Phase 5 ships that case deliberately.
5. **The five `[S]` rules have no enforcement** anywhere in the plan, and FR3's agent skill is referenced three times and built never. Scope decision.
6. **`create` into a non-empty directory** — overwrite, refuse, or route to `adopt`. Undefined today.
