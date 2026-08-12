import { ActionableError } from "../../engine/src/errors.js";
import { EXIT_CODES } from "./exit-codes.js";
export { ActionableError } from "../../engine/src/errors.js";
export class PromptCancelledError extends Error {
    constructor() {
        super("Operation cancelled.");
        this.name = "PromptCancelledError";
    }
}
export function formatActionableError(error) {
    return [
        `Problem: ${error.message}`,
        `Next step: ${error.action}`,
        `More information: ${error.resource}`,
    ].join("\n");
}
export function handleCliError(error, writeError = console.error) {
    if (error instanceof PromptCancelledError) {
        writeError(error.message);
        return EXIT_CODES.success;
    }
    if (error instanceof ActionableError) {
        writeError(formatActionableError(error));
        return error.exitCode;
    }
    writeError([
        "Problem: story-cli-kit encountered an internal error.",
        "Next step: Run the command again with the same arguments and report the failure if it repeats.",
        "More information: https://github.com/joachimtrungtuan/story-cli-kit/issues",
    ].join("\n"));
    return EXIT_CODES.internalError;
}
//# sourceMappingURL=errors.js.map