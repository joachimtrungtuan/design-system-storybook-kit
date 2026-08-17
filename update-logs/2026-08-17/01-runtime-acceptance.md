# 01 — Runtime acceptance

**What:** Verified a disposable Phase 6 project with a real npm installation, installed `ds validate`, Vite production build, and Storybook production build. Fixed local package provenance detection for the ESM-only `exports` map used by the shipped toolkit package.

**Why:** The installed maintenance CLI must recognise its own package before it can validate a versioned generated project. Production builds provide runtime evidence without changing the repository.

**Alternative considered:** Keeping `require.resolve("story-cli-kit/package.json")` was rejected because the package intentionally does not export that subpath and its preset exports are import-only. Resolving an exported preset with `import.meta.resolve` and walking to the named package root preserves the package boundary.

**Follow-ups:** Dev-server startup remains pending because this environment rejects localhost listeners and elevated approval timed out twice. Prompt/cancel and full apply-stage failure matrices remain open in Phase 6.
