import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import test from "node:test";

import { createManifest, listProjectFiles, readManifest, writeManifestObject } from "../manifest/index.ts";
import { regenerateAllTierBarrels } from "../scaffold/component.ts";
import { materialiseTemplate } from "../template/materialise.ts";
import { runUpdatePipeline } from "./pipeline.ts";

async function createFixtureProject(root: string, engineVersion = "1.0.0"): Promise<void> {
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
    engineVersion,
    createdWith: engineVersion,
    templateId: "storybook-vite",
    appliedMigrations: [],
    files,
  });
  await writeManifestObject(root, manifest);
}

test("a fresh project is entirely unmodified or generated, and update leaves it byte-identical", async (context) => {
  const root = await mkdtemp(resolve(tmpdir(), "story-cli-update-fresh-"));
  context.after(() => rm(root, { recursive: true, force: true }));
  await createFixtureProject(root);
  const before = await readFile(resolve(root, "src/components/atoms/button/Button.tsx"), "utf8");

  const result = await runUpdatePipeline({ root, engineVersion: "1.0.0", dryRun: false });

  assert.ok(result.classified.every((file) => file.category === "unmodified" || file.category === "generated"));
  assert.equal(await readFile(resolve(root, "src/components/atoms/button/Button.tsx"), "utf8"), before);
  assert.equal(result.validation?.violations.length, 0);
});

test("dry run writes nothing to disk and skips validation", async (context) => {
  const root = await mkdtemp(resolve(tmpdir(), "story-cli-update-dry-"));
  context.after(() => rm(root, { recursive: true, force: true }));
  await createFixtureProject(root);
  const manifestBefore = await readFile(resolve(root, ".designsystem/manifest.json"), "utf8");

  const result = await runUpdatePipeline({ root, engineVersion: "1.1.0", dryRun: true });

  assert.equal(await readFile(resolve(root, ".designsystem/manifest.json"), "utf8"), manifestBefore);
  assert.equal(result.validation, undefined);
  assert.equal(result.manifest.engineVersion, "1.1.0");
});

test("a locally modified shipped file is classified conflicted and left untouched", async (context) => {
  const root = await mkdtemp(resolve(tmpdir(), "story-cli-update-conflict-"));
  context.after(() => rm(root, { recursive: true, force: true }));
  await createFixtureProject(root);
  const path = resolve(root, "src/components/atoms/button/Button.tsx");
  await writeFile(path, "// locally edited\nexport const Button = () => null;\n");

  const result = await runUpdatePipeline({ root, engineVersion: "1.0.0", dryRun: false });

  const classified = result.classified.find((file) => file.path === "src/components/atoms/button/Button.tsx");
  assert.equal(classified?.category, "conflicted");
  assert.equal(await readFile(path, "utf8"), "// locally edited\nexport const Button = () => null;\n");
});

test("a file deleted locally is classified new and rewritten from the template", async (context) => {
  const root = await mkdtemp(resolve(tmpdir(), "story-cli-update-deleted-"));
  context.after(() => rm(root, { recursive: true, force: true }));
  await createFixtureProject(root);
  const path = resolve(root, "src/components/atoms/badge/Badge.tsx");
  await rm(path);

  const result = await runUpdatePipeline({ root, engineVersion: "1.0.0", dryRun: false });

  const classified = result.classified.find((file) => file.path === "src/components/atoms/badge/Badge.tsx");
  assert.equal(classified?.category, "new");
  assert.match(await readFile(path, "utf8"), /Badge/u);
});

test("a user-created file is left alone and absent from the rewritten manifest", async (context) => {
  const root = await mkdtemp(resolve(tmpdir(), "story-cli-update-usercreated-"));
  context.after(() => rm(root, { recursive: true, force: true }));
  await createFixtureProject(root);
  await mkdir(resolve(root, "src/components/atoms/custom"), { recursive: true });
  await writeFile(resolve(root, "src/components/atoms/custom/Custom.tsx"), "export const Custom = () => null;\n");

  const result = await runUpdatePipeline({ root, engineVersion: "1.0.0", dryRun: false });

  const classified = result.classified.find((file) => file.path === "src/components/atoms/custom/Custom.tsx");
  assert.equal(classified?.category, "user-created");
  assert.equal(result.manifest.files["src/components/atoms/custom/Custom.tsx"], undefined);
});

test("a hand-edited tier barrel is always regenerated from the project's live component directories", async (context) => {
  const root = await mkdtemp(resolve(tmpdir(), "story-cli-update-barrel-"));
  context.after(() => rm(root, { recursive: true, force: true }));
  await createFixtureProject(root);
  const barrelPath = resolve(root, "src/components/atoms/index.ts");
  await writeFile(barrelPath, "// hand-edited, should be discarded\n");

  const result = await runUpdatePipeline({ root, engineVersion: "1.0.0", dryRun: false });

  const classified = result.classified.find((file) => file.path === "src/components/atoms/index.ts");
  assert.equal(classified?.category, "generated");
  const regenerated = await readFile(barrelPath, "utf8");
  assert.doesNotMatch(regenerated, /hand-edited/u);
  assert.match(regenerated, /export \* from ".\/button";/u);
});

test("a second run against an already-updated project reclassifies resolved files as unmodified", async (context) => {
  const root = await mkdtemp(resolve(tmpdir(), "story-cli-update-idempotent-"));
  context.after(() => rm(root, { recursive: true, force: true }));
  await createFixtureProject(root);
  await rm(resolve(root, "src/components/atoms/badge/Badge.tsx"));
  await runUpdatePipeline({ root, engineVersion: "1.0.0", dryRun: false });

  const manifestAfterFirstRun = await readManifest(resolve(root, ".designsystem/manifest.json"));
  assert.ok(manifestAfterFirstRun.files["src/components/atoms/badge/Badge.tsx"] !== undefined);

  const second = await runUpdatePipeline({ root, engineVersion: "1.0.0", dryRun: false });

  const classified = second.classified.find((file) => file.path === "src/components/atoms/badge/Badge.tsx");
  assert.equal(classified?.category, "unmodified");
});
