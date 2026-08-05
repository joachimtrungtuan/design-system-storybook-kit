# Red team — failure modes, `story-cli-kit` implementation plan

Reviewer 2 of 2. Scope: runtime and operational failure modes only. Security findings excluded (Reviewer 1).
Target: `plans/260804-1648-story-cli-kit-implementation/**` against `docs/{requirements,architecture,design-system-contract,update-and-migration}.md`.
Date: 2026-08-04. 12 findings.

---

### [Critical] `ds update` never writes the manifest — the second update sees the whole tree as conflicted

**Where:** `phase-07-ds-update.md:59-68` (Related Code Files), `:30-42` (Requirements), `:84-96` (Success Criteria); contrast `phase-06-ds-create-and-ds-generate.md:65` and `phase-08-ds-migrate.md:53`.

**Failure scenario:** Phase 7 creates `manifest/classify.ts` and nothing else manifest-related. Phase 6 owns `manifest/{checksum,write,read}.ts`; Phase 8 and Phase 9 each declare `Modify: manifest/write.ts`; Phase 7 declares no modification and no write step. So: project at engineVersion 1.4.0, `ds update --to 1.5.0` runs, files are overwritten with 1.5.0 bytes, report written, exit. `manifest.json` still says `engineVersion: "1.4.0"` and still holds 1.4.0 checksums. Next `ds update`: every file just written by us now hashes to the 1.5.0 value while the manifest holds the 1.4.0 value → **checksum differs → conflicted**. The entire shipped surface is reported as user-modified work needing resolution, on a project where the user changed nothing. `--on-conflict=skip` then leaves the project permanently frozen. This is the exact "classification is subtly wrong" failure the phase names as its own top risk (`:100`), arriving through omission rather than through a bug.

**Smallest fix:** Add a pipeline step and a success criterion to Phase 7: after apply, rewrite the manifest — new `engineVersion`, recomputed checksums for every file actually written, `createdWith` preserved, untouched/conflicted entries carried forward unchanged. Add `Modify: packages/engine/src/manifest/write.ts` to the file list, and a criterion: "after a successful update, re-running classify on the result yields zero conflicts."

---

### [Critical] `ds update --to <version>` has no way to obtain the new version's template

**Where:** `phase-07-ds-update.md:31` (`--to <version>` flag), `:81` (step 10 — "`--to <version>` resolution against git tags"), `:64` (`baseline.ts` fetches the **old** tag only); `architecture.md:178` (ADR-007 — maintenance commands must not run via `npx`).

**Failure scenario:** `update` runs from the project's own devDependency, which *is* version 1.4.0. Its bundled `templates/storybook-vite` and `migrations/*.md` are 1.4.0's. Classification is defined (`:51`) as a function of "the manifest, the current tree and the incoming template" — but no code path produces a 1.5.0 template. `baseline.ts` fetches the old tag; nothing fetches the new one. User runs `ds update --to 1.5.0`: either the command writes 1.4.0 bytes while recording 1.5.0 (silent no-op update, manifest now lies about the version — worse than failing), or `--to` resolves a git tag and then has nothing to do with it. Running the newer CLI via `npx` to get the new template is exactly what ADR-007 forbids. The prerequisite — the user must first bump the devDependency, *then* run the local `ds update` — appears nowhere in the plan or in `update-and-migration.md`.

**Smallest fix:** State the invariant in Phase 7: the incoming template is always the one inside the currently-running toolkit. Redefine `--to` as either (a) an assertion that refuses unless the installed toolkit version matches, printing the exact `npm install github:…#semver:^1.5.0` line, or (b) a tag fetch of the *new* version through the same `baseline.ts` machinery. Pick one; do not leave both readings open.

---

### [Critical] `create` commits without checking git identity — the failure lands after the whole project is written

**Where:** `phase-06-ds-create-and-ds-generate.md:24` (gates: "Node ≥ 24.12, git present, target empty or safe"), `:53` (order), `:49` (rollback), `:93` (criterion: "Missing git produces an instruction … with no partial project written"); `architecture.md:194-196` (ADR-009).

**Failure scenario:** Gates check that git is *present*, never that `user.name` / `user.email` are set. Fresh macOS with Xcode Command Line Tools — precisely the "installed Node and nothing else" audience Phase 6 step 9 exists to test — has `git` on PATH and no identity. The order is `copy → codegen → manifest → git init and commit → install`, so the failure occurs after every file is on disk: `git commit` exits 128 with *"Author identity unknown … Please tell me who you are."* Two bad outcomes and no third: rollback fires and deletes a complete, working project because a commit failed; or rollback's "if `git init` already ran … stop and report" branch (`:49`) leaves a project with an initialised repo, no commit, no `node_modules`, and a raw git stderr on screen — violating NFR5 and ADR-009's reversibility guarantee simultaneously. The same class covers `init.defaultBranch` warnings and a `commit.gpgsign=true` global with no key present, which fails identically.

**Smallest fix:** Move identity to the gate list in Phase 6 (`:24`): git present **and** `user.email`/`user.name` resolvable, checked before any write, failing with the `git config --global user.email …` instruction. Add the criterion: "git installed but unconfigured is refused at the gate, with nothing written."

---

### [High] `create` into an enclosing repository commits the user's unrelated work in progress

**Where:** `architecture.md:200-204` (ADR-009 — enclosing repository is the default answer); `phase-06-ds-create-and-ds-generate.md:24` (gate list has no clean-tree check), `:27`, `:76` (step 5 — "Git handling: `init`, initial commit, and the nested-repository branch").

**Failure scenario:** User has an application repo with uncommitted work across several files. They run `ds create design-system/` inside it and press enter, taking the documented default: the enclosing repository holds the history. `create` must now make ADR-009's initial commit *in the user's repo*. Phase 6 never states the staging scope, and it never gates on a clean tree — clean-tree preflight is specified only for `update` (`phase-07:33`), `migrate` (`phase-08:24`) and `adopt` (`phase-09:41`). A `git add -A && git commit` sweeps the user's in-flight work into a commit labelled as the design-system scaffold. If instead only the scaffold path is staged, the user's *staged-but-uncommitted* index entries elsewhere are still consumed by the commit. Either way the user's history is rewritten by a scaffolding command, and NFR1 — the guarantee ADR-009 exists to deliver — is broken in the one mode where a pre-existing state was there to protect.

**Smallest fix:** Add to Phase 6's gates: when the chosen history is an enclosing repository, require a clean tree (same check `update` uses) and refuse with an instruction otherwise. Specify path-scoped staging (`git add -- <target>`) in step 5, and add a criterion: "create into a dirty enclosing repository is refused; the user's index and worktree are unchanged."

---

### [High] Checksum normalisation is introduced in Phase 7 but not in Phase 6 — every project created before it sees universal false conflicts

**Where:** `phase-07-ds-update.md:102` ("Normalise before hashing and record the normalisation in the manifest format so it stays stable across versions"); `phase-06-ds-create-and-ds-generate.md:72` (step 1 — "sha256 per file, stable ordering", no normalisation); `architecture.md:58-68` (manifest example: no schema/normalisation field).

**Failure scenario:** Phase 6 ships `create`, writing raw-byte sha256 into `manifest.files`. Phase 7 then decides hashing must normalise line endings and trailing newlines. Every project created between those two releases carries raw-byte checksums. The Phase 7 classifier normalises before comparing, so for any file whose stored hash was computed over CRLF or a missing trailing newline, `normalise(current) ≠ stored` → **conflicted**. On a first update the user sees dozens of conflicts on files they never opened; under the default `skip` policy nothing is written and the project silently stops receiving engine updates. The manifest carries no version or normalisation field (`architecture.md:59-68`), so no code path can even detect which hashing scheme produced a given manifest — the failure is undiagnosable from the artefact.

**Smallest fix:** Move the normalisation decision into Phase 6 step 1 so `create` and `classify` hash identically from the first release. Add a `manifestVersion` (or `checksumAlgorithm`) field to the manifest shape in Phase 6, and to `architecture.md`'s example, so a mismatch is a stated refusal rather than a wall of false conflicts.

---

### [High] The validator needs the TypeScript compiler API; the toolkit declares one runtime dependency and it is not TypeScript

**Where:** `phase-03-validator.md:63` ("use the TypeScript API, since it is present anyway"), `:74` (`snapshot.ts` — "one TypeScript program"); `phase-01-toolkit-skeleton.md:55` (`dependencies: { "@clack/prompts": "^<current>" }`); `plan.md:74` ("`dependencies: @clack/prompts` — the only runtime dep"); `phase-10-release-ci-and-distribution.md:24` ("`ds validate` against the template").

**Failure scenario:** "Already a dependency of every generated project" is true of the *project*, not of the toolkit — and the engine is the thing doing the importing. Three concrete breakages: (1) `create` runs `ds validate` at the tail (`phase-06:31`) from the `npx` process, where `node_modules/typescript` in the just-created project may not yet exist (`--no-install`) and, when it does, `import ts from "typescript"` inside `node_modules/story-cli-kit/packages/engine/**` resolves against the *toolkit's* dependency tree, not the project's; (2) `phase-10:24`'s CI job validates `templates/storybook-vite`, a directory that is never installed, so no `typescript` is resolvable at all; (3) `phase-08:61` reuses the same parsing machinery for import rewriting, inheriting the failure. Rules 3 and 11 crash with `ERR_MODULE_NOT_FOUND`, taking the whole `validate` run with them — and rule 9 is the contract's self-declared "single most important rule" (`design-system-contract.md:65`).

**Smallest fix:** Decide the resolution strategy in Phase 3 explicitly: either add `typescript` to the toolkit's `dependencies` (a second runtime dep — record it against `plan.md:24`), or resolve it from the target project via `createRequire(projectPath)` with an actionable refusal when absent. Add a criterion: "`ds validate` succeeds from a tarball install against a project whose `node_modules` is absent, or refuses with an instruction."

---

### [High] `ds generate` mutates a manifest-tracked barrel — the blessed way to add a component guarantees a permanent update conflict

**Where:** `phase-06-ds-create-and-ds-generate.md:35` ("writes the component directory, `index.ts`, **the tier barrel entry** and the mirrored story file"); `design-system-contract.md:59` (tier `index.ts` is contract-required, hence template-shipped); `requirements.md:101` (NFR4); `phase-07-ds-update.md:33` (checksum differs → conflicted).

**Failure scenario:** `src/components/atoms/index.ts` ships in the template and is therefore recorded in the manifest with its as-shipped checksum. `ds generate atoms my-thing` appends an export line to it — the correct, documented, NFR4-sanctioned action. The file's checksum now differs from the manifest. On the next `ds update`, the tier barrel classifies as **conflicted**. Every project that ever adds a single component acquires a permanent conflict on all four tier barrels, forever, on every release — for doing the one thing the toolkit exists to make easy. Under `skip` the barrel never receives engine changes again; under `migrate` an agent is invoked to reconcile an append-only list of exports, which is machine-decidable and should never have reached an agent.

**Smallest fix:** Name barrels as a distinct manifest class in Phase 6/7 — append-managed, not checksum-managed — updated by structured line merge (the same additive rule ADR-013 already applies to `.gitignore`) rather than classified. Add the criterion: "a project with one generated component reports zero conflicts on update."

---

### [High] `--dry-run` creates a branch and regenerates a file, and the criterion that would catch it cannot

**Where:** `phase-07-ds-update.md:33` (preflight "create branch `ds-update/<version>`"), `:43` ("`--dry-run` performs preflight through regeneration and reports, **writing nothing**"), `:88` (criterion: "verified by comparing the tree hash before and after"); `update-and-migration.md:45,52,57` (same 1–4 span).

**Failure scenario:** The stated dry-run span is self-contradictory at both ends. Step 1 creates a git branch — a ref write. Step 4 regenerates `src/styles/tokens.css` — a file write. So `ds update --dry-run` on a project whose `tokens.json` was edited overwrites `tokens.css` in the working tree, and leaves a `ds-update/1.5.0` branch behind. The verification gap is the second half: a git **tree hash** is unchanged by branch creation, and — if the regenerated `tokens.css` happens to be identical or is gitignored — unchanged by the regeneration too. The criterion passes while the invariant is violated. The user then runs `--dry-run` a second time and hits either a branch-already-exists failure or a silent checkout of a stale branch, on the invocation the docs call "the expected first invocation" (`update-and-migration.md:57`).

**Smallest fix:** Split preflight in Phase 7: validation (clean tree, version resolution) runs under `--dry-run`; branch creation moves to the apply stage. Compute regeneration **in memory** for the dry run and diff, never write. Restate the criterion as a filesystem + `git branch --list` comparison, not a tree hash.

---

### [High] `baseline.ts`'s containment check fails on macOS's symlinked temp root — `migrate` never works on the maintainer's own machine

**Where:** `phase-07-ds-update.md:23` ("a `mkdtemp` under the OS temp root … Extraction is confined to that directory — an archive entry escaping it is refused, not sanitised"), `:79` (step 8 test: "an archive entry containing `..` is refused").

**Failure scenario:** On macOS `os.tmpdir()` honours `$TMPDIR`, which is a per-user `/var/folders/…` path — and `/var` is itself a symlink to `/private/var`. The containment check compares a resolved entry path against the `mkdtemp` prefix. If the prefix is kept as returned (`/var/folders/x/…/ds-baseline-ab12`) while each entry is checked with `fs.realpath` (the only correct way to catch a symlinked escape), every entry resolves to `/private/var/folders/…` and fails the `startsWith` test. Result: `ds update --on-conflict=migrate` refuses **every** archive entry as an escape attempt, on 100% of runs, on macOS — the maintainer's platform. The phase's own tests would not catch it: step 8 tests only the `..`-containing entry (which fails correctly, for the wrong reason) and the cleanup, never the happy path of a benign entry being *accepted*.

**Smallest fix:** Specify in Phase 7 that both sides of the containment comparison are `fs.realpath`-resolved before comparison, and add the missing test to step 8: "a benign archive entry extracts successfully into the temp directory" — the positive case, without which the negative cases prove nothing.

---

### [High] Two success criteria require validating a template that cannot be installed or validated

**Where:** `phase-10-release-ci-and-distribution.md:24` ("CI … `ds validate` against the template"); `phase-05-neutral-template.md:102` (`package.json` "with `{{placeholders}}` for name and package-manager scripts"), `:49` ("no committed generated file"), `:120` (step 10 — "Full run: install, start Vite, start Storybook, `ds validate`. All four must succeed **from a clean copy**"), `:125` and `:130`; `design-system-contract.md:80` (rule 15).

**Failure scenario:** Three ways this fails as written. (1) `npm install` in a clean copy of `templates/storybook-vite` aborts — `"name": "{{projectName}}"` is not a legal npm name (`{`/`}` are not URL-safe), so step 10 cannot begin. (2) Rule 15 requires `src/styles/tokens.css` to match codegen output; `:49` forbids committing generated files, so the template has no `tokens.css` and rule 15 fails permanently on the template — while `:125`/`:130` simultaneously demand zero violations and a current, generated `tokens.css`. (3) Rules 22/23 require `.storybook/main.ts` to import the engine preset by bare specifier, which does not resolve inside an uninstalled directory. The CI job at `phase-10:24` therefore fails on day one, and Phase 5's central acceptance criterion is unreachable by the route it names.

**Smallest fix:** Restate both as validation of a *materialised* project: CI and Phase 5 step 10 run `ds create` into a temp directory and validate that, never `templates/storybook-vite` in place. Note in Phase 5 that the template is validated only through `create`, since placeholders and the generated `tokens.css` make in-place validation meaningless.

---

### [Medium] The "generated" file category exists in three documents with three different definitions

**Where:** `architecture.md:79-85` (five-row table, including "Generated | on generated list | always overwritten"); `update-and-migration.md:47-51` (four bullets, no generated row); `phase-07-ds-update.md:33` (four named categories — new / unmodified / conflicted / user-created) versus `:86` ("Classification correct for **all five** categories"); `phase-06:53` (manifest written after codegen, from files on disk).

**Failure scenario:** No phase defines what the "generated list" is or who owns it, and no phase says whether `src/styles/tokens.css` appears in `manifest.files`. Both readings break. **In the manifest:** the user edits `$base` in `tokens.json` and regenerates (rule 15 compels them to), so `tokens.css` no longer matches its recorded checksum → classified **conflicted** → reported to the user as their own modified work on a file `architecture.md:42` calls "machine-written, never hand-edited, safe to overwrite always". Every project, every update. **Absent from the manifest:** classified **user-created → never touched**, directly contradicting step 4's unconditional regeneration. Phase 7's success criterion asks for five categories against a requirement listing four, so the test suite cannot even be written to a fixed target.

**Smallest fix:** Add the fifth category explicitly to Phase 7's requirement list, with the generated-file list as engine-owned data (currently: `src/styles/tokens.css`), excluded from `manifest.files` and always regenerated. Reconcile `update-and-migration.md:47-51` in the same change.

---

### [Medium] Files `adopt` classifies as `conflict` can never converge — validate fails forever and `update` will not deliver them

**Where:** `phase-09-ds-adopt.md:33` (`conflict` — "**never written**"), `:34` (`skip`), `:51` ("`update` reports them and stops, permanently"), `:86` ("`ds validate` runs after adoption and its result is reported honestly, including failure"); `phase-07-ds-update.md:33` (absent from manifest → user-created → never touched); `design-system-contract.md:141` (rule 22).

**Failure scenario:** An existing app already using Storybook is adopted. Its `.storybook/main.ts` exists, differs from ours, and is not additively mergeable → `conflict` → never written. The file is absent from the manifest (we never wrote it), so `ds update` classifies it **user-created** and never touches it either. Contract rule 22 fails on every subsequent `ds validate`, permanently, with no command in the toolkit able to resolve it — `adopt` cannot (no `--force`, correctly), `update` cannot (user-created), and re-running `adopt` reproduces the same conflict. The user is left with a project the toolkit declares non-compliant and offers no path out of. The plan's only response is `:96`, "adoption is a merge, not a guarantee", which describes the state without providing an exit.

**Smallest fix:** Have `adopt`'s report emit, per `conflict` entry, the concrete resolution step (the file to delete or the lines to move) plus the exact re-run command, and record conflicted paths in the manifest as `unresolved` so a second `adopt` can reclassify them as `add` once the user has cleared the path. Add a criterion: "every `conflict` entry in the report carries a stated route to resolution."

---

## Unresolved questions

1. **Exit codes are undefined across every command.** `phase-07:37` requires `ds validate` to run after `update` and its failures to be reported — but not whether `ds update` then exits non-zero. Same silence in `phase-08:27` ("reported as failed") and `phase-09:86`. `phase-10:56`'s CI end-to-end job depends entirely on exit codes. Needs one exit-code table owned by Phase 1.
2. **Does `create` invoke `ds validate` as a subprocess or in-process?** If a subprocess, Phase 1's npx-misuse guard (`phase-01:33`) fires — the directory now has a manifest and the toolkit is running transiently — and the freshly created project reports the local-command redirect, contradicting `phase-06:91`.
3. **Who commits the result of `update` / `migrate`?** Both create a branch and write to it; neither states a commit. If nothing commits, a user cannot run `migrate` after `update` (dirty tree refusal, `phase-08:24`) and no message says why.
4. **"Target empty or safe" (`phase-06:24`) is never defined.** On macOS a directory a user merely opened in Finder contains `.DS_Store`. Needs an explicit ignore list or the gate is a coin flip.
5. **Phase 9 says it reuses Phase 7's classifier (`:47`), but `adopt` has no manifest to read.** Phase 7 asks "does this differ from the recorded shipped checksum"; `adopt` asks "does this differ from the current template's checksum". Reuse without forking requires a shared signature neither phase specifies.
