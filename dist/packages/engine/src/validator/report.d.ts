import type { ValidationResult } from "./types.ts";
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
export declare function formatHumanReport(result: ValidationResult): string;
export declare function jsonReport(result: ValidationResult): JsonValidationReport;
export declare function formatJsonReport(result: ValidationResult): string;
