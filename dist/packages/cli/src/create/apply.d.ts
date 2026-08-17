import { type ExitCode } from "../exit-codes.ts";
import type { Reporter } from "../ui/report.ts";
import type { CreatePlan } from "./plan.ts";
type GitRunner = (cwd: string, args: readonly string[]) => void;
type Installer = (manager: CreatePlan["packageManager"], cwd: string) => Promise<void>;
type Validator = (cwd: string, write: (message: string) => void) => Promise<ExitCode>;
export interface CreateApplyDependencies {
    git?: GitRunner;
    install?: Installer;
    validate?: Validator;
}
export interface CreateApplyOptions {
    plan: CreatePlan;
    toolkitRoot: string;
    reporter?: Reporter;
    dependencies?: CreateApplyDependencies;
}
export interface CreateApplyResult {
    target: string;
    installed: boolean;
    validated: boolean;
    exitCode: ExitCode;
}
export declare function applyCreate(options: CreateApplyOptions): Promise<CreateApplyResult>;
export {};
