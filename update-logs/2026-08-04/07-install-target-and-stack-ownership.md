# 07 — Install target, stack ownership, and where prompts are allowed to appear

**What:** FR1 and FR6 extended in `docs/requirements.md`; ADR-010 added and ADR-009 amended in `docs/architecture.md`.

**Why:** Maintainer raised two things — the install target may not be the repo root, and whether scaffolding React + Tailwind should be an option — then a third: whether the nested-git-repo case is a concern to handle or a choice to offer.

## Decisions

**The scaffold owns the whole stack. Not optional (ADR-010).** React, Vite, TypeScript and Tailwind v4 are generated with the Storybook layer. *Reasoning:* the contract already mandates that stack — ADR-002 fixes React + Vite, ADR-003 makes the token pipeline Tailwind v4 `@theme`, which on v3 does not degrade but simply does not exist. A "Storybook-only" output is a project that cannot run until the user assembles the rest by hand, which is the friction FR6 exists to delete. The maintainer framed this as an optional helper; the honest reframe is that the option was never whether the stack is present, only whether we create it or adopt one.

**`create` finishes the job — dependencies installed, both run commands working.** Maintainer asked to confirm no separate "create a Vite app" step remains. There is none: `create` is not a layer added to a project the user builds first, it *is* the project. Dependency install runs as part of `create`, skippable by flag for automated use. A scaffold that ends by telling the user to go install dependencies has not finished. Recorded in FR1 so it is a requirement rather than an assumption.

**Install target is a path and nothing more.** Root, new subdirectory, or nested inside an existing repo — all produce the same self-contained tree: own `package.json`, own source, own Storybook config, own manifest. A subfolder install never reads the parent's config or depends on its dependencies. `create` confirms the resolved absolute path before writing anything.

**Adopting an existing React app in place: rejected for this iteration (ADR-010).** Materially different problem — version compatibility gates, *merging* rather than writing `globals.css` / `vite.config` / `tsconfig`, and a manifest whose "as shipped" baseline entangles with files we did not write. The self-contained subfolder already covers the practical case of a design system beside an app in one repo. Revisit once the contract is proven. **This is a scope call the maintainer should confirm or overturn.**

**Nested git repo: a choice, not a hazard (ADR-009 amended).** First pass flatly refused to `git init` inside an existing repo. Wrong — an independent nested repo destined for its own remote is legitimate, which is why submodules exist. Corrected to: user chooses, enclosing repo is the default, and if an independent repo is chosen `create` reports what the parent needs (submodule entry or `.gitignore` line). The non-negotiable is not *which* repo, it is that a repo the parent neither tracks nor ignores never gets created silently — that is the case where work looks committed and reversibility is broken where nobody would look.

**Workspace parents: detect and instruct, never edit.** When the parent declares `pnpm-workspace.yaml` or `package.json#workspaces`, print the line to add. Rewriting config the user owns, in a repo we were invited into, is a larger liberty than the convenience buys.

**Prompts are conditional (FR6).** A question appears only when its triggering situation is detected. An empty-directory install never sees the nested-git or workspace questions. Prompt count scales with the user's situation, not with the number of cases supported — this is what makes "confirm before anything irreversible" survive contact with the non-technical-user goal. Where the two conflict, correctness wins; NFR1 is not traded for a prompt.

## Follow-ups

- Still blocking, still trivial: the npm scope string, to replace `@<scope>/` and the `@ds/*` placeholders.
- Supersedes the ADR-009 follow-up in `06` about a target inside an existing repo — now specified here.
- Tailwind v4 as a hard gate means a detectable failure mode worth an NFR5 message even in the scaffold-only world: a user whose global tooling pins v3. Verify at scaffold time.
