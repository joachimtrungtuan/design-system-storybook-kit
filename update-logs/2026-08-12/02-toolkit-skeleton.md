# 02 — Toolkit skeleton

**What:** Established the installable `story-cli-kit` package and strict TypeScript build shape, then added the Phase 1 CLI shell, environment checks, prompt boundary, tests, and distribution evidence.

**Why:** Phase 1 turns the documentation-only repository into the smallest real toolkit artifact and proves the Git-based install path before later phases depend on it.

**Alternative considered:** A source-only TypeScript binary was rejected by ADR-012 because Node does not strip types for installed packages. `@types/node` is pinned to the Node 24 line so the strict build can type-check Node APIs without widening the supported runtime contract.

**Distribution spike:** A packed tarball installed and ran `ds --help`. A local Git dependency installed with scripts enabled also ran `prepare`, produced `dist/`, and ran the binary. The same Git dependency installed with `--ignore-scripts` produced neither `dist/` nor `node_modules/.bin/ds`; invoking the documented binary failed in the shell with exit 127 before toolkit code could execute. With `bin` pointing directly at `dist/packages/cli/src/bin.js`, the planned in-process guard is unreachable.

**Maintainer decision:** Compile before GitHub delivery and commit `dist/`. Init and upgrade execute shipped JavaScript; users do not compile the toolkit. This replaces install-time `prepare`, makes `--ignore-scripts` safe, and moves the failure boundary to maintainer validation.

**Revised spike:** A fresh local Git dependency containing committed `dist/`, installed with `--ignore-scripts`, created the `ds` bin link and ran `ds --help` successfully. The chosen distribution shape resolves the blocker empirically.

**Packaging correction:** Added responsibility READMEs under `migrations/` and `skill/` so all five declared package surfaces exist and ship in Phase 1. Substantive migration notes remain owned by their implementing phases, and `skill/SKILL.md` remains owned by the semantic-rule phase.

**Review corrections:** Git inspection now probes from the nearest existing ancestor for not-yet-created targets. The maintenance guard distinguishes the executing package from the project's local installation instead of treating every `npm exec` as transient, and its recovery instruction is package-manager-neutral. Invalid flags now produce an actionable refusal. Repository governance narrowly exempts verified root `dist/` so the standing Git rules match ADR-012.

**Executable regression:** The first provenance implementation resolved the compiled module only to `dist/`; a real installed-package test exposed the off-by-one root. It now resolves four levels to the `story-cli-kit` package root, with direct compiled-layout coverage.

**Workspace regression:** A fixed `<cwd>/node_modules/story-cli-kit` lookup rejected valid hoisted workspace installs. Provenance now uses Node's package resolution from the project, which follows ancestor `node_modules` and package-manager resolution hooks, then compares the resolved package root with the executing toolkit.

**Alternative considered:** A tiny committed launcher could explain a missing `dist/`, but users would still depend on an install-time build. Declaring script-skipping unsupported was rejected. Committing the complete output was chosen over the launcher because it removes compilation from the user path entirely.

**Follow-ups:** Phase 10 must rebuild and reject any `dist/` diff in CI before release.
