# @ds/cli

The `ds` command. A convenience over documented procedures — every operation must also be performable by hand from the docs (NFR2 in `docs/requirements.md`).

## Commands

| Command | Does |
| --- | --- |
| `ds create <name>` | scaffold a new project from a template; write `.designsystem/manifest.json` |
| `ds validate` | run every `[V]` contract rule; non-zero exit on violation |
| `ds generate <tier> <name>` | scaffold a component + its story at the correct paths |
| `ds update [--to <v>] [--on-conflict=skip\|migrate] [--dry-run]` | move a project to a newer engine version |
| `ds migrate --name <id> [--dry-run]` | run a named structural migration |

`ds update` is one pipeline with a conflict-policy flag, not two modes. Only user-modified shipped files are affected by the policy — see `docs/update-and-migration.md`.

## Invariants

- `update` and `migrate` refuse to run on a dirty git tree and work on a dedicated branch.
- `--dry-run` writes nothing and is the expected first invocation.
- There is no force-overwrite flag; discarding local work is a `git checkout` away.
- Both commands run the validator afterwards and report failures rather than suppressing them.

## Status

Not implemented.
