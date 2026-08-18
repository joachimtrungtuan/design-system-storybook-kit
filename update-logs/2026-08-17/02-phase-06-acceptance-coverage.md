# 02 — Phase 6 acceptance coverage

**What:** Added injectable prompt/apply seams and tests for conditional prompts, enclosing/independent repository guidance, workspace non-editing, every pre-commit apply failure stage, overwrite restoration, and post-commit validation retention. Updated Phase 6 plan evidence from 5/18 to 9/18.

**Why:** The implementation was present, but the remaining acceptance debt was interaction and failure evidence rather than new command behavior. The seams keep production defaults unchanged while making those boundaries deterministic to test.

**Alternative considered:** Leaving the missing cases as manual-only evidence was rejected because rollback and prompt-condition regressions need repeatable tests; advancing to `ds update` before closing this evidence would stack classifier work on an incompletely accepted scaffold.

**Follow-ups:** Vite/Storybook dev-server startup remains blocked by localhost listener restrictions; full confirmation-prompt cancellation, the later `ds update` barrel-classification assertion, and independent delegated review remain open.
