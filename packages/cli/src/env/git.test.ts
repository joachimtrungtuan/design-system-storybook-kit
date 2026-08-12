import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";

import { inspectGit, nearestExistingAncestor } from "./git.ts";

test("git inspection reports identity, repository root, and clean state", () => {
  const responses = new Map<string, string>([
    ["--version", "git version 2.50.0"],
    ["-C /project rev-parse --show-toplevel", "/project"],
    ["-C /project config --get user.name", "Maintainer"],
    ["-C /project config --get user.email", "maintainer@example.test"],
    ["-C /project status --porcelain", ""],
  ]);
  const result = inspectGit(
    "/project/new-project",
    (args) => {
      const value = responses.get(args.join(" "));
      if (value === undefined) {
        throw new Error("unexpected git call");
      }
      return value;
    },
    () => "/project",
  );
  assert.deepEqual(result, {
    present: true,
    userNameConfigured: true,
    userEmailConfigured: true,
    insideRepository: true,
    repositoryRoot: "/project",
    clean: true,
  });
});

test("missing git is reported without attempting repository checks", () => {
  let calls = 0;
  const result = inspectGit("/project", () => {
    calls += 1;
    throw new Error("ENOENT");
  });
  assert.equal(calls, 1);
  assert.equal(result.present, false);
});

test("a missing nested target resolves Git probes from its nearest existing ancestor", () => {
  const root = mkdtempSync(join(tmpdir(), "story-cli-kit-git-context-"));
  const existingParent = join(root, "apps");
  mkdirSync(existingParent);
  assert.equal(
    nearestExistingAncestor(join(existingParent, "new-project", "nested")),
    existingParent,
  );
});
