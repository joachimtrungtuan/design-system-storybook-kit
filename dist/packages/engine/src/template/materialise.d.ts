export interface MaterialiseTemplateOptions {
    destination?: string;
    projectName?: string;
    packageManager?: string;
    toolkitSpecifier?: string;
    templateDirectory?: string;
    preserveExistingFiles?: Iterable<string>;
    onDirectoryCreate?: (path: string) => void | Promise<void>;
    onFileWrite?: (path: string, content: string) => void | Promise<void>;
}
export interface MaterialisedTemplate {
    directory: string;
}
export declare function toolkitRoot(): Promise<string>;
export declare function materialiseTemplate(options?: MaterialiseTemplateOptions): Promise<MaterialisedTemplate>;
export declare function listTemplateFiles(templateDirectory: string): Promise<string[]>;
export declare function listTemplateDirectories(templateDirectory: string): Promise<string[]>;
