import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { ActionableError } from "../errors.ts";
import { codegenTokens, generateTokensCss } from "./codegen.ts";
import { parseTokens, parseTokensJson } from "./schema.ts";

const fixtures = new URL("./__fixtures__/", import.meta.url);

function reverseObjects(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(reverseObjects);
  if (typeof value !== "object" || value === null) return value;
  return Object.fromEntries(Object.entries(value).reverse().map(([key, child]) => [key, reverseObjects(child)]));
}

test("codegen is byte-identical to the checked-in output", async () => {
  const input = await readFile(new URL("valid-tokens.json", fixtures), "utf8");
  const expected = await readFile(new URL("expected-tokens.css", fixtures), "utf8");
  assert.equal(generateTokensCss(parseTokensJson(input, "valid-tokens.json")).css, expected);
});

test("codegen is deterministic across runs and shuffled object order", async () => {
  const input = JSON.parse(await readFile(new URL("valid-tokens.json", fixtures), "utf8")) as unknown;
  const first = codegenTokens(input).css;
  assert.equal(codegenTokens(input).css, first);
  assert.equal(codegenTokens(reverseObjects(input)).css, first);
});

test("semantic references emit CSS aliases", () => {
  const result = codegenTokens({
    color: {
      brand: { signal: { $base: "#336699", $anchor: 500, $mode: "hsl" } },
      semantic: { action: "{color.brand.signal.500}" },
    },
  });
  assert.match(result.css, /--color-semantic-action: var\(--color-brand-signal-500\);/u);
});

test("dangling semantic references report the source path", () => {
  assert.throws(
    () => codegenTokens({ color: { semantic: { action: "{color.brand.missing.500}" } } }, "fixture.json"),
    (error: unknown) => error instanceof ActionableError && error.resource.includes("fixture.json"),
  );
});

test("semantic reference cycles are reported without recursion overflow", () => {
  assert.throws(
    () => codegenTokens({ color: { semantic: { first: "{color.semantic.second}", second: "{color.semantic.first}" } } }),
    /reference cycle/u,
  );
});

test("the token engine has no file-write path", async () => {
  for (const file of ["schema.ts", "color.ts", "ramp.ts", "codegen.ts", "index.ts"]) {
    const source = await readFile(new URL(file, new URL("./", import.meta.url)), "utf8");
    assert.doesNotMatch(source, /writeFile|createWriteStream|appendFile/u);
  }
});

test("codegen reports clipped gamut steps", () => {
  const parsed = parseTokens({ color: { brand: { vivid: { $base: "#FF00FF", $anchor: 500, $mode: "oklch" } } } });
  assert.ok(generateTokensCss(parsed).gamutClips.length > 0);
});
