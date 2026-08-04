# 08 — Stack versions verified against the registry; TypeScript pinned below latest

**What:** Added a dated "Stack versions" table and ADR-011 to `docs/architecture.md`. Fixed two errors introduced while editing (below).

**Why:** Maintainer asked to confirm nothing in the stack is outdated. Assistant knowledge cutoff is May 2026 and today is 2026-08-04, so recall was not trustworthy. Versions were read from the npm registry directly rather than from articles, since the registry is authoritative for what actually installs.

## Findings

Everything is on genuine latest **except TypeScript**, and that exception is deliberate.

**ADR-011 — TypeScript 6.0.3, not 7.0.2.** TS 7.0 went stable 2026-07-08 (Go-native compiler, ~10x builds) and is `latest` on npm. It ships **without a stable programmatic API** — expected in 7.1. Two consequences hit this project directly:

- `typescript-eslint@8.66.0` declares `typescript >=4.8.4 <6.1.0`. TS 7 is outside its range → no type-aware linting.
- MDX tooling cannot consume TS 7 yet. Foundations docs are `.mdx` and are contract, not garnish.

Taking `latest` would trade a build-speed win we do not need — these projects are small — for two things the contract depends on. Revisit conditions are observable (7.1 stable API; typescript-eslint widening peers), so this is dated, not indefinite.

**Confirmed, not assumed:** Tailwind 4.3.3 `@theme` still emits both utilities and CSS custom properties, so ADR-003 holds. Tailwind's own docs use `oklch`, aligning with ADR-006. `@vitejs/plugin-react@6`'s new `@rolldown/plugin-babel` and `babel-plugin-react-compiler` peers are **optional** — no hidden install burden.

**Node floor established:** minimum 22.13, recommended 24 LTS (active to 2028-04). Node 20 is EOL. Floor is the intersection of Vite and ESLint engine ranges. NFR5 messages name a single version to install rather than a range — one number is a better instruction.

**Verification date recorded in the table.** A version table without one gets trusted after it stops being true.

## Errors made and corrected

- Inserted ADR-011 into the middle of ADR-010, splitting it before its closing paragraph. Moved the paragraph back.
- ADR-010 still asserted "an enclosing repository is used rather than a new one created", contradicting the ADR-009 amendment in `07` that made it a user choice. Corrected. Cause: edited ADR-010 before ADR-009 was amended and did not re-check the cross-reference — the exact staleness class `INDEX.md` currency rules exist to prevent, here between two ADRs in one file.

## Follow-ups

- Re-verify the table at every engine release; treat the date as the trigger.
- ADR-011 needs a recheck once TS 7.1 ships — worth an explicit item rather than waiting to notice.
- Still blocking the plan: the npm scope string.
