export interface StorybookBackground {
    name: string;
    value: string;
}
export interface StorybookPreviewParameters {
    backgrounds?: {
        default?: string;
        options?: Record<string, StorybookBackground>;
        [key: string]: unknown;
    };
    [key: string]: unknown;
}
export type StorybookDecorator = (...args: never[]) => unknown;
export interface StorybookPreviewConfig {
    decorators: StorybookDecorator[];
    parameters: StorybookPreviewParameters;
    initialGlobals?: Record<string, unknown>;
    [key: string]: unknown;
}
export interface StorybookPreviewOverrides {
    decorators?: StorybookDecorator[];
    parameters?: StorybookPreviewParameters;
    initialGlobals?: Record<string, unknown>;
    [key: string]: unknown;
}
export declare function preview(tokenInput: unknown, overrides?: StorybookPreviewOverrides, source?: string): StorybookPreviewConfig;
