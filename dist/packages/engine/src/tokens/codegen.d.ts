import { type ParsedTokens, type TokenObject } from "./schema.ts";
export interface GamutClipNotice {
    path: string;
    emitted: string;
}
export interface TokenCodegenResult {
    css: string;
    gamutClips: GamutClipNotice[];
}
export declare function generateTokensCss(tokens: ParsedTokens): TokenCodegenResult;
export declare function codegenTokens(input: unknown, source?: string): TokenCodegenResult;
export declare function tokenObject(value: TokenObject): TokenObject;
