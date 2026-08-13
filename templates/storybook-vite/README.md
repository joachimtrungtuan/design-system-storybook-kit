# templates/storybook-vite

React + Vite + Storybook + Tailwind v4. The files copied into a project at `ds create`, and the baseline every later `ds update` diffs against.

Everything here is **content** in the sense of `docs/architecture.md`: copied, owned by the generated project, freely editable. Infrastructure that should stay updatable belongs in `packages/engine/` instead — if a file here would be identical and unedited in every project, it is in the wrong place.

## Must contain

The full layout in `docs/design-system-contract.md`, plus:

- neutral `tokens.json` — brand-free but complete, every group populated, brand colours declared as ramps (`$base` / `$anchor` / `$mode`)
- a few example components per tier, each **complete**, with its story
- the five required foundations MDX docs and `Introduction.mdx`
- `.storybook/main.ts` and `preview.tsx` importing the engine preset
- `globals.css` importing generated `tokens.css`

"Neutral" means a working reference implementation, not a stub. A new project must run and pass `ds validate` immediately after creation.

## Completeness rule

Every shipped component covers its full surface — all size variants, all interaction states (default, hover, active, focus, disabled), all tone/style variants — each documented in its story. Depth over breadth: a few components realised completely, not many realised partly.

This is not decoration. The template is the reference every later component gets copied from, so a half-built example propagates as a half-built pattern.

## Must not contain

`tailwind.config.ts` — tokens are CSS-first via `@theme` (ADR-003). Any generated file committed as source. Brand assets, brand copy, or real content.

## Materialisation

The raw template intentionally contains placeholders and no generated `src/styles/tokens.css`. `materialiseTemplate` renders it into a temporary project, replaces every placeholder, and writes current token CSS; `ds create` will reuse the same rendering boundary.
