export type PackageManager = "npm" | "pnpm" | "yarn";
export type DetectionSource = "user-agent" | "path" | "none";
export interface PackageManagerDetection {
    detected?: PackageManager;
    source: DetectionSource;
    available: PackageManager[];
}
type ExecutableProbe = (name: PackageManager, pathValue: string) => boolean;
export declare function detectPackageManager(environment?: NodeJS.ProcessEnv, executableProbe?: ExecutableProbe): PackageManagerDetection;
export {};
