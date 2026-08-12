import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";

import { findParentWorkspace } from "./workspace.ts";

test("a pnpm parent returns the exact registration line without writing", () => {
  const root = mkdtempSync(join(tmpdir(), "story-cli-kit-pnpm-"));
  const target = join(root, "apps", "docs");
  mkdirSync(target, { recursive: true });
  writeFileSync(join(root, "pnpm-workspace.yaml"), "packages: []\n");

  assert.deepEqual(findParentWorkspace(target), {
    kind: "pnpm",
    root,
    declarationFile: join(root, "pnpm-workspace.yaml"),
    registration: "  - 'apps/docs'",
  });
});

test("a package.json workspace parent returns a JSON entry", () => {
  const root = mkdtempSync(join(tmpdir(), "story-cli-kit-npm-"));
  const target = join(root, "packages", "ui");
  mkdirSync(target, { recursive: true });
  writeFileSync(join(root, "package.json"), '{"workspaces":["packages/*"]}\n');

  const result = findParentWorkspace(target);
  assert.equal(result?.kind, "package-json");
  assert.equal(result?.registration, '"packages/ui"');
});
