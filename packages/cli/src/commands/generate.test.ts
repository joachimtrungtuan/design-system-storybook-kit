import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { resolve } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";

import { validateProject } from "../../../engine/src/validator/index.ts";
import { materialiseTemplate } from "../../../engine/src/template/materialise.ts";
import { runGenerate } from "./generate.ts";

test("generate uses the canonical scaffold for every tier", async (context) => {
  const root = await mkdtemp(resolve(tmpdir(), "story-cli-generate-"));
  context.after(() => rm(root, { recursive: true, force: true }));
  await materialiseTemplate({ destination: root, toolkitSpecifier: "file:/toolkit" });

  for (const [tier, name] of [
    ["atoms", "date-picker"],
    ["molecules", "filter-bar"],
    ["organisms", "site-nav"],
    ["templates", "dashboard-shell"],
  ] as const) {
    await runGenerate({ cwd: root, tier, name, reporter: { info: () => undefined, warn: () => undefined } });
  }

  assert.deepEqual((await validateProject(root)).violations, []);
  assert.match(await readFile(resolve(root, "src/components/atoms/index.ts"), "utf8"), /date-picker/u);
  assert.match(await readFile(resolve(root, "src/stories/templates/DashboardShell.stories.tsx"), "utf8"), /StoryObj/u);
});
