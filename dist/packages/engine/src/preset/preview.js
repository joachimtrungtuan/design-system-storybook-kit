import { parseTokens } from "../tokens/schema.js";
import { buildBrandSurfaces } from "./surfaces.js";
function surfaceOptions(surfaces) {
    return Object.fromEntries(surfaces.map((surface) => [surface.id, { name: surface.name, value: surface.value }]));
}
export function preview(tokenInput, overrides = {}, source = "tokens.json") {
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
            brandSurfaces: Object.fromEntries(surfaces.map((surface) => [surface.id, { value: surface.value, mode: surface.mode }])),
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
//# sourceMappingURL=preview.js.map