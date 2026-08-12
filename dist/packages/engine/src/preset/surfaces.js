import { ActionableError } from "../errors.js";
import { generateRamp } from "../tokens/ramp.js";
import { isRampDefinition, RAMP_STEPS, tokenReferencePath, } from "../tokens/schema.js";
import { hexToRgb, normalizeHex } from "../tokens/color.js";
function isTokenObject(value) {
    return typeof value === "object" && value !== null && !isRampDefinition(value);
}
function fail(source, path, problem, action) {
    throw new ActionableError(`${problem} at ${path}.`, action, `${source}#${path}`);
}
function lookupToken(root, path, source) {
    const segments = path.split(".");
    let node = root;
    for (let index = 0; index < segments.length; index += 1) {
        const segment = segments[index];
        if (segment === undefined) {
            fail(source, path, "Invalid token reference", "Use a dotted DTCG token path.");
        }
        if (isRampDefinition(node)) {
            const step = Number(segment);
            if (!RAMP_STEPS.includes(step)) {
                fail(source, path, "Unknown generated ramp step", "Reference one of the generated ramp steps.");
            }
            node = generateRamp(node)[step].hex;
            continue;
        }
        if (!isTokenObject(node) || node[segment] === undefined) {
            fail(source, path, "Unknown surface colour token", "Reference a colour token that exists in tokens.json.");
        }
        node = node[segment];
    }
    return node;
}
function resolveColor(root, reference, source, seen = new Set()) {
    if (seen.has(reference)) {
        fail(source, reference, "Circular surface colour reference", "Point the surface at an acyclic colour token.");
    }
    seen.add(reference);
    const node = lookupToken(root, reference, source);
    if (typeof node !== "string") {
        fail(source, reference, "Surface colour does not resolve to a colour", "Reference a concrete colour token or ramp step.");
    }
    const nestedReference = tokenReferencePath(node);
    if (nestedReference !== undefined) {
        return resolveColor(root, nestedReference, source, seen);
    }
    try {
        return normalizeHex(node);
    }
    catch {
        fail(source, reference, "Surface colour does not resolve to a six-digit hex colour", "Reference a colour token.");
    }
}
function relativeLuminance(hex) {
    const { red, green, blue } = hexToRgb(hex);
    const linear = (channel) => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
    return 0.2126 * linear(red) + 0.7152 * linear(green) + 0.0722 * linear(blue);
}
export function classifySurface(hex) {
    return relativeLuminance(hex) > 0.179 ? "light" : "dark";
}
export function buildBrandSurfaces(tokens) {
    const meta = tokens.configuration.$meta;
    if (!isTokenObject(meta)) {
        return [];
    }
    const declarations = meta.surfaces;
    if (declarations === undefined) {
        return [];
    }
    if (!isTokenObject(declarations)) {
        fail(tokens.source, "$.$meta.surfaces", "Expected a surface map", "Map each surface name to a colour reference.");
    }
    return Object.keys(declarations)
        .sort()
        .map((id) => {
        const path = `$.$meta.surfaces.${id}`;
        const declaration = declarations[id];
        if (!isTokenObject(declaration) || typeof declaration.color !== "string") {
            fail(tokens.source, path, "Expected a surface colour reference", "Add color: \"{color.path.to.token}\".");
        }
        const reference = tokenReferencePath(declaration.color);
        if (reference === undefined) {
            fail(tokens.source, `${path}.color`, "Expected a DTCG token reference", "Use braces, for example {color.base.white}.");
        }
        if (declaration.mode !== undefined && declaration.mode !== "light" && declaration.mode !== "dark") {
            fail(tokens.source, `${path}.mode`, "Expected light or dark", "Remove mode for automatic classification or choose light/dark.");
        }
        const value = resolveColor(tokens.root, reference, tokens.source);
        return {
            id,
            name: id,
            value,
            mode: declaration.mode ?? classifySurface(value),
        };
    });
}
//# sourceMappingURL=surfaces.js.map