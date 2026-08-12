import { parseTokens } from "../tokens/schema.ts";
import { buildBrandSurfaces, type BrandSurface } from "./surfaces.ts";

export interface StorybookBackground {
  name: string;
  value: string;
}

export interface StorybookPreviewParameters {
  backgrounds?: {
    default?: string;
    options?: Record<string, StorybookBackground>;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export type StorybookDecorator = (...args: never[]) => unknown;

export interface StorybookPreviewConfig {
  decorators: StorybookDecorator[];
  parameters: StorybookPreviewParameters;
  initialGlobals?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface StorybookPreviewOverrides {
  decorators?: StorybookDecorator[];
  parameters?: StorybookPreviewParameters;
  initialGlobals?: Record<string, unknown>;
  [key: string]: unknown;
}

function surfaceOptions(surfaces: BrandSurface[]): Record<string, StorybookBackground> {
  return Object.fromEntries(surfaces.map((surface) => [surface.id, { name: surface.name, value: surface.value }]));
}

export function preview(
  tokenInput: unknown,
  overrides: StorybookPreviewOverrides = {},
  source = "tokens.json",
): StorybookPreviewConfig {
  const surfaces = buildBrandSurfaces(parseTokens(tokenInput, source));
  const options = surfaceOptions(surfaces);
  const { decorators = [], parameters: overrideParameters = {}, ...rest } = overrides;
  const overrideBackgrounds = overrideParameters.backgrounds ?? {};
  const firstSurface = surfaces[0];

  return {
    ...rest,
    decorators: [...decorators],
    parameters: {
      controls: {
        matchers: {
          color: /(background|color)$/iu,
          date: /Date$/u,
        },
      },
      docs: { toc: true },
      brandSurfaces: Object.fromEntries(
        surfaces.map((surface) => [surface.id, { value: surface.value, mode: surface.mode }]),
      ),
      ...overrideParameters,
      backgrounds: {
        ...overrideBackgrounds,
        options: {
          ...options,
          ...overrideBackgrounds.options,
        },
      },
    },
    ...(firstSurface === undefined
      ? {}
      : {
          initialGlobals: {
            backgrounds: { value: firstSurface.id },
            ...overrides.initialGlobals,
          },
        }),
  };
}
