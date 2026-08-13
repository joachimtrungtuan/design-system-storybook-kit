import type { ValidatorRule, Violation } from "../types.ts";
import {
  TIERS,
  componentTier,
  moduleSpecifiers,
  nodeLine,
  resolveModule,
  violation,
} from "./helpers.ts";

export const validateTierImports: ValidatorRule = (snapshot) => {
  const violations: Violation[] = [];
  for (const [sourcePath, source] of snapshot.sources) {
    const sourceTier = componentTier(sourcePath);
    if (sourceTier === undefined) continue;
    const active = new Set<string>();
    const visited = new Set<string>();

    const visit = (path: string, firstNode?: import("typescript").Node): void => {
      if (active.has(path) || visited.has(path)) return;
      active.add(path);
      visited.add(path);
      const targetTier = componentTier(path);
      if (targetTier !== undefined && TIERS.indexOf(targetTier) > TIERS.indexOf(sourceTier)) {
        violations.push(violation(
          "V3",
          sourcePath,
          `${sourceTier} imports from higher tier ${targetTier} through ${path}.`,
          `Depend only on ${sourceTier} or lower tiers.`,
          firstNode === undefined ? undefined : nodeLine(snapshot, sourcePath, firstNode),
        ));
        active.delete(path);
        return;
      }
      const targetSource = snapshot.sources.get(path);
      if (targetSource !== undefined) {
        for (const specifier of moduleSpecifiers(targetSource)) {
          const resolved = resolveModule(snapshot, path, specifier.value);
          if (resolved !== undefined) visit(resolved, firstNode ?? specifier.node);
        }
      }
      active.delete(path);
    };

    for (const specifier of moduleSpecifiers(source)) {
      const resolved = resolveModule(snapshot, sourcePath, specifier.value);
      if (resolved !== undefined) visit(resolved, specifier.node);
    }
  }
  return violations;
};
