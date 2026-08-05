# Red team — contract fidelity

Reviewer 4 of 4. Scope: `docs/design-system-contract.md` against `plans/260804-1648-story-cli-kit-implementation/`. Peer findings (security, failure modes, assumptions) are not repeated; where a peer already owns an adjacent issue it is cited, not restated.

## `[V]` rule map — contract → Phase 3

Contract carries **23** `[V]` rules. Phase 3 enumerates **24**.

| # | Contract | Rule | Phase 3 | Status |
| --- | --- | --- | --- | --- |
| 1 | `contract:37` | no dir under `src/components/` beyond the four tiers | `phase-03:23` | matched |
| 2 | `contract:38` | `src/stories/` subdirs = tiers + `foundations` + `pages` | `phase-03:24` | matched |
| 3 | `contract:50` | a tier imports from lower tiers only | `phase-03:25` | mismatched — scope, see F6 |
| 4 | `contract:55` | component dirs `kebab-case` | `phase-03:26` | matched |
| 5 | `contract:56` | component files `PascalCase.tsx` matching dir | `phase-03:27` | matched |
| 6 | `contract:57` | non-component modules `kebab-case.ts` | `phase-03:28` | matched |
| 7 | `contract:58` | component dir has `index.ts` | `phase-03:29` | matched |
| 8 | `contract:59` | tier dir has `index.ts` | `phase-03:30` | matched |
| 9 | `contract:65` | every component covered by one story at the mirrored path | `phase-03:31` | mismatched — see F5 |
| 10 | `contract:69` | story `title` is `<Tier>/<Name>` | `phase-03:32` | matched |
| 11 | `contract:71` | default export `title` + `component` as `Meta`, ≥1 `StoryObj` | `phase-03:33` | mismatched — see F5 |
| 12 | `contract:77` | `tokens.json` the only file with a raw colour / font family / type-scale value | `phase-03:34` | mismatched — see F3, F4 |
| 13 | `contract:78` | no hex / `rgb()` / `hsl()` in components, pages, `.storybook` | `phase-03:35` | matched (scope gap → F4) |
| 14 | `contract:79` | no arbitrary Tailwind values for tokenised properties | `phase-03:36` | matched |
| 15 | `contract:80` | `tokens.css` matches codegen output | `phase-03:37` | matched |
| 16 | `contract:118` | every ramp declares `$base`, `$anchor`, `$mode` | `phase-03:38` | mismatched — see F8 |
| 17 | `contract:119` | anchor step equals `$base` | `phase-03:39` | matched |
| 18 | `contract:120` | no ramp declares all twelve steps literally | `phase-03:40` | mismatched — see F2 |
| 19 | `contract:99` | `color.semantic.*` references another token | `phase-03:41` | matched |
| 20 | `contract:134` | five foundations `.mdx` | `phase-03:42` | matched |
| 21 | `contract:135` | `Introduction.mdx` with `<Meta title="Introduction" />` | `phase-03:43` | matched |
| 22 | `contract:141` | `main.ts` imports the engine preset | `phase-03:44` | matched |
| 23 | `contract:142` | `preview.tsx` imports and spreads the engine preview | `phase-03:45` | matched |
| — | **none** | top-level token group is a Tailwind namespace / camelCase / `$`-prefixed | `phase-03:46` (rule 24) | **no contract basis** — see F1 |

No contract `[V]` rule is missing from Phase 3. One validator rule has no contract text, five have plan wording that does not check what the contract states.

## `[S]` rule map — enforcement

| Contract | Rule | Enforcement anywhere in the plan |
| --- | --- | --- |
| `contract:51` | atom vs molecule judgement | none |
| `contract:73` | stories cover the states that matter | none — `phase-05:127` asserts it for the template only, by review |
| `contract:82` | token names are semantically honest | none |
| `contract:130` | generated ramp steps have usable contrast | none |
| `contract:137` | foundations docs reflect *current* tokens | partial and decaying — see F10 |

Five of five have no mechanism at the end of Phase 10. Root cause (the FR3 agent skill has no phase) is already owned by `redteam-260804-1648-assumptions-and-scope.md:97`; F10 below covers only the part that report does not.

---

### [Critical] Rule 24 exists in the plan and in no contract, and two phases each claim the fix

**Where:** `phase-03:46` (rule 24 in the validator table), `phase-03:92` (step 9 — "add rule 24's naming rule to the token-structure section"), `phase-05:70` ("This becomes a `[V]` rule in Phase 3"), `phase-05:111` (step 1 — "Land the contract change first … Phase 3's validator gains the matching `[V]` rule"), `plan.md:125` ("Token group names follow Tailwind v4's `@theme` namespaces — **Phase 5**"), `plan.md:140`, `plan.md:150` ("Doc changes owed: `docs/design-system-contract.md` (2, 3, 4)"); `docs/design-system-contract.md:86-97` (the token-structure block as it stands), `CLAUDE.md` ("Changing the contract means changing `docs/design-system-contract.md`, the validator, and the template together. Any one alone is a bug.").

**Mismatch:** Three defects in one rule. (a) The contract has no rule 24 and no `[V]` marker anywhere in its token-structure section — the rule currently lives only in plan prose, which is the precise state the project exists to end. (b) Ownership is doubled: `phase-03:92` puts the contract edit in Phase 3, `phase-05:111`/`plan.md:125`/`plan.md:150` put it in Phase 5. Phase 3 runs first and cannot implement rule 24 against contract text Phase 5 is scheduled to write; whichever phase runs second will find the edit already made or, worse, make it twice with different wording. (c) The contract's group block (`contract:88-97`) is a closed list of nine groups; `breakpoint`, `container`, `zIndex`, `icon` and `$meta` are adopted at `phase-05:57-67` and appear nowhere in it. A validator implementing rule 24 would accept five groups the contract's own structure block does not name, so contract and validator disagree from the first commit.

**Smallest fix:** Assign the contract edit to Phase 3 alone (it is the phase that ships the rule), strike the Phase 5 duplicate at `:111` down to "verify the contract already carries the rule", and make the edit add both the naming rule *and* the five adopted groups to `contract:88-97` in the same change. Correct `plan.md:125`/`:150` to name Phase 3.

---

### [High] Rule 18 is keyed to "twelve steps"; the scale the contract describes has eleven

**Where:** `contract:103` ("the engine generates the 50–950 scale"), `contract:120` (rule 18 — "No ramp declares all twelve steps literally"), `contract:126` ("without abandoning generation for the other eleven"), `phase-02:23` ("Generate a 50–950 ramp (12 steps: 50, 100, 200 … 900, 950)"), `phase-03:40`.

**Mismatch:** `50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950` is eleven values, not twelve. `phase-02:23` states the count and enumerates the set in the same sentence and they disagree. Two consequences. If the implementation follows the enumeration, rule 18 is stated as a threshold no ramp can ever reach — a fully hand-authored eleven-step ramp passes the one rule written to forbid hand-authored ramps, and `phase-02:76` ("A ramp declaring all twelve steps literally is rejected") has no test that can fail. If it follows the count, codegen emits a twelfth step nobody has named and `contract:126`'s "the other eleven" becomes wrong in the opposite direction.

**Smallest fix:** Enumerate the step set once, in the contract's ramp section, as data. Then restate rule 18 as a shape rule rather than a count — "a ramp declares no literal numeric step outside `$overrides`" — which is what `contract:125` already asserts as an invariant (see F7) and is immune to the step count changing.

---

### [High] Rule 12 forbids a font family outside `tokens.json`; three documents require one in `globals.css`

**Where:** `contract:77` (rule 12 — "`tokens.json` is the only file where a raw colour value, **font family**, or type-scale value may appear"), `contract:33` ("`globals.css` hand-edited; imports `tokens.css`"), `architecture.md:113` ("`globals.css` remains hand-edited **for font imports** and base layer rules"), `phase-05:43` ("`globals.css` hand-edited, importing generated `tokens.css`"), `phase-03:34` (rule 12 restated verbatim), `phase-03:109` (flags rule 12 as ambiguous, does not name this case), `phase-05:125` ("`ds validate` reports zero violations").

**Mismatch:** A font import in `globals.css` is a font family named in a second file — `@import url('…family=Inter…')` carries the family name, and an `@font-face` block or a base-layer `font-family` declaration carries it literally. `architecture.md:113` states this file exists for exactly that purpose. Rule 12 as worded makes the template's own `globals.css` a violation, so `phase-05:125` and rule 12 cannot both hold. Phase 3 names rule 12 as a likely ambiguity but proposes no wording, and its step order has the template built against a rule whose scope is undecided.

**Smallest fix:** Amend `contract:77` to exempt `src/styles/globals.css` for font *sourcing* (`@import`, `@font-face`) while keeping the family-to-token binding in `tokens.json` — one clause, and it matches what `architecture.md:113` already documents. Phase 3 implements rule 12 against that exemption rather than discovering it in Phase 5.

---

### [High] Rule 13's three directories cannot deliver rule 12's "only file"

**Where:** `contract:77` (rule 12 — *only* file), `contract:78` (rule 13 — "No hex literal, `rgb()`, or `hsl()` in `src/components/**`, `src/pages/**`, or `.storybook/**`"), `phase-03:34-35`, `contract:24` (`src/stories/foundations/` — "token & brand documentation"), `contract:137` (`[S]` — whether foundations docs reflect the *current* tokens), `phase-05:118` (six MDX docs, "prose sections stay hand-written").

**Mismatch:** Rule 12 claims a whole-project scope; rule 13 is the only rule with a mechanism and it names three directories. `src/stories/**` and `src/styles/globals.css` are outside both. `src/stories/foundations/Colors.mdx` is the single most likely file in the tree to contain a hardcoded hex — it documents colours, and `phase-05:118` says only part of it is generated — and it is exempt from the one rule that would catch it. The gap is not theoretical: `contract:137` exists because these docs go stale, and a hardcoded hex is how they go stale invisibly.

**Smallest fix:** Extend rule 13's directory list at `contract:78` to `src/stories/**` and `src/styles/globals.css` (the latter with the F3 font exemption), and update `phase-03:35`. If MDX needs a narrow escape for a deliberate swatch example, name it in the contract rather than by omission.

---

### [High] Rule 9's grouped-story allowance and rule 11's single `component` field cannot both hold

**Where:** `contract:65` (rule 9 — every component covered), `contract:67` ("Story files may group related components (`Cards.stories.tsx` covering all card variants)"), `contract:71` (rule 11 — "exports a `default` object with `title` **and** `component`"), `phase-03:33` (rule 11 restated), `phase-03:69` ("or is exported from a grouped story file at the mirrored path"), `phase-05:82` ("Neutrally that is one `card` component with variants … the contract explicitly permits a grouped `Cards.stories.tsx`").

**Mismatch:** Storybook's `Meta.component` is singular. A story file grouping three components declares one of them; the other two are covered by rule 9 with no `component` binding for the validator to match on. `phase-03:69` proposes "is exported from a grouped story file" as the fallback signal, but a `*.stories.tsx` file's named exports are `StoryObj`s, not components — there is nothing there to resolve back to `src/components/molecules/product-card/`. So rule 9 as specified has no data source for the grouped case, and rule 11 as specified forbids the only shape that would supply one. The template hits this deliberately at `phase-05:82`.

**Smallest fix:** Make the grouped case explicit and machine-readable in the contract: a grouped story file declares its covered components in one place (`component` for the primary, plus a named `subcomponents` map — Storybook's own mechanism), and rule 11 requires `component` or `subcomponents`. Rule 9 then resolves coverage from a real field instead of from export shape.

---

### [High] `pages` is a contract tier with zero `[V]` coverage

**Where:** `contract:48` (tier table — "**pages** | templates + everything | Concrete content in a template. Lives in `src/pages/`, documented under `stories/pages/`"), `contract:50` (rule 3 — "A tier may import from lower tiers only"), `contract:30` (`src/pages/` in the layout), `contract:37-38` (rules 1 and 2 — components scoped to four tiers, `stories/pages/` merely permitted), `contract:65` (rule 9 — scoped to `src/components/**`), `phase-03:23-25`, `phase-05:80` (one composed page with a story, by intent).

**Mismatch:** The contract defines five tiers and validates four. Nothing requires a file in `src/pages/**` to have a story under `stories/pages/`, so `stories/pages/` may legitimately exist and be empty forever while `src/pages/` fills up — the exact undocumented-component failure `contract:65` calls "the single most important rule in the contract", exempted by scope. Rule 3's Phase 3 wording inherits the same scope: an atom importing from `src/pages/` is a tier inversion the contract's own table forbids and the rule as scoped to `src/components/**` never sees.

**Smallest fix:** State the pages requirement as `[V]` at `contract:48` ("every module in `src/pages/**` is covered by a story under `src/stories/pages/`") and extend rule 3's file set to `src/pages/**` in `phase-03:25`. Two lines, no new concept — the contract already asserts both.

---

### [Medium] The layout block is enforced only negatively — nothing has to exist

**Where:** `contract:9-35` (the directory layout, including `.designsystem/manifest.json`, `tokens.json`, `src/styles/globals.css`), `contract:33` ("`globals.css` hand-edited; **imports `tokens.css`**"), `contract:37-38` (both rules are prohibitions), `architecture.md:113`, `phase-09:38` and `:49` (`adopt` merges "a `globals.css` `@import`" of the generated tokens, and that merge is one of only four sanctioned write classes), `phase-03:23-24`.

**Mismatch:** Every layout rule in the contract is of the form "no X other than Y". No `[V]` rule requires `.designsystem/manifest.json`, `tokens.json` or `src/styles/globals.css` to exist, and none requires `globals.css` to actually import `tokens.css`. A project whose manifest was deleted passes `ds validate` and then breaks `update` and `adopt`, which both read it as their only signal. Worse for `adopt`: its `globals-css` merger writes precisely the import that no rule verifies, so the one thing `adopt` promises to have done is the one thing the post-adoption validate at `phase-09:86` cannot confirm.

**Smallest fix:** One positive existence rule in the contract covering the three files the layout marks as required, with the `globals.css` → `tokens.css` import as its second clause. It is a single validator module and it closes `adopt`'s verification hole for free.

---

### [Medium] Rule 16 checks that `$mode` and `$anchor` are present, not that they are legal

**Where:** `contract:110` (`"$mode": "oklch" | "hsl"`), `contract:107` (`"$anchor": 950` — "which step `$base` occupies"), `contract:118` (rule 16 — "Every ramp **declares** `$base`, `$anchor` and `$mode`"), `phase-03:38`, `phase-02:22` ("`$base` / `$anchor` / `$mode` **required** per ramp"), `phase-02:75` (criterion — "A ramp missing `$mode` fails parse").

**Mismatch:** Contract, plan and success criterion all check presence. `"$mode": "lab"` and `"$anchor": 42` satisfy every one of them and reach `ramp.ts`, which `phase-02:39` specifies as two mode-specific code paths with no third. `$anchor` off the step scale breaks rule 17's anchor-fidelity check with no rule naming the cause — the generator will be blamed for a token-file error, and `contract:119` says explicitly that an anchor mismatch is a generator bug.

**Smallest fix:** Reword rule 16 at `contract:118` to "declares `$base`, `$anchor` and `$mode`, with `$mode` one of `oklch` / `hsl` and `$anchor` one of the declared steps". Presence-plus-membership is the same module.

---

### [Medium] The `ds validate` rename is owed by Phase 3 and leaves a third spelling behind

**Where:** `contract:148` ("`pnpm ds:validate` runs every **[V]** rule"), `update-and-migration.md:54` ("**Validate.** Run `ds:validate`"), `plan.md:146-148` (open question 4 — "The contract names `ds validate`"), `plan.md:150` ("Doc changes owed: `docs/design-system-contract.md` (2, 3, 4), `docs/update-and-migration.md` (1)"), `phase-03:92` (step 9, the contract edit only), `phase-07` (the update pipeline, no doc-sync step for this).

**Mismatch:** Three spellings of one command across the docs: `pnpm ds:validate` (contract), `ds:validate` (update-and-migration), `ds validate` (every phase file). The plan's owed-doc-changes list assigns `update-and-migration.md` only item 1 — the migrate retrieval step — so `update-and-migration.md:54` keeps the pnpm-era script name after Phase 3 fixes the contract. The update pipeline's step 6 then names a command the binary does not expose, in the document `architecture.md:89` calls the "full detail" for that pipeline.

**Smallest fix:** Add `update-and-migration.md:54` to Phase 3 step 9's edit list. One word.

---

### [Medium] The one `[S]` rule the plan partly mechanises is the one that will silently rot

**Where:** `contract:137` (`[S]` — "Whether foundations docs reflect the *current* tokens. **Generated-from-tokens where practical**; prose sections are the agent's responsibility"), `phase-05:118` (step 8 — "Generate from tokens where practical (Colors, Spacing, Typography largely can be)"), `contract:80` (rule 15 — staleness check, scoped to `src/styles/tokens.css` alone), `update-and-migration.md:52` (update step 4 — "**Regenerate** `src/styles/tokens.css`" and nothing else), `architecture.md:42` (the generated category — `src/styles/tokens.css`, one entry).

**Mismatch:** Phase 5 produces MDX content derived from `tokens.json`, but the generated-file category holds exactly one path, `update` regenerates exactly one path, and rule 15's staleness check covers exactly one path. So three foundations documents are token-derived at authoring time and hand-owned forever after: a `$base` edit updates `tokens.css` and leaves `Colors.mdx` showing the old ramp, with no rule and no command able to notice. The `[S]` rule that exists precisely to catch this is unenforced (the agent skill has no phase — `redteam-260804-1648-assumptions-and-scope.md:97`), so nothing catches it at either level. This is the drift mode the contract names, arriving through the template's own generation step.

**Smallest fix:** Decide it once in Phase 5: either the token-derived MDX sections are genuinely generated — added to the generated-file list, regenerated by `update`, covered by rule 15's staleness comparison — or they are hand-written and `phase-05:118`'s "generate from tokens where practical" is struck so nobody believes they self-maintain. The half state is the only unworkable one.

---

## Unresolved questions

1. **Does rule 12 have a mechanism at all, or is it a heading over rule 13?** The contract states it as an independent rule and Phase 3 lists it as one, but no phase describes how a "type-scale value" is recognised outside `tokens.json`. If rule 12 is only rules 13+14 restated, say so and drop it to prose under them — 24 rules where one is a summary of two others makes the count itself unreliable.
2. **`$overrides` at the anchor step.** `phase-02:64` flags that the contract does not say how it resolves, and defers to the maintainer if a fixture hits it. Rule 17 (`contract:119`) says the anchor equals `$base` unconditionally, which reads as an answer — override refused. Confirming that in the contract turns a deferred decision into a rule.
3. **Which document owns the step set?** F2 needs the eleven-or-twelve question answered somewhere authoritative. The contract's ramp section is the natural owner; `phase-02:23` currently owns it by accident.
4. **Brand surfaces** (`contract:144`) remain unspecified as a token group — owned by `redteam-260804-1648-assumptions-and-scope.md:61`, flagged here only because whatever key is chosen must also clear rule 24 and be added to `contract:88-97` in the same edit as F1.
5. **Does anything ship the contract into a generated project?** `architecture.md:31` lists "Contract documentation shipped for agent reference" as engine surface. `phase-05:98-107` does not create it and no other phase does — already raised at `redteam-260804-1648-assumptions-and-scope.md:97`; noted here because a contract agents cannot read is a contract with no `[S]` enforcement path even after the skill exists.
