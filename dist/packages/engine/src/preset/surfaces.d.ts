import { type ParsedTokens } from "../tokens/schema.ts";
export type BrandSurfaceMode = "light" | "dark";
export interface BrandSurface {
    id: string;
    name: string;
    value: string;
    mode: BrandSurfaceMode;
}
export declare function classifySurface(hex: string): BrandSurfaceMode;
export declare function buildBrandSurfaces(tokens: ParsedTokens): BrandSurface[];
