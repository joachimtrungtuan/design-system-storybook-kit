import type { ClassifiedFile } from "../manifest/index.ts";
import type { ValidationResult } from "../validator/index.ts";
export interface UpdateReportOptions {
    previousEngineVersion: string;
    engineVersion: string;
    classified: readonly ClassifiedFile[];
    validation: ValidationResult | undefined;
}
export declare function formatUpdateReport(options: UpdateReportOptions): string;
export declare function writeUpdateReport(root: string, content: string, engineVersion: string, date?: Date): Promise<string>;
