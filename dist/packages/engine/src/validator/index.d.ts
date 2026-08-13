import type { ValidationResult } from "./types.ts";
export declare const IMPLEMENTED_RULE_IDS: readonly ["V1", "V2", "V3", "V4", "V5", "V6", "V7", "V8", "V9", "V10", "V11", "V12", "V13", "V14", "V15", "V16", "V17", "V18", "V19", "V20", "V21", "V22", "V23", "V24"];
export declare function validateProject(root: string): Promise<ValidationResult>;
export { formatHumanReport, formatJsonReport, jsonReport } from "./report.ts";
export type { JsonValidationReport } from "./report.ts";
export type { ProjectSnapshot, RuleId, ValidationResult, Violation } from "./types.ts";
