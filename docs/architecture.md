# Architecture

## Repository shape

This repo is the **toolkit**, not a generated project. Repo name and package name are both `story-cli-kit`; the binary it installs is `ds`. It is a pnpm workspace:

```text
package.json              the single installable artifact — bin: ds, built by `prepare` on install
packages/engine/          the updatable surface — a workspace package, not published alone
packages/cli/             ds command — create / adopt / validate / update / migrate
templates/storybook-vite/ the copied-at-init surface
docs/                     requirements, contract, ADRs
plans/                    work plans and reports
update-logs/              dated change log
```

The workspace exists for development. What gets *installed* is the repo root — because git installs resolve the repository root and cannot address a subdirectory (ADR-007) — shipped as TypeScript source and compiled by `prepare` at install time (ADR-012). Nothing generated is committed. Engine and CLI stay separate modules with a real boundary between them; they simply ship as one artifact, and the CLI reaches the engine through a subpath import rather than a workspace link, which does not exist in an installed tarball.

Generated projects are outputs of this repo. Nothing here ships inside them except that one dependency and the template contents (as copied files).

## The engine / content boundary

This is the central decision. Everything about updating follows from it.

**Engine** — lives in `node_modules/story-cli-kit`, never edited in a generated project:

- Storybook preset (`main.ts` / `preview.tsx` factories)
- Token codegen: `tokens.json` → `src/styles/tokens.css`
- Validator rules and CLI
- Story templates and scaffolding generators
- Contract documentation shipped for agent reference

**Content** — copied at init, owned by the project, freely editable:

- `tokens.json`
- `src/components/**`
- `src/stories/**`
- `src/pages/**`, `src/styles/globals.css`, assets

**Generated** — machine-written, never hand-edited, safe to overwrite always:

- `src/styles/tokens.css`

The consequence: a generated project's `.storybook/main.ts` is three lines importing the preset. Structural changes to Storybook wiring ship as an engine bump and require no user action. Structural changes to the *taxonomy* are a different matter — see below.

### Why not put components in the engine too

Because the maintainer edits components per brand. A component that cannot be edited in place forces every brand difference through a variant API designed in advance, which is speculative abstraction and would fail on the first unanticipated brand. Copying components is the deliberate trade: harder updates, real freedom.

### Why not copy everything

Because Storybook config, codegen and validator rules are pure infrastructure that the maintainer has no reason to edit and every reason to receive fixes for. Copying them means every project is frozen at its init date, which is the current problem.

## Manifest

Every generated project carries `.designsystem/manifest.json`:

```jsonc
{
  "engineVersion": "1.4.0",     // engine version at last successful update
  "templateId": "storybook-vite",
  "createdWith": "1.2.0",
  "files": {
    // path -> checksum AS SHIPPED by the template at the recorded version
    "src/components/atoms/button/Button.tsx": "sha256-...",
    "src/stories/foundations/Tokens.mdx": "sha256-..."
  }
}
```

The manifest answers the only two questions an update needs: *which version is this project on*, and *which shipped files has the user modified*. A file whose current checksum differs from its manifest entry is user-modified. A file absent from the manifest is user-created and is never touched.

The manifest is the mechanism that makes "flag potential mismatch or data loss" possible. Without it, an updater can only overwrite blindly or do nothing.

## Update pipeline

One pipeline, one policy flag — not two modes. The four file categories:

| Category | Detection | Behaviour |
| --- | --- | --- |
| Engine | in `node_modules` | always updated by version bump |
| Generated | on generated list | always overwritten |
| Shipped, unmodified | in manifest, checksum matches | updated automatically |
| Shipped, modified | in manifest, checksum differs | **policy applies** |
| User-created | absent from manifest | never touched |

Only the fourth row varies. `--on-conflict=skip` (default) leaves the file and reports it. `--on-conflict=migrate` hands it to an agent with the release's migration notes.

Framing this as two whole modes would mean two code paths that must stay in sync. They would not stay in sync. Full detail: [update-and-migration.md](update-and-migration.md).

## Taxonomy changes

The hardest update case: the boilerplate's *structure* changes (a tier is renamed, stories move). This cannot be handled by file-level checksums because it is a whole-tree operation.

Such changes ship as a **named structural migration** in the engine — an explicit, versioned, reversible transform with its own notes, run separately from routine updates. They are expected to be rare and are a deliberate cost, not an automatic convenience.

## Token pipeline

Single hand-edited source, everything else generated:

```text
tokens.json  ──codegen──>  src/styles/tokens.css  ──@theme──>  Tailwind utilities
  anchors +      ramps                                      └─> CSS custom properties
  directives     expanded
```

Colour ramps are **derived at codegen, never materialised back** into `tokens.json`. The token file holds an anchor, a mode and any pinned overrides; the generated CSS holds the twelve steps. Writing ramps back would make `tokens.json` partly generated and destroy the single-hand-edited-source invariant this pipeline exists to protect.

Tailwind v4's `@theme` directive emits both the utility classes and the CSS variables from one declaration, so a single generated file serves both consumption paths. Verified against current Tailwind documentation.

This deliberately departs from the reference project, which maintains the same colour in three places (`tokens.json`, `globals.css` `:root`, `tailwind.config.ts`). That is a DRY violation and a live drift source. **No `tailwind.config.ts` in the template.**

`globals.css` remains hand-edited for font imports and base layer rules, and imports the generated `tokens.css`.

## Stack versions

Verified against the npm registry and vendor documentation on **2026-08-04**. Re-verify at every engine release; a version table with no verification date is worse than none, because it is trusted without being current.

| Package | Version | Note |
| --- | --- | --- |
| `react`, `react-dom` | 19.2.8 | |
| `vite` | 8.2.0 | |
| `@vitejs/plugin-react` | 6.0.5 | peers `@rolldown/plugin-babel`, `babel-plugin-react-compiler` are **optional** — not installed |
| `typescript` | 6.0.3 | **deliberately not 7.x** — see ADR-011 |
| `tailwindcss`, `@tailwindcss/vite` | 4.3.3 | `@theme` confirmed current; ADR-003 holds |
| `storybook`, `@storybook/react-vite`, `@storybook/addon-docs` | 10.5.6 | `react-vite` peers `vite ^5–^8` |
| `vitest` | 4.1.10 | |
| `eslint` | 10.8.0 | |
| `typescript-eslint` | 8.66.0 | peers `typescript >=4.8.4 <6.1.0` — the binding constraint |
| `prettier` | 3.9.6 | |

**Node: 24.12 or newer**, which is 24 LTS (active until 2028-04). Node 20 is end-of-life; Node 22 LTS is excluded deliberately.

The dependency floor alone would allow 22.13 — the intersection of Vite (`^20.19 || >=22.12`) and ESLint (`^20.19 || ^22.13 || >=24`). 24.12 was originally binding because the toolkit ran its own TypeScript through Node's native type stripping; ADR-012's rewrite (2026-08-05) removed that constraint, since what ships is now compiled JavaScript. The floor is **retained at 24 LTS as a choice** — it was already the recommendation, the audience is the maintainer's own projects, and one version to install is a better NFR5 instruction than a range. It is now revisitable on its own merits rather than dictated by another decision.

## Decisions

### ADR-001 — Hybrid distribution

Engine as npm package, components copied. Rejected: full package (blocks per-brand editing), pure copy (freezes infrastructure at init date). Accepted cost: conflicted-file updates need explicit resolution.

### ADR-002 — React + Vite only, first iteration

All four reference projects are Vite. Next.js needs a different Storybook framework package, routing decorator and image handling — roughly double the template surface. Deferred until the engine contract is proven against real projects. The engine is framework-agnostic by construction so a second template can be added without redesign.

### ADR-003 — Tailwind v4 CSS-first tokens

`@theme` in a generated CSS file. No JS Tailwind config. See token pipeline above.

### ADR-004 — Stories separated from components

`src/stories/**` mirrors `src/components/**` rather than co-locating `*.stories.tsx` next to each component. Co-location is the more common convention, but all three well-structured reference projects use separation, and it makes the story tree independently browsable and trivially validatable against the tier taxonomy. Consistency with existing work wins here.

### ADR-005 — Validator is deterministic, agent skill is a superset

The skill runs the script and treats its output as authoritative before adding semantic checks. A parallel agent-side reimplementation would eventually disagree with the script, and then neither would be trustworthy.

### ADR-006 — Colour ramps generated from an anchor, per-ramp colour mode

`$base` + `$anchor` + `$mode` (`oklch` | `hsl`) + optional `$overrides`, expanded at codegen. Rejected: hand-authored ramps as in the reference project — twelve values per colour, no stated relationship between them, and a rebrand means re-deriving every step by hand. Rejected: a single project-wide colour mode — a project routinely has one ramp that must match an existing spec (hsl) alongside others that should be perceptually even (oklch). Accepted cost: generated ramps are mathematically even, not automatically accessible; contrast remains a semantic `[S]` check.

### ADR-007 — Distributed from GitHub, not npm; `npx` scaffolds, the local install maintains

**There is no npm registry account and none is required.** Distribution is `npx github:joachimtrungtuan/story-cli-kit`. Verified against npm documentation, three facts make this viable:

- **`prepare` runs on git installs.** npm installs the package's devDependencies and runs `prepare` before packing and installing it, so TypeScript can be built at install time. Committed build artifacts are not inherently required.
- **Semver ranges work on git dependencies** via `#semver:^1.0.0` — npm matches tags in the remote much as it would a registry range. Generated projects get real version ranges, not pinned commits, so `update` keeps its semantics.
- **Subdirectories cannot be addressed.** A git URL installs the *repository root*. There is no `#path=packages/cli` equivalent.

The third fact is binding, and it is why the repo root — not `packages/cli` — is the installable artifact. The workspace survives for development; the root package declares the `ds` binary and ships the engine and templates alongside it. This does not reverse the monorepo decision: engine and CLI keep a real module boundary and separate directories, they simply install as one unit. There is no build and no bundle — see ADR-012.

Rejected: publishing built artifacts to a separate distribution repository or a release branch. It works and keeps the main tree clean, but it needs CI to stay honest and buys nothing while there is one maintainer.

Cost accepted: a generated project's dependency carries the CLI and templates alongside the engine, instead of the engine alone — megabytes of `node_modules` against not running a publishing pipeline. If the registry is ever adopted, the same bundle publishes unchanged, so this is reversible.

**`create` runs via `npx`** — nothing exists yet, so there is nothing local to run. `git clone` + local run is the contributor path for developing the toolkit, not a user install path.

**Every other command runs from the project's own devDependency**, added by `create`. `validate`, `update` and `migrate` must be version-locked to the project's engine. Running them via `npx` would fetch the *latest* CLI and point it at an older project — a newer updater reasoning about an older manifest, which is exactly the skew the manifest exists to prevent. The CLI detects this case (invoked transiently inside a directory that already has a manifest) and redirects the user to the local command rather than proceeding.

Rejected: separate `create-*` and maintenance packages. The split is real — a create package wants to stay tiny for a fast `npx`, while the maintenance CLI carries codegen, validator and migration logic. But one artifact is simpler to version and reason about, and the download happens once. Git-only distribution makes the split impossible anyway, since both would resolve to the same repository root.

**Naming:** repo `story-cli-kit`, package `story-cli-kit`, binary `ds`. The binary is short and generic, which is normally a collision risk — but ADR-007 installs it as a project-local devDependency rather than globally, so it lives in `node_modules/.bin` and is scoped to the project that owns it. The risk the short name would otherwise carry does not arise.

### ADR-008 — The generated project follows the user's package manager

`create` detects npm, pnpm or yarn — from the invoking `npm_config_user_agent`, then from what is on `PATH` — and generates scripts and a lockfile for that one. It never installs a package manager on the user's behalf.

Rejected: pnpm-only via `corepack enable`. It is what this repo itself uses and would be one install path to test instead of three. But it makes the first command a user runs a *prerequisite installation*, and corepack is exactly the kind of step that fails quietly behind a corporate proxy or a managed machine. That is the failure NFR5 exists to prevent, placed at the worst possible moment.

Accepted cost: three install paths to verify, and a generated project's lockfile differs by machine. The engine contract does not depend on the package manager, so this stays a `create`-time concern and never reaches the contract or the validator.

### ADR-009 — `create` initialises git and commits

NFR1 makes every rewrite of user-owned files depend on a clean tree and a recoverable previous state. A project that is not a repository cannot offer that, so `create` runs `git init` and makes one initial commit containing the scaffold. The user gets the guarantee without needing to know the mechanism, and the manifest's first entry corresponds to a real commit.

Missing git is reported as an instruction, not an error trace, per NFR5.

Rejected: a snapshot-directory fallback for users without git. It would mean two reversibility mechanisms — one battle-tested, one ours — and `update` would have to reason about both. The second path would be the less-tested one and would fail exactly when it mattered. One mechanism, clearly stated.

**When the target is already inside a git repository, the user chooses which repository holds the history — and is never left without one.** Both answers are legitimate. Using the enclosing repository is the default and the right answer for a design system living beside an application. An independent nested repository is the right answer when the directory is destined for its own remote, which is a real pattern and the reason submodules exist.

What is not negotiable is that the choice is made knowingly. A nested repository the parent neither tracks nor ignores is the failure case: work appears committed, the parent silently omits it, and reversibility is broken exactly where the user would never look. So `create` states which repository it detected, states the consequence of each answer, and — if an independent repository is chosen — reports what the parent needs (a submodule entry or a `.gitignore` line) rather than leaving the two repositories to quietly disagree.

This is where the non-technical goal stops bending. A user in an empty directory is never asked this question; it does not exist for them. A user inside an existing repository is asked once, with a default that is correct if they simply press enter. Reversibility is not something we trade away to save a prompt.

### ADR-010 — The scaffold owns the whole stack; a subfolder target is self-contained

`create` generates React, Vite, TypeScript and Tailwind v4 alongside the Storybook layer. The contract already requires that stack — ADR-002 fixes React + Vite, ADR-003 makes the token pipeline Tailwind v4's `@theme` — so a "Storybook-only" output would be a project that cannot run until the user assembles the rest by hand. There is no meaningful option to withhold it.

The install target is a path and nothing more. Root, a new subdirectory, or a nested path inside an existing repository all produce the same self-contained tree: its own `package.json`, its own source, its own Storybook config, its own manifest. A design system at `design-system/` inside a larger repo does not read the parent's config or depend on its dependencies.

Two things vary with the surroundings, and only two:

- **Git** — inside an existing repository the user is asked which repository holds the history, defaulting to the enclosing one (ADR-009).
- **Workspaces** — when the parent declares `pnpm-workspace.yaml` or `package.json#workspaces`, `create` reports that the new directory should be registered and prints the line to add. It does not edit the file. Rewriting configuration the user owns, in a repository we were invited into, is a larger liberty than the convenience is worth.

Adopting an existing React application in place is a **second supported mode**, `ds adopt`, specified in ADR-013. It was initially deferred as too large; the maintainer required it, so it is in scope and designed rather than bolted on.

### ADR-011 — TypeScript 6, not 7

TypeScript 7.0 is `latest` on npm (stable since 2026-07-08, Go-native compiler, roughly 10x faster builds). We pin **6.0.3** anyway.

TypeScript 7.0 ships without a stable programmatic API — the team expects it in 7.1. Two consequences land directly on this project:

- **`typescript-eslint@8.66.0` declares `typescript >=4.8.4 <6.1.0`.** TypeScript 7 is outside its supported range, so adopting it costs us type-aware linting.
- **MDX tooling cannot consume TypeScript 7 yet.** Our foundations documentation is `.mdx` and is part of the contract, not an optional extra.

Taking `latest` here would trade a build-speed win we do not need — these projects are small — for two things the contract actually depends on. Newest is not the same as current, and this is the case where they diverge.

Revisit when TypeScript 7.1 ships the stable API and `typescript-eslint` widens its peer range. Both are observable conditions, so this is a dated decision rather than an indefinite one. Node, React, Vite, Tailwind and Storybook all sit on their genuine latest.

### ADR-012 — The toolkit builds at install time, through `prepare`

*Rewritten 2026-08-05. The original decision — no build step at all, `bin` pointing at a `.ts` entry run through Node's native type stripping — was refuted. What follows replaces it; the refutation is kept because the reasoning error is repeatable.*

**Why the original is impossible.** Node's own documentation, on the same page that carries the stability claim the decision was made from:

> To discourage package authors from publishing packages written in TypeScript, Node.js refuses to handle TypeScript files inside folders under a `node_modules` path.

Type stripping is available for a project's *own* code and deliberately withheld from *installed packages*. No flag lifts it — `--no-strip-types` turns stripping off, not on. Every install path puts `bin.ts` under `node_modules`: the project devDependency directly, and `npx` by staging into `~/.npm/_npx/<hash>/node_modules/`. So the original ADR worked in a repo checkout and failed for every actual user, which is the worst possible shape for a defect. It is not a version gap and not a bug; it is policy, stable since 24.12.

The error was reading the type-stripping documentation for the stability claim and stopping there. Two later spikes probed the *consequences* of having no build without re-checking the premise — a spike does not substitute for reading the source of the claim it rests on.

**The decision.** `package.json` declares a `prepare` script that compiles the toolkit to JavaScript, and `bin` points at the compiled entry. npm installs the package's devDependencies and runs `prepare` before packing on **git installs** (ADR-007), so a `npx github:…` or a devDependency install gets built JavaScript without anything generated being committed.

This reverses the original ADR's rejection of `prepare`, which was that npm runs it silently and a first `npx` becomes a half-minute of apparent hang. That objection was correct and still stands — it is now simply the least-bad option, because the alternative it was rejected *in favour of* does not exist. Weighed against:

- **Committing the built JavaScript.** Fast installs, no hooks, but it contradicts the standing "never commit `dist/`" rule, puts generated files in every diff, and lets the shipped JS drift from the source it came from.
- **Writing the shipped code in JavaScript with JSDoc types.** Satisfies the no-build goal literally. Rejected because the pain concentrates exactly where this codebase is most typed — the token schema, the manifest, and update classification all lean on generics that JSDoc expresses badly.
- **Publishing to the npm registry.** Cleanest by a distance: build once at publish, ship JavaScript, no install hook, no artifacts in git. Rejected here only because it reverses ADR-007's "no npm account and none is required". ADR-007 already records that the same bundle publishes unchanged, so this stays the documented upgrade path if the install-time build proves as annoying in practice as it does on paper.

Consequences, accepted deliberately:

- **`--ignore-scripts` breaks the install.** The sharpest edge, and it is not hypothetical — `npm ci --ignore-scripts` is common corporate CI policy. `prepare` does not run, nothing is compiled, and `ds` is missing its entry point. The failure must be caught and explained rather than surfacing as a missing-file stack trace: if the compiled entry is absent, say that the install skipped build scripts and name the command that fixes it (NFR5).
- **Every install pays for a build**, including each CI reinstall of every generated project. This is a recurring cost borne by users, not a one-time cost borne by the maintainer — the inverse of the usual arrangement, and the strongest argument for the registry path later.
- **TypeScript is a real devDependency**, fetched at install time. Pinned per ADR-011.
- **Erasable syntax only** — retained. No enums, runtime namespaces, parameter properties, import aliases or decorators in toolkit source. None are wanted in a CLI, and keeping `erasableSyntaxOnly: true` preserves the option of dropping the build if Node's restriction is ever relaxed.
- **`tsc --noEmit` remains a distinct gate.** The build emits; it is not a substitute for checking, and CI runs both.
- **The Node 24.12 floor is now a choice, not a constraint.** It was binding only because type stripping needed it. The dependency floor alone allows 22.13. Retained at 24 LTS because that was already the recommendation, but it is now revisitable without touching anything else.

This applies to the toolkit only. Generated projects build normally through Vite.

### ADR-013 — `ds adopt` merges into an existing React source, and never overwrites silently

`create` writes into empty space. `adopt` writes into a tree someone else built, where every write is a potential act of destruction. The two share the template and the contract but not the write logic, because the safety obligations are entirely different.

**Every intended write is classified before anything happens.** Five outcomes, and the classification is the output of the dry run:

| Class | Condition | Behaviour |
| --- | --- | --- |
| `add` | no file at that path | written |
| `identical` | file exists, checksum matches ours | no-op |
| `merge` | file exists, additively mergeable (see below) | merged, additions listed line by line |
| `conflict` | file exists, differs, not mergeable | **never written** — reported, user resolves |
| `skip` | file exists and is the user's domain outright | untouched, reported |

Only `add` and `merge` write. `conflict` never resolves itself — there is no `--force`, for the same reason `update` has none: discarding someone's work is a `git checkout` away and should stay a deliberate human act.

**Mergeable means additive and structured**, never textual. `package.json` (dependencies, scripts), `tsconfig.json` (paths, compiler options we require), `.gitignore` (appended lines), `globals.css` (an `@import` of the generated tokens). Anything else — component files, `vite.config`, application source — is `conflict` or `skip`. A merge that cannot be expressed as "these specific keys or lines were added" is not a merge and is treated as a conflict.

**The dry run is not optional, it is the first half of the command.** `adopt` prints the full classification, then asks. Nothing is written before that answer. `--dry-run` exists to stop after printing, for scripted use.

**Compatibility gates run before classification**, and failure is a refusal with an instruction, not a partial adoption:

- React 19, and Vite as the bundler — Create React App, Next.js and webpack setups are out of scope (ADR-002), and saying so plainly beats half-working output.
- **Tailwind v4.** On v3 the token pipeline does not degrade, it does not exist (ADR-003, ADR-011). This gate is absolute.
- TypeScript present, within the ADR-011 range.

**Merged files are permanently user-owned.** The manifest records that `adopt` touched them, but they are never checksum-managed and `update` never rewrites them — it reports them as needing attention and stops there. A file we merged into is a file whose baseline "as shipped by us" does not exist, so the manifest's central question — *has the user modified this since we wrote it* — is unanswerable for it. Pretending otherwise would put the update pipeline's one reliable signal on a foundation it cannot support.

**Written record.** `adopt` leaves a report of every path and its classification in the project. NFR1 still applies in full: clean tree required, work on a branch, validator runs afterwards.
