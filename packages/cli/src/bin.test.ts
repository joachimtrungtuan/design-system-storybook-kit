import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";
import test from "node:test";

import {
  guardTransientMaintenance,
  isProjectLocalInstallation,
  resolveExecutionPackageRoot,
  run,
} from "./bin.ts";
import { ActionableError } from "./errors.ts";

test("compiled CLI layout resolves to the installed package root", () => {
  const moduleUrl = pathToFileURL(
    "/project/node_modules/story-cli-kit/dist/packages/cli/src/bin.js",
  ).href;
  assert.equal(
    resolveExecutionPackageRoot(moduleUrl),
    "/project/node_modules/story-cli-kit",
  );
});

test("execution provenance recognises the project's installed package", () => {
  const directory = mkdtempSync(join(tmpdir(), "story-cli-kit-local-"));
  const localPackage = join(directory, "node_modules", "story-cli-kit");
  mkdirSync(localPackage, { recursive: true });
  writeFileSync(join(localPackage, "package.json"), '{"name":"story-cli-kit"}\n');
  assert.equal(isProjectLocalInstallation(directory, localPackage), true);
  assert.equal(
    isProjectLocalInstallation(
      directory,
      mkdtempSync(join(tmpdir(), "story-cli-kit-transient-")),
    ),
    false,
  );
});

test("execution provenance recognises a package hoisted above a workspace app", () => {
  const workspace = mkdtempSync(join(tmpdir(), "story-cli-kit-hoisted-"));
  const app = join(workspace, "apps", "design-system");
  const hoistedPackage = join(workspace, "node_modules", "story-cli-kit");
  mkdirSync(app, { recursive: true });
  mkdirSync(hoistedPackage, { recursive: true });
  writeFileSync(join(app, "package.json"), '{"name":"design-system"}\n');
  writeFileSync(
    join(hoistedPackage, "package.json"),
    '{"name":"story-cli-kit"}\n',
  );
  assert.equal(isProjectLocalInstallation(app, hoistedPackage), true);
});

test("execution provenance recognises packages that hide package.json behind exports", () => {
  const directory = mkdtempSync(join(tmpdir(), "story-cli-kit-exports-"));
  const localPackage = join(directory, "node_modules", "story-cli-kit");
  mkdirSync(join(localPackage, "dist"), { recursive: true });
  writeFileSync(
    join(localPackage, "package.json"),
    JSON.stringify({
      name: "story-cli-kit",
      exports: { "./preset": "./dist/preset.js" },
    }) + "\n",
  );
  writeFileSync(join(localPackage, "dist", "preset.js"), "export {}\n");
  assert.equal(isProjectLocalInstallation(directory, localPackage), true);
});

test("transient maintenance redirects a manifest project to its local command", () => {
  const directory = mkdtempSync(join(tmpdir(), "story-cli-kit-manifest-"));
  mkdirSync(join(directory, ".designsystem"));
  writeFileSync(join(directory, ".designsystem", "manifest.json"), "{}\n");
  const transientPackage = mkdtempSync(join(tmpdir(), "story-cli-kit-transient-"));

  assert.throws(
    () => guardTransientMaintenance("validate", directory, transientPackage),
    (error: unknown) =>
      error instanceof ActionableError &&
      error.action.includes("npm exec -- ds validate") &&
      error.exitCode === 2,
  );
});

test("a local package remains allowed when launched through npm exec", () => {
  const directory = mkdtempSync(join(tmpdir(), "story-cli-kit-local-manifest-"));
  mkdirSync(join(directory, ".designsystem"), { recursive: true });
  writeFileSync(join(directory, ".designsystem", "manifest.json"), "{}\n");
  const localPackage = join(directory, "node_modules", "story-cli-kit");
  mkdirSync(localPackage, { recursive: true });
  writeFileSync(join(localPackage, "package.json"), '{"name":"story-cli-kit"}\n');
  assert.doesNotThrow(() =>
    guardTransientMaintenance("update", directory, localPackage),
  );
});

test("unknown commands are refused with a suggestion", async () => {
  await assert.rejects(
    run(["valid"]),
    (error: unknown) =>
      error instanceof ActionableError && error.action.includes("ds validate"),
  );
});

test("unknown flags are actionable refusals rather than internal errors", async () => {
  await assert.rejects(
    run(["validate", "--bogus"]),
    (error: unknown) =>
      error instanceof ActionableError &&
      error.action.includes("ds validate --help") &&
      error.exitCode === 2,
  );
});
