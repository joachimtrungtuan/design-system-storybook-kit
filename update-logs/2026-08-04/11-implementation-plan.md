# 11 — Implementation plan written; four planning decisions taken

**What:** Docs session 05–10 committed (two commits). Ten-phase implementation plan created at `plans/260804-1648-story-cli-kit-implementation/`. Four decisions taken at planning time. Four contract/doc gaps found and left open rather than resolved silently.

**Why:** `docs/` is complete and nothing is implemented. Plan turns spec into sequenced work.

## Decisions

- **Scope: all five commands.** Maintainer chose the full roadmap over a vertical slice ending at `create` + `validate`.
- **`@clack/prompts`, nothing else.** `parseArgs` and help text stay native; commander rejected — five subcommands do not justify a framework. Deciding factor was cancel handling, not aesthetics: `create` writes before it installs, and hand-rolled prompts are where the Ctrl-C branch gets forgotten and a half-written directory survives. Confined to `ui/prompts.ts` so the zero-dep fallback stays cheap.
- **`node:test`.** Runs toolkit TS under the type stripping ADR-012 already requires. No second toolchain. Generated projects keep vitest.
- **Template mirrors `win-ui-layout`** (WIN Flavor). Scouted: it supplies *content* only. Its atoms are grouped by category not per component, organisms are flat files, ramps are materialised twelve-value scales the contract forbids, semantic tokens are raw hex with a comment-arrow instead of references, one foundations MDX where five are required, and a `tailwind.config.ts` ADR-003 bans. Phase 5 is a translation, not a copy — and that is where the real work is.

## Two spikes scheduled before code

Both trace to the same hole: **ADR-012 removed the build step that ADR-007 assumed would inline the engine.**

- **Phase 1** — how does the CLI import the engine from an installed git tarball, when the workspace link does not exist there? Recommended: Node subpath imports (`#engine/*`). Fallbacks: relative cross-package imports, then flatten the workspace. Both are ADR-level.
- **Phase 4** — can Storybook load a preset shipping as unbuilt TypeScript in `node_modules`? Node-side config loaders commonly externalise `node_modules` without transforming. Fallback: ship the preset's Node half as hand-written `.js` + `.d.ts`, which does not disturb ADR-012 since that ADR is about how `ds` runs.

Neither was visible when 09 and 10 were written. Worth noting the pattern: 09 designed distribution assuming a bundle, 10 removed the bundle, and the consequences for *consumers* of engine code were not re-derived.

## Open questions — not resolved, deliberately

1. **`update --on-conflict=migrate` needs the old shipped file; the manifest stores checksums, not content.** As written the policy is unimplementable. Options: fetch the old tag at migrate time (recommended), keep a baseline copy in the project, or weaken the prompt to current+new+notes — the last quietly makes migration worse while looking simpler. Blocks Phase 7's migrate path only; `skip` is unaffected and ships first.
2. **Token groups the contract does not name.** Reference has `icon`, `breakpoint`, `container`, plus `borderRadius`/`transition` against the contract's `radius`/`motion`. Contract wins on the renames; the three extra groups need a decision.
3. **Template runtime dependencies.** Recommend none beyond React/Vite/TS/Tailwind/Storybook — a template dep is inherited by every project forever. Drops `SlidingNumber` and the carousel. `@phosphor-icons/react` is the one real candidate, since `tokens.json` declares `icon.library`.
4. **`ds validate` vs the contract's `pnpm ds:validate`.** A pnpm-specific command cannot be the contract's name for it under ADR-008.

Resolving 2 and 3 changes the contract; resolving 1 changes `update-and-migration.md`. Each needs its own entry.

## Follow-ups

- Answer 2 and 3 before Phase 5 starts — discovering them mid-phase means rewriting `tokens.json` and its foundations doc.
- Phase 3 step 8 runs the finished validator against `win-ui-layout`. Predates the contract, so a long violation list is the expected result and the first real measurement of the drift this project exists to end.
- Phase 5 step 2 re-derives WIN Flavor's ramps from their anchors and diffs against the hand-authored twelve. Override count is direct evidence for or against ADR-006 and goes in that phase's log entry.
- `AGENTS.md` / `CLAUDE.md` untouched this session; mirror parity intact.
