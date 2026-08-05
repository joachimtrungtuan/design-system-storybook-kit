# 14 — Three of the red team's six open decisions resolved; Phase 11 added

**What:** Maintainer decisions on entry 13's items 2, 3 and 5, applied across `plan.md`, phases 2, 3 and a new phase 11. Items 1 (ADR-012), 4 (rules 9/11 vs grouped stories) and 6 (`create` into a non-empty directory) remain open.

**Why:** Three of the six blocked nothing structural and could be settled from evidence already gathered; leaving them open would have meant re-deriving the same context later.

## Client brand data in fixtures — the finding was partly overstated

Reviewed against the maintainer's objection, which was correct: the *template* was never at issue. `phase-05` step 3 neutralises every brand value, and shipping a neutral design system is the point of the project, not a risk to it. Phase 3 step 8 and Phase 9 step 7 run tooling against `win-ui-layout` locally and commit nothing.

The real exposure was two lines: `phase-02:55` proposed committing "the WIN Flavor ramps as a real-world case" as engine fixtures, and `phase-02:62` named `cal-poly-green` and `yellow-green` with their actual anchors — in a repository that must be public for `npx github:…` to resolve, with `files: ["packages","templates"]` including fixtures recursively.

**Decided: synthetic values, reference structure.** The fixtures reproduce anchor *positions* — one ramp at 950, one at 500 — because that is what the expansion maths turns on; the specific hex is inert. An invented dark colour at 950 exercises the identical code path. Nothing is lost and the question stops existing.

Worth recording that the finding as written conflated "tests against the reference project" with "ships the reference project's data", and the maintainer caught it. Adversarial review produces overstatement as well as understatement; both need checking.

## Rule 12 vs `globals.css` — narrowed

`contract:77` made `tokens.json` the only file where a font family may appear. `architecture.md:113` puts font imports in `globals.css`. The template's own file therefore violated the contract, making Phase 5's "zero violations" unreachable.

**Decided: `src/styles/globals.css` is exempt for `@import` and `@font-face` only.** A font *source* is not a font *token* — the family name in a webfont URL is how the file is fetched; the token is how the design system refers to it. `globals.css` is already the single hand-edited style file by design, so the exemption follows a boundary that already exists rather than inventing one.

Scoped to two at-rules, not to the file: the same family written into a custom property in that file is still a violation, and Phase 3 carries a success criterion asserting exactly that.

Rejected: modelling webfont URLs and `@font-face` descriptors as tokens — codegen would own a shape it has no good emission for. Rejected: demoting rule 12 to `[S]`, which moves a rule from enforced to suggested, the direction this project exists to reverse.

This is a narrowing decided against a case the contract had not considered, not a rule weakened because a check was failing. The distinction matters because the second is prohibited, and the two look alike from the outside — noted in `phase-03`'s risk section so the next such decision is held to the same test. Contract, validator and template change together in Phase 3 step 9 and Phase 5.

## The `[S]` rules had no reviewer — Phase 11 added

FR3 splits the contract in two: 24 `[V]` rules Phase 3 machine-checks, and five `[S]` rules that `contract:5` says "the agent skill reviews; a script cannot." Nothing built the skill. It was referenced three times — `phase-01:55` for the exit codes it branches on, `phase-03:15` as its authoritative input, `phase-03:56` for the `--json` shape built for it to consume — so three phases were designing against a consumer that did not exist, and the whole `[S]` half would have shipped as prose with no reviewer.

**Decided: in scope, as `phase-11-agent-skill-and-semantic-rules.md`, depending on 3 and 5.**

Two design calls inside it:

- **Contrast is split.** `contract:130` asks whether a generated ramp is *usable* — ADR-006 accepted that generation guarantees evenness, not accessibility. The ratio is arithmetic and belongs in `packages/engine/src/tokens/contrast.ts` beside `color.ts`; what a 3.1:1 pairing *means* depends on type size and is the skill's. Numbers to the engine, judgement to the skill.
- **The arithmetic stays `[S]`.** Promoting it to `[V]` is tempting — deterministic, and it grows the enforced set. But `[V]` fails the build, and a contrast threshold with a legitimate exception gets weakened by the first project that hits one. That is the prohibited move arriving by a side door.

Rejected: folding this into Phase 3. Deterministic rule code and a prompt-shaped artefact have different failure modes and different review standards, and merging them lets the softer half set the standard for the harder one. ADR-005's own framing draws the same line — the script is the floor, the skill is the ceiling, and the ceiling comes after the floor holds.

Phase 11 step 1 is a blocking decision of its own: where the skill lives. Recommendation recorded as toolkit-level, invoked against a project path — a project-local copy is a fork of the reviewer, and a hundred projects then hold a hundred drifting reviewers, which is this project's founding problem reproduced one level up.

## Follow-ups

- ADR-012 still blocks Phase 1 step 2. Surfaced to the maintainer with a fifth option the earlier analysis missed: `architecture.md:166` already verified that **`prepare` runs on git installs**, so a build at install time is documented as viable — at the cost ADR-012 rejected it for.
- Rules 9/11 vs grouped stories, and `create` into a non-empty directory, still unpresented.
- `docs/requirements.md` FR3 does not say where the skill lives or how it ships. Phase 11 step 8.
