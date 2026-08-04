# 06 — What `create` is allowed to assume about the user's machine

**What:** Three maintainer decisions recorded. FR6 in `docs/requirements.md` extended with two consequences of the prerequisite floor; ADR-008 and ADR-009 added to `docs/architecture.md`; `packages/cli/README.md` gained a "What `create` does to the environment" section.

**Why:** These were the open questions blocking the implementation plan. All three follow from the non-technical-user goal in FR6, and all three change what `create` has to do.

## Decisions

**Package manager is detected, not dictated (ADR-008).** npm, pnpm or yarn — from `npm_config_user_agent`, falling back to `PATH`. *Alternative rejected:* pnpm-only via `corepack enable`. One install path to test instead of three, and it matches this repo. Rejected because it makes the user's first command a prerequisite installation, and corepack fails quietly behind proxies and on managed machines — the NFR5 failure mode at the worst moment. *Cost accepted:* three install paths to verify; lockfile shape varies per machine. Contained to `create` — the engine contract and validator are package-manager-blind.

**`create` runs `git init` and commits (ADR-009).** NFR1's reversibility requires a clean tree and a recoverable prior state; a non-repository cannot supply either. User gets the guarantee without knowing the mechanism. Missing git reports as an instruction, not a trace. *Alternative rejected:* snapshot-directory fallback for non-git users. Two reversibility mechanisms means `update` reasons about both, and the home-grown one would be the less-tested path failing exactly when it mattered.

**Published name is scoped to the maintainer's npm org.** Removes name-availability risk entirely. Docs carry `@<scope>/` until the org name is supplied; workspace names `@ds/engine` and `@ds/cli` are placeholders.

## Follow-ups

- **Blocking, trivial:** need the actual npm scope string to replace `@<scope>/` and the `@ds/*` workspace names.
- Package-manager detection needs a decision on what `create` does when *several* are present — proposal: prefer the one that invoked it, else prompt with npm as default. Belongs in the plan, not here.
- ADR-009 implies `create` must fail cleanly on a target directory already inside a git repo. Behaviour to be specified in the plan.
