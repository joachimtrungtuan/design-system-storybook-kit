# 09 — GitHub-only distribution; `ds adopt` added as a second mode

**What:** ADR-007 rewritten, ADR-013 added, ADR-010's rejection reversed, FR1b added, FR6 rewritten, repository shape revised, CLI README updated.

**Why:** Maintainer has no npm account and asked whether GitHub-only distribution is sufficient; supplied names (`story-cli-kit` for repo and package, `ds` for binary); and overturned the deferral of merging into an existing React source.

## Verified before deciding

npm docs, not recall. Three facts:

- **`prepare` runs on git installs** — npm installs devDeps and runs it before packing/installing. TypeScript can build at install time; committed artifacts not inherently required.
- **`#semver:^1.0.0` works on git deps** — npm matches remote tags like a registry range. *Corrects an assertion the assistant was about to make that git deps cannot take semver ranges.* Generated projects keep real ranges, so `update` keeps its semantics.
- **No subdirectory addressing.** A git URL resolves the repository *root*; no `#path=packages/cli`.

## Decisions

**GitHub-only distribution (ADR-007 rewritten).** `npx github:joachimtrungtuan/story-cli-kit`. No registry account.

**Consequence: the repo root is the installable artifact.** Forced by the no-subdirectory fact. `packages/cli` and `packages/engine` cannot be two installable units. *This does not reverse the maintainer's monorepo choice* — the workspace stays for development, engine and CLI keep a real module boundary, and the root builds one bundle with the engine inlined. Rejected: a separate distribution repo or release branch — works, keeps the tree clean, but needs CI to stay honest and buys nothing with one maintainer. *Cost accepted:* generated projects carry CLI + templates in `node_modules`, not just the engine. Reversible — the same bundle publishes to npm unchanged if that ever happens.

**Names.** repo + package `story-cli-kit`, binary `ds`. Assistant had flagged `ds` as generic; maintainer chose it. Re-examined and the objection does not hold: ADR-007 installs it as a project-local devDependency, so it lives in `node_modules/.bin` and never enters global `PATH`. No collision surface.

**`ds adopt` (ADR-013) — merging into an existing React app is in scope.** Previously deferred as a materially different problem; maintainer required it. Designed, not bolted on. Core rules:

- Five write classes — `add`, `identical`, `merge`, `conflict`, `skip`. Only `add` and `merge` write.
- **No `--force`.** `conflict` never self-resolves; same reasoning as `update`.
- **Merge means additive and structured, never textual** — `package.json` deps/scripts, `tsconfig` entries, `.gitignore` lines, a `globals.css` import. If a change cannot be stated as "these keys or lines were added", it is a conflict.
- **Dry run is the first half of the command**, not a flag. Classification prints, then it asks. `--dry-run` only stops it after printing.
- **Compatibility gates first, refusal on failure** — React 19, Vite (not CRA/Next/webpack), Tailwind v4 absolute, TypeScript in ADR-011 range.
- **Merged files are permanently user-owned.** The manifest asks one question — *has the user modified this since we wrote it* — and for a file we merged into, there is no "as shipped by us" baseline, so the question is unanswerable. `update` reports them and stops. Pretending otherwise would rest the update pipeline's only reliable signal on a foundation that cannot carry it.

## Follow-ups

- **Open for maintainer:** commit the built bundle, or build via `prepare` on every `npx`? Affects first-run latency vs repo hygiene, and a committed bundle contradicts the "never commit `dist/`" rule in `CLAUDE.md` / `AGENTS.md` / `code-standards.md` §9, which would need a scoped amendment.
- `AGENTS.md` unchanged so far this session; verify mirror parity before the plan closes.
- Contract doc still to be re-read for rules that are illustrated but not stated, before the validator is written.
