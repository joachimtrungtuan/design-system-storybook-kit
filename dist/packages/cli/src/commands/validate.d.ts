import { type ExitCode } from "../exit-codes.ts";
export interface ValidateCommandOptions {
    cwd?: string;
    json?: boolean;
    write?: (message: string) => void;
}
export declare function runValidate(options?: ValidateCommandOptions): Promise<ExitCode>;
