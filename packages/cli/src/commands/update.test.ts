import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import test from "node:test";

import { createManifest, listProjectFiles, writeManifestObject } from "../../../engine/src/manifest/index.ts";
import { regenerateAllTierBarrels } from "../../../engine/src/scaffold/component.ts";
import { materialiseTemplate } from "../../../engine/src/template/materialise.ts";
import { ActionableError } from "../errors.ts";
import { runUpdate } from "./update.ts";

function runGit(cwd: string, args: readonly string[]): void {
  execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
}

async function createFixtureProject(root: string): Promise<void> {
  await materialiseTemplate({
    destination: root,
    projectName: "fixture-system",
    packageManager: "npm",
    toolkitSpecifier: "file:/toolkit",
  });
  await regenerateAllTierBarrels(root);
  const files = await listProjectFiles(root);
  const manifest = await createManifest({
    root,
    engineVersion: "0.0.0",
    createdWith: "0.0.0",
    templateId: "storybook-vite",
    appliedMigrations: [],
    files,
  });
  await writeManifestObject(root, manifest);
  runGit(root, ["init"]);
  runGit(root, ["config", "user.email", "test@example.com"]);
  runGit(root, ["config", "user.name", "Test"]);
  runGit(root, ["add", "--", "."]);
  runGit(root, ["commit", "-m", "chore: scaffold"]);
}

function currentBranch(root: string): string {
  return execFileSync("git", ["branch", "--show-current"], { cwd: root, encoding: "utf8" }).trim();
}

test("--to is refused as not implemented and makes no git calls", async (context) => {
  const root = await mkdtemp(resolve(tmpdir(), "story-cli-update-cmd-to-"));
  context.after(() => rm(root, { recursive: true, force: true }));
  await createFixtureProject(root);
  const calls: string[][] = [];

  await assert.rejects(
    runUpdate({ cwd: root, to: "2.0.0", git: (_cwd, args) => calls.push([...args]) }),
    (error: unknown) => error instanceof ActionableError && error.message.includes("--to"),
  );
  assert.deepEqual(calls, []);
});

test("an unsupported --on-conflict strategy is refused", async (context) => {
  const root = await mkdtemp(resolve(tmpdir(), "story-cli-update-cmd-conflict-"));
  context.after(() => rm(root, { recursive: true, force: true }));
  await createFixtureProject(root);

  await assert.rejects(
    runUpdate({ cwd: root, onConflict: "migrate" }),
    (error: unknown) => error instanceof ActionableError && error.message.includes("--on-conflict=migrate"),
  );
});

test("a dirty working tree is refused before any branch is created", async (context) => {
  const root = await mkdtemp(resolve(tmpdir(), "story-cli-update-cmd-dirty-"));
  context.after(() => rm(root, { recursive: true, force: true }));
  await createFixtureProject(root);
  await writeFile(resolve(root, "README.md"), "dirty\n");
  const calls: string[][] = [];

  await assert.rejects(
    runUpdate({ cwd: root, git: (_cwd, args) => calls.push([...args]) }),
    (error: unknown) => error instanceof ActionableError && error.message.includes("clean working tree"),
  );
  assert.deepEqual(calls, []);
});

test("dry run creates no branch and writes nothing", async (context) => {
  const root = await mkdtemp(resolve(tmpdir(), "story-cli-update-cmd-dry-"));
  context.after(() => rm(root, { recursive: true, force: true }));
  await createFixtureProject(root);
  const startingBranch = currentBranch(root);
  const messages: string[] = [];

  const result = await runUpdate({
    cwd: root,
    dryRun: true,
    reporter: { info: (message) => messages.push(message), warn: (message) => messages.push(message) },
  });

  assert.equal(result.branch, undefined);
  assert.equal(currentBranch(root), startingBranch);
  assert.ok(messages.some((message) => message.includes("Dry run")));
  const branches = execFileSync("git", ["branch", "--list"], { cwd: root, encoding: "utf8" });
  assert.doesNotMatch(branches, /ds-update/u);
});

test("a real run creates an update branch, commits the result, and writes a report", async (context) => {
  const root = await mkdtemp(resolve(tmpdir(), "story-cli-update-cmd-real-"));
  context.after(() => rm(root, { recursive: true, force: true }));
  await createFixtureProject(root);

  const result = await runUpdate({
    cwd: root,
    pipeline: async (options) => ({
      previousEngineVersion: "0.0.0",
      engineVersion: options.engineVersion,
      classified: [],
      manifest: { schemaVersion: 1, engineVersion: options.engineVersion, templateId: "storybook-vite", createdWith: "0.0.0", appliedMigrations: [], files: {} },
      validation: { root: options.root, violations: [] },
    }),
  });

  assert.match(result.branch ?? "", /^ds-update\//u);
  assert.equal(currentBranch(root), result.branch);
  const log = execFileSync("git", ["log", "--oneline", "-1"], { cwd: root, encoding: "utf8" });
  assert.match(log, /chore: update design-system engine/u);
  const dateFolders = await readdir(resolve(root, "update-logs"));
  assert.equal(dateFolders.length, 1);
  const reportFiles = await readdir(resolve(root, "update-logs", dateFolders[0] ?? ""));
  assert.equal(reportFiles.length, 1);
  const reportContent = await readFile(resolve(root, "update-logs", dateFolders[0] ?? "", reportFiles[0] ?? ""), "utf8");
  assert.match(reportContent, /# Engine update 0\.0\.0/u);
});

test("a pipeline failure after branch creation is reported without deleting the branch", async (context) => {
  const root = await mkdtemp(resolve(tmpdir(), "story-cli-update-cmd-fail-"));
  context.after(() => rm(root, { recursive: true, force: true }));
  await createFixtureProject(root);

  await assert.rejects(
    runUpdate({
      cwd: root,
      pipeline: async () => {
        throw new Error("boom");
      },
    }),
    (error: unknown) => error instanceof ActionableError && error.message.includes("ds update failed on branch"),
  );
  assert.match(currentBranch(root), /^ds-update\//u);
});
