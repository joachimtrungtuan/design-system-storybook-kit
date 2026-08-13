---
title: Phase 5 neutral template
date: 2026-08-13
summary: Completed neutral materialised Storybook template and Phase 3 reference measurement.
---

# Phase 5 neutral template

## What happened

Completed the Phase 5 neutral React, Vite, Storybook and Tailwind template with atoms, molecules, header/footer organisms, a page shell, stories, foundations docs, token configuration, and a materialisation boundary in the engine.

The materialiser renders template placeholders, generates current `tokens.css`, asserts no placeholders remain, and locates the package root correctly both from source and from the precompiled installed layout.

## Evidence

- Full direct Node suite: 107/107 passing.
- Direct TypeScript check, compiled build, clean materialised `ds validate`, Vite build, and Storybook build: passing.
- Independent review corrected the installed-layout root lookup, Storybook CSS entry, and documented component state coverage.

## Decision

Keep generated neutral ramps. The private reference needs extensive non-anchor overrides for exact reproduction, so ADR-006 must be revisited before attempting an exact translation. No private values, content, or path were recorded.

## Next steps

Phase 6 should reuse `materialiseTemplate` for `ds create`, then implement `ds generate` against the template's canonical component patterns.

> Historical work record — not durable authority. Prefer docs/specs/ADRs for current decisions.
