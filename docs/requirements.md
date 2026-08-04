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

### FR2 — Adapt
An AI agent applies a brand (tokens, typography, brand guidelines, requested components) without altering taxonomy, naming rules, story conventions, or the token pipeline. The governance files (`CLAUDE.md` / `AGENTS.md`) and the contract doc are what constrain it.

### FR3 — Validate
A deterministic script checks contract compliance and exits non-zero on violation. An agent skill wraps that script, treats its output as authoritative, and adds the semantic checks a script cannot perform. The script is the floor; the skill is the ceiling. The skill never reimplements a rule the script owns.

### FR4 — Update
Engine updates land in existing projects without destroying local work. Conflicted files (engine-shipped, user-modified) are resolved by an explicit policy, never silently. Details: [update-and-migration.md](update-and-migration.md).

### FR5 — Migrate
When a conflicted component must adopt a new version, an agent performs the migration guided by the release's stated migration intent — not by inferring intent from a diff. Every migration is reversible and validator-checked.

## Non-functional requirements

- **NFR1 — Reversibility.** Any operation that rewrites user-owned files requires a clean git tree, runs on a branch, and leaves the previous state recoverable.
- **NFR2 — Legibility.** A person can perform every operation manually by reading the docs. The CLI is a convenience over a documented procedure, never a black box.
- **NFR3 — Determinism.** Same inputs, same output, whether run by human or agent.
- **NFR4 — Low ceremony.** Adding a component must not require touching more than its own folder, its story, and the relevant barrel.

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
