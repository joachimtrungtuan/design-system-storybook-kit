import assert from "node:assert/strict";
import test from "node:test";

import { PromptCancelledError } from "../errors.ts";
import { collectCreatePromptAnswers, type CreatePromptDependencies } from "./prompts.ts";

function gitEnvironment(insideRepository = false) {
  return {
    present: true,
    userNameConfigured: true,
    userEmailConfigured: true,
    insideRepository,
    clean: true,
  };
}

test("an empty-directory flow asks only for its target", async () => {
  const calls: string[] = [];
  const dependencies: CreatePromptDependencies = {
    text: async () => {
      calls.push("target");
      return "design-system";
    },
    select: async <Value>() => {
      calls.push("repository");
      return false as Value;
    },
  };

  const answers = await collectCreatePromptAnswers({
    git: gitEnvironment(),
    rollback: () => undefined,
    dependencies,
  });

  assert.deepEqual(answers, { target: "design-system" });
  assert.deepEqual(calls, ["target"]);
});

test("an existing repository defaults to the enclosing history choice", async () => {
  const messages: string[] = [];
  const answers = await collectCreatePromptAnswers({
    target: "design-system",
    git: gitEnvironment(true),
    rollback: () => undefined,
    dependencies: {
      select: async <Value>(message: string) => {
        messages.push(message);
        return false as Value;
      },
    },
  });

  assert.deepEqual(answers, { target: "design-system", independentRepository: false });
  assert.deepEqual(messages, ["This target is inside an existing repository. Where should its history live?"]);
});

test("an explicit independent choice suppresses the repository prompt", async () => {
  let prompted = false;
  const answers = await collectCreatePromptAnswers({
    target: "design-system",
    independentRepository: true,
    git: gitEnvironment(true),
    rollback: () => undefined,
    dependencies: {
      select: async <Value>() => {
        prompted = true;
        return false as Value;
      },
    },
  });

  assert.deepEqual(answers, { target: "design-system", independentRepository: true });
  assert.equal(prompted, false);
});

test("cancellation at each create prompt invokes rollback and stops before apply", async () => {
  for (const [label, options] of [
    ["target", {
      git: gitEnvironment(),
      dependencies: {
        text: async (_message: string, rollback: () => void | Promise<void>) => {
          await rollback();
          throw new PromptCancelledError();
        },
      },
    }],
    ["repository", {
      target: "design-system",
      git: gitEnvironment(true),
      dependencies: {
        select: async <Value>(_message: string, _options: unknown[], rollback: () => void | Promise<void>) => {
          await rollback();
          throw new PromptCancelledError();
        },
      },
    }],
  ] as const) {
    let rollbacks = 0;
    await assert.rejects(
      collectCreatePromptAnswers({
        ...options,
        rollback: () => {
          rollbacks += 1;
        },
      }),
      PromptCancelledError,
      label,
    );
    assert.equal(rollbacks, 1, label);
  }
});
