import assert from "node:assert/strict";
import test from "node:test";

import { main } from "./main.ts";

test("main supplies the contract Storybook configuration", () => {
  const config = main();
  assert.deepEqual(config.stories, [
    "../src/stories/**/*.mdx",
    "../src/stories/**/*.stories.@(js|jsx|mjs|ts|tsx)",
  ]);
  assert.deepEqual(config.addons, ["@storybook/addon-docs"]);
  assert.deepEqual(config.framework, { name: "@storybook/react-vite", options: {} });
});

test("main appends project stories and addons without dropping preset entries", () => {
  const config = main({
    stories: ["../local/**/*.stories.tsx"],
    addons: ["local-addon"],
    staticDirs: ["../public"],
  });

  assert.deepEqual(config.stories, [
    "../src/stories/**/*.mdx",
    "../src/stories/**/*.stories.@(js|jsx|mjs|ts|tsx)",
    "../local/**/*.stories.tsx",
  ]);
  assert.deepEqual(config.addons, ["@storybook/addon-docs", "local-addon"]);
  assert.deepEqual(config.staticDirs, ["../public"]);
});

test("viteFinal installs Tailwind before handing config to the project extension", async () => {
  let extensionSawTailwind = false;
  const config = main({
    viteFinal(viteConfig) {
      extensionSawTailwind = JSON.stringify(viteConfig.plugins).includes("@tailwindcss/vite");
      return { ...viteConfig, base: "/storybook/" };
    },
  });

  const result = await config.viteFinal({}, {});
  assert.equal(extensionSawTailwind, true);
  assert.equal(result.base, "/storybook/");
});
