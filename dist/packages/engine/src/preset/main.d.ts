import { type InlineConfig } from "vite";
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
export declare function main(overrides?: StorybookMainOverrides): StorybookMainConfig;
