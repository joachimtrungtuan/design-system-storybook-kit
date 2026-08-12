import assert from "node:assert/strict";
import test from "node:test";

import { PromptCancelledError } from "../errors.ts";
import { resolvePromptResult } from "./prompts.ts";

test("prompt cancellation always rolls back before exiting", async () => {
  const events: string[] = [];
  await assert.rejects(
    resolvePromptResult(
      Symbol("cancel"),
      () => {
        events.push("rollback");
      },
      () => true,
    ),
    PromptCancelledError,
  );
  assert.deepEqual(events, ["rollback"]);
});

test("a submitted prompt value does not invoke rollback", async () => {
  let rolledBack = false;
  const result = await resolvePromptResult(
    "project-name",
    () => {
      rolledBack = true;
    },
    () => false,
  );
  assert.equal(result, "project-name");
  assert.equal(rolledBack, false);
});
