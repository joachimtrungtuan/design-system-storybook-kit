import assert from "node:assert/strict";
import test from "node:test";

import { hexToHsl, hexToOklch } from "./color.ts";
import { generateRamp } from "./ramp.ts";
import { RAMP_STEPS, type RampDefinition } from "./schema.ts";

const fixtures: RampDefinition[] = [
  { $base: "#173D2B", $anchor: 950, $mode: "oklch" },
  { $base: "#769C3A", $anchor: 500, $mode: "hsl" },
];

test("both anchor positions generate eleven steps and preserve the base exactly", () => {
  for (const fixture of fixtures) {
    const generated = generateRamp(fixture);
    assert.deepEqual(Object.keys(generated).map(Number), [...RAMP_STEPS]);
    assert.equal(generated[fixture.$anchor].hex, fixture.$base);
    assert.equal(generated[fixture.$anchor].source, "anchor");
  }
});

test("a 950 anchor produces ten lighter oklch steps", () => {
  const generated = generateRamp(fixtures[0] as RampDefinition);
  const anchorLightness = hexToOklch(generated[950].hex).lightness;
  for (const step of RAMP_STEPS.slice(0, -1)) {
    assert.ok(hexToOklch(generated[step].hex).lightness > anchorLightness);
  }
});

test("a 500 anchor produces hsl steps on both sides", () => {
  const generated = generateRamp(fixtures[1] as RampDefinition);
  const anchorLightness = hexToHsl(generated[500].hex).lightness;
  assert.ok(hexToHsl(generated[50].hex).lightness > anchorLightness);
  assert.ok(hexToHsl(generated[950].hex).lightness < anchorLightness);
});

test("a non-anchor override wins over generated output", () => {
  const generated = generateRamp({
    $base: "#769C3A",
    $anchor: 500,
    $mode: "hsl",
    $overrides: { 200: "#DDE8AA" },
  });
  assert.deepEqual(generated[200], { hex: "#DDE8AA", clipped: false, source: "override" });
});

test("out-of-gamut generated steps are surfaced", () => {
  const generated = generateRamp({ $base: "#FF00FF", $anchor: 500, $mode: "oklch" });
  assert.ok(Object.values(generated).some((color) => color.clipped));
});
