# Update Logs

Canonical path is `update-logs/` (plural). **Never create a competing `update-log/`.**

## Format

```
update-logs/YYYY-MM-DD/NN-short-slug.md
```

- **Folder per date, named `YYYY-MM-DD`** — zero-padded, no other format. Create today's folder if it does not exist.
- **`NN` is zero-padded and increments within that date**, restarting at `01` each day. It orders entries within the day; the folder orders the days.
- **Slug is short and kebab-case**, naming the change rather than the task ("engine-token-codegen", not "phase-2").

```
update-logs/
  2026-08-04/
    01-project-foundation.md
    02-engine-token-codegen.md
  2026-08-06/
    01-validator-rules.md
    02-ramp-oklch-mode.md
    03-end-of-session-validator.md
```

## When to write an entry

Before or immediately after any non-trivial change. Non-trivial means: a structural or architectural decision, a contract rule added or changed, a token pipeline change, a file split, a tooling pick, a scope interpretation, a clarification from the maintainer, an engine version bump, a rollback.

Trivial edits — typos, formatting, comment wording — need no entry.

Each entry states **what changed**, **why**, **what alternative was considered**, and any **follow-ups**. Grammar may be sacrificed for concision.

```markdown
# 02 — Engine token codegen

**What:** tokens.json → src/styles/tokens.css generator in packages/engine.
**Why:** single hand-edited source; @theme emits utilities + CSS vars in one pass.
**Alternative considered:** keeping tailwind.config.ts as in WIN Flavor — rejected,
same value maintained in three places is a live drift source.
**Follow-ups:** ramp generation (base colour → 50–950) still manual.
```

## End-of-session notes

Written when **triggered**, not on a schedule:

- the maintainer asks to end the session or asks for a note, **or**
- a large span of work has accumulated that no existing note covers, and you are at a natural stopping point.

Do **not** auto-trigger from context limits, idle time, or inference.

**One note covers the whole span since the last one — never one per task.** A project in active development across many sessions does not need a note per session; the numbered entries already carry the detail. The note is an index and handoff, not a duplicate.

Name it `NN-end-of-session-<slug>.md` in today's dated folder, where `NN` is the next sequential number in that folder — it takes its place in the day's numbering rather than sitting outside it. Sections:

1. **Session goal** — the request that opened the span.
2. **Completed (DONE)** — finished items, file paths, one line each. Mark unambiguously so the next agent skips them.
3. **In-progress** — started, not finished: current state + next concrete step.
4. **Key decisions** — scope, stack, design choices + reason.
5. **Files touched** — created / modified / deleted, one line of purpose each.
6. **Unresolved questions or blockers** — needing maintainer input or external resolution.
7. **Pickup pointer** — recommended first action next session.

Cross-reference the numbered entries rather than restating them. Nothing material since the last note: `No material changes; nothing to hand off.`

## Session start protocol

At the start of every new session, before acting on the request:

1. Look for the most recent `*-end-of-session-*.md` — latest dated folder first, then highest `NN` within it.
2. **If none exists, fall back to the most recent numbered update log entry** (latest dated folder, highest `NN`). Mid-project sessions frequently have no end-of-session note, and that is normal — the latest numbered entry is then the authoritative handoff.
3. Read whichever was found. Internalise: what is DONE (skip it), what is in progress, what is blocked, and where to resume.
4. Surface a one-line orientation, e.g. *"Last entry <date>: <X>. Continue there, or different focus?"* — do **not** silently auto-execute the pickup pointer.
5. If the opening request is unrelated, acknowledge the prior context exists and follow the new request. The note is context, not a directive.
6. If neither exists, or the read fails, proceed normally and mention it once.

Read this **once per session**, not per task. Do not preload other numbered entries — fetch one only when a specific item demands it.
