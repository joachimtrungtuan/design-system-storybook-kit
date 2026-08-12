import { ActionableError } from "../../engine/src/errors.ts";
import { EXIT_CODES, type ExitCode } from "./exit-codes.ts";

export { ActionableError } from "../../engine/src/errors.ts";

export class PromptCancelledError extends Error {
  constructor() {
    super("Operation cancelled.");
    this.name = "PromptCancelledError";
  }
}

export function formatActionableError(error: ActionableError): string {
  return [
    `Problem: ${error.message}`,
    `Next step: ${error.action}`,
    `More information: ${error.resource}`,
  ].join("\n");
}

export function handleCliError(
  error: unknown,
  writeError: (message: string) => void = console.error,
): ExitCode {
  if (error instanceof PromptCancelledError) {
    writeError(error.message);
    return EXIT_CODES.success;
  }

  if (error instanceof ActionableError) {
    writeError(formatActionableError(error));
    return error.exitCode;
  }

  writeError(
    [
      "Problem: story-cli-kit encountered an internal error.",
      "Next step: Run the command again with the same arguments and report the failure if it repeats.",
      "More information: https://github.com/joachimtrungtuan/story-cli-kit/issues",
    ].join("\n"),
  );
  return EXIT_CODES.internalError;
}
