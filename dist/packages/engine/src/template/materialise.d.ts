export interface MaterialiseTemplateOptions {
    destination?: string;
    projectName?: string;
    packageManager?: string;
    toolkitSpecifier?: string;
    templateDirectory?: string;
}
export interface MaterialisedTemplate {
    directory: string;
}
export declare function materialiseTemplate(options?: MaterialiseTemplateOptions): Promise<MaterialisedTemplate>;
