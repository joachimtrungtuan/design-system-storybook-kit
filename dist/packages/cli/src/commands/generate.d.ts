import { type Reporter } from "../ui/report.ts";
export interface GenerateCommandOptions {
    cwd?: string;
    tier: string;
    name: string;
    reporter?: Reporter;
}
export declare function runGenerate(options: GenerateCommandOptions): Promise<void>;
