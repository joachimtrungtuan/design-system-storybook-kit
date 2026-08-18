import assert from "node:assert/strict";
import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import test from "node:test";

import { formatUpdateReport, writeUpdateReport } from "./report.ts";

test("formatUpdateReport lists every category and reports a clean validator run", () => {
  const content = formatUpdateReport({
    previousEngineVersion: "1.0.0",
    engineVersion: "1.1.0",
    classified: [
      { path: "src/New.tsx", category: "new" },
      { path: "src/Same.tsx", category: "unmodified" },
      { path: "src/Edited.tsx", category: "conflicted" },
    ],
    validation: { root: "/project", violations: [] },
  });

  assert.match(content, /# Engine update 1\.0\.0 → 1\.1\.0/u);
  assert.match(content, /### New \(written\)\n\n- src\/New\.tsx/u);
  assert.match(content, /### Conflicted[^\n]*\n\n- src\/Edited\.tsx/u);
  assert.match(content, /No validator failures\./u);
});

test("formatUpdateReport reports dry runs as skipped validation and lists violations when present", () => {
  const dryRunContent = formatUpdateReport({
    previousEngineVersion: "1.0.0",
    engineVersion: "1.1.0",
    classified: [],
    validation: undefined,
  });
  assert.match(dryRunContent, /Skipped \(dry run\)\./u);

  const violationContent = formatUpdateReport({
    previousEngineVersion: "1.0.0",
    engineVersion: "1.1.0",
    classified: [],
    validation: {
      root: "/project",
      violations: [{ ruleId: "V1", file: "src/Bad.tsx", message: "broke a rule", action: "fix it" }],
    },
  });
  assert.match(violationContent, /- V1 src\/Bad\.tsx — broke a rule/u);
});

test("writeUpdateReport numbers reports within a date folder and increments on repeat calls", async (context) => {
  const root = await mkdtemp(resolve(tmpdir(), "story-cli-update-report-"));
  context.after(() => rm(root, { recursive: true, force: true }));
  const date = new Date("2026-08-18T00:00:00Z");

  const first = await writeUpdateReport(root, "first\n", "1.0.0", date);
  const second = await writeUpdateReport(root, "second\n", "1.1.0", date);

  assert.match(first, /01-engine-update-1\.0\.0\.md$/u);
  assert.match(second, /02-engine-update-1\.1\.0\.md$/u);
  const entries = await readdir(resolve(root, "update-logs/2026-08-18"));
  assert.deepEqual(entries.sort(), ["01-engine-update-1.0.0.md", "02-engine-update-1.1.0.md"]);
  assert.equal(await readFile(second, "utf8"), "second\n");
});
