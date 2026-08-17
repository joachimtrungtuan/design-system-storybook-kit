import { access } from "node:fs/promises";
import { resolve } from "node:path";
import { regenerateTierBarrel, createComponentScaffold, isComponentName } from "../../../engine/src/scaffold/index.js";
import { isTier } from "../../../engine/src/validator/rules/helpers.js";
import { ActionableError } from "../errors.js";
import { consoleReporter } from "../ui/report.js";
import { RollbackLedger } from "../create/ledger.js";
async function exists(path) {
    try {
        await access(path);
        return true;
    }
    catch {
        return false;
    }
}
export async function runGenerate(options) {
    if (!isTier(options.tier)) {
        throw new ActionableError(`Unknown component tier '${options.tier}' (V1).`, "Use atoms, molecules, organisms, or templates.", "docs/design-system-contract.md");
    }
    if (!isComponentName(options.name)) {
        throw new ActionableError(`Component name '${options.name}' is not kebab-case (V4).`, "Use lowercase words separated by single hyphens, for example 'date-picker'.", "docs/design-system-contract.md");
    }
    const root = resolve(options.cwd ?? process.cwd());
    const scaffold = createComponentScaffold(options.tier, options.name);
    const paths = [scaffold.componentPath, scaffold.indexPath, scaffold.storyPath];
    const collisions = (await Promise.all(paths.map(async (path) => (await exists(resolve(root, path))) ? path : undefined)))
        .filter((path) => path !== undefined);
    if (collisions.length > 0 || await exists(resolve(root, `src/components/${options.tier}/${options.name}`))) {
        const pathsWithDirectory = [
            ...collisions,
            ...(await exists(resolve(root, `src/components/${options.tier}/${options.name}`))
                ? [`src/components/${options.tier}/${options.name}`]
                : []),
        ];
        throw new ActionableError(`Generate would overwrite existing paths: ${pathsWithDirectory.join(", ")}.`, "Choose a new component name or remove the incomplete scaffold after checking its contents.", root);
    }
    const ledger = new RollbackLedger(root);
    try {
        for (const [path, content] of [
            [scaffold.componentPath, scaffold.componentSource],
            [scaffold.indexPath, scaffold.indexSource],
            [scaffold.storyPath, scaffold.storySource],
        ]) {
            await ledger.write(resolve(root, path), content);
        }
        await regenerateTierBarrel(root, options.tier, (path, content) => ledger.write(path, content));
        (options.reporter ?? consoleReporter).info(`Generated ${options.tier}/${options.name}; run your local ds validate command to verify the project.`);
    }
    catch (error) {
        await ledger.rollback();
        throw error;
    }
}
//# sourceMappingURL=generate.js.map