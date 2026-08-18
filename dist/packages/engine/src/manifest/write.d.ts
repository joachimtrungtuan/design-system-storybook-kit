import type { DesignSystemManifest } from "./types.ts";
export declare function listProjectFiles(root: string): Promise<string[]>;
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
export declare function writeManifestObject(root: string, manifest: DesignSystemManifest): Promise<string>;
export interface RewriteManifestAfterUpdateOptions {
    manifest: DesignSystemManifest;
    engineVersion: string;
    updatedFiles: Readonly<Record<string, string>>;
}
/**
 * Post-update rewrite: bumps engineVersion and refreshes the checksum of every
 * overwritten or newly-written path. Conflicted, user-created and adopt-merged
 * entries are absent from `updatedFiles` and so pass through untouched.
 */
export declare function rewriteManifestAfterUpdate(options: RewriteManifestAfterUpdateOptions): DesignSystemManifest;
