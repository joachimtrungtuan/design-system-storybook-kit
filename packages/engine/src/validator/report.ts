import type { ValidationResult, Violation } from "./types.ts";

export interface JsonValidationReport {
  valid: boolean;
  root: string;
  violations: Array<{
    ruleId: string;
    file: string;
    line?: number;
    message: string;
    action: string;
  }>;
}

function location(violation: Violation): string {
  return violation.line === undefined
    ? violation.file
    : `${violation.file}:${violation.line}`;
}

export function formatHumanReport(result: ValidationResult): string {
  if (result.violations.length === 0) {
    return "Design-system contract valid: 0 violations.";
  }
  const details = result.violations.flatMap((violation) => [
    `${violation.ruleId} ${location(violation)} — ${violation.message}`,
    `  Fix: ${violation.action}`,
  ]);
  return [
    `Design-system contract invalid: ${result.violations.length} violation(s).`,
    ...details,
  ].join("\n");
}

export function jsonReport(result: ValidationResult): JsonValidationReport {
  return {
    valid: result.violations.length === 0,
    root: result.root,
    violations: result.violations.map((violation) => ({ ...violation })),
  };
}

export function formatJsonReport(result: ValidationResult): string {
  return JSON.stringify(jsonReport(result), null, 2);
}
