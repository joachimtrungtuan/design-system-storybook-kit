export type ManifestMark = "rendered" | "merged";
export interface ManifestFile {
    sha256?: string;
    mark?: ManifestMark;
}
export interface DesignSystemManifest {
    schemaVersion: number;
    engineVersion: string;
    templateId: string;
    createdWith: string;
    appliedMigrations: string[];
    files: Record<string, ManifestFile>;
}
