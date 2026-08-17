import type { GitEnvironment } from "../env/git.ts";
import type { PackageManager, PackageManagerDetection } from "../env/package-manager.ts";
import type { WorkspaceDeclaration } from "../env/workspace.ts";
export type RepositoryMode = "new" | "enclosing" | "independent";
export interface CreateEnvironment {
    nodeVersion: string;
    git: GitEnvironment;
    packageManager: PackageManagerDetection;
    templateFiles: string[];
    workspace?: WorkspaceDeclaration;
}
export interface CreatePlanInput {
    target: string;
    projectName?: string;
    packageManager?: PackageManager;
    noInstall?: boolean;
    independentRepository?: boolean;
    yes?: boolean;
    toolkitSpecifier?: string;
    engineVersion: string;
    environment: CreateEnvironment;
}
export interface CreatePlan {
    target: string;
    projectName: string;
    packageManager: PackageManager;
    noInstall: boolean;
    repositoryMode: RepositoryMode;
    repositoryRoot: string;
    parentRepositoryRoot?: string;
    workspace?: WorkspaceDeclaration;
    templateFiles: string[];
    collisions: string[];
    preservedFiles: string[];
    toolkitSpecifier: string;
    engineVersion: string;
}
export declare function buildCreatePlan(input: CreatePlanInput): CreatePlan;
