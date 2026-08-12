import { EXIT_CODES, type ExitCode } from "./exit-codes.ts";

export class ActionableError extends Error {
  readonly action: string;
  readonly resource: string;
  readonly exitCode: ExitCode;

  constructor(
    problem: string,
    action: string,
    resource: string,
    exitCode: ExitCode = EXIT_CODES.refusal,
  ) {
    super(problem);
    this.name = "ActionableError";
    this.action = action;
    this.resource = resource;
    this.exitCode = exitCode;
  }
}
