import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";

import { ActionableError } from "../errors.ts";
import { buildCreatePlan, type CreateEnvironment } from "./plan.ts";

function environment(overrides: Partial<CreateEnvironment> = {}): CreateEnvironment {
  return {
    nodeVersion: "24.12.0",
    git: {
      present: true,
      userNameConfigured: true,
      userEmailConfigured: true,
      insideRepository: false,
      clean: false,
    },
    packageManager: { detected: "npm", source: "path", available: ["npm"] },
    templateFiles: ["src", "src/components", "package.json"],
    ...overrides,
  };
}

function baseInput(target: string, env = environment()) {
  return { target, engineVersion: "0.0.0", environment: env };
}

test("non-empty target without a template collision is allowed", async (context) => {
  const target = await mkdtemp(resolve(tmpdir(), "story-cli-create-plan-"));
  context.after(() => rm(target, { recursive: true, force: true }));
  await writeFile(resolve(target, "README.md"), "user-owned\n");
  await writeFile(resolve(target, "LICENSE"), "license\n");
  const plan = buildCreatePlan(baseInput(target));
  assert.equal(plan.target, target);
  assert.deepEqual(plan.collisions, []);
});

test("an existing src directory is a named collision", async (context) => {
  const target = await mkdtemp(resolve(tmpdir(), "story-cli-create-collision-"));
  context.after(() => rm(target, { recursive: true, force: true }));
  await mkdir(resolve(target, "src"));
  assert.throws(
    () => buildCreatePlan(baseInput(target)),
    (error: unknown) => error instanceof ActionableError && error.message.includes("src") && error.action.includes("ds adopt"),
  );
});

test("enclosing repository mode requires a clean tree", async (context) => {
  const target = await mkdtemp(resolve(tmpdir(), "story-cli-create-repo-"));
  context.after(() => rm(target, { recursive: true, force: true }));
  const env = environment({
    git: {
      present: true,
      userNameConfigured: true,
      userEmailConfigured: true,
      insideRepository: true,
      repositoryRoot: target,
      clean: false,
    },
  });
  assert.throws(() => buildCreatePlan(baseInput(resolve(target, "design-system"), env)), ActionableError);
  const independent = buildCreatePlan({
    ...baseInput(resolve(target, "design-system"), env),
    independentRepository: true,
  });
  assert.equal(independent.repositoryMode, "independent");
});
