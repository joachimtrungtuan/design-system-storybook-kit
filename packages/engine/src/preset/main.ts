import tailwindcss from "@tailwindcss/vite";
import { mergeConfig, type InlineConfig } from "vite";

export type StorybookViteFinal = (config: InlineConfig, options: unknown) => InlineConfig | Promise<InlineConfig>;

export interface StorybookMainConfig {
  stories: string[];
  addons: string[];
  framework: {
    name: "@storybook/react-vite";
    options: Record<string, never>;
  };
  viteFinal: StorybookViteFinal;
  [key: string]: unknown;
}

export type StorybookMainOverrides = Omit<Partial<StorybookMainConfig>, "stories" | "addons" | "framework" | "viteFinal"> & {
  stories?: string[];
  addons?: string[];
  viteFinal?: StorybookViteFinal;
};

const BASE_STORIES = [
  "../src/stories/**/*.mdx",
  "../src/stories/**/*.stories.@(js|jsx|mjs|ts|tsx)",
];
const BASE_ADDONS = ["@storybook/addon-docs"];

export function main(overrides: StorybookMainOverrides = {}): StorybookMainConfig {
  const { stories = [], addons = [], viteFinal: extendVite, ...rest } = overrides;

  return {
    ...rest,
    stories: [...BASE_STORIES, ...stories],
    addons: [...BASE_ADDONS, ...addons],
    framework: {
      name: "@storybook/react-vite",
      options: {},
    },
    async viteFinal(config, options) {
      const withTailwind = mergeConfig(config, { plugins: [tailwindcss()] });
      return extendVite === undefined ? withTailwind : extendVite(withTailwind, options);
    },
  };
}
