import type { DesignSystemManifest } from "./types.ts";
export type ClassificationCategory = "new" | "unmodified" | "conflicted" | "user-created" | "generated" | "adopt-merged";
export interface ClassifiedFile {
    path: string;
    category: ClassificationCategory;
}
export interface ClassifyProjectOptions {
    manifest: DesignSystemManifest;
    currentChecksums: ReadonlyMap<string, string>;
    incomingPaths: ReadonlySet<string>;
    generatedPaths: ReadonlySet<string>;
}
export declare function classifyProject(options: ClassifyProjectOptions): ClassifiedFile[];
