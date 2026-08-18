import { type Reporter } from "../ui/report.ts";
import { type PackageManager } from "../env/package-manager.ts";
import { type CreateApplyDependencies, type CreateApplyResult } from "../create/apply.ts";
import { type CreatePromptDependencies } from "../create/prompts.ts";
export interface CreateCommandOptions {
    cwd?: string;
    target?: string;
    projectName?: string;
    packageManager?: PackageManager;
    noInstall?: boolean;
    independentRepository?: boolean;
    yes?: boolean;
    toolkitSpecifier?: string;
    promptDependencies?: CreatePromptDependencies;
    reporter?: Reporter;
    dependencies?: CreateApplyDependencies;
}
export declare function runCreate(options?: CreateCommandOptions): Promise<CreateApplyResult>;
