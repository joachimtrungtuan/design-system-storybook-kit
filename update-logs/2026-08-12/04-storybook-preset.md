# 04 — Storybook preset

**What:** Added typed `main()` and `preview(tokens)` factories, Tailwind's Vite plugin, token-derived `$meta.surfaces`, additive project overrides, package export/peer contracts, focused tests, and committed build output. Token parsing now retains `$`-prefixed configuration separately from codegen's token root. Verified an installed tarball against Storybook 10.5.7, Vite 8.2.1, and Tailwind 4.3.3; the scratch project typechecked, built statically, booted on localhost, and served its story index.

**Why:** V22/V23 require generated projects to consume shared Storybook wiring without hardcoded brand values. Keeping configuration separate lets preview metadata reach the preset without changing Phase 2's byte-identical token CSS output.

**Alternative considered:** Importing Storybook's full React config types was rejected because their dependency declarations fail this repo's stricter TypeScript 6 settings and pull DOM types into the Node engine; the emitted API uses narrow structural types and the installed consumer check proves compatibility. Naming the engine module `preview.tsx` was rejected because it contains no JSX and Node's native TypeScript test runner does not load `.tsx`; generated projects still use `.storybook/preview.tsx`. Direct default-export factory calls were rejected after Storybook's parser warned on the call expression; generated configs spread the factory result instead.

**Follow-ups:** Phase 3 implements V22/V23 against the spread-based config shape. Phase 5 writes `$meta.surfaces` into neutral template tokens and uses `export default { ...main() }` / `export default { ...preview(tokens) }` in generated Storybook config.
