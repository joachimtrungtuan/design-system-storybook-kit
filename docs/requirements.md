# Requirements

## Problem

Every new website/landing-page project rebuilds its Storybook from scratch. Storybook supplies a framework, not a structure — so the information architecture, tier taxonomy, token pipeline, and story conventions get re-decided each time. The result is drift: four existing projects, four different structures, and adding a component to a mature project produces something that does not match the rest of that same project.

The cost is not the initial setup (that is fast). The cost is the mental re-adaptation per project, and the loss of confidence that any given project is internally coherent.

## Goal

One boilerplate, one contract, reproduced identically into every new project by a CLI — then adapted per brand by AI agents that cannot silently change the structure while doing so.

## What "consistent" means here

This is the load-bearing definition. Consistency is guaranteed at the **contract level**, not the implementation level:

| Guaranteed identical across projects | Free to diverge per project |
| --- | --- |
| Directory taxonomy and tier boundaries | Component internals and markup |
| File naming and barrel-export rules | Token *values* |
| Story file location, title, and required structure | Which components exist |
| Token pipeline shape (`tokens.json` is the only hand-edited source) | Brand voice, copy, assets |
| Foundations documentation sections | Page and section composition |

Component internals **will** drift as each brand evolves, and that is correct — per-brand freedom is the point. What must never drift is where things live, what they are called, how they are documented, and where their values come from. The validator enforces the left column and is indifferent to the right.

Any requirement that implies freezing the right column is out of scope.

## Users

- **Primary:** the maintainer, starting and running multiple brand projects in parallel.
- **Secondary:** AI agents (Claude Code and others) performing init, adaptation, component authoring, and version migration inside a generated project.

Both must reach the same result through the same contract. No workflow may be available to an agent but not a human, or vice versa.

## Functional requirements

### FR1 — Initialize

A CLI command scaffolds a complete, runnable Storybook project: engine wired, taxonomy present, neutral tokens, foundations docs, example component per tier, validator passing. "Neutral" means brand-free but not empty — a working reference implementation, not a stub.

**The scaffold includes the application stack, not only the Storybook layer.** React, Vite, TypeScript and Tailwind v4 are generated as part of the project. This is not a convenience option: the contract mandates that stack (see non-goals and the ADRs), and the token pipeline is Tailwind v4's `@theme` — on Tailwind v3 it does not degrade, it does not function. A scaffold that produced a Storybook the user then had to attach to a stack they built themselves would reintroduce the setup friction this project exists to remove.

**End state after one command.** The user runs `create`, answers prompts that all have defaults, and has a project where dependencies are already installed and two commands work immediately: one to run the Vite application, one to run Storybook. There is no separate "now create a Vite app" or "now set up Tailwind" step, because there is nothing left to create — `create` is not a layer added to a project the user builds first, it *is* the project. Dependency installation runs as part of `create` (skippable by flag for automated use); a scaffold that ends by telling the user to go and install dependencies has not finished.

**The install target is confirmed before anything is written.** `create` asks where the project goes and shows the resolved absolute path for confirmation. The target may be the current directory, a new subdirectory, or a nested path inside an existing repository — all three are expected and equally supported.

**A subfolder target is self-contained.** It carries its own React source, its own `package.json`, its own Storybook config and its own manifest, and runs independently of whatever surrounds it. A design system installed at `design-system/` inside an existing repo must not depend on the parent's build, dependencies or configuration. The only thing the surroundings change is git handling (NFR1) and, when the parent is a workspace, whether the user is told to register the new directory as a member.

### FR1b — Adopt

A second command merges the design system into an **existing** React application rather than scaffolding a new one. It reaches the same contract-compliant end state, but every write lands in a tree the user built, so no write is silent.

Every intended change is classified and shown before anything is written — added, identical, merged, conflicted, or skipped. Merges are additive and structured (dependencies, `tsconfig` entries, a `globals.css` import), never textual. A file that cannot be merged additively is reported as a conflict and left alone; there is no force flag. Compatibility is gated first — React 19, Vite, Tailwind v4, TypeScript in range — and a failed gate is a refusal with an instruction, not a partial adoption.

Files merged into are permanently user-owned: recorded, never auto-updated. Mechanics and reasoning: [architecture.md](architecture.md) ADR-013.

### FR2 — Adapt

An AI agent applies a brand (tokens, typography, brand guidelines, requested components) without altering taxonomy, naming rules, story conventions, or the token pipeline. The governance files (`CLAUDE.md` / `AGENTS.md`) and the contract doc are what constrain it.

### FR3 — Validate

A deterministic script checks contract compliance and exits non-zero on violation. An agent skill wraps that script, treats its output as authoritative, and adds the semantic checks a script cannot perform. The script is the floor; the skill is the ceiling. The skill never reimplements a rule the script owns.

### FR4 — Update

Engine updates land in existing projects without destroying local work. Conflicted files (engine-shipped, user-modified) are resolved by an explicit policy, never silently. Details: [update-and-migration.md](update-and-migration.md).

### FR5 — Migrate

When a conflicted component must adopt a new version, an agent performs the migration guided by the release's stated migration intent — not by inferring intent from a diff. Every migration is reversible and validator-checked.

### FR6 — Install

The toolkit is distributed from GitHub. There is no npm registry account and none is required:

- **`npx github:joachimtrungtuan/story-cli-kit`** — the normal path. One command, no prior install, no clone.
- **`git clone` + local run** — for developing the toolkit itself, not a user install path.

Git installs support semver tag ranges, so generated projects depend on a real version range rather than a pinned commit. Because a git URL resolves the repository root and cannot address a subdirectory, one artifact is installed rather than separate engine and CLI packages — see ADR-007.

Scaffolding runs interactively by default: no required flags, a sensible default for every prompt, and a working project at the end. Every flag is an optional override of a prompt, never a prerequisite for one.

**Prompts are conditional, not a questionnaire.** A question is asked only when the situation that makes it meaningful has actually been detected. Someone scaffolding into an empty directory should never see a question about nested git repositories or workspace registration — those questions do not exist for them. This is what keeps "asks before doing anything irreversible" compatible with "easy for a non-technical person": the number of prompts scales with the complexity of the user's situation, not with the number of cases the tool supports.

Where the two goals genuinely conflict, correctness wins. Reversibility (NFR1) is not traded away to save a prompt.

**Honest limit on "easy for a non-technical person".** Nothing in this project removes the floor: Node.js installed, a terminal open, one command typed. That floor is fixed by the ecosystem, not by our design. What is in scope is making everything *above* the floor trivial — see NFR5.

Two consequences of that floor, both required of `create`:

- **The user's package manager is discovered, not dictated.** `create` detects npm, pnpm or yarn and generates a project that works with whichever is present. A user who has only npm — the common case for someone who installed Node and nothing else — must never be told to install a second package manager first.
- **The project is a git repository from the first minute.** `create` initialises a repo and makes an initial commit, so NFR1's reversibility holds without the user knowing what git is. If git is absent, `create` says so and points at the installer rather than producing an unrecoverable project.

## Non-functional requirements

- **NFR1 — Reversibility.** Any operation that rewrites user-owned files requires a clean git tree, runs on a branch, and leaves the previous state recoverable.
- **NFR2 — Legibility.** A person can perform every operation manually by reading the docs. The CLI is a convenience over a documented procedure, never a black box.
- **NFR3 — Determinism.** Same inputs, same output, whether run by human or agent.
- **NFR4 — Low ceremony.** Adding a component must not require touching more than its own folder, its story, and the relevant barrel.
- **NFR5 — Failure messages are instructions.** Every failure a first-time user can hit — Node absent or too old, package manager missing, network blocked, target directory not empty, git absent — reports what is wrong, what to do about it, and where to get it. A stack trace reaching the user is a bug. This is what "easy for a non-technical person" actually reduces to once the prerequisite floor is accepted.

## Non-goals

- Publishing a public component library for third parties.
- Supporting arbitrary CSS frameworks. The contract assumes Tailwind v4 + CSS variables.
- Next.js support in the first iteration (see ADR in [architecture.md](architecture.md)).
- Runtime theming / multi-brand switching inside a single generated project.
- Design-tool (Figma) round-tripping.
- Freezing component implementations across projects — explicitly rejected above.

## Success criteria

The project succeeds when all of the following hold:

1. A new project is running, brand-adapted, and validator-clean in well under the time it currently takes to hand-build a Storybook.
2. Two projects generated months apart, with different brands, still have identical directory taxonomy, story titles, and token pipeline shape.
3. A component added in month six passes the same validator as one added on day one.
4. An engine update applied to a mature project leaves user components intact, reports every conflict explicitly, and reports zero surprises after the fact.
5. A fresh AI agent, given only the repo and the governance files, produces a component indistinguishable in structure from one the maintainer wrote.

Criterion 5 is the real test. If an agent needs conversation to get the structure right, the contract is under-specified.

## Resolved decisions

**Example components ship complete.** Every component in the neutral template covers its full surface — all size variants, all interaction states (default, hover, active, focus, disabled), all tone/style variants — each documented in its story. A partially-realised example teaches the wrong lesson, since the template is the reference every later component is copied from.

Completeness applies *within* each shipped component. Breadth stays deliberately small (a few components per tier); the reference value comes from depth, not from shipping a component the project will delete.

**Ramp generation is an engine utility.** Brand colours are declared by anchor and generated into a 50–950 scale at codegen time, in `oklch` or `hsl` mode chosen per ramp. Schema and rules: [design-system-contract.md](design-system-contract.md). This removes the last hand-maintained numeric surface from the token file.
