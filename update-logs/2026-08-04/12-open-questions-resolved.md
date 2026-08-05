# 12 — Four open questions resolved; ADR-012 fallout swept from architecture.md

**What:** All four open questions from entry 11 answered by the maintainer. Two stale ADR-012 artefacts fixed. Validator gains rule 24.

**Why:** The questions blocked Phases 3, 5 and 7. Answering them together avoids discovering the answers mid-phase, which for 2 and 3 would mean rewriting `tokens.json` and its foundations doc.

## Resolutions

- **1 — `update --on-conflict=migrate` fetches the old tag.** `baseline.ts` pulls `story-cli-kit@<manifest.engineVersion>` into a `mkdtemp` at migrate time, reads the file, discards the directory. Rejected: `.designsystem/baseline/` in every repo (a template copy per project, forever, that drifts out of sync with the manifest and then lies), and weakening the prompt to current+new+notes (the agent then cannot tell a user's local edit from an old shipped default — the exact judgement the notes' rationale field exists to support). Offline or deleted tag ⇒ refuse with an instruction, never degrade silently. `docs/update-and-migration.md` gains the retrieval step in Phase 7.

- **2 — token groups follow Tailwind v4 `@theme` namespaces.** Maintainer delegated the call and asked for industry convention. The governing convention is the one the pipeline already compiles into: **group name = its Tailwind namespace where one exists, camelCase otherwise, `$` prefix for non-token keys.** Codegen becomes a namespace lookup instead of a translation table, and translation tables are where drift lives. `borderRadius`→`radius`, `transition`→`motion` (Tailwind has no `--transition-` namespace; `transition` is a DTCG *type* misused as a group). `breakpoint`, `container`, `zIndex`, `icon` adopted unchanged. `meta`→`$meta`, matching ADR-006's existing `$base`/`$anchor`/`$mode`/`$overrides` reservation; `icon.library`→`$meta.iconLibrary` because a token group holds tokens, not configuration. All five previously-unnamed groups adopted, nothing dropped. Encoded as **validator rule 24** rather than a fixed group list, so the next group is checkable without amending the validator — per the standing rule that a rule in prose is a suggestion.

- **3 — template ships `@phosphor-icons/react` and `motion`.** Two deps inherited by every generated project forever, both justified: `$meta.iconLibrary` declares an icon set, so an `icon` atom with nothing behind it is a contract rule pointing at nothing; `motion` restores `sliding-number` and gives the `motion` token group a consumer. Not adopted: `embla-carousel-react`, `@splidejs/react-splide`, `react-router-dom`, `react-use-measure`, `lenis`. Noted once so nobody trips on it: npm package `motion` ≠ token group `motion`.

- **4 — the contract names `ds validate`.** `pnpm ds:validate` cannot be the contract's name when ADR-008 says the project follows the detected package manager. Contract references the binary; generated `package.json` keeps a `ds:validate` script. Lands in Phase 3 step 9.

## ADR-012 fallout, swept

Entry 10 removed the build step. Entry 11 caught the *consequences* for engine consumers and scheduled them as the Phase 1 and Phase 4 spikes. Two artefacts of the old model survived anyway:

- `docs/architecture.md:8` said `bin: ds, built bundle`; `:17` said "built into one bundle with the engine inlined". Both now describe shipping as source with a subpath import. Entry 10 claimed this correction was made — the repository-shape section was missed. **Fixed here, not deferred to Phase 10's docs sync,** because Phase 1's spike is decided against that text and a spike reading stale premises is worse than no spike.
- `phase-01` listed root `package.json` as **Create**. It exists, as `name: "design-system-storybook", private: true`. Corrected to Modify: rename to `story-cli-kit` and **delete `private: true`** — a private package does not install, so `npx github:…` fails at the last step, after everything else looks right.

Pattern worth naming: both survived because the change that removed the build step was verified against the ADR it added, not against the documents that assumed the thing it removed. A removal needs a search for its assumptions, not just an ADR.

## Follow-ups

- `docs/design-system-contract.md` owes three edits (rule 24 wording, the five adopted groups, `ds validate`); `docs/update-and-migration.md` owes one (tag retrieval). Each lands in the phase that implements it so contract, validator and template move together.
- Rule 24 needs the Tailwind namespace list verified against the installed version at implementation time. It is version-bound; the stack table's verification date applies to it.
- Red team in progress — 1 of 4 reviewers returned. Its findings are not yet adjudicated and may add further phase edits.
