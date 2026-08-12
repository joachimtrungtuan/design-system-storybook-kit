export declare const RAMP_STEPS: readonly [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
export type RampStep = (typeof RAMP_STEPS)[number];
export type RampMode = "oklch" | "hsl";
export type TokenPrimitive = string | number;
export type TokenNode = TokenPrimitive | TokenObject | RampDefinition;
export interface TokenObject {
    [key: string]: TokenNode;
}
export interface RampDefinition {
    $base: string;
    $anchor: RampStep;
    $mode: RampMode;
    $overrides?: Partial<Record<RampStep, string>>;
}
export interface ParsedTokens {
    root: TokenObject;
    source: string;
}
export declare function tokenReferencePath(value: string): string | undefined;
export declare function parseTokens(input: unknown, source?: string): ParsedTokens;
export declare function parseTokensJson(input: string, source?: string): ParsedTokens;
export declare function isRampDefinition(value: TokenNode): value is RampDefinition;
