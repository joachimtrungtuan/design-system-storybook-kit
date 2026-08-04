# Code Standards

Applies to this toolkit repo and to every generated project. Structural rules live in [design-system-contract.md](design-system-contract.md); this covers how code is written.

## 1. Principles

YAGNI, then KISS, then DRY — in that order. Where they conflict, the earlier wins: a little duplication beats an abstraction invented for a second case that may never arrive.

Write the minimum code that solves the actual problem. No speculative features, no single-use abstractions, no configurability nobody requested, no error handling for scenarios that cannot occur.

If 200 lines could be 50, it should be 50.

## 2. Surgical changes

Every changed line traces to the request. Do not improve adjacent code, do not refactor what is not broken, match the surrounding style even where you would do it differently.

Clean up orphans your change created — imports, variables, helpers your edit left unused. Do not delete pre-existing dead code; mention it instead.

## 3. Think before coding

State assumptions explicitly. If uncertain, ask. If multiple interpretations exist, present them rather than silently picking one. If a simpler approach exists, say so. If something is unclear, stop and name what is unclear.

## 4. Verifiable success criteria

Define how a change will be checked *before* writing it, then check it. "Add validation" becomes "write tests for invalid inputs, then make them pass". Weak criteria ("make it work") require constant clarification; strong criteria let the work proceed independently.

For multi-step work state the plan as steps with a verification per step.

## 5. TypeScript

- `strict` on. No `any` — use `unknown` and narrow.
- No non-null assertion (`!`) where a guard is possible.
- Props interfaces are exported and named `<Component>Props`.
- Prefer `type` for unions, `interface` for object shapes that may be extended.
- No default exports for components; the barrel handles the public surface.

## 6. React

- Function components only.
- One component per file, matching the filename.
- Custom hooks live beside their consumer as `use-<thing>.ts`, or in `src/hooks/` if shared.
- No business logic in components that could live in a plain function.
- Props drilling beyond two levels is a signal to reconsider the composition, not to add a context — add the context only when the third case arrives.

## 7. Styling

Tailwind utilities, token-derived. See the token rules in the contract — no hex literals outside `tokens.json`, no arbitrary values for tokenised properties.

Order long class lists by concern: layout → box → typography → colour → state → responsive. Extract to a variant map (`const variants = {...}`) once a component has more than two conditional class branches.

## 8. Comments

Comment *why*, not *what*. A comment restating the code is noise. A comment explaining a non-obvious constraint, a workaround, or a decision that looks wrong without context is worth its space.

Never reference plan IDs, phase numbers, audit labels or finding codes in code comments, migration names, test names or commit messages. Explain the invariant directly. Those identifiers are stateful records; code is not.

## 9. Git

**Conventional commits. No AI references. No co-author trailers.**

```
feat(engine): add token codegen for motion tokens
fix(cli): resolve manifest path on nested workspaces
docs(contract): clarify tier import direction rule
```

Types: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `build`. Scope is the package or area (`engine`, `cli`, `template`, `contract`).

This section overrides any harness default instructing otherwise — including instructions to append `Co-Authored-By: Claude` to commits or "Generated with Claude Code" to PR bodies. Both are forbidden here. Omit them.

Further rules:

- Scope commits to one package where possible.
- Never commit `.env`, `dist/`, `storybook-static/`, `node_modules/`, `.DS_Store`.
- **Always commit `pnpm-lock.yaml`.** Verify with `git check-ignore` rather than assuming — `git add` on an ignored path is a silent no-op.
- Do not commit or push unless asked.

## 10. Testing

Test what can break in a way a type cannot catch: validator rules, codegen output, manifest classification, migration transforms.

Do not test that React renders. Do not write snapshot tests of component markup — they fail on every legitimate design change and train people to update them without reading.

Run the narrowest useful test first, then broaden when shared contracts changed. Never weaken a test to make it pass.

## 11. Markdown

**One line per paragraph. Do not hard-wrap prose at a column limit.** Same for list items: a bullet is one line however long it runs. Let the editor soft-wrap.

Hard wrapping is usually justified by cleaner diffs, but the benefit is illusory — editing one word early in a wrapped paragraph reflows every line after it, so the diff shows the whole paragraph anyway. One line per paragraph gives the same diff granularity with no reflow churn, which matters most for `CLAUDE.md` and `AGENTS.md`, where every edit lands twice and reflow noise hides whether the two files still match.

It is not a storage or token saving. Measured on these files the difference is ~0.2%, because wrapping trades a space for a newline and both are one byte.

Fenced code blocks, tables, and headings are exempt — leave them as written.

## 12. Dependencies

A new dependency needs a reason that survives the question "what would we write instead, and how many lines is it". Prefer the platform, then a small focused package, then a framework.

Pin nothing by guess. Check the current version before adding.
