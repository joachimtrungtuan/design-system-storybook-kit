import { existsSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
function hasPackageJsonWorkspaces(packageJsonPath) {
    try {
        const parsed = JSON.parse(readFileSync(packageJsonPath, "utf8"));
        return (typeof parsed === "object" &&
            parsed !== null &&
            "workspaces" in parsed &&
            parsed.workspaces !== undefined);
    }
    catch {
        return false;
    }
}
function relativeWorkspacePath(root, target) {
    return relative(root, target).split(sep).join("/") || ".";
}
export function findParentWorkspace(start) {
    const target = resolve(start);
    let current = dirname(target);
    while (true) {
        const relativeTarget = relativeWorkspacePath(current, target);
        const pnpmWorkspace = join(current, "pnpm-workspace.yaml");
        if (existsSync(pnpmWorkspace)) {
            return {
                kind: "pnpm",
                root: current,
                declarationFile: pnpmWorkspace,
                registration: `  - '${relativeTarget}'`,
            };
        }
        const packageJson = join(current, "package.json");
        if (existsSync(packageJson) && hasPackageJsonWorkspaces(packageJson)) {
            return {
                kind: "package-json",
                root: current,
                declarationFile: packageJson,
                registration: `\"${relativeTarget}\"`,
            };
        }
        const parent = dirname(current);
        if (parent === current) {
            return undefined;
        }
        current = parent;
    }
}
//# sourceMappingURL=workspace.js.map