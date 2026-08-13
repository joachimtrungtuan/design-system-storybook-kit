import type { ValidatorRule, Violation } from "../types.ts";
import { violation } from "./helpers.ts";

const FOUNDATION_DOCS = ["Colors.mdx", "Typography.mdx", "Spacing.mdx", "Elevation.mdx", "Motion.mdx"];

export const validateDocs: ValidatorRule = (snapshot) => {
  const violations: Violation[] = [];
  for (const name of FOUNDATION_DOCS) {
    const file = `src/stories/foundations/${name}`;
    if (!snapshot.files.has(file)) {
      violations.push(violation("V20", file, `Required foundation document '${name}' is missing.`, `Create ${file}.`));
    }
  }
  const introduction = "src/stories/Introduction.mdx";
  const content = snapshot.files.get(introduction);
  if (content === undefined || !/<Meta\s+title=["']Introduction["']\s*\/>/u.test(content)) {
    violations.push(violation("V21", introduction, "Introduction.mdx is missing the Introduction Meta declaration.", "Add <Meta title=\"Introduction\" />."));
  }
  return violations;
};
