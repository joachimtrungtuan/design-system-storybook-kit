# engine

The updatable surface. Part of `story-cli-kit`, not separately installable — a git URL resolves the repository root, so this workspace package ships inside the one installed artifact (ADR-007).

The updatable surface. Ships into generated projects as a versioned dependency and is never edited there.

## Responsibilities

- **Storybook preset** — `main.ts` / `preview.tsx` factories. A generated project's config is a few lines importing these, so Storybook wiring changes ship as a version bump.
- **Token codegen** — `tokens.json` → `src/styles/tokens.css` as a Tailwind v4 `@theme` block, emitting utilities and CSS custom properties in one pass.
- **Ramp generation** — expands each brand colour's `$base` / `$anchor` / `$mode` into a 50–950 scale in `oklch` or `hsl`, honouring `$overrides`. The anchor step must reproduce `$base` exactly. Runs as part of codegen; ramps are never written back to `tokens.json`.
- **Validator rules** — every `[V]` rule in `docs/design-system-contract.md`.
- **Story and component templates** — scaffolding for new components at each tier.
- **Migration notes** — `migrations/<version>.md` per release, stating what changed, whether it breaks, the mechanical equivalent, and the rationale.

## Not its responsibility

Components. Those are copied into projects and owned there — see ADR-001 in `docs/architecture.md`.

## Status

Not implemented. Contract is specified in `docs/design-system-contract.md`; update behaviour in `docs/update-and-migration.md`.
