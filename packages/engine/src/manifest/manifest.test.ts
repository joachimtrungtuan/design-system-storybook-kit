import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";

import {
  checksumContent,
  createManifest,
  listProjectFiles,
  normalizeForChecksum,
  readManifest,
  rewriteManifestAfterUpdate,
  writeManifest,
} from "./index.ts";

test("checksum normalisation ignores line endings and final-newline drift", () => {
  assert.equal(normalizeForChecksum("one\r\ntwo"), "one\ntwo\n");
  assert.equal(checksumContent("one\r\ntwo"), checksumContent("one\ntwo\n\n"));
});

test("manifest records rendered files and excludes allowed pre-existing files", async (context) => {
  const root = await mkdtemp(resolve(tmpdir(), "story-cli-manifest-"));
  context.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(resolve(root, "src"));
  await writeFile(resolve(root, "src/App.tsx"), "export const App = () => null;\n");
  await writeFile(resolve(root, "README.md"), "user-owned\n");

  const manifest = await createManifest({
    root,
    engineVersion: "0.0.0",
    createdWith: "0.0.0",
    templateId: "storybook-vite",
    files: ["src/App.tsx"],
    renderedFiles: ["src/App.tsx"],
    appliedMigrations: [],
  });
  assert.deepEqual(Object.keys(manifest.files), ["src/App.tsx"]);
  assert.deepEqual(manifest.files["src/App.tsx"], {
    sha256: checksumContent("export const App = () => null;\n"),
    mark: "rendered",
  });

  await writeManifest({
    root,
    engineVersion: "0.0.0",
    createdWith: "0.0.0",
    templateId: "storybook-vite",
    files: ["src/App.tsx"],
  });
  const stored = await readManifest(resolve(root, ".designsystem/manifest.json"));
  assert.equal(stored.schemaVersion, 1);
  assert.deepEqual(stored.appliedMigrations, []);
  assert.match(await readFile(resolve(root, ".designsystem/manifest.json"), "utf8"), /"schemaVersion": 1/u);
});

test("listProjectFiles walks the tree and ignores manifest-irrelevant directories", async (context) => {
  const root = await mkdtemp(resolve(tmpdir(), "story-cli-manifest-"));
  context.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(resolve(root, "src"));
  await mkdir(resolve(root, "node_modules/dep"), { recursive: true });
  await writeFile(resolve(root, "src/App.tsx"), "export const App = () => null;\n");
  await writeFile(resolve(root, "node_modules/dep/index.js"), "module.exports = {};\n");

  const files = await listProjectFiles(root);
  assert.deepEqual(files, ["src/App.tsx"]);
});

test("rewriteManifestAfterUpdate bumps the version and refreshes only the given paths' checksums", () => {
  const manifest = {
    schemaVersion: 1,
    engineVersion: "1.0.0",
    templateId: "storybook-vite",
    createdWith: "1.0.0",
    appliedMigrations: [],
    files: {
      "src/App.tsx": { sha256: checksumContent("old app\n"), mark: "rendered" as const },
      "src/Conflicted.tsx": { sha256: checksumContent("conflicted\n") },
      "src/Custom.tsx": { sha256: checksumContent("custom\n") },
    },
  };

  const rewritten = rewriteManifestAfterUpdate({
    manifest,
    engineVersion: "1.1.0",
    updatedFiles: { "src/App.tsx": "new app\n" },
  });

  assert.equal(rewritten.engineVersion, "1.1.0");
  assert.deepEqual(rewritten.files["src/App.tsx"], {
    sha256: checksumContent("new app\n"),
    mark: "rendered",
  });
  assert.deepEqual(rewritten.files["src/Conflicted.tsx"], manifest.files["src/Conflicted.tsx"]);
  assert.deepEqual(rewritten.files["src/Custom.tsx"], manifest.files["src/Custom.tsx"]);
});
