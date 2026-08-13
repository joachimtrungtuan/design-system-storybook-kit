import { generateTokensCss } from "../../tokens/codegen.js";
import { lineOf } from "../snapshot.js";
import { violation } from "./helpers.js";
const COLOR_LITERAL = /#[0-9a-fA-F]{3,8}\b|\b(?:rgb|hsl)a?\([^)]*\)/gu;
const TOP_LEVEL_GROUP = /^[a-z][A-Za-z0-9]*$/u;
const NON_CANONICAL_GROUPS = new Map([
    ["borderRadius", "radius"],
    ["transition", "motion"],
    ["meta", "$meta"],
]);
const FONT_FAMILY_VALUE = /(?:font-family\s*:\s*|fontFamily\s*:\s*["'])([^;}"']+)/giu;
const TYPE_SCALE_VALUE = /(?:font-size\s*:\s*|fontSize\s*:\s*["'])([^;}"']+)|\btext-\[(?:\d*\.)?\d+(?:px|rem|em|pt)\]/giu;
const RAW_FONT_LITERAL = /["']([^"']*,\s*(?:sans-serif|serif|monospace|cursive|fantasy|system-ui))["']/giu;
const RAW_SIZE_BINDING = /\b(?:const|let|var)\s+(?:fontSize|typeSize|size)\s*=\s*["']((?:\d*\.)?\d+(?:px|rem|em|pt))["']/giu;
function sourceFiles(snapshot) {
    return [...snapshot.files].filter(([path]) => (path.startsWith("src/") || path.startsWith(".storybook/")) &&
        /\.(?:css|mdx|[cm]?[jt]sx?)$/u.test(path) && path !== "src/styles/tokens.css");
}
function stripFontSourceExemptions(content) {
    return content
        .replace(/^\s*@import[^;]+;.*$/gmu, "")
        .replace(/@font-face\s*\{[^}]*\}/gisu, (block) => block.replace(/font-family\s*:[^;]+;/giu, ""));
}
function collectPrimitiveStrings(value, path = [], output = []) {
    if (typeof value === "string") {
        output.push({ path: path.join("."), value });
        return output;
    }
    if (typeof value !== "object" || value === null || Array.isArray(value))
        return output;
    for (const [key, child] of Object.entries(value))
        collectPrimitiveStrings(child, [...path, key], output);
    return output;
}
function tokenErrorViolation(snapshot, ruleId, pattern, action) {
    const error = snapshot.tokenError;
    if (error === undefined || !pattern.test(error.message))
        return [];
    const source = snapshot.files.get("tokens.json") ?? "";
    const path = /at (\$\.[^.]*(?:\.[^.]*)*)\.?$/u.exec(error.message)?.[1];
    const needle = path?.split(".").at(-1)?.replace(/^\$/u, "");
    const offset = needle === undefined ? -1 : source.indexOf(`"${needle}"`);
    return [violation(ruleId, "tokens.json", error.message, action, offset < 0 ? undefined : lineOf(source, offset))];
}
function validateRawValues(snapshot) {
    const violations = [];
    const tokenStrings = collectPrimitiveStrings(snapshot.rawTokens);
    const fontValues = tokenStrings.filter(({ path }) => path.includes("typography.fontFamily"));
    const typeScaleValues = tokenStrings.filter(({ path }) => path.includes("typography.fontSize"));
    for (const [file, original] of sourceFiles(snapshot)) {
        const content = file === "src/styles/globals.css" ? stripFontSourceExemptions(original) : original;
        const color = COLOR_LITERAL.exec(content);
        COLOR_LITERAL.lastIndex = 0;
        if (color !== null) {
            violations.push(violation("V12", file, `Raw colour '${color[0]}' appears outside tokens.json.`, "Replace it with a token-derived utility or CSS variable.", lineOf(content, color.index)));
        }
        for (const token of [...fontValues, ...typeScaleValues]) {
            if (token.value.length < 2)
                continue;
            const offset = content.indexOf(token.value);
            if (offset >= 0) {
                violations.push(violation("V12", file, `Raw token value '${token.value}' is duplicated outside tokens.json.`, "Reference the generated token instead.", lineOf(content, offset)));
            }
        }
        for (const pattern of [FONT_FAMILY_VALUE, TYPE_SCALE_VALUE, RAW_FONT_LITERAL, RAW_SIZE_BINDING]) {
            const match = pattern.exec(content);
            pattern.lastIndex = 0;
            if (match !== null && !/var\(--(?:font|text)-/u.test(match[0])) {
                violations.push(violation("V12", file, `Raw typography value '${match[0]}' appears outside tokens.json.`, "Move the value into tokens.json and reference its generated token.", lineOf(content, match.index)));
            }
        }
    }
    return violations;
}
function validateComponentColors(snapshot) {
    const violations = [];
    for (const [file, content] of sourceFiles(snapshot)) {
        if (!file.startsWith("src/components/") && !file.startsWith("src/pages/") && !file.startsWith(".storybook/"))
            continue;
        const match = COLOR_LITERAL.exec(content);
        COLOR_LITERAL.lastIndex = 0;
        if (match !== null) {
            violations.push(violation("V13", file, `Raw colour '${match[0]}' is not permitted here.`, "Use a token-derived utility or var(--...).", lineOf(content, match.index)));
        }
    }
    return violations;
}
function validateArbitraryValues(snapshot) {
    const violations = [];
    const root = snapshot.parsedTokens?.root;
    if (root === undefined)
        return violations;
    const prefixes = new Set();
    if (root.color !== undefined)
        ["bg", "text", "border", "fill", "stroke"].forEach((prefix) => prefixes.add(prefix));
    if (root.typography !== undefined)
        ["text", "font", "tracking", "leading"].forEach((prefix) => prefixes.add(prefix));
    if (root.spacing !== undefined)
        ["p", "px", "py", "pt", "pr", "pb", "pl", "m", "mx", "my", "mt", "mr", "mb", "ml", "gap", "space-x", "space-y"].forEach((prefix) => prefixes.add(prefix));
    if (root.radius !== undefined)
        prefixes.add("rounded");
    if (root.shadow !== undefined)
        prefixes.add("shadow");
    if (root.motion !== undefined)
        ["duration", "ease"].forEach((prefix) => prefixes.add(prefix));
    if (prefixes.size === 0)
        return violations;
    const pattern = new RegExp(`\\b(?:${[...prefixes].sort((a, b) => b.length - a.length).join("|")})(?:-[trblxy])?-\\[[^\\]]+\\]`, "gu");
    for (const [file, content] of sourceFiles(snapshot)) {
        for (const match of content.matchAll(pattern)) {
            if (/^bg-\[(?:url\(|image-set\(|(?:repeating-)?(?:linear|radial|conic)-gradient\()/u.test(match[0]))
                continue;
            violations.push(violation("V14", file, `Arbitrary value '${match[0]}' bypasses an available token group.`, "Use the corresponding token-derived utility.", lineOf(content, match.index)));
            break;
        }
    }
    return violations;
}
function validateGeneratedCss(snapshot) {
    if (snapshot.parsedTokens === undefined)
        return [];
    const actual = snapshot.files.get("src/styles/tokens.css");
    let expected;
    try {
        expected = generateTokensCss(snapshot.parsedTokens).css;
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const ruleId = message.startsWith("Semantic token reference") ? "V19" : "V15";
        return [violation(ruleId, "tokens.json", message, ruleId === "V19" ? "Point semantic colours at existing, non-cyclic token paths." : "Use token groups supported by codegen before regenerating tokens.css.")];
    }
    return actual === expected ? [] : [violation("V15", "src/styles/tokens.css", "Generated token CSS is missing or stale.", "Regenerate tokens.css from the current tokens.json.")];
}
function validateGroupNames(snapshot) {
    if (typeof snapshot.rawTokens !== "object" || snapshot.rawTokens === null || Array.isArray(snapshot.rawTokens)) {
        return [violation("V24", "tokens.json", "tokens.json must contain top-level token groups.", "Use a top-level object of token groups.")];
    }
    const violations = [];
    const source = snapshot.files.get("tokens.json") ?? "";
    for (const key of Object.keys(snapshot.rawTokens)) {
        const replacement = NON_CANONICAL_GROUPS.get(key);
        if (replacement !== undefined) {
            const offset = source.indexOf(`"${key}"`);
            violations.push(violation("V24", "tokens.json", `Top-level group '${key}' has canonical contract name '${replacement}'.`, `Rename it to ${replacement}.`, offset < 0 ? undefined : lineOf(source, offset)));
            continue;
        }
        if (key.startsWith("$") || TOP_LEVEL_GROUP.test(key))
            continue;
        const offset = source.indexOf(`"${key}"`);
        violations.push(violation("V24", "tokens.json", `Top-level group '${key}' is neither camelCase nor $-prefixed.`, "Rename it to a Tailwind namespace or camelCase, or prefix configuration with $.", offset < 0 ? undefined : lineOf(source, offset)));
    }
    return violations;
}
export const validateTokens = (snapshot) => [
    ...validateRawValues(snapshot),
    ...validateComponentColors(snapshot),
    ...validateArbitraryValues(snapshot),
    ...validateGeneratedCss(snapshot),
    ...tokenErrorViolation(snapshot, "V16", /Expected (?:a six-digit hex colour|one of the eleven ramp steps|oklch or hsl)|Palette colours must be declared as ramps/u, "Declare each ramp with valid $base, $anchor, and $mode fields."),
    ...tokenErrorViolation(snapshot, "V17", /override cannot replace the anchor colour/u, "Keep the generated anchor equal to $base."),
    ...tokenErrorViolation(snapshot, "V18", /declares every step literally/u, "Keep the ramp definition and only exceptional $overrides."),
    ...tokenErrorViolation(snapshot, "V19", /Semantic colours must reference another token/u, "Use a DTCG brace reference to another colour token."),
    ...validateGroupNames(snapshot),
];
//# sourceMappingURL=tokens.js.map