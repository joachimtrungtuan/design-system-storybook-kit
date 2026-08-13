import { validateProject } from "../../../engine/src/validator/index.ts";
import { formatHumanReport, formatJsonReport } from "../../../engine/src/validator/report.ts";
import { EXIT_CODES, type ExitCode } from "../exit-codes.ts";

export interface ValidateCommandOptions {
  cwd?: string;
  json?: boolean;
  write?: (message: string) => void;
}

export async function runValidate(options: ValidateCommandOptions = {}): Promise<ExitCode> {
  const result = await validateProject(options.cwd ?? process.cwd());
  const output = options.json === true ? formatJsonReport(result) : formatHumanReport(result);
  (options.write ?? console.log)(output);
  return result.violations.length === 0 ? EXIT_CODES.success : EXIT_CODES.validationFailure;
}
