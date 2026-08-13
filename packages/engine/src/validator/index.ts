import { createProjectSnapshot } from "./snapshot.ts";
import { validateConfig } from "./rules/config.ts";
import { validateDocs } from "./rules/docs.ts";
import { validateLayout } from "./rules/layout.ts";
import { validateNaming } from "./rules/naming.ts";
import { validateStories } from "./rules/stories.ts";
import { validateTierImports } from "./rules/tiers.ts";
import { validateTokens } from "./rules/tokens.ts";
import type { ValidationResult, ValidatorRule } from "./types.ts";

export const IMPLEMENTED_RULE_IDS = [
  "V1", "V2", "V3", "V4", "V5", "V6", "V7", "V8", "V9", "V10", "V11", "V12",
  "V13", "V14", "V15", "V16", "V17", "V18", "V19", "V20", "V21", "V22", "V23", "V24",
] as const;

const RULES: ValidatorRule[] = [
  validateLayout,
  validateTierImports,
  validateNaming,
  validateStories,
  validateTokens,
  validateDocs,
  validateConfig,
];

function ruleNumber(ruleId: string): number {
  return Number(ruleId.slice(1));
}

export async function validateProject(root: string): Promise<ValidationResult> {
  const snapshot = await createProjectSnapshot(root);
  const violations = RULES
    .flatMap((rule) => rule(snapshot))
    .sort((left, right) =>
      ruleNumber(left.ruleId) - ruleNumber(right.ruleId) ||
      left.file.localeCompare(right.file) ||
      (left.line ?? 0) - (right.line ?? 0),
    );
  return { root: snapshot.root, violations };
}

export { formatHumanReport, formatJsonReport, jsonReport } from "./report.ts";
export type { JsonValidationReport } from "./report.ts";
export type { ProjectSnapshot, RuleId, ValidationResult, Violation } from "./types.ts";
