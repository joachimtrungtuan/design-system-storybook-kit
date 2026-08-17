# 01 — Create and generate

**What:** Implemented Phase 6 `ds create` and `ds generate`, including shared normalized SHA-256 manifests, materialisation hooks, rollback ledgers, collision-safe create planning, package-manager-aware installation, canonical tier scaffolds, and generated barrel regeneration.

**Why:** `create` must finish with a committed project and `generate` must be the sanctioned path that cannot compound a nearby component's drift. The manifest and ledger establish the safety boundary required by later update work.

**Alternative considered:** Keeping renderer, barrel, checksum, and component templates separately in the CLI was rejected because each duplicate would drift from the Phase 5 materialisation boundary or the engine contract. Refusing every non-empty target was rejected because README/LICENSE-only targets are explicitly supported.

**Follow-ups:** Phase 7 will consume the shared checksum module and classify tier barrels as generated. The plan index could not be refreshed in this sandbox because its SQLite store is outside the writable roots; the repository Markdown remains canonical.
