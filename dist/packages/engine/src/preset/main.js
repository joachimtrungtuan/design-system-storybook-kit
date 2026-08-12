import tailwindcss from "@tailwindcss/vite";
import { mergeConfig } from "vite";
const BASE_STORIES = [
    "../src/stories/**/*.mdx",
    "../src/stories/**/*.stories.@(js|jsx|mjs|ts|tsx)",
];
const BASE_ADDONS = ["@storybook/addon-docs"];
export function main(overrides = {}) {
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
//# sourceMappingURL=main.js.map