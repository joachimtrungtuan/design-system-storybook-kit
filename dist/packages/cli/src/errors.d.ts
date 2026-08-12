import { ActionableError } from "../../engine/src/errors.ts";
import { type ExitCode } from "./exit-codes.ts";
export { ActionableError } from "../../engine/src/errors.ts";
export declare class PromptCancelledError extends Error {
    constructor();
}
export declare function formatActionableError(error: ActionableError): string;
export declare function handleCliError(error: unknown, writeError?: (message: string) => void): ExitCode;
