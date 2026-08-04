# 01 — Project foundation: requirements, structure, governance

**What:** Initial scaffolding of the toolkit repo — five docs in `docs/`, monorepo skeleton (`packages/engine`, `packages/cli`, `templates/storybook-vite` with responsibility READMEs), `CLAUDE.md` + mirrored `AGENTS.md`, `INDEX.md`, `update-logs/README.md`, workspace manifest, `.gitignore`. No implementation.

**Why:** Establish the contract before any code, so the template and validator are built against a written spec rather than the spec being reverse-engineered from the template.

## Decisions

**Hybrid distribution (ADR-001).** Engine (Storybook preset, token codegen, validator, story templates) ships as versioned npm package; components copied into projects and owned there. *Alternatives:* full package — rejected, blocks per-brand component editing and forces every brand difference through a variant API designed in advance. Pure copy — rejected, freezes infrastructure at init date, which is the current problem.

**One update pipeline, not two modes.** Maintainer proposed "upgrade keeping progress" vs "upgrade adopting new structure". Reframed: of the five file categories, four behave identically in both; only user-modified shipped files differ. So `ds update --on-conflict=skip|migrate`. *Alternative:* two pipelines — rejected, two code paths that must stay in sync and would not.

**Migration notes ship per release.** `migrations/<version>.md` states what changed, whether breaking, mechanical equivalent, rationale. *Why:* an agent reading only a diff cannot distinguish a rename from a redesign; intent must be stated, not inferred.

**Consistency defined at contract level, not implementation level.** Taxonomy, naming, story format, token pipeline, doc structure are guaranteed identical; component internals diverge per brand by design. Flagged to maintainer as a consequence to sign off on; written into `docs/requirements.md` as the operative definition.

**Tailwind v4 CSS-first tokens (ADR-003).** `tokens.json` → generated `tokens.css` `@theme` block. Verified against current Tailwind docs that `@theme` emits both utilities and CSS custom properties. *Alternative:* the reference project's `tokens.json` + `globals.css` `:root` + `tailwind.config.ts` — rejected, same value maintained in three places.

**Stories separated from components (ADR-004).** `src/stories/**` mirrors `src/components/**`. *Alternative:* co-location, the more common convention — rejected, three of four reference projects use separation and it makes the story tree independently validatable against the tier taxonomy.

**React + Vite only, first iteration (ADR-002).** All four references are Vite. Next.js deferred; engine kept framework-agnostic so a second template needs no redesign.

**Validator + agent skill as superset (ADR-005).** Deterministic script owns mechanical rules and is authoritative; the agent skill runs it first, then adds semantic review. *Alternative:* independent agent-side checking — rejected, would eventually disagree with the script leaving neither trustworthy.

**Session-start protocol amended** per maintainer: fall back to the latest numbered entry when no end-of-session note exists, and no expectation of one note per session.

## Reference basis

`win-ui-layout` (WIN Flavor) supplied the taxonomy: four component tiers, mirrored stories tree, per-component barrels, `tokens.json` as source, `Introduction.mdx` + `foundations/*.mdx` spine. `VantixB/react-ui` and `SIMPLE VR` replicate it, confirming the pattern is stable. `Volta/landing-page-ui` has no atomic structure (`src/sections` only) — the drift case this project exists to prevent.

## Follow-ups

- Open in `docs/requirements.md`: full example component set per tier vs. one representative; whether ramp generation (base colour → 50–950) is an engine utility or an agent task.
- Nothing pinned to dependency versions yet — deliberate, versions to be checked at implementation rather than guessed.
- Next: build `templates/storybook-vite` and the engine token codegen together, so the contract is exercised before the validator is written against it.
