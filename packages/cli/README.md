# cli

The `ds` command. Part of `story-cli-kit`, not separately installable — a git URL resolves the repository root, so this workspace package ships inside the one installed artifact (ADR-007).

The `ds` command. A convenience over documented procedures — every operation must also be performable by hand from the docs (NFR2 in `docs/requirements.md`).

## Install

```bash
npx github:joachimtrungtuan/story-cli-kit create my-project   # new project
npx github:joachimtrungtuan/story-cli-kit adopt               # into an existing React app
```

Distributed from GitHub; no npm registry account involved. `create` and `adopt` are the only commands meant to run via `npx`. It adds the CLI to the new project, and everything afterwards runs from that local install. Running `validate` / `update` / `migrate` through `npx` would point the latest CLI at an older project engine — see ADR-007. The CLI detects that case and redirects rather than proceeding.

Cloning the repo is the contributor path for developing the toolkit, not a user install path.

## What `create` produces

A complete, runnable project — not a Storybook layer to attach to something you build first. The React source, the Vite setup and Tailwind v4 are all generated here; there is no prior "create a Vite app" step.

- React + Vite + TypeScript application, runnable
- Tailwind v4, CSS-first, wired to the generated `tokens.css`
- Storybook, configured through the engine preset
- The tier taxonomy, neutral tokens, foundations docs, example component per tier
- `.designsystem/manifest.json`
- Dependencies installed, and a validator that passes on first run

Two commands work immediately afterwards: one to run the app, one to run Storybook.

## What `create` does to the environment

- **Detects the package manager** (npm, pnpm or yarn) and generates for that one. It never installs a package manager (ADR-008).
- **Runs `git init` and commits the scaffold**, so reversibility holds from the first minute (ADR-009).
- **Prompts for everything, requires no flag.** Every flag overrides a prompt; none is a prerequisite.
- **Reports missing prerequisites as instructions** — what is wrong, what to do, where to get it (NFR5).
- **Allows a non-empty target when its user-owned files do not collide** — `README.md` and `LICENSE` are preserved; an existing `src/` or other shipped path is refused and routed to `ds adopt`.
- **`--no-install` skips both install and the tail validator**, then prints the exact commands to run later.

## Commands

| Command | Does |
| --- | --- |
| `ds create [target] [--no-install]` | scaffold a new project from a template; write `.designsystem/manifest.json` |
| `ds adopt [--dry-run]` | merge into an existing React app; classify every write, never overwrite silently (ADR-013) |
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

## Manual equivalent

The generated project is copied from `templates/storybook-vite`, rendered with its project name, package manager and toolkit dependency, then receives generated token CSS and tier barrels. The manifest records normalized SHA-256 checksums of those written paths; `package.json` is marked `rendered`, and `appliedMigrations` starts as an empty array.

`ds generate <tier> <name>` creates `<Name>.tsx`, its barrel, and the mirrored Storybook story from the engine-owned scaffold. It never copies a nearby component, and it refuses an existing component directory or story path.

## Status

`create` and `generate` are implemented; `adopt`, `update`, `migrate`, and `guard` remain in their planned phases.
