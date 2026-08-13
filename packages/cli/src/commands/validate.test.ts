import assert from "node:assert/strict";
import { cp, mkdtemp, rm, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import test from "node:test";

import { runValidate } from "./validate.ts";

const FIXTURE = resolve(import.meta.dirname, "../../../engine/src/validator/__fixtures__/compliant-project");

test("validate returns success and human output for a compliant project", async () => {
  const messages: string[] = [];
  const exitCode = await runValidate({ cwd: FIXTURE, write: (message) => messages.push(message) });
  assert.equal(exitCode, 0);
  assert.match(messages.join("\n"), /0 violations/u);
});

test("validate emits parseable JSON with stable fields", async () => {
  const messages: string[] = [];
  const exitCode = await runValidate({ cwd: FIXTURE, json: true, write: (message) => messages.push(message) });
  const report = JSON.parse(messages.join("\n")) as { valid: boolean; root: string; violations: unknown[] };
  assert.equal(exitCode, 0);
  assert.equal(report.valid, true);
  assert.equal(report.root, FIXTURE);
  assert.deepEqual(report.violations, []);
});

test("validate returns failure and structured JSON for a seeded violation", async (context) => {
  const root = await mkdtemp(resolve(tmpdir(), "story-cli-validate-command-"));
  context.after(() => rm(root, { recursive: true, force: true }));
  await cp(FIXTURE, root, { recursive: true });
  await unlink(resolve(root, "src/stories/foundations/Colors.mdx"));
  const messages: string[] = [];
  const exitCode = await runValidate({ cwd: root, json: true, write: (message) => messages.push(message) });
  const report = JSON.parse(messages.join("\n")) as {
    valid: boolean;
    violations: Array<{ file: string; ruleId: string; message: string; action: string }>;
  };
  assert.equal(exitCode, 1);
  assert.equal(report.valid, false);
  assert.deepEqual(Object.keys(report.violations[0] ?? {}).sort(), ["action", "file", "message", "ruleId"]);
  assert.equal(report.violations[0]?.ruleId, "V20");
});
