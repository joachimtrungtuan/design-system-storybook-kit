import type { ProjectSnapshot } from "./types.ts";
export declare function createProjectSnapshot(root: string): Promise<ProjectSnapshot>;
export declare function lineOf(content: string, offset: number): number;
