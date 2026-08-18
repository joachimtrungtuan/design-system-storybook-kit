import { type ClassifiedFile, type DesignSystemManifest } from "../manifest/index.ts";
import { type ValidationResult } from "../validator/index.ts";
export interface UpdatePipelineOptions {
    root: string;
    engineVersion: string;
    dryRun: boolean;
}
export interface UpdatePipelineResult {
    previousEngineVersion: string;
    engineVersion: string;
    classified: ClassifiedFile[];
    manifest: DesignSystemManifest;
    validation: ValidationResult | undefined;
}
export declare function runUpdatePipeline(options: UpdatePipelineOptions): Promise<UpdatePipelineResult>;
