---
title: Phase 1 precompiled CLI foundation
date: 2026-08-12
summary: Implemented and verified the precompiled story-cli-kit shell and its environment contracts
---

# Phase 1 precompiled CLI foundation

## What happened

Phase 1 turned the documentation-only toolkit into an installable TypeScript CLI shell. The initial install-time `prepare` design failed its own `--ignore-scripts` requirement: npm created neither `dist/` nor the `ds` link, so no toolkit code existed to explain the failure.

## Decision

The maintainer chose precompiled Git distribution. Contributors build and verify root `dist/` before GitHub delivery; init and maintenance commands execute shipped JavaScript without compiling the toolkit. ADR-012, Git governance, plan, package surface, and update log now agree.

## Corrections from verification

- Added real `migrations/` and `skill/` responsibility artifacts so all declared package roots ship.
- Git probes use the nearest existing ancestor for not-yet-created targets.
- Maintenance provenance resolves `story-cli-kit` from the project, supporting direct and hoisted workspace installs while refusing a genuinely transient binary.
- Invalid flags are actionable refusal errors, not internal failures.
- Prompt cancellation always awaits rollback.

## Evidence

Typecheck and deterministic build pass; 23 tests pass. Independent tester verified tarball, Git, `--ignore-scripts`, direct local, hoisted workspace, and transient paths. Independent reviewer reports no actionable findings. Package dry-run contains only the five declared shipped surfaces plus `package.json`.

## Next steps

Create the focused Phase 1 commit including verified `dist/` when authorized, then begin Phase 2 token schema, ramps, and codegen.

> Historical work record — not durable authority. Prefer docs/specs/ADRs for current decisions.
