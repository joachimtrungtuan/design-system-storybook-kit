import { ActionableError } from "../errors.ts";
import { generateRamp } from "./ramp.ts";
import {
  isRampDefinition,
  parseTokens,
  tokenReferencePath,
  type ParsedTokens,
  type TokenNode,
  type TokenObject,
  type TokenPrimitive,
} from "./schema.ts";

export interface GamutClipNotice {
  path: string;
  emitted: string;
}

export interface TokenCodegenResult {
  css: string;
  gamutClips: GamutClipNotice[];
}

interface TokenLeaf {
  path: string;
  value: TokenPrimitive;
  reference?: string;
}

const GROUP_ORDER = [
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
] as const;

function kebabCase(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/gu, "$1-$2")
    .replace(/[^A-Za-z0-9-]+/gu, "-")
    .replace(/-{2,}/gu, "-")
    .replace(/^-|-$/gu, "")
    .toLowerCase();
}

function variableName(path: string): string {
  const [group, subgroup, ...rest] = path.split(".");
  if (group === undefined || subgroup === undefined) {
    throw new TypeError(`Token path ${path} does not contain a group and name.`);
  }
  const suffix = (parts: string[]): string => parts.map(kebabCase).join("-");
  if (group === "color") return `--color-${suffix([subgroup, ...rest])}`;
  if (group === "typography") {
    const namespaces: Record<string, string> = {
      fontFamily: "font",
      fontWeight: "font-weight",
      fontSize: "text",
      letterSpacing: "tracking",
      lineHeight: "leading",
    };
    const namespace = namespaces[subgroup];
    if (namespace === undefined || rest.length === 0) {
      throw new ActionableError(
        `Typography token ${path} does not map to a Tailwind theme namespace.`,
        "Nest it under fontFamily, fontWeight, fontSize, letterSpacing, or lineHeight.",
        `tokens.json#$.${path}`,
      );
    }
    return `--${namespace}-${suffix(rest)}`;
  }
  if (group === "motion") {
    const namespaces: Record<string, string> = {
      duration: "duration",
      easing: "ease",
      animation: "animate",
    };
    const namespace = namespaces[subgroup];
    if (namespace === undefined || rest.length === 0) {
      throw new ActionableError(
        `Motion token ${path} does not map to a supported theme namespace.`,
        "Nest it under duration, easing, or animation.",
        `tokens.json#$.${path}`,
      );
    }
    return `--${namespace}-${suffix(rest)}`;
  }
  const namespaces: Record<string, string> = {
    spacing: "spacing",
    radius: "radius",
    shadow: "shadow",
    breakpoint: "breakpoint",
    container: "container",
    icon: "icon",
    zIndex: "z-index",
  };
  const namespace = namespaces[group];
  if (namespace === undefined) {
    throw new TypeError(`Unsupported token group ${group}.`);
  }
  return `--${namespace}-${suffix([subgroup, ...rest])}`;
}

function collectLeaves(
  node: TokenNode,
  path: string[],
  leaves: TokenLeaf[],
  gamutClips: GamutClipNotice[],
): void {
  if (typeof node === "string" || typeof node === "number") {
    const tokenPath = path.join(".");
    const reference = typeof node === "string" ? tokenReferencePath(node) : undefined;
    leaves.push({ path: tokenPath, value: node, ...(reference === undefined ? {} : { reference }) });
    return;
  }
  if (isRampDefinition(node)) {
    const ramp = generateRamp(node);
    for (const [step, color] of Object.entries(ramp)) {
      const tokenPath = [...path, step].join(".");
      leaves.push({ path: tokenPath, value: color.hex });
      if (color.clipped) gamutClips.push({ path: tokenPath, emitted: color.hex });
    }
    return;
  }
  for (const key of Object.keys(node).sort()) {
    const child = node[key];
    if (child !== undefined) collectLeaves(child, [...path, key], leaves, gamutClips);
  }
}

function assertReferences(leaves: TokenLeaf[], source: string): void {
  const byPath = new Map(leaves.map((leaf) => [leaf.path, leaf]));
  const resolved = new Set<string>();
  const active = new Set<string>();

  function visit(path: string): void {
    if (resolved.has(path)) return;
    if (active.has(path)) {
      throw new ActionableError(
        `Semantic token reference cycle includes ${path}.`,
        "Point each semantic token at a non-cyclic token path.",
        `${source}#$.${path}`,
      );
    }
    const leaf = byPath.get(path);
    if (leaf === undefined) {
      throw new ActionableError(
        `Semantic token reference ${path} does not exist.`,
        "Correct the reference so it points at an existing token.",
        `${source}#$.${path}`,
      );
    }
    active.add(path);
    if (leaf.reference !== undefined) visit(leaf.reference);
    active.delete(path);
    resolved.add(path);
  }

  for (const leaf of leaves) {
    if (leaf.reference !== undefined) visit(leaf.path);
  }
}

function serializeValue(leaf: TokenLeaf): string {
  if (leaf.reference !== undefined) return `var(${variableName(leaf.reference)})`;
  return String(leaf.value);
}

export function generateTokensCss(tokens: ParsedTokens): TokenCodegenResult {
  const leaves: TokenLeaf[] = [];
  const gamutClips: GamutClipNotice[] = [];
  const unsupportedGroup = Object.keys(tokens.root).find(
    (group) => !GROUP_ORDER.includes(group as (typeof GROUP_ORDER)[number]),
  );
  if (unsupportedGroup !== undefined) {
    throw new ActionableError(
      `Token group ${unsupportedGroup} has no codegen namespace mapping.`,
      "Add an explicit codegen mapping before using this token group.",
      `${tokens.source}#$.${unsupportedGroup}`,
    );
  }
  for (const group of GROUP_ORDER) {
    const node = tokens.root[group];
    if (node !== undefined) collectLeaves(node, [group], leaves, gamutClips);
  }
  assertReferences(leaves, tokens.source);

  const declarations = leaves
    .map((leaf) => ({ leaf, variable: variableName(leaf.path) }))
    .sort((left, right) => {
      const leftGroup = left.leaf.path.split(".")[0] ?? "";
      const rightGroup = right.leaf.path.split(".")[0] ?? "";
      const groupDifference = GROUP_ORDER.indexOf(leftGroup as (typeof GROUP_ORDER)[number]) -
        GROUP_ORDER.indexOf(rightGroup as (typeof GROUP_ORDER)[number]);
      return groupDifference === 0
        ? left.leaf.path.localeCompare(right.leaf.path, "en", { numeric: true })
        : groupDifference;
    });
  const seen = new Set<string>();
  for (const declaration of declarations) {
    if (seen.has(declaration.variable)) {
      throw new ActionableError(
        `Multiple tokens emit ${declaration.variable}.`,
        "Rename one token so their kebab-case CSS variable names are distinct.",
        tokens.source,
      );
    }
    seen.add(declaration.variable);
  }

  const lines = declarations.map(
    ({ leaf, variable }) => `  ${variable}: ${serializeValue(leaf)};`,
  );
  return {
    css: `@theme {\n${lines.join("\n")}\n}\n`,
    gamutClips: gamutClips.sort((left, right) => left.path.localeCompare(right.path)),
  };
}

export function codegenTokens(input: unknown, source = "tokens.json"): TokenCodegenResult {
  return generateTokensCss(parseTokens(input, source));
}

export function tokenObject(value: TokenObject): TokenObject {
  return value;
}
