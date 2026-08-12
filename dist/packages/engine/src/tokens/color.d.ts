export interface RgbColor {
    red: number;
    green: number;
    blue: number;
}
export interface OklchColor {
    lightness: number;
    chroma: number;
    hue: number;
}
export interface HslColor {
    hue: number;
    saturation: number;
    lightness: number;
}
export interface HexConversion {
    hex: string;
    clipped: boolean;
}
export declare function normalizeHex(value: string): string;
export declare function hexToRgb(value: string): RgbColor;
export declare function rgbToHex(color: RgbColor): string;
export declare function hexToOklch(value: string): OklchColor;
export declare function oklchToHex(color: OklchColor): HexConversion;
export declare function hexToHsl(value: string): HslColor;
export declare function hslToHex(color: HslColor): string;
