import type { ValidatorRule } from "../types.ts";
import { TIERS, violation } from "./helpers.ts";

const STORY_DIRECTORIES = new Set([...TIERS, "foundations", "pages"]);

export const validateLayout: ValidatorRule = (snapshot) => {
  const violations = [];
  for (const directory of snapshot.directories) {
    const componentMatch = /^src\/components\/([^/]+)$/u.exec(directory);
    if (componentMatch?.[1] !== undefined && !TIERS.includes(componentMatch[1] as never)) {
      violations.push(violation(
        "V1",
        directory,
        `Unexpected component tier '${componentMatch[1]}'.`,
        `Move it under one of: ${TIERS.join(", ")}.`,
      ));
    }
    const storyMatch = /^src\/stories\/([^/]+)$/u.exec(directory);
    if (storyMatch?.[1] !== undefined && !STORY_DIRECTORIES.has(storyMatch[1])) {
      violations.push(violation(
        "V2",
        directory,
        `Unexpected story directory '${storyMatch[1]}'.`,
        `Use a component tier, foundations, or pages.`,
      ));
    }
  }
  return violations;
};
