export declare class RollbackLedger {
    private readonly entries;
    private readonly touched;
    private readonly directories;
    private readonly trackedDirectories;
    private readonly root;
    constructor(root: string);
    ensureDirectory(path: string): Promise<void>;
    recordDirectory(path: string): void;
    write(path: string, content: string): Promise<void>;
    paths(): string[];
    relativePaths(): string[];
    rollback(): Promise<void>;
}
