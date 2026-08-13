import { createProjectSnapshot } from "./snapshot.js";
import { validateConfig } from "./rules/config.js";
import { validateDocs } from "./rules/docs.js";
import { validateLayout } from "./rules/layout.js";
import { validateNaming } from "./rules/naming.js";
import { validateStories } from "./rules/stories.js";
import { validateTierImports } from "./rules/tiers.js";
import { validateTokens } from "./rules/tokens.js";
export const IMPLEMENTED_RULE_IDS = [
    "V1", "V2", "V3", "V4", "V5", "V6", "V7", "V8", "V9", "V10", "V11", "V12",
    "V13", "V14", "V15", "V16", "V17", "V18", "V19", "V20", "V21", "V22", "V23", "V24",
];
const RULES = [
    validateLayout,
    validateTierImports,
    validateNaming,
    validateStories,
    validateTokens,
    validateDocs,
    validateConfig,
];
function ruleNumber(ruleId) {
    return Number(ruleId.slice(1));
}
export async function validateProject(root) {
    const snapshot = await createProjectSnapshot(root);
    const violations = RULES
        .flatMap((rule) => rule(snapshot))
        .sort((left, right) => ruleNumber(left.ruleId) - ruleNumber(right.ruleId) ||
        left.file.localeCompare(right.file) ||
        (left.line ?? 0) - (right.line ?? 0));
    return { root: snapshot.root, violations };
}
export { formatHumanReport, formatJsonReport, jsonReport } from "./report.js";
//# sourceMappingURL=index.js.map