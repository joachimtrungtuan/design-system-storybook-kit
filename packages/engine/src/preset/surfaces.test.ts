import assert from "node:assert/strict";
import test from "node:test";

import { ActionableError } from "../errors.ts";
import { parseTokens } from "../tokens/schema.ts";
import { buildBrandSurfaces, classifySurface } from "./surfaces.ts";

function tokensWithSurfaces(surfaces: Record<string, unknown>) {
  return parseTokens({
    $meta: { surfaces },
    color: {
      brand: { signal: { $base: "#336699", $anchor: 500, $mode: "hsl" } },
      base: { black: "#000000", white: "#FFFFFF" },
      semantic: { action: "{color.brand.signal.500}" },
    },
  });
}

test("surface declarations resolve direct, semantic, and generated colour tokens", () => {
  const surfaces = buildBrandSurfaces(
    tokensWithSurfaces({
      action: { color: "{color.semantic.action}" },
      canvas: { color: "{color.base.white}" },
      signal: { color: "{color.brand.signal.500}" },
    }),
  );

  assert.deepEqual(surfaces, [
    { id: "action", name: "action", value: "#336699", mode: "dark" },
    { id: "canvas", name: "canvas", value: "#FFFFFF", mode: "light" },
    { id: "signal", name: "signal", value: "#336699", mode: "dark" },
  ]);
});

test("an explicit surface mode overrides luminance classification", () => {
  const [surface] = buildBrandSurfaces(tokensWithSurfaces({ canvas: { color: "{color.base.white}", mode: "dark" } }));
  assert.equal(surface?.mode, "dark");
});

test("automatic mode uses the contrast crossover for black and white", () => {
  assert.equal(classifySurface("#000000"), "dark");
  assert.equal(classifySurface("#FFFFFF"), "light");
});

test("surface colours must be DTCG references to existing colours", () => {
  assert.throws(
    () => buildBrandSurfaces(tokensWithSurfaces({ canvas: { color: "#FFFFFF" } })),
    (error: unknown) => error instanceof ActionableError && error.resource.endsWith(".canvas.color"),
  );
  assert.throws(
    () => buildBrandSurfaces(tokensWithSurfaces({ canvas: { color: "{color.base.missing}" } })),
    /Unknown surface colour token/u,
  );
});

test("tokens without surface declarations produce no Storybook backgrounds", () => {
  assert.deepEqual(buildBrandSurfaces(parseTokens({ color: { base: { white: "#FFFFFF" } } })), []);
});
