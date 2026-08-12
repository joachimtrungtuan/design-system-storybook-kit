import { type RampDefinition, type RampStep } from "./schema.ts";
export interface GeneratedRampColor {
    hex: string;
    clipped: boolean;
    source: "generated" | "anchor" | "override";
}
export type GeneratedRamp = Record<RampStep, GeneratedRampColor>;
export declare function generateRamp(definition: RampDefinition): GeneratedRamp;
