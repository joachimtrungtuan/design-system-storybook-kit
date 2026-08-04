# 03 — Markdown: one line per paragraph

**What:** Dropped hard wrapping across all repo markdown. One line per paragraph, one line per list item. Recorded as `docs/code-standards.md` §11 (Dependencies moved 11→12; §9 Git unchanged, so existing cross-references hold).

**Why:** Maintainer proposed it for storage saving. Storage premise is wrong — measured 16 bytes on 8KB (~0.2%), since wrapping trades a space for a newline and both are one byte. Conclusion still correct for a different reason: hard wrapping's usual justification is cleaner diffs, but editing one word early in a wrapped paragraph reflows every line after it, so the diff shows the whole paragraph regardless. One line per paragraph gives the same granularity with no reflow churn. Matters most for `CLAUDE.md` / `AGENTS.md`, which are mirrored — every edit lands twice and reflow noise hides whether the two still match.

**Alternative considered:** semantic line breaks (one line per sentence) — finer diffs, also no reflow. Rejected: a formatting rule people forget, and in documents whose premise is being followed exactly, an easy convention beats a marginally better one.

**Regression caught and fixed:** the unwrap script merged consecutive `**[V]**` rules in `docs/design-system-contract.md` into single paragraphs — seven places where discrete rules became one blob. Converted those to bullet lists, which is the correct markup for a rule list and is stable under this convention. Verified no other doc over-merged (checked every line >400 chars; all were genuine single paragraphs).

**Follow-up:** convention applies to generated projects too — the template's markdown should follow it, and it is a candidate `[V]` rule if drift shows up in practice.
