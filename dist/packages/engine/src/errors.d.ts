import { type ExitCode } from "./exit-codes.ts";
export declare class ActionableError extends Error {
    readonly action: string;
    readonly resource: string;
    readonly exitCode: ExitCode;
    constructor(problem: string, action: string, resource: string, exitCode?: ExitCode);
}
