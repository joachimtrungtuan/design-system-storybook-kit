export interface GitEnvironment {
    present: boolean;
    userNameConfigured: boolean;
    userEmailConfigured: boolean;
    insideRepository: boolean;
    repositoryRoot?: string;
    clean: boolean;
}
type GitRunner = (args: readonly string[]) => string;
type GitContextResolver = (target: string) => string;
export declare function nearestExistingAncestor(target: string): string;
export declare function inspectGit(target: string, runner?: GitRunner, resolveContext?: GitContextResolver): GitEnvironment;
export {};
