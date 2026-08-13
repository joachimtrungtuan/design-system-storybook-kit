import ts from "typescript";
import type { ProjectSnapshot, RuleId, Violation } from "../types.ts";
export declare const TIERS: readonly ["atoms", "molecules", "organisms", "templates"];
export type Tier = (typeof TIERS)[number];
export declare function isTier(value: string): value is Tier;
export declare function violation(ruleId: RuleId, file: string, message: string, action: string, line?: number): Violation;
export declare function nodeLine(snapshot: ProjectSnapshot, file: string, node: ts.Node): number | undefined;
export declare function kebabCase(value: string): boolean;
export declare function pascalCase(value: string): boolean;
export declare function pascalFromKebab(value: string): string;
export declare function componentTier(path: string): Tier | undefined;
export declare function storyTier(path: string): Tier | undefined;
export declare function moduleSpecifiers(source: ts.SourceFile): Array<{
    value: string;
    node: ts.Node;
}>;
export declare function exportSpecifiers(source: ts.SourceFile): Array<{
    value: string;
    node: ts.ExportDeclaration;
}>;
export declare function resolveModule(snapshot: ProjectSnapshot, sourcePath: string, specifier: string): string | undefined;
export declare function objectProperty(object: ts.ObjectLiteralExpression, name: string): ts.PropertyAssignment | undefined;
export declare function defaultMetaObject(source: ts.SourceFile): ts.ObjectLiteralExpression | undefined;
export declare function typeText(node: ts.Node | undefined): string;
