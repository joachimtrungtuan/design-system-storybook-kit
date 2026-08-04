# 04 — State the log path convention instead of demonstrating it

**What:** `update-logs/YYYY-MM-DD/NN-short-slug.md` now written as an explicit rule in `CLAUDE.md`, `AGENTS.md` and `update-logs/README.md`. Added the entry-content requirement of **follow-ups** alongside what/why/alternative. Clarified that an end-of-session note takes the next `NN` in the day's numbering rather than sitting outside it.

**Why:** Maintainer caught that the dated-folder pattern existed only as an *example* in `update-logs/README.md`, and the governance files said merely "today's folder". An agent reading only `CLAUDE.md` could not derive `2026-08-04/` — it would invent a format. Exactly the drift class this repo exists to prevent, in the repo's own rules.

**Alternative considered:** leaving the detail solely in `update-logs/README.md` and pointing at it from the governance files. Rejected — the path shape is needed at the moment of writing an entry, which is every non-trivial change; forcing a second file read for a one-line fact is the wrong trade. Detail that is *used constantly* belongs inline; detail that is *consulted occasionally* (the seven end-of-session sections) stays in the README.

**Also fixed:** the README's example folder listing skipped from `01` to `03`, implying `NN` may have gaps. Added the missing `02`.

**Follow-ups:** general lesson worth applying when the validator is written — a convention shown only by example is unenforceable, since there is nothing to check against. Candidate `[V]` rule: log filenames match `^\d{2}-[a-z0-9-]+\.md$` inside a `^\d{4}-\d{2}-\d{2}$` folder.
