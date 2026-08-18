import { runUpdatePipeline } from "../../../engine/src/update/pipeline.ts";
import { type ExitCode } from "../exit-codes.ts";
import { type Reporter } from "../ui/report.ts";
type GitRunner = (cwd: string, args: readonly string[]) => void;
export interface UpdateCommandOptions {
    cwd?: string;
    dryRun?: boolean;
    onConflict?: string;
    to?: string;
    reporter?: Reporter;
    git?: GitRunner;
    pipeline?: typeof runUpdatePipeline;
}
export interface UpdateCommandResult {
    exitCode: ExitCode;
    branch?: string;
}
export declare function runUpdate(options?: UpdateCommandOptions): Promise<UpdateCommandResult>;
export {};
