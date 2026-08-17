import { type Tier } from "../validator/rules/helpers.ts";
export interface ComponentScaffold {
    componentPath: string;
    indexPath: string;
    storyPath: string;
    componentSource: string;
    indexSource: string;
    storySource: string;
}
export declare function isComponentName(value: string): boolean;
export declare function createComponentScaffold(tier: Tier, name: string): ComponentScaffold;
export declare function componentTierBarrelSource(names: Iterable<string>): string;
export declare function regenerateTierBarrel(root: string, tier: Tier, write?: (path: string, content: string) => Promise<void>): Promise<string>;
export declare function regenerateAllTierBarrels(root: string, write?: (path: string, content: string) => Promise<void>): Promise<string[]>;
export declare function writeComponentScaffold(root: string, scaffold: ComponentScaffold, write: (path: string, content: string) => Promise<void>): Promise<void>;
