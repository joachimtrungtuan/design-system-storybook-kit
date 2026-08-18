import { mkdir, readdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
const CATEGORY_LABELS = {
    new: "New (written)",
    unmodified: "Unmodified (overwritten with the latest template)",
    conflicted: "Conflicted (left as-is; run with --on-conflict once supported)",
    "user-created": "User-created (untouched)",
    generated: "Generated (regenerated from the project's current state)",
    "adopt-merged": "Adopt-merged (never rewritten)",
};
const CATEGORY_ORDER = [
    "new",
    "unmodified",
    "generated",
    "conflicted",
    "user-created",
    "adopt-merged",
];
export function formatUpdateReport(options) {
    const byCategory = new Map();
    for (const file of options.classified) {
        const paths = byCategory.get(file.category) ?? [];
        paths.push(file.path);
        byCategory.set(file.category, paths);
    }
    const sections = CATEGORY_ORDER.map((category) => {
        const paths = (byCategory.get(category) ?? []).sort();
        const label = CATEGORY_LABELS[category];
        return paths.length === 0 ? `### ${label}\n\nNone.` : `### ${label}\n\n${paths.map((path) => `- ${path}`).join("\n")}`;
    });
    const validationSection = options.validation === undefined
        ? "Skipped (dry run)."
        : options.validation.violations.length === 0
            ? "No validator failures."
            : options.validation.violations
                .map((violation) => `- ${violation.ruleId} ${violation.file}${violation.line === undefined ? "" : `:${violation.line}`} — ${violation.message}`)
                .join("\n");
    return [
        `# Engine update ${options.previousEngineVersion} → ${options.engineVersion}`,
        "",
        ...sections,
        "",
        "## Validator",
        "",
        validationSection,
        "",
    ].join("\n");
}
export async function writeUpdateReport(root, content, engineVersion, date = new Date()) {
    const dateFolder = date.toISOString().slice(0, 10);
    const directory = resolve(root, "update-logs", dateFolder);
    await mkdir(directory, { recursive: true });
    const existing = await readdir(directory).catch(() => []);
    const nextNumber = existing
        .map((name) => /^(\d{2})-/u.exec(name)?.[1])
        .filter((match) => match !== undefined)
        .map((match) => Number(match))
        .reduce((max, value) => Math.max(max, value), 0) + 1;
    const path = resolve(directory, `${String(nextNumber).padStart(2, "0")}-engine-update-${engineVersion}.md`);
    await writeFile(path, content);
    return path;
}
//# sourceMappingURL=report.js.map