import { hexToHsl, hexToOklch, hslToHex, normalizeHex, oklchToHex } from "./color.ts";
import { RAMP_STEPS, type RampDefinition, type RampStep } from "./schema.ts";

export interface GeneratedRampColor {
  hex: string;
  clipped: boolean;
  source: "generated" | "anchor" | "override";
}

export type GeneratedRamp = Record<RampStep, GeneratedRampColor>;

const LIGHT_ENDPOINT = 0.97;
const OKLCH_DARK_ENDPOINT = 0.18;
const HSL_DARK_ENDPOINT = 0.12;

function curvedProgress(value: number): number {
  return value ** 1.15;
}

function interpolate(start: number, end: number, progress: number): number {
  return start + (end - start) * curvedProgress(progress);
}

function lightnessAt(
  index: number,
  anchorIndex: number,
  baseLightness: number,
  darkEndpoint: number,
): number {
  if (index < anchorIndex) {
    return interpolate(LIGHT_ENDPOINT, baseLightness, index / anchorIndex);
  }
  if (index > anchorIndex) {
    return interpolate(baseLightness, darkEndpoint, (index - anchorIndex) / (RAMP_STEPS.length - 1 - anchorIndex));
  }
  return baseLightness;
}

export function generateRamp(definition: RampDefinition): GeneratedRamp {
  const anchorIndex = RAMP_STEPS.indexOf(definition.$anchor);
  const result = {} as GeneratedRamp;
  const base = normalizeHex(definition.$base);
  const oklch = definition.$mode === "oklch" ? hexToOklch(base) : undefined;
  const hsl = definition.$mode === "hsl" ? hexToHsl(base) : undefined;

  for (const [index, step] of RAMP_STEPS.entries()) {
    if (step === definition.$anchor) {
      result[step] = { hex: base, clipped: false, source: "anchor" };
      continue;
    }
    const override = definition.$overrides?.[step];
    if (override !== undefined) {
      result[step] = { hex: normalizeHex(override), clipped: false, source: "override" };
      continue;
    }
    if (oklch !== undefined) {
      const converted = oklchToHex({
        ...oklch,
        lightness: lightnessAt(index, anchorIndex, oklch.lightness, OKLCH_DARK_ENDPOINT),
      });
      result[step] = { ...converted, source: "generated" };
      continue;
    }
    if (hsl === undefined) {
      throw new TypeError(`Unsupported ramp mode: ${definition.$mode as string}`);
    }
    result[step] = {
      hex: hslToHex({
        ...hsl,
        lightness: lightnessAt(index, anchorIndex, hsl.lightness, HSL_DARK_ENDPOINT),
      }),
      clipped: false,
      source: "generated",
    };
  }
  return result;
}
