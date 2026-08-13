# 05 — Validator

**What:** Added the one-pass project snapshot, V1–V24 rule groups, stable human and JSON reports, `ds validate` CLI wiring, a compliant fixture, and seeded failure coverage for every implemented rule. V25–V26 remain reserved for Phase 12. Token group parsing now accepts the contract's camelCase fallback as well as `$`-prefixed configuration.

**Why:** Phase 5 needs a running contract check before the neutral template is built, and agents need machine-readable rule IDs rather than prose-only conventions.

**Alternative considered:** Independent filesystem walks per rule were rejected because rules could observe different trees and repeat I/O. Regex-only import checking was rejected because it mishandles type-only imports and barrel re-exports; the validator parses TypeScript once and traverses runtime import/export edges.

**Review corrections:** Codegen failures and unsupported-but-valid token groups now become stable violations instead of aborting or silently dropping values. Story coverage resolves direct, aliased, and tier-barrel component origins; story typing is tied to imported Storybook types on the exported meta; named type-only re-exports are ignored; and barrel rules require real export declarations rather than comments or imports. Typography checks catch novel contextual and standalone raw values while permitting generated CSS variables and exempting only font sourcing. V14 permits non-tokenised background-image functions, and V24 rejects known pre-contract aliases when a canonical namespace exists.

**Follow-ups:** Run the validator against the maintainer's pre-contract reference project when its local path is supplied. Phase 12 adds V25–V26 and reconciles the implemented count to all 26 contract rules.
