import { type ExitCode } from "./exit-codes.ts";
export declare class ActionableError extends Error {
    readonly action: string;
    readonly resource: string;
    readonly exitCode: ExitCode;
    constructor(problem: string, action: string, resource: string, exitCode?: ExitCode);
}
export declare class PromptCancelledError extends Error {
    constructor();
}
export declare function formatActionableError(error: ActionableError): string;
export declare function handleCliError(error: unknown, writeError?: (message: string) => void): ExitCode;
