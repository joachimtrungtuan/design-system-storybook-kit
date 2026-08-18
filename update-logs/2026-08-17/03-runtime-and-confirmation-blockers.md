# 03 — Phase 6 runtime and confirmation blockers

**What:** Verified the generated project with installed `ds validate`, Vite HTTP serving on port 5173, and Storybook HTTP serving on port 6006 using temporary elevated localhost permission. Added final-confirmation cancellation coverage and refreshed the Phase 6 evidence to 10/18.

**Why:** The prior blockers were environment/runtime proof and one untested prompt boundary. The server probes ran against a disposable generated project and both processes were terminated in the same shell after successful HTTP responses.

**Alternative considered:** Treating a terminal that printed “ready” as sufficient was rejected because cross-session probes could not see the listener and the normal sandbox fails with `listen EPERM`. Treating a manually edited fixture as automatic create-install proof was also rejected; the template’s default GitHub dependency is refused here with npm `EALLOWGIT`.

**Follow-ups:** The automatic install criterion remains pending until a Git-enabled/network-permitted environment runs the unmodified GitHub dependency path. Independent review remains pending because the review destination was rejected by the privacy guard; no source was transmitted to it.
