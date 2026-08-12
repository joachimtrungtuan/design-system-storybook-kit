import assert from "node:assert/strict";
import test from "node:test";

import { hexToHsl, hexToOklch, hslToHex, oklchToHex } from "./color.ts";

function assertHexWithinOne(actual: string, expected: string): void {
  for (let index = 1; index < 7; index += 2) {
    const actualChannel = Number.parseInt(actual.slice(index, index + 2), 16);
    const expectedChannel = Number.parseInt(expected.slice(index, index + 2), 16);
    assert.ok(Math.abs(actualChannel - expectedChannel) <= 1, `${actual} differs from ${expected}`);
  }
}

test("hex and oklch round-trip across dark, light, neutral and saturated colours", () => {
  for (const hex of ["#050607", "#FAFBFC", "#808080", "#FF0000", "#00FF00", "#0000FF", "#C040D0"]) {
    assertHexWithinOne(oklchToHex(hexToOklch(hex)).hex, hex);
  }
});

test("hex and hsl round-trip across dark, light, neutral and saturated colours", () => {
  for (const hex of ["#050607", "#FAFBFC", "#808080", "#FF0000", "#00FF00", "#0000FF", "#C040D0"]) {
    assertHexWithinOne(hslToHex(hexToHsl(hex)), hex);
  }
});

test("out-of-gamut oklch conversion reports clipping", () => {
  const result = oklchToHex({ lightness: 0.9, chroma: 0.4, hue: 150 });
  assert.equal(result.clipped, true);
  assert.match(result.hex, /^#[\dA-F]{6}$/u);
});
