import assert from "node:assert/strict";
import test from "node:test";

import { preview } from "./preview.ts";

const tokenInput = {
  $meta: {
    surfaces: {
      canvas: { color: "{color.base.white}" },
      inverse: { color: "{color.base.black}" },
    },
  },
  color: {
    base: {
      black: "#000000",
      white: "#FFFFFF",
    },
  },
};

test("preview derives Storybook backgrounds and modes from tokens", () => {
  const config = preview(tokenInput);

  assert.deepEqual(config.parameters.backgrounds, {
    options: {
      canvas: { name: "canvas", value: "#FFFFFF" },
      inverse: { name: "inverse", value: "#000000" },
    },
  });
  assert.deepEqual(config.parameters.brandSurfaces, {
    canvas: { value: "#FFFFFF", mode: "light" },
    inverse: { value: "#000000", mode: "dark" },
  });
  assert.deepEqual(config.initialGlobals, { backgrounds: { value: "canvas" } });
});

test("preview appends project decorators and backgrounds while keeping preset values", () => {
  const decorator = () => undefined;
  const config = preview(tokenInput, {
    decorators: [decorator],
    parameters: {
      backgrounds: {
        options: { local: { name: "local", value: "var(--color-local)" } },
      },
      layout: "fullscreen",
    },
  });

  assert.deepEqual(config.decorators, [decorator]);
  assert.deepEqual(config.parameters.backgrounds?.options, {
    canvas: { name: "canvas", value: "#FFFFFF" },
    inverse: { name: "inverse", value: "#000000" },
    local: { name: "local", value: "var(--color-local)" },
  });
  assert.equal(config.parameters.layout, "fullscreen");
  assert.deepEqual(config.parameters.docs, { toc: true });
});

test("preview remains valid when a project declares no brand surfaces", () => {
  const config = preview({ color: { base: { white: "#FFFFFF" } } });
  assert.deepEqual(config.parameters.backgrounds, { options: {} });
  assert.equal(config.initialGlobals, undefined);
});
