import type { DesignSystemManifest } from "./types.ts";
export interface WriteManifestOptions {
    root: string;
    engineVersion: string;
    createdWith: string;
    templateId: string;
    appliedMigrations?: string[];
    renderedFiles?: Iterable<string>;
    mergedFiles?: Iterable<string>;
    files?: Iterable<string>;
}
export declare function createManifest(options: WriteManifestOptions): Promise<DesignSystemManifest>;
export declare function writeManifest(options: WriteManifestOptions): Promise<string>;
