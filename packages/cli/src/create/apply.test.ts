import assert from "node:assert/strict";
import { access, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";

import { toolkitRoot } from "../../../engine/src/template/materialise.ts";
import { ActionableError } from "../errors.ts";
import { EXIT_CODES } from "../exit-codes.ts";
import { applyCreate, type CreateApplyDependencies } from "./apply.ts";
import type { CreatePlan } from "./plan.ts";

function plan(target: string, noInstall = true, overrides: Partial<CreatePlan> = {}): CreatePlan {
  return {
    target,
    projectName: "example-system",
    packageManager: "npm",
    noInstall,
    repositoryMode: "new",
    repositoryRoot: target,
    templateFiles: [],
    collisions: [],
    preservedFiles: ["README.md"],
    toolkitSpecifier: "file:/toolkit",
    engineVersion: "0.0.0",
    ...overrides,
  };
}

test("create writes a rendered manifest and preserves allowed user files", async (context) => {
  const target = await mkdtemp(resolve(tmpdir(), "story-cli-create-apply-"));
  context.after(() => rm(target, { recursive: true, force: true }));
  await writeFile(resolve(target, "README.md"), "user-owned\n");
  const messages: string[] = [];
  const gitCalls: string[][] = [];

  const result = await applyCreate({
    plan: plan(target),
    toolkitRoot: await toolkitRoot(),
    reporter: { info: (message) => messages.push(message), warn: (message) => messages.push(message) },
    dependencies: {
      git: (_cwd, args) => gitCalls.push([...args]),
      validate: async () => EXIT_CODES.success,
      install: async () => {
        throw new Error("install should be skipped");
      },
    },
  });

  assert.equal(result.exitCode, EXIT_CODES.success);
  assert.equal(await readFile(resolve(target, "README.md"), "utf8"), "user-owned\n");
  const manifest = JSON.parse(await readFile(resolve(target, ".designsystem/manifest.json"), "utf8")) as {
    files: Record<string, { mark?: string }>;
    appliedMigrations: string[];
  };
  assert.equal(manifest.files["package.json"]?.mark, "rendered");
  assert.deepEqual(manifest.appliedMigrations, []);
  assert.ok(gitCalls.some((args) => args[0] === "commit"));
  assert.ok(messages.some((message) => message.includes("Skipped dependency installation")));
});

test("a failure before commit rolls back only ledger paths", async (context) => {
  const target = await mkdtemp(resolve(tmpdir(), "story-cli-create-rollback-"));
  context.after(() => rm(target, { recursive: true, force: true }));
  await writeFile(resolve(target, "README.md"), "keep me\n");

  await assert.rejects(
    applyCreate({
      plan: plan(target),
      toolkitRoot: await toolkitRoot(),
      dependencies: {
        git: (_cwd, args) => {
          if (args[0] === "commit") throw new Error("commit failed");
        },
      },
    }),
  );

  assert.equal(await readFile(resolve(target, "README.md"), "utf8"), "keep me\n");
  await assert.rejects(readFile(resolve(target, "package.json"), "utf8"));
});

test("pre-commit failures at each apply stage roll back generated files", async (context) => {
  const failures: Record<string, CreateApplyDependencies> = {
    materialisation: {
      materialise: async () => {
        throw new Error("materialisation failed");
      },
    },
    codegen: {
      regenerateAllTierBarrels: async () => {
        throw new Error("codegen failed");
      },
    },
    manifest: {
      createManifest: async () => {
        throw new Error("manifest failed");
      },
    },
    staging: {
      git: (_cwd, args) => {
        if (args[0] === "add") throw new Error("staging failed");
      },
    },
  };

  for (const [stage, dependencies] of Object.entries(failures)) {
    const target = await mkdtemp(resolve(tmpdir(), `story-cli-create-${stage}-`));
    context.after(() => rm(target, { recursive: true, force: true }));

    await assert.rejects(
      applyCreate({
        plan: plan(target),
        toolkitRoot: await toolkitRoot(),
        dependencies,
      }),
    );

    await assert.rejects(readFile(resolve(target, "package.json"), "utf8"));
    await assert.rejects(readFile(resolve(target, ".designsystem/manifest.json"), "utf8"));
  }
});

test("rollback restores a pre-existing file when an apply stage overwrote it", async (context) => {
  const target = await mkdtemp(resolve(tmpdir(), "story-cli-create-restore-"));
  context.after(() => rm(target, { recursive: true, force: true }));
  const original = '{"name":"user-owned"}\n';
  await writeFile(resolve(target, "package.json"), original);

  await assert.rejects(
    applyCreate({
      plan: plan(target),
      toolkitRoot: await toolkitRoot(),
      dependencies: {
        git: (_cwd, args) => {
          if (args[0] === "commit") throw new Error("commit failed");
        },
      },
    }),
  );

  assert.equal(await readFile(resolve(target, "package.json"), "utf8"), original);
});

test("enclosing commit failure resets only the scaffold paths it staged", async (context) => {
  const parent = await mkdtemp(resolve(tmpdir(), "story-cli-create-parent-"));
  context.after(() => rm(parent, { recursive: true, force: true }));
  const target = resolve(parent, "design-system");
  const calls: string[][] = [];
  await assert.rejects(
    applyCreate({
      plan: plan(target, true, {
        repositoryMode: "enclosing",
        repositoryRoot: parent,
        parentRepositoryRoot: parent,
      }),
      toolkitRoot: await toolkitRoot(),
      dependencies: {
        git: (_cwd, args) => {
          calls.push([...args]);
          if (args[0] === "commit") throw new Error("commit failed");
        },
      },
    }),
  );
  assert.ok(calls.some((args) => args[0] === "reset"));
  await assert.rejects(readFile(resolve(target, "package.json"), "utf8"));
});

test("a partially failing git init is removed during rollback", async (context) => {
  const target = await mkdtemp(resolve(tmpdir(), "story-cli-create-init-"));
  context.after(() => rm(target, { recursive: true, force: true }));
  await assert.rejects(
    applyCreate({
      plan: plan(target),
      toolkitRoot: await toolkitRoot(),
      dependencies: {
        git: (_cwd, args) => {
          if (args[0] === "init") {
            mkdirSync(resolve(target, ".git"));
            throw new Error("git init failed after creating .git");
          }
        },
      },
    }),
  );
  await assert.rejects(access(resolve(target, ".git")));
});

test("install failure keeps the committed scaffold and gives a retry instruction", async (context) => {
  const target = await mkdtemp(resolve(tmpdir(), "story-cli-create-install-"));
  context.after(() => rm(target, { recursive: true, force: true }));
  await assert.rejects(
    applyCreate({
      plan: plan(target, false),
      toolkitRoot: await toolkitRoot(),
      dependencies: {
        git: () => undefined,
        install: async () => {
          throw new Error("registry unavailable");
        },
      },
    }),
    (error: unknown) => error instanceof ActionableError && error.message.includes("installation failed"),
  );
  assert.match(await readFile(resolve(target, "package.json"), "utf8"), /story-cli-kit/u);
});

test("workspace registration is reported without editing the parent declaration", async (context) => {
  const parent = await mkdtemp(resolve(tmpdir(), "story-cli-create-workspace-"));
  context.after(() => rm(parent, { recursive: true, force: true }));
  const target = resolve(parent, "packages/design-system");
  const declarationFile = resolve(parent, "package.json");
  const original = '{"workspaces":[]}\n';
  await writeFile(declarationFile, original);
  const messages: string[] = [];

  await applyCreate({
    plan: plan(target, true, {
      workspace: {
        kind: "package-json",
        root: parent,
        declarationFile,
        registration: '"packages/design-system"',
      },
    }),
    toolkitRoot: await toolkitRoot(),
    reporter: { info: (message) => messages.push(message), warn: (message) => messages.push(message) },
    dependencies: { git: () => undefined },
  });

  assert.equal(await readFile(declarationFile, "utf8"), original);
  assert.ok(messages.some((message) => message.includes('"packages/design-system"')));
});

test("independent nested repositories report the parent integration instruction", async (context) => {
  const parent = await mkdtemp(resolve(tmpdir(), "story-cli-create-independent-"));
  context.after(() => rm(parent, { recursive: true, force: true }));
  const target = resolve(parent, "packages/design-system");
  const messages: string[] = [];

  await applyCreate({
    plan: plan(target, true, {
      repositoryMode: "independent",
      repositoryRoot: target,
      parentRepositoryRoot: parent,
    }),
    toolkitRoot: await toolkitRoot(),
    reporter: { info: (message) => messages.push(message), warn: (message) => messages.push(message) },
    dependencies: { git: () => undefined },
  });

  assert.ok(messages.some((message) => message.includes("as a submodule")));
  assert.ok(messages.some((message) => message.includes(".gitignore")));
});

test("validation failure keeps the committed scaffold for inspection", async (context) => {
  const target = await mkdtemp(resolve(tmpdir(), "story-cli-create-validate-"));
  context.after(() => rm(target, { recursive: true, force: true }));
  const calls: string[][] = [];

  await assert.rejects(
    applyCreate({
      plan: plan(target, false),
      toolkitRoot: await toolkitRoot(),
      dependencies: {
        git: (_cwd, args) => calls.push([...args]),
        install: async () => undefined,
        validate: async () => EXIT_CODES.validationFailure,
      },
    }),
    (error: unknown) => error instanceof ActionableError && error.message.includes("did not pass ds validate"),
  );

  assert.ok(calls.some((args) => args[0] === "commit"));
  assert.match(await readFile(resolve(target, "package.json"), "utf8"), /story-cli-kit/u);
  assert.ok(await readFile(resolve(target, ".designsystem/manifest.json"), "utf8"));
});
