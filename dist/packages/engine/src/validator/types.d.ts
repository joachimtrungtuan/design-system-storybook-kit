import type ts from "typescript";
import type { ParsedTokens } from "../tokens/schema.ts";
export type RuleId = `V${number}`;
export interface Violation {
    ruleId: RuleId;
    file: string;
    line?: number;
    message: string;
    action: string;
}
export interface ProjectSnapshot {
    root: string;
    program: ts.Program;
    files: ReadonlyMap<string, string>;
    directories: ReadonlySet<string>;
    sources: ReadonlyMap<string, ts.SourceFile>;
    rawTokens?: unknown;
    parsedTokens?: ParsedTokens;
    tokenError?: Error;
}
export type ValidatorRule = (snapshot: ProjectSnapshot) => Violation[];
export interface ValidationResult {
    root: string;
    violations: Violation[];
}
