import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import test from "node:test";

import { generateTokensCss, parseTokensJson } from "../tokens/index.ts";
import { validateProject } from "../validator/index.ts";
import { materialiseTemplate } from "./materialise.ts";

test("materialiseTemplate renders placeholders and writes current token CSS", async (context) => {
  const directory = await mkdtemp(resolve(tmpdir(), "story-cli-materialise-"));
  context.after(() => rm(directory, { recursive: true, force: true }));
  await materialiseTemplate({
    destination: directory,
    projectName: "example-system",
    packageManager: "pnpm",
    toolkitSpecifier: "file:/toolkit",
  });
  const packageJson = await readFile(resolve(directory, "package.json"), "utf8");
  assert.match(packageJson, /"name": "example-system"/u);
  assert.match(packageJson, /"packageManager": "pnpm"/u);
  assert.doesNotMatch(packageJson, /\{\{/u);
  const tokens = await readFile(resolve(directory, "tokens.json"), "utf8");
  const expected = generateTokensCss(parseTokensJson(tokens)).css;
  assert.equal(await readFile(resolve(directory, "src/styles/tokens.css"), "utf8"), expected);
  assert.deepEqual((await validateProject(directory)).violations, []);
});

test("preserved files are not rendered or rejected for their own placeholder text", async (context) => {
  const directory = await mkdtemp(resolve(tmpdir(), "story-cli-materialise-preserved-"));
  context.after(() => rm(directory, { recursive: true, force: true }));
  await writeFile(resolve(directory, "README.md"), "{{projectName}} is user-owned\n");
  await materialiseTemplate({
    destination: directory,
    projectName: "example-system",
    toolkitSpecifier: "file:/toolkit",
    preserveExistingFiles: ["README.md"],
  });
  assert.equal(await readFile(resolve(directory, "README.md"), "utf8"), "{{projectName}} is user-owned\n");
});
