import assert from "node:assert/strict";
import test from "node:test";

import { ActionableError } from "../errors.ts";
import { parseTokens, parseTokensJson } from "./schema.ts";

function ramp(overrides: Record<string, string> = {}): Record<string, unknown> {
  return { $base: "#336699", $anchor: 500, $mode: "oklch", $overrides: overrides };
}

test("a missing ramp mode fails with the offending path", () => {
  assert.throws(
    () => parseTokens({ color: { brand: { signal: { $base: "#336699", $anchor: 500 } } } }),
    (error: unknown) => error instanceof ActionableError && error.resource.endsWith("$.color.brand.signal.$mode"),
  );
});

test("a ramp declaring every step literally is rejected", () => {
  const literal = Object.fromEntries([50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950].map((step) => [step, "#336699"]));
  assert.throws(
    () => parseTokens({ color: { brand: { signal: literal } } }),
    /declares every step literally/u,
  );
});

test("semantic colours require DTCG brace references", () => {
  assert.throws(
    () => parseTokens({ color: { semantic: { action: "#336699" } } }),
    /must reference another token/u,
  );
  assert.doesNotThrow(() =>
    parseTokens({ color: { brand: { signal: ramp() }, semantic: { action: "{color.brand.signal.500}" } } }),
  );
});

test("non-anchor direct hex overrides are accepted and normalized", () => {
  const parsed = parseTokens({ color: { brand: { signal: ramp({ 200: "#aabbcc" }) } } });
  assert.deepEqual(parsed.root.color, {
    brand: {
      signal: {
        $base: "#336699",
        $anchor: 500,
        $mode: "oklch",
        $overrides: { 200: "#AABBCC" },
      },
    },
  });
});

test("an override at the anchor is rejected", () => {
  assert.throws(
    () => parseTokens({ color: { brand: { signal: ramp({ 500: "#FFFFFF" }) } } }),
    /cannot replace the anchor colour/u,
  );
});

test("invalid JSON is reported as an actionable source error", () => {
  assert.throws(
    () => parseTokensJson("{", "fixture.json"),
    (error: unknown) => error instanceof ActionableError && error.resource === "fixture.json",
  );
});

test("$-prefixed configuration is retained outside the token root", () => {
  const parsed = parseTokens({
    $meta: { surfaces: { canvas: { color: "{color.base.white}" } } },
    color: { base: { white: "#FFFFFF" } },
  });

  assert.deepEqual(parsed.configuration, {
    $meta: { surfaces: { canvas: { color: "{color.base.white}" } } },
  });
  assert.deepEqual(parsed.root, { color: { base: { white: "#FFFFFF" } } });
});
