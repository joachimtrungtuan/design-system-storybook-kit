# 05 — Distribution: npx + git, and the boundary between them

**What:** Added FR6 (Install) and NFR5 (failure messages are instructions) to `docs/requirements.md`, ADR-007 to `docs/architecture.md`, and an Install section to `packages/cli/README.md`.

**Why:** Maintainer requires the toolkit installable via `npx` and from git, with installation straightforward for a non-technical person.

## Decisions

**One package, two invocation modes, hard boundary.** `create` runs via `npx` (nothing local exists yet). `validate` / `update` / `migrate` run only from the project's own devDependency. *Why:* those commands must be version-locked to the project's engine — running the latest CLI against an older project is exactly the skew the manifest exists to detect. CLI detects transient invocation inside a directory that already has a manifest and redirects.

**Alternative considered:** separate `create-*` and maintenance packages. Split is genuine — create wants to stay small for fast `npx`; maintenance carries codegen, validator, migration. Rejected for now: one package is simpler to version and publish, download happens once. Revisit on real latency complaints, not speculation.

**Git channel is `npx github:<owner>/<repo>`, not clone.** Clone + local run is the contributor path for developing the toolkit. Conflating the two would push users into `pnpm install` at the monorepo root for what should be one command.

**Stated the prerequisite floor honestly.** Node installed, terminal open, one command typed. Not removable by anything we build — fixed by the ecosystem. Written into FR6 rather than left as an implied promise, so "easy for non-technical users" does not get read as more than it is.

**Reframed the usability goal as NFR5.** Once the floor is accepted, "easy" reduces to: interactive by default, no required flags, a default for every prompt, and every first-run failure (Node missing/old, package manager missing, network blocked, directory not empty, git absent) reporting what is wrong, what to do, and where to get it. A stack trace reaching the user is a bug.

## Follow-ups — needed before the plan

- **npm package name / scope** — maintainer's call; determines the `npx` command string. Availability must be checked, not assumed.
- **Package manager support** — template currently assumes pnpm. A non-technical user likely has npm only. Either detect the package manager or require pnpm via corepack. Materially affects `create`.
- **Git requirement vs. non-technical users** — NFR1 requires a clean git tree and a branch for `update`. A non-technical user may not use git. Do not weaken the invariant; detect git's absence and explain instead.
