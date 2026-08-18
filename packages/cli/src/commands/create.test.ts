import assert from "node:assert/strict";
import { access, mkdtemp, rm } from "node:fs/promises";
import { resolve } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";

import { PromptCancelledError } from "../errors.ts";
import { runCreate } from "./create.ts";

test("cancelling final create confirmation leaves the target untouched", async (context) => {
  const target = await mkdtemp(resolve(tmpdir(), "story-cli-create-confirm-"));
  context.after(() => rm(target, { recursive: true, force: true }));

  await assert.rejects(
    runCreate({
      target,
      promptDependencies: {
        confirm: async () => {
          throw new PromptCancelledError();
        },
      },
    }),
    PromptCancelledError,
  );

  await assert.rejects(access(resolve(target, "package.json")));
});
