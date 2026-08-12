import { ActionableError } from "../errors.js";
import { normalizeHex } from "./color.js";
export const RAMP_STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
const TOKEN_REFERENCE = /^\{([A-Za-z0-9_$-]+(?:\.[A-Za-z0-9_$-]+)+)\}$/u;
const ALLOWED_TOP_LEVEL_GROUPS = new Set([
    "color",
    "typography",
    "spacing",
    "radius",
    "shadow",
    "motion",
    "breakpoint",
    "container",
    "icon",
    "zIndex",
]);
const RAMP_PALETTES = new Set(["brand", "secondary", "grey"]);
function isRecord(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}
function fail(source, path, problem, action) {
    throw new ActionableError(`${problem} at ${path}.`, action, `${source}#${path}`);
}
function isRampStep(value) {
    return RAMP_STEPS.some((step) => step === value);
}
function parseRamp(value, source, path) {
    const literalSteps = Object.keys(value).filter((key) => RAMP_STEPS.includes(Number(key)));
    if (literalSteps.length === RAMP_STEPS.length) {
        fail(source, path, "A ramp declares every step literally", "Keep $base, $anchor and $mode, then pin only exceptional steps in $overrides.");
    }
    if (typeof value.$base !== "string") {
        fail(source, `${path}.$base`, "Expected a six-digit hex colour", "Add a $base such as #336699.");
    }
    let base;
    try {
        base = normalizeHex(value.$base);
    }
    catch {
        fail(source, `${path}.$base`, "Expected a six-digit hex colour", "Use the form #RRGGBB.");
    }
    if (typeof value.$anchor !== "number" || !isRampStep(value.$anchor)) {
        fail(source, `${path}.$anchor`, "Expected one of the eleven ramp steps", `Use one of: ${RAMP_STEPS.join(", ")}.`);
    }
    const anchor = value.$anchor;
    if (value.$mode !== "oklch" && value.$mode !== "hsl") {
        fail(source, `${path}.$mode`, "Expected oklch or hsl", "Choose the colour mode for this ramp.");
    }
    const mode = value.$mode;
    const unexpected = Object.keys(value).filter((key) => !["$base", "$anchor", "$mode", "$overrides"].includes(key));
    if (unexpected.length > 0) {
        fail(source, `${path}.${unexpected[0] ?? ""}`, "Unexpected ramp property", "Use only $base, $anchor, $mode and optional $overrides.");
    }
    if (value.$overrides === undefined) {
        return { $base: base, $anchor: anchor, $mode: mode };
    }
    if (!isRecord(value.$overrides)) {
        fail(source, `${path}.$overrides`, "Expected an object", "Map ramp steps to #RRGGBB values.");
    }
    const overrides = {};
    for (const [key, override] of Object.entries(value.$overrides)) {
        const step = Number(key);
        if (!Number.isInteger(step) || !isRampStep(step)) {
            fail(source, `${path}.$overrides.${key}`, "Expected a valid ramp step", `Use one of: ${RAMP_STEPS.join(", ")}.`);
        }
        if (step === anchor) {
            fail(source, `${path}.$overrides.${key}`, "An override cannot replace the anchor colour", "Change $base to update the approved anchor, or move the override to another step.");
        }
        if (typeof override !== "string") {
            fail(source, `${path}.$overrides.${key}`, "Expected a direct hex colour", "Use #RRGGBB.");
        }
        try {
            overrides[step] = normalizeHex(override);
        }
        catch {
            fail(source, `${path}.$overrides.${key}`, "Expected a direct hex colour", "Use #RRGGBB.");
        }
    }
    if (Object.keys(overrides).length === RAMP_STEPS.length) {
        fail(source, `${path}.$overrides`, "A ramp declares every step literally", "Keep only exceptional pinned steps.");
    }
    return { $base: base, $anchor: anchor, $mode: mode, $overrides: overrides };
}
function parseNode(value, source, path, segments) {
    const isPaletteEntry = segments[0] === "color" && segments[1] !== undefined && RAMP_PALETTES.has(segments[1]) && segments.length === 3;
    if (typeof value === "string" || typeof value === "number") {
        if (isPaletteEntry) {
            fail(source, path, "Palette colours must be declared as ramps", "Add $base, $anchor and $mode instead of a direct token value.");
        }
        if (segments[0] === "color" && segments[1] === "semantic") {
            if (typeof value !== "string" || TOKEN_REFERENCE.exec(value) === null) {
                fail(source, path, "Semantic colours must reference another token", "Use DTCG braces, for example {color.brand.forest.500}.");
            }
        }
        return value;
    }
    if (!isRecord(value)) {
        fail(source, path, "Expected a token value or object", "Use a string, number, or nested token object.");
    }
    if ("$value" in value) {
        const permitted = new Set(["$value", "$type", "$description"]);
        const unexpected = Object.keys(value).find((key) => !permitted.has(key));
        if (unexpected !== undefined) {
            fail(source, `${path}.${unexpected}`, "Unexpected token property", "Remove it or nest it as a token.");
        }
        return parseNode(value.$value, source, `${path}.$value`, segments);
    }
    if (isPaletteEntry) {
        return parseRamp(value, source, path);
    }
    const parsed = {};
    for (const key of Object.keys(value).sort()) {
        if (key.startsWith("$") && segments[0]?.startsWith("$") !== true) {
            fail(source, `${path}.${key}`, "Unexpected directive", "Move configuration under a top-level $-prefixed group.");
        }
        parsed[key] = parseNode(value[key], source, `${path}.${key}`, [...segments, key]);
    }
    return parsed;
}
export function tokenReferencePath(value) {
    return TOKEN_REFERENCE.exec(value)?.[1];
}
export function parseTokens(input, source = "tokens.json") {
    if (!isRecord(input)) {
        fail(source, "$", "Expected a top-level object", "Make tokens.json contain token groups.");
    }
    const root = {};
    for (const key of Object.keys(input).sort()) {
        if (!key.startsWith("$") && !ALLOWED_TOP_LEVEL_GROUPS.has(key)) {
            fail(source, `$.${key}`, "Unknown top-level token group", "Use a contract group or prefix non-token configuration with $.");
        }
        if (key.startsWith("$")) {
            continue;
        }
        root[key] = parseNode(input[key], source, `$.${key}`, [key]);
    }
    return { root, source };
}
export function parseTokensJson(input, source = "tokens.json") {
    let parsed;
    try {
        parsed = JSON.parse(input);
    }
    catch (error) {
        const detail = error instanceof Error ? error.message : "invalid JSON";
        throw new ActionableError(`Could not parse ${source}: ${detail}`, "Correct the JSON syntax and run the command again.", source);
    }
    return parseTokens(parsed, source);
}
export function isRampDefinition(value) {
    return typeof value === "object" && value !== null && "$base" in value;
}
//# sourceMappingURL=schema.js.map