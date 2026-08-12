#!/usr/bin/env node
import { type ExitCode } from "./exit-codes.ts";
import { type Command } from "./help.ts";
export declare function resolveExecutionPackageRoot(moduleUrl: string): string;
export declare function isProjectLocalInstallation(cwd: string, executionPackageRoot?: string): boolean;
export declare function guardTransientMaintenance(command: Command, cwd?: string, executionPackageRoot?: string): void;
export declare function run(argv?: string[]): Promise<ExitCode>;
