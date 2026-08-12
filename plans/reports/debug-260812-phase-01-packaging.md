# Packaging diagnosis — Phase 1

## Result

- **`migrations/` and `skill/`: confirmed packaging defect.** `package.json:15-21` lists both, but neither root directory exists. npm's `files` allowlist does not create or retain absent directories; it packs only matching files.
- **`dist/`: a required Phase 1 delivery state, currently intentionally pending the requested no-commit workflow.** It is not ignored and the current build exists, but it has not been staged or committed. It is therefore not a source/build implementation failure, but Phase 1 cannot be marked complete until the eventual focused commit includes it.

## Evidence

1. `find migrations skill -maxdepth 2 -print` returned `No such file or directory` for both paths.
2. `npm_config_cache="$(mktemp -d /private/tmp/story-cli-pack-XXXXXX)" npm pack --dry-run --json` succeeded and reported 37 files. The paths are only `dist/**`, `templates/storybook-vite/README.md`, `docs/**`, and `package.json`; none start with `migrations/` or `skill/`.
3. The specification requires the four asset directories to ship (`phase-01-toolkit-skeleton.md:17-23`, `:96`, `:109-112`) and architecture declares both root directories shipped (`docs/architecture.md:8-22`, `:279`). This is not an optional future-release optimization.
4. `.gitignore` contains no `dist/` rule. `git status --short dist` reports `?? dist/`, and `git ls-files --error-unmatch dist/packages/cli/src/bin.js` fails because it is untracked, not because the path is ignored. The tester's deterministic-build evidence is compatible with this status.

## Root cause and ownership

The packaging issue is structural: a `files` entry expresses inclusion policy, not directory creation. TypeScript only emitted `dist`; Phase 1 did not add the two root asset containers.

Future phases own their substantive content: Phase 7/8 own migration machinery and release migration behavior; Phase 11 owns `skill/SKILL.md` and its references. Phase 1 should not pre-implement either feature merely to make `npm pack` green.

## Minimum Phase 1 repair

Add one real, durable root-level package artifact in each currently absent directory, with content limited to its standing role and future ownership (for example, a concise `migrations/README.md` defining the shipped migration-note location and a concise `skill/README.md` identifying the shipped skill location and Phase 11 as its content owner). Do **not** add empty-directory sentinels, fake migration versions, or a premature `SKILL.md`: those would either be non-functional packaging padding or steal Phase 11's actual artifact.

Because these are new shipped files/directories, the implementation must also make the required `INDEX.md` and update-log changes. Then rebuild and include `dist/` in the same eventual focused commit. This is the smallest fix that makes the declared artifact literally packable without bringing later command or skill behavior forward.

## `dist/` classification

The current untracked state is not merely a staging oversight if judged against the Phase 1 acceptance criterion: the criterion explicitly says `dist/` is committed. It is, however, expected under the maintainer's explicit no-commit-yet gate and must not be "fixed" by an unauthorized staging or commit. Treat it as an open delivery gate, not an implementation-code defect; reclassify it as a defect only if the Phase 1 commit omits the verified output.

## Verification after the repair

```sh
npm run typecheck
npm test
npm run build
npm_config_cache="$(mktemp -d /private/tmp/story-cli-pack-XXXXXX)" npm pack --dry-run --json
# Assert the JSON file paths contain each prefix exactly as required:
# dist/, templates/, migrations/, skill/, docs/
git check-ignore -v dist || true
git status --short dist migrations skill
git add dist migrations skill package.json .gitignore INDEX.md update-logs/2026-08-12
git diff --cached --check
git diff --cached --name-only
```

The final two `git add`/index checks are only for the maintainer's later approved commit step. Before committing, run a clean rebuild and confirm it introduces no change to the staged `dist/` output:

```sh
npm run build
git diff --exit-code -- dist
```
