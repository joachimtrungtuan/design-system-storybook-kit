# 10 — The toolkit has no build step

**What:** ADR-012 added (`ds` runs TypeScript directly via Node type stripping). Node floor raised to 24.12 in the stack table. ADR-007's "built bundle" language corrected — there is no bundle. ADR numbers 012/013 swapped to restore order after a misplaced insert; five cross-references updated.

**Why:** Git installs need something runnable at the repo root. Three ways to get there; maintainer chose the one that costs nothing structural.

## Decision

`bin` points at a `.ts` entry. Node strips types natively — default since 22.18, **stable since 24.12** — so nothing compiles, bundles or generates before `ds` runs.

**Alternatives rejected:**

- *Commit the built bundle.* Fastest install, works on Node 22.13+. But artifacts in git, a rebuilt bundle in every release commit, and it contradicts the standing "never commit `dist/`" rule in three governance files. Would have required amending a maintainer-authored rule to work around a problem that has another solution.
- *Build via `prepare` on install.* No artifacts, works on Node 22.13+. But npm runs `prepare` **silently in the background**, so the first `npx` is a 30–90s apparent hang with no output — the NFR5 failure mode at the exact moment a new user decides whether the tool works.

**Costs accepted:**

- **Node 22 LTS excluded** despite support until 2027-04. This is the real price. Acceptable: 24 LTS was already the recommendation, audience is the maintainer's own projects. Floor applies to generated projects too, since the CLI is their devDependency.
- **Erasable syntax only** — no enums, runtime namespaces, parameter properties, import aliases, decorators. None wanted in a CLI. `erasableSyntaxOnly: true` makes it a typecheck failure, not a runtime surprise.
- **Type checking becomes its own gate.** Node strips types without checking them, so `tsc --noEmit` catches nothing by accident — it must be run deliberately. Worth remembering when the validator and CI are built.

Applies to the toolkit only. Generated projects build through Vite as normal.

## Error made and corrected

Inserted ADR-012 immediately *before* the existing ADR-012 heading, producing order 011 → 013 → 012. **Second occurrence of this exact mistake this session** (see `08`). Fixed by renumbering rather than moving blocks, then grepping for every `ADR-012|ADR-013` reference across `docs/`, `packages/`, `update-logs/` and the governance files — five needed updating.

Worth naming as a pattern: appending an ADR by anchoring the edit on the *following* heading puts it in the wrong place every time. Anchor on the end of the preceding section instead.

## Follow-ups

- `AGENTS.md` has had no edits this session while `CLAUDE.md` also has none — mirror parity is intact by default, but both need a check against the git-rule question if a `dist/` exception is ever revisited. Not needed now: ADR-012 removes the reason.
- Contract doc still to be re-read for rules illustrated but not stated, before the validator is written.
