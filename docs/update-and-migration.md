# Update and Migration

How a generated project moves to a newer engine version without losing local work.

## Versioning

The engine is semver. The meaning is defined by impact on a generated project:

| Bump | Means | Project impact |
| --- | --- | --- |
| patch | engine-internal fix | none; safe automatic update |
| minor | new shipped components, new validator rules, additive token slots | new files appear; existing untouched files may update |
| major | changed component APIs, renamed tokens, taxonomy changes | requires migration notes; may require a structural migration |

**A new validator rule is a minor bump, and it can fail an existing project.** That is intended — the project was already violating a rule that had not been written yet. The update output must say so plainly rather than presenting it as a regression.

## Release migration notes

Every release ships `migrations/<version>.md` inside the engine. This is what makes agent-assisted migration work rather than guess.

```markdown
## 2.0.0

### Button
- BREAKING: prop `size` renamed to `scale`; values unchanged.
- Added `tone` variant ("neutral" | "accent"); default "neutral" matches old appearance.
- Removed `ghost` variant — use `tone="neutral"` with `variant="text"`.
- Rationale: `size` collided with the native attribute on button-as-input usage.

### tokens.json
- `color.semantic.cta-bg` → `color.semantic.action-primary-bg`. Old key still read,
  warns, removed in 3.0.0.
```

Required per entry: what changed, whether it is breaking, the mechanical equivalent, and the rationale. **A diff is not migration intent.** An agent reading only a diff cannot tell a rename from a redesign, and will confidently produce a wrong migration. The rationale is what lets it decide whether a user's local modification still makes sense after the change.

## The update pipeline

One pipeline. The conflict policy is a flag, not a second mode.

```
ds update [--to <version>] [--on-conflict=skip|migrate] [--dry-run]
```

1. **Preflight.** Refuse unless the git tree is clean. Create branch `ds-update/<version>`.
2. **Read manifest.** Determine current version and per-file checksums.
3. **Classify** every template-shipped file:
   - absent locally → **new**, write it
   - checksum matches manifest → **unmodified**, overwrite with new version
   - checksum differs → **conflicted**, apply policy
   - present locally, absent from manifest → **user-created**, never touch
4. **Regenerate** `src/styles/tokens.css` from the project's own `tokens.json`.
5. **Apply conflict policy** (below).
6. **Validate.** Run `ds:validate`. Failures are reported, never auto-suppressed.
7. **Report.** Write `update-logs/<date>/NN-engine-update-<version>.md` listing every file by category, every conflict and its resolution, and every validator failure.

`--dry-run` performs 1–4 and reports, writing nothing. It is the expected first invocation.

### Conflict policy

**`skip` (default).** Conflicted files are left exactly as they are and listed in the report with the relevant migration notes quoted. Nothing is lost; the project may now be running a component whose API the rest of the engine no longer expects, and the validator will say so.

**`migrate`.** Each conflicted file is handed to an agent with: the file as it stands, the old shipped version, the new shipped version, and the migration notes for that component. The agent's task is to apply the *intent* of the change while preserving the user's local modifications — not to overwrite with the new version, which is what `skip`'s opposite would mean and which would discard exactly the work this design exists to protect.

There is no "force overwrite" flag. Deleting the user's component is a `git checkout` away and does not need tooling support.

### Safety invariants

Non-negotiable, and they apply to `migrate` in particular:

- Clean tree required; all work on a dedicated branch.
- Original file content is recoverable from git at every step.
- Validator runs after. A migration that leaves the project invalid is reported as failed, not quietly accepted.
- The agent may not change a file's public export surface without recording it in the report.
- Migration of a conflicted file is per-file and independent — one failure does not roll back the others, and the report distinguishes migrated / skipped / failed.

## Structural migrations

Taxonomy changes (a tier renamed, `stories/` relocated) are whole-tree transforms that file-level checksums cannot express. They ship as named, explicitly-invoked migrations:

```
ds migrate --name 2.0-tier-rename [--dry-run]
```

Separate from `ds update`, never automatic, always reversible via branch. Expected to be rare; each one is a real cost paid by every existing project, which is itself a reason to get the taxonomy right early.

## Drift between projects

An unavoidable consequence of copying components: two projects will diverge in component internals over time. This is accepted (see the consistency definition in [requirements.md](requirements.md)) and bounded by two things:

- The **validator** holds taxonomy, naming, story and token rules regardless of internals.
- The **update report** makes divergence visible — a project with forty conflicted files on every update has drifted far, and that is worth knowing.

If a project's conflict count keeps growing, the correct response is usually to upstream the local changes into the template, not to keep migrating them forever.
