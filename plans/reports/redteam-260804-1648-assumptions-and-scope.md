# Red team — assumptions and scope

Adversarial review of `plans/260804-1648-story-cli-kit-implementation/`. Angle: unverified load-bearing assumptions, wrong-by-a-factor effort, unowned scope, requirements with no phase, and phases whose acceptance depends on later phases. Security and runtime/partial-failure findings are out of scope here — covered by `redteam-260804-1648-security-adversary.md` and `redteam-260804-1648-failure-modes.md`.

Versions checked against the live registry 2026-08-04: `typescript@6.0.3`, `tailwindcss@4.3.3`, `react@19.2.8`, `vite@8.2.0`, `vitest@4.1.10`, `@storybook/react-vite@10.5.6` all resolve. `@clack/prompts` is 1.7.0, `motion` 12.43.0, `@phosphor-icons/react` 2.1.10 — none named with a version in the plan. Node 24.12.0 exists. The stack table is not the problem.

---

### [Critical] Node refuses to run TypeScript under `node_modules` — ADR-012 has no working install path, and the Phase 1 spike asks the wrong question

**Where:** `phase-01-toolkit-skeleton.md:17-25` (the spike), `:81` (success criterion), `docs/architecture.md:234-236` (ADR-012), `:178` (ADR-007, "Every other command runs from the project's own devDependency").

**The assumption / gap:** ADR-012 states "`bin` points at a `.ts` entry and nothing is compiled". Phase 1's spike treats this as settled and asks only *how `bin.ts` imports `packages/engine/src/*`*. Node's own documentation (nodejs.org/api/typescript.html, Stability 2 — Stable since 24.12.0) says the opposite of what the ADR needs:

> "To discourage package authors from publishing packages written in TypeScript, Node.js refuses to handle TypeScript files inside folders under a `node_modules` path."

Every path that runs `ds` puts the package under a `node_modules` path: the project devDependency (`node_modules/story-cli-kit/packages/cli/src/bin.ts`), and `npx`, which stages the package into `~/.npm/_npx/<hash>/node_modules/<pkg>` before executing its `bin`. The Phase 4 spike (`phase-04:19-21`) asks a narrower version of the same question about Storybook loading the preset — its answer is already known and it is "no", for the Node half *and* for `ds` itself.

**Why it breaks:** `npx github:joachimtrungtuan/story-cli-kit create` — Goal 1, and Phase 10's first success criterion — cannot execute. Neither can `ds validate` from a generated project. All three of Phase 1's candidate answers (subpath imports, relative imports, postinstall link) are about resolution *between* toolkit modules and none of them changes the fact that the entry file is a `.ts` under `node_modules`. Phase 1's criterion "`ds --help` runs from a tarball install and from a git install, with no build step" is unachievable as written, and it gates all nine remaining phases.

**Smallest fix:** Do not run the spike as designed — it has a documented answer. Take it to the maintainer now as an ADR-012 amendment with the two options that survive: (a) a `prepare`-built `dist/` (which ADR-012 rejected on first-run-latency grounds, and the standing git rules reject committing), or (b) hand-written `.js` for the shipped surface only. Option (b) is already pre-decided in `phase-04:32` for the preset's Node half — the finding is that it must apply to `bin.ts` and every engine module the CLI touches, i.e. the whole toolkit, which is a build step by another name. Resolve before Phase 1 step 2.

---

### [High] Phase 3's acceptance requires the Phase 4 preset, and Phase 7's requires the Phase 9 adopt — two criteria that cannot pass in their own phase

**Where:** `phase-03-validator.md:6` (`dependencies: [1, 2]`), `:44-45` (rules 22–23), `:84` (build the compliant fixture first), `:98` (criterion: exits zero on the compliant fixture). `phase-07-ds-update.md:40`, `:94` ("Adopt-merged files are reported and never rewritten"), `phase-09-ds-adopt.md:73`.

**The assumption / gap:** Rule 22 requires `.storybook/main.ts` to *import the engine preset*; rule 23 the same for `preview.tsx`. Phase 3's compliant fixture must therefore import a preset entry point that Phase 4 creates (`phase-04:64`, `exports` map). Phase 3 does not depend on 4. Symmetrically, Phase 7 acceptance asserts behaviour over a manifest mark that only `adopt` writes (`phase-09:63`, "Modify: `manifest/write.ts` — the merged-file marking"); Phase 7 itself admits it, "even though `adopt` is built later" (`:40`), but still lists the untestable assertion as a checkbox.

**Why it breaks:** Phase 3 cannot exit zero on its own fixture, so either the phase reports done against a failing criterion or rules 22–23 get stubbed — and a stubbed rule in a validator is exactly the "rule that exists only in prose" the project bans. Phase 7's criterion is verified by nobody: Phase 7 cannot produce the mark, and Phase 9's criteria (`phase-09:85`) assume Phase 7 already honours it.

**Smallest fix:** Move Phase 4 before Phase 3 (it already declares `dependencies: [1]` and the plan calls it independent of 2 and 3 — see next finding for the correction), so the preset exists when the fixture is written. For Phase 7, define the manifest's `merged` field in Phase 6's manifest module, seed a fixture manifest with a merged entry in Phase 7, and move the end-to-end assertion to Phase 9's criteria.

---

### [High] "Phase 4 is independent of 2 and 3" is stated as fact and contradicted by Phase 4's own architecture

**Where:** `plan.md:66`, against `phase-04-storybook-preset.md:6` (`dependencies: [1]`), `:41`, `:47` ("Every colour it emits comes from parsed tokens (Phase 2)"), `:54`, `:62` (`surfaces.ts` — token-derived background list), `:71`.

**The assumption / gap:** The sequencing rationale asserts Phase 4 can be built at any point after Phase 1. Phase 4's own requirements make `surfaces.ts` a consumer of Phase 2's parsed token structure, and its success criterion `:81` is "preview background list is generated from `tokens.json`".

**Why it breaks:** If the plan's parallelism claim is acted on — Phase 4 pulled forward as filler while Phase 2 is unfinished — `surfaces.ts` gets its own token reader, and there are then two parsers for `tokens.json` that must agree. That is the exact duplication the plan forbids in Phase 3 (`phase-03:48`) and Phase 9 (`phase-09:47`).

**Smallest fix:** Change `phase-04` frontmatter to `dependencies: [1, 2]` and delete the "independent of 2 and 3" sentence in `plan.md:66`. One line each.

---

### [High] The template's `{{placeholders}}` have no renderer, and rendering silently breaks manifest classification

**Where:** `phase-05-neutral-template.md:100` ("`templates/storybook-vite/package.json` — with `{{placeholders}}` for name and package-manager scripts"), `phase-06-ds-create-and-ds-generate.md:53` (fixed order: copy → codegen → manifest), `:51` ("Checksums are computed from the files on disk after copy"), `phase-09:59-60`.

**The assumption / gap:** Phase 5 introduces a templating syntax. No phase owns a renderer: Phase 6's file list (`:59-67`) has `plan.ts`, `apply.ts`, `prompts.ts`, `install.ts`, `manifest/*` and no substitution module; its step list (`:71-81`) says "copy", never "render". Phase 9 copies the same template into an existing app and never mentions placeholders at all. Nor is it specified which files may carry placeholders, or what escapes an unmatched `{{...}}`.

**Why it breaks:** Two consequences, both unowned. (1) The work itself — a copy-with-substitution pass, its placeholder inventory, and the ADR-008 branch that emits npm/pnpm/yarn script bodies — is real work hidden inside the word "copy". (2) Worse: Phase 6 records the checksum of the *rendered* file, while `update` (`phase-07:33`) compares that checksum against the *unrendered* template of the new version. Every placeholder-bearing file — starting with `package.json`, which carries the toolkit's own dependency range — is classified conflicted on the first update of every project, forever, with no user modification involved.

**Smallest fix:** Add a `create/render.ts` to Phase 6 with an explicit placeholder inventory, and add one line to the manifest format: placeholder-bearing paths are recorded as rendered and classified by comparing *rendered* new-template output, not raw template bytes. Both decisions belong in Phase 6, before any project exists to be mis-classified.

---

### [High] Brand surfaces are consumed by Phase 4, defined by nobody, and rule 24 will reject them

**Where:** `docs/design-system-contract.md:144` ("Brand surfaces … are declared in `tokens.json` and consumed by the preview"), `:88-97` (the token-structure group list), `phase-04:41`, `:54`, `:62`, `phase-05:38-45` (template `tokens.json` requirements), `:57-67` (the group naming table), `phase-03:46` (rule 24).

**The assumption / gap:** The contract requires surfaces in `tokens.json`, and Phase 4 builds `surfaces.ts` from them — but the contract's own group list does not contain a surfaces group, Phase 2's schema requirements (`phase-02:20-27`) never mention one, Phase 5's neutral `tokens.json` requirements never mention one, and the 2026-08-04 group-naming table adopts five reference groups without adding it. Nothing anywhere states the shape: is a surface a colour reference, does it carry an explicit light/dark flag (`phase-04:92` says allow the token file to state it), where does it live.

**Why it breaks:** Phase 4's success criterion `:81` cannot be met against a template that has no surfaces to read. And whatever key is eventually invented must clear rule 24 — `surface` is not a Tailwind `@theme` namespace, so it lands on the camelCase fallback as a *token* group even though a surface list is closer to configuration, which the same table routes to `$meta` (`phase-05:65-66`). The rule was written without this case in mind.

**Smallest fix:** Decide the surfaces key and shape in Phase 2's schema (one paragraph), add it to the contract's token-structure list and to the Phase 5 naming table in the same change the rest of rule 24 lands, and add a fixture. Otherwise Phase 4 invents it and the contract documents it afterwards — the inversion `phase-05:111` explicitly forbids.

---

### [High] Phase 5 at 4–6 days is off by roughly 2–3x

**Where:** `phase-05-neutral-template.md:5` (`effort: "4-6d"`), `:76-80` (component set), `:41`, `docs/requirements.md:127-129` ("Example components ship complete … all size variants, all interaction states (default, hover, active, focus, disabled), all tone/style variants — each documented in its story").

**The assumption / gap:** The named set is 10 atoms + 3 molecules + 2 organisms + 1 template + 1 page = **17 components**, each required to be complete across sizes, states and tones, each with a story documenting every one of those, and each passing the validator (`:115`, run after every component). Plus, in the same phase: the full token translation from `win-ui-layout` including per-ramp re-derivation and a diff against hand-authored twelve-step scales (`:112`), neutralisation of every value (`:113`), six MDX documents of which three are "generated from tokens" (`:118` — that is codegen work, not prose), the `.storybook` wiring, and a contract-plus-validator change for rule 24 landed first (`:111`).

**Why it breaks:** At the completeness bar the requirements set, a component with its full-surface story is half a day at best; 17 of them is 8–9 days before any of the token, MDX or contract work. The phase's own note "this is why the phase is 4–6 days and not 2" (`:94`) reasons from the completeness rule to a number that the same rule contradicts. Since Phases 6, 9 and 10 all gate on the template, a 2x slip here is a 2x slip in the release.

**Smallest fix:** Either re-estimate to 10–14d, or cut the component set to the number that fits: 4–5 atoms, 1 molecule, 1 organism, 1 template, 1 page. Breadth is explicitly the tradeable dimension (`requirements.md:129`, "Breadth stays deliberately small … the reference value comes from depth"); the estimate is not.

---

### [High] Phase 3's "compliant fixture project" is a second template, built before the template

**Where:** `phase-03-validator.md:5` (`effort: "2-3d"` — note the plan's own table and the brief both say 3d; the file says 2–3), `:84` ("Build the compliant fixture project first — a minimal tree satisfying all 24 rules"), `:23-46` (the rule table), `:91` (run against `win-ui-layout`).

**The assumption / gap:** "A minimal tree satisfying all 24 rules" is not a fixture directory. To pass rule 15 it needs a real `tokens.json` and a real codegen-produced `tokens.css`. To pass rule 20 it needs five foundations MDX files; rule 21, an `Introduction.mdx`; rules 9–11, a component *and* a conforming story in each tier exercised; rules 22–23, Storybook config importing a preset that does not exist yet. That is the Phase 5 deliverable in miniature, and it is step 1 of a 2–3 day phase that also has to implement 24 rules — several of them non-trivial (rule 3 and 11 over the TypeScript compiler API, rule 9's component→story coverage mapping which needs symbol resolution from a story's `component:` property back to a module, rule 14's tokenised-property list derived from parsed tokens), each with a passing and a seeded failing fixture (24 × 2 fixtures), plus `--json` report shape, plus the contract sync at `:92`.

**Why it breaks:** 24 rules + ~48 fixtures + a compiler-API integration + a miniature compliant project + a contract edit is a week, not two to three days. And building the miniature project twice — once here, once as Phase 5 — is duplicated work the plan does not acknowledge.

**Smallest fix:** Re-estimate to 5–7d, and make the fixture explicitly the seed of `templates/storybook-vite/` rather than a throwaway under `validator/__fixtures__/` (`:77`), so Phase 5 extends it instead of rebuilding it. That also removes the Phase 5 step-4 "scaffold the directory layout empty and run `ds validate`, expect a wall of violations" (`:114`) — the wall was already climbed.

---

### [High] Requirements criterion 5, FR2 and FR3's agent skill have no phase

**Where:** `docs/requirements.md:121` ("A fresh AI agent, given only the repo and the governance files, produces a component indistinguishable in structure from one the maintainer wrote" — `:123`: "Criterion 5 is the real test"), `:58-64` (FR2 Adapt, FR3's skill), `docs/architecture.md:31` ("Contract documentation shipped for agent reference" is engine surface), `:154-156` (ADR-005). Grep of all ten phase files returns exactly six hits for skill/CLAUDE/AGENTS/governance and every one is a passing reference, not a deliverable.

**The assumption / gap:** Three things the docs require are owned by no phase: (1) the generated project's governance files — a generated project gets no `CLAUDE.md`/`AGENTS.md`, and Phase 5's file list (`phase-05:98-107`) does not include them; (2) the contract documentation shipped into `node_modules` for agent reference, which architecture.md lists as engine surface and no phase creates; (3) the FR3 agent skill itself — Phase 3 produces `--json` "for the agent skill to consume" (`phase-03:56`, `:89`) and the skill is never built, so every `[S]` rule in the contract is unenforced by anything at the end of Phase 10.

**Why it breaks:** The project's stated real test cannot be run at the end of the plan, because the governance files it hands the agent do not exist. FR2 has no implementation at all. NFR2 ("a person can perform every operation manually by reading the docs", `requirements.md:99`) is in the same position — Phase 10 writes a README and a release checklist (`phase-10:46-47`) and no manual procedure for create/update/adopt.

**Smallest fix:** Add the generated project's `CLAUDE.md`/`AGENTS.md` and the shipped contract copy to Phase 5's deliverables (they are template content and belong there). Either add an eleventh phase for the FR3 skill or state explicitly in `plan.md` that the skill and the `[S]` rules are out of scope for this plan — the current silence reads as coverage.

---

### [Medium] The manifest schema is extended by four phases and versioned by none

**Where:** `docs/architecture.md:58-69` (the schema: `engineVersion`, `templateId`, `createdWith`, `files`), `phase-06:72` (writes it), `phase-07:102` ("record the normalisation in the manifest format"), `phase-08:66` ("Record applied migrations in the manifest"), `phase-09:63` (merged-file marking), plus this report's placeholder finding.

**The assumption / gap:** Four later phases each add a field to a schema that carries no version number and has no owning module spec. Phase 6 creates `manifest/{checksum,write,read}.ts` and Phases 7, 8 and 9 all modify `write.ts`.

**Why it breaks:** A project created at Phase 6 and updated after Phase 9 meets a reader expecting fields its manifest does not have, with no version discriminator to branch on — and the manifest is the single artefact the whole safety story rests on. The failure is silent: a missing `merged` map reads as "no merged files", which is exactly wrong for an adopted project.

**Smallest fix:** Add `"manifestVersion": 1` and the full field set — including the fields Phases 7–9 will need — to Phase 6's writer, with a reader that refuses an unknown version by instruction. One field now, no migration later.

---

### [Medium] `ds generate` is a sixth command no requirement asks for

**Where:** `phase-06-ds-create-and-ds-generate.md:35-37`, `:79`, `:94`; `phase-01:76` ("stubs for all six commands"). Against `docs/requirements.md:38-95` (FR1, FR1b, FR2, FR3, FR4, FR5, FR6 — create, adopt, validate, update, migrate), `docs/architecture.md:5` ("`ds` command — create / adopt / validate / update / migrate"), and `plan.md:15`, which itself says "all five `ds` commands".

**The assumption / gap:** `generate` appears in no requirement, no ADR and no contract rule. The nearest hook is NFR4, which is a *ceremony* constraint ("adding a component must not require touching more than its own folder, its story, and the relevant barrel") — satisfied by the taxonomy, not by a generator. FR2 assigns component authoring to an agent working under the contract.

**Why it breaks:** Straight YAGNI against `code-standards.md:9` ("No speculative features"). It also buys a real cost: `phase-06:55` requires it to share the template's component scaffolds, which means the template's component files must be parameterisable — a second templating surface on top of the unowned `{{placeholders}}` one. And per the failure-modes report it makes the blessed way to add a component mutate a manifest-tracked barrel.

**Smallest fix:** Drop `generate` from Phase 6 and from Phase 1's stub list. If the maintainer wants it, it is a post-1.0 phase with its own requirement — and the barrel-conflict question answered first.

---

### [Medium] Phase 1's spike needs a GitHub remote that does not exist and is Phase 10's work

**Where:** `phase-01:25` ("repeat through a real git install (`npm i <local-clone-path>`, and `npx <git-url>` against a pushed branch)"), `phase-10:48` (`Modify: package.json — files, engines, version, repository`), `:57` (tag `v0.1.0`, real install test). Repo state 2026-08-04: `git remote -v` is empty, `git tag` is empty, and the root `package.json` has no `repository` field.

**The assumption / gap:** The Phase 1 spike's decisive test — the one that would confirm or refute ADR-007's "one artifact" reasoning — is a `npx` against a pushed git URL. There is no remote, no pushed branch, and repository metadata is scheduled nine phases later.

**Why it breaks:** The spike will be run in its cheap local form only (`npm pack` + tarball), which is precisely the form `phase-10:38` warns is not representative: "`npm i /path/to/clone` behaves differently from `npm i github:user/repo` — different resolution, different file selection". The riskiest assumption in the plan gets verified by the weaker of the two available tests, and the stronger one arrives after everything has been built on the answer.

**Smallest fix:** Move remote creation, the `repository` field and a throwaway `v0.0.0-spike` tag into Phase 1 step 1. Costs minutes; it is the difference between the spike answering the question and rehearsing it.

---

### [Medium] The Phase 1 tsconfig omits the two compiler options type stripping actually requires

**Where:** `phase-01:57` ("Create: `tsconfig.json` — strict, `erasableSyntaxOnly`, `noEmit`, `module: nodenext`"), `docs/architecture.md:241-242` (ADR-012's erasable-syntax consequence).

**The assumption / gap:** ADR-012 names `erasableSyntaxOnly` as the guard that makes type stripping safe. It is not sufficient, and Node's documentation names the gap directly:

> "Due to the nature of type stripping, the `type` keyword is necessary to correctly strip type imports. Without the `type` keyword, Node.js will treat the import as a value import, which will result in a runtime error."

`erasableSyntaxOnly` bans enums, namespaces and parameter properties; it does not force `import type`. `verbatimModuleSyntax: true` is the option that does. Separately, under `module: nodenext` the runtime requires the `.ts` extension in relative specifiers, which needs `allowImportingTsExtensions` for `tsc --noEmit` to accept the same source.

**Why it breaks:** Exactly the failure ADR-012 says the type-check gate exists to prevent, and the one it does not catch: `import { ActionableError, ErrorFields } from "./errors.ts"` where `ErrorFields` is an interface typechecks green and throws at runtime — in the CLI's own error handler, first run, in front of a new user. The plan's phrasing "`erasableSyntaxOnly: true` makes this a typecheck failure rather than a runtime surprise" (`architecture.md:241`) is true for the syntax it covers and false for this case.

**Smallest fix:** Add `verbatimModuleSyntax: true` and `allowImportingTsExtensions: true` to the Phase 1 tsconfig line, and one test importing a type without the keyword to prove the typecheck catches it. Two words in the plan.

---

### [Medium] Phase 10 at 1–2 days absorbs the verification work three earlier phases deferred into it

**Where:** `phase-10:5` (`effort: "1-2d"`), `:21-27` (requirements), `:55-63` (steps). Deferred in: `phase-06:102` ("pnpm and yarn get at least a smoke run before release"), `phase-04:90` and `architecture.md:117` (stack re-verification at every release), `phase-10:61` ("Final docs sync — reconcile every doc against what was actually built").

**The assumption / gap:** Phase 10 carries, at minimum: `package.json` finalisation and `npm pack` inspection; a CI workflow whose end-to-end job runs a real `ds create` — which installs React, Vite, Storybook and Tailwind from the network on every CI run and then boots the validator; a real `npx github:` install test on a clean profile; two tags, because "a newly published tag is picked up by an install" (`:70`) cannot be shown with one; pnpm and yarn smoke runs inherited from Phase 6; the stack re-verification; a repository README; `docs/releasing.md`; and a reconciliation of five docs plus `INDEX.md` against ten phases of implementation.

**Why it breaks:** The docs reconciliation alone is a day if the earlier phases discovered anything — and the plan expects them to (`plan.md:17`, "where implementation reveals that a doc is silent or self-contradictory"). CI end-to-end debugging against a network install is rarely a first-try success. The estimate reads as if it covers steps 1–3 only.

**Smallest fix:** Re-estimate to 3–4d, and move the pnpm/yarn smoke runs back into Phase 6 where the install code is fresh and the failure is diagnosable.

---

## Unresolved questions

1. **ADR-012 needs re-deciding before Phase 1, not spiking.** Node's node_modules exclusion is documented and stable. Which replacement does the maintainer want: `prepare`-built output (rejected once on first-run latency), hand-written `.js` for the shipped surface (Phase 4 already pre-decided this for the preset), or a committed build (rejected by the standing git rules)? Every option contradicts something already written down.
2. **Do generated projects get `CLAUDE.md` / `AGENTS.md`, and who writes them?** Requirements criterion 5 depends on them existing; no phase produces them.
3. **Is the FR3 agent skill in scope for this plan?** If not, `plan.md` should say so — the `[S]` half of the contract is otherwise unenforced at the end of Phase 10 with nothing recording that as a known gap.
4. **What is the shape of a brand surface in `tokens.json`?** Colour reference, explicit light/dark flag, or both — and does it live under `color.*`, a top-level `surface` group, or `$meta`? Rule 24 forces the answer to be decided rather than discovered.
5. **Which files may carry `{{placeholders}}`, and does the manifest checksum the rendered or the unrendered form?** The answer determines whether `package.json` is conflicted on every update of every project.
6. **Is `ds generate` wanted at all?** No requirement asks for it and it costs a second templating surface plus a permanent barrel conflict.
7. **Effort:** the plan's phase efforts sum to roughly 23–30 days. With the Phase 3, 5 and 10 corrections above it is closer to 35–45, before the ADR-012 rework. Does the maintainer want the estimate corrected or the scope cut?
