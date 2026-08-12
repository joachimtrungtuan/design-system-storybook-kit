---
title: "Phase 12: Generated-project guardrails"
status: pending
priority: P1
effort: "2-3d"
dependencies: [5, 6, 7]
---

# Phase 12: Generated-project guardrails

## Overview

A generated project is edited mostly by agents, and every guarantee the toolkit makes ends at the moment it stops being the thing writing files. This phase builds what carries those guarantees forward: `ds guard`, the hook adapters that call it, the agent instructions that state the rules, and the two validator rules that notice when either has been removed (ADR-014).

Two failure modes are being addressed, both structural, both from `docs/design-system-contract.md` §Ownership and agent guardrails. An agent edits a file the toolkit owns — it looks ordinary, the edit works, and the next `ds update` or codegen reverts it. And an agent creates a component by copying the nearest sibling, inheriting whatever that sibling had already diverged into, so one unnoticed deviation propagates through everything created afterwards until it is no longer recoverable. The second is this repository's founding problem, reappearing one level down.

## What is guarded, and what is not

**There is no engine directory in a generated project.** The engine ships as a dependency under `node_modules/`; an agent editing it there is editing a package the next install replaces, which is a wasted afternoon rather than a lost one. Guarding a path that does not exist would produce a rule nobody can violate and a false sense of coverage.

The surface that genuinely needs a guard is the one that lives *in* the project, looks like ordinary source, and is owned upstream: **generated** files, which codegen destroys, and **shipped** files, which become permanently conflicted on every future `update`. Those are exactly the files the manifest already records, which is why the classification comes from the manifest and from nothing else.

## Requirements

**Functional — `ds guard`**

- `ds guard <path>...` classifies each path against the manifest and returns the contract's ownership class: **generated**, **shipped** (`mark: rendered`), **adopt-merged** (`mark: merged`), or **user-created** (absent from the manifest)
- Exit codes follow Phase 1's contract and are what a hook branches on: non-zero for a refused write (**generated**), zero for everything else. A warning is not a refusal and must not be encoded as one
- **generated** → refuse, naming where the edit belongs instead: `tokens.json` for `tokens.css`, the component directories for a tier barrel
- **shipped** → allow with a warning stating the consequence: the file becomes conflicted on every future `ds update`, permanently. Legitimate divergence, but a decision rather than an accident
- **adopt-merged** → allow with a warning: safe from `update`, and therefore receiving no upstream fixes either
- **user-created** → allow silently. This is where project work belongs, and a guard that comments on it is noise that gets switched off
- Paths outside the project are refused before classification; a path is resolved and confined the same way Phase 7 confines extraction, by `realpath` rather than string prefix
- A project with no manifest is refused with an instruction, never defaulted to permissive. Silently allowing everything is the failure that matters least when it is right and most when it is wrong
- `--json` for adapter consumption, the same shape discipline Phase 3's validator output follows

**Functional — hook adapters shipped in the template**

- `.claude/settings.json` for Claude Code and the Codex equivalent alongside it, both shipped template files under the update pipeline
- **The adapters contain no logic.** Each invokes `ds guard`, `ds validate`, or the project's own lint and typecheck scripts, and does nothing else
- Four events ship:
  - **pre-write scope guard** — `ds guard` on the intended path, the only event that acts before damage
  - **end-of-pass `ds validate`** — the mechanical contract, checked before the pass is called done
  - **end-of-pass lint and typecheck** — run through the project's own scripts under the detected package manager (ADR-008), never a hardcoded manager
  - **end-of-pass git status report** — the changed-file list, so a pass that edited files nobody asked about is visible, followed by a reminder to commit
- The commands are runnable by hand and in CI exactly as the adapters run them. A check reachable only through a hook is a check nobody can reproduce when it fails

**Functional — agent instructions in the generated project**

- The template ships `AGENTS.md` stating the ownership table's refusal rule and the scaffolding rule, in the imperative and without hedging
- `CLAUDE.md` mirrors or references it, matching this repository's own convention
- Both state that `ds generate` is the only sanctioned way to create a component, and why: copying a sibling inherits its drift

**Functional — validator rules**

- **[V25]** hook configuration present and wiring the guard and end-of-pass checks to the shipped `ds` commands
- **[V26]** `AGENTS.md` present and stating both rules; `CLAUDE.md` mirrors or references it

**Non-functional**

- The guard is cooperative and says so. It constrains agents that honour their platform's hook contract; an agent invoked outside that contract, or a human with an editor, bypasses it entirely. `ds validate` in CI remains the check that cannot be skipped
- Guard output is short. A pre-write hook that prints a paragraph on every file trains its reader to ignore it

## Architecture

**All logic lives in `ds` subcommands; the hook configuration is an adapter and nothing more.** One implementation, tested once, runnable in three places. Putting the checks inside platform hook definitions was rejected for the obvious reason: two copies that drift, in the mechanism whose entire job is preventing drift. A third platform then costs a config file rather than a port.

**Classification comes from the manifest, not from a glob list.** A hand-maintained list of protected paths is stale the first time a component is added, and it is prose — the failure mode this project exists to end. The manifest already records every shipped file, its checksum and its mark, so the guard stays correct as the project grows without anyone maintaining it.

**`guard` reuses Phase 7's classifier rather than forking it.** The question "does this path belong to us, and how" is asked by `update`, by `adopt` and here; three implementations would eventually disagree about the same file, and then none of them is trustworthy. `guard` adds the refuse/warn/allow policy on top of the shared classification, and only that.

**The hook configuration is itself a shipped file.** It sits under the update pipeline like any other, which means a project that deletes its hooks keeps working — and V25 is what notices. That is the right shape: the guard is a convenience the project can decline, the validator rule is the record that it declined.

**V25 and V26 check presence and wiring, not behaviour.** A validator cannot prove a hook fires; it can prove the configuration names the right commands and that the instructions exist and say the right thing. Attempting to verify behaviour statically would produce a rule that passes on a broken setup, which is worse than a narrower rule that means what it says.

**Scaffolding provenance is split across the two halves of the contract.** V-rules catch the structural consequences of a copied component — wrong tier, missing story, absent barrel entry — and Phase 11's **[S6]** catches the rest, by reading a component against the engine's canonical scaffolding rather than against its neighbours. Neither half alone is sufficient: a copied component can satisfy every mechanical rule while carrying every habit of the thing it was copied from.

## Related Code Files

- Create: `packages/cli/src/commands/guard.ts`
- Create: `packages/engine/src/guard/classify.ts` — ownership class over Phase 7's shared classifier
- Create: `packages/engine/src/guard/policy.ts` — refuse / warn / allow, and the messages
- Create: `packages/engine/src/guard/guard.test.ts` — one case per class, plus the outside-the-project and no-manifest refusals
- Create: `packages/engine/src/guard/__fixtures__/` — a generated project with a manifest, a project without one, and a project whose hook configuration has been emptied
- Create: `templates/storybook-vite/.claude/settings.json` — the Claude Code adapter
- Create: `templates/storybook-vite/<codex-hook-config>` — the Codex adapter, at the path Codex's current hook documentation specifies; verify it at implementation time rather than assuming, the same discipline the stack table follows
- Create: `templates/storybook-vite/AGENTS.md` and `templates/storybook-vite/CLAUDE.md`
- Modify: `packages/engine/src/validator/rules/` — V25 and V26, reserved in Phase 3 and implemented here
- Modify: `packages/engine/src/validator/__fixtures__/` — projects violating V25 and V26
- Create: `update-logs/<date>/NN-generated-project-guardrails.md`

## Implementation Steps

1. `classify.ts` over Phase 7's classifier, with a fixture per class. Confirm by test that it calls the shared classifier rather than reimplementing the checksum comparison.
2. `policy.ts` and the messages. Write the messages first and read them aloud: a refusal that does not say where the edit belongs instead is a refusal the agent will work around.
3. `guard.ts` with exit codes and `--json`. Test the codes directly — the adapters are branching on them, and a warning encoded as a non-zero exit turns every shipped-file edit into a blocked one.
4. The refusals: a path outside the project, resolved with `realpath`; a project with no manifest.
5. The template's `AGENTS.md` and `CLAUDE.md`. State the ownership table and the scaffolding rule as requirements, not suggestions.
6. The two hook adapters. Verify Codex's current hook configuration path and schema against its documentation before writing the file. Each adapter is invocation only — if either grows a conditional, the condition belongs in `ds`.
7. **Run each of the four events by hand, exactly as the adapter invokes them**, in a project created by `ds create`. A hook whose command only works inside its platform is a check that cannot be reproduced when it fails.
8. V25 and V26 in the validator, with fixtures for a project whose hooks were emptied and one with no `AGENTS.md`.
9. End-to-end: attempt to write `src/styles/tokens.css` in a generated project through the pre-write hook and confirm the refusal; attempt a shipped component and confirm the warning and the write; attempt a new user file and confirm silence.
10. Update-log entry.

## Success Criteria

- [ ] `ds guard` returns the contract's class for a file of each kind — generated, shipped, adopt-merged, user-created — read from the manifest
- [ ] A **generated** path is refused with a non-zero exit and a message naming where the edit belongs instead
- [ ] A **shipped** path is allowed with a warning that states the permanent-conflict consequence, and exits zero
- [ ] A **user-created** path produces no output
- [ ] A path outside the project is refused, verified with a symlinked temp directory rather than only a `..` string
- [ ] A project with no manifest is refused, never defaulted to permissive
- [ ] `guard` and `update` classify the same file identically, asserted against the shared classifier rather than by inspection
- [ ] Both hook adapters contain invocation only — verified by reading them, and by running every command they name from a shell in a generated project
- [ ] Lint and typecheck run through the project's own scripts under the detected package manager, not a hardcoded one
- [ ] The git-status event reports the changed-file list and prompts a commit
- [ ] A generated project ships `AGENTS.md` and `CLAUDE.md` stating the ownership refusal rule and the scaffolding rule
- [ ] V25 fails a project whose hook configuration was deleted or emptied; V26 fails one with no `AGENTS.md`
- [ ] Contract and validator rule counts reconcile: V1–V24 from Phase 3 plus V25–V26 here is the full V1–V26 set, none unowned

## Risk Assessment

**The guard is mistaken for a security boundary.** It is cooperative and bypassable by design — outside a hook-honouring agent it does nothing at all. The risk is not that it fails but that its existence justifies dropping the check that cannot be skipped. `ds validate` in CI (Phase 10) stays the enforcement point, and the guard's own documentation says plainly what it is.

**Warnings become noise and get switched off.** A pre-write hook fires on every file an agent touches. If it comments on user-created files, or explains itself at length on shipped ones, its reader stops reading and the refusals go with it. Silence on the common case is a design requirement, not a polish item.

**The adapters drift from the commands.** The failure this design was chosen to avoid, arriving anyway if a conditional or a path assumption creeps into a hook file. Step 7 — running every event by hand — is the guard, and it is worth repeating whenever an adapter is edited.

**Codex's hook contract differs from Claude Code's, or changes.** Two platforms, one of them moving. Because the adapters hold no logic, a divergence costs a config file rather than a reimplementation, and the verification in step 6 is what keeps the shipped file honest. If Codex cannot express one of the four events, ship the three it can and say so in the project's `AGENTS.md` rather than silently shipping a weaker guarantee.

**V25 passes on a hook configuration that is present but broken.** The rule checks wiring, not behaviour, and that limit is deliberate — a rule that claims more than it verifies is worse than one that is narrow and honest. The end-to-end run in step 9 is where behaviour is actually established.
