export interface WorkspaceDeclaration {
    kind: "pnpm" | "package-json";
    root: string;
    declarationFile: string;
    registration: string;
}
export declare function findParentWorkspace(start: string): WorkspaceDeclaration | undefined;
