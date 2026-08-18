import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { confirmPrompt, textPrompt } from "../ui/prompts.js";
import { consoleReporter } from "../ui/report.js";
import { inspectGit } from "../env/git.js";
import { detectPackageManager } from "../env/package-manager.js";
import { findParentWorkspace } from "../env/workspace.js";
import { PromptCancelledError } from "../errors.js";
import { listTemplateDirectories, listTemplateFiles, toolkitRoot } from "../../../engine/src/template/materialise.js";
import { applyCreate } from "../create/apply.js";
import { collectCreatePromptAnswers } from "../create/prompts.js";
import { buildCreatePlan } from "../create/plan.js";
async function packageVersion(root) {
    const parsed = JSON.parse(await readFile(resolve(root, "package.json"), "utf8"));
    if (typeof parsed !== "object" || parsed === null || !("version" in parsed) || typeof parsed.version !== "string") {
        throw new Error("Unable to determine the story-cli-kit version.");
    }
    return parsed.version;
}
export async function runCreate(options = {}) {
    const cwd = resolve(options.cwd ?? process.cwd());
    const root = await toolkitRoot();
    const text = options.promptDependencies?.text ?? textPrompt;
    const confirm = options.promptDependencies?.confirm ?? confirmPrompt;
    const targetInput = options.target ?? await text("Where should the design-system project be created?", async () => undefined, "design-system");
    const initialGit = inspectGit(resolve(cwd, targetInput));
    const promptAnswers = await collectCreatePromptAnswers({
        target: targetInput,
        ...(options.independentRepository === undefined ? {} : { independentRepository: options.independentRepository }),
        git: initialGit,
        rollback: async () => undefined,
        ...(options.promptDependencies === undefined ? {} : { dependencies: options.promptDependencies }),
    });
    const target = resolve(cwd, promptAnswers.target);
    const git = inspectGit(target);
    const workspace = findParentWorkspace(target);
    const environment = {
        nodeVersion: process.versions.node,
        git,
        packageManager: detectPackageManager(),
        templateFiles: [
            ...(await listTemplateFiles(resolve(root, "templates/storybook-vite"))),
            ...(await listTemplateDirectories(resolve(root, "templates/storybook-vite"))),
        ],
        ...(workspace === undefined ? {} : { workspace }),
    };
    const plan = buildCreatePlan({
        target,
        ...(options.projectName === undefined ? {} : { projectName: options.projectName }),
        ...(options.packageManager === undefined ? {} : { packageManager: options.packageManager }),
        ...(options.noInstall === undefined ? {} : { noInstall: options.noInstall }),
        ...(promptAnswers.independentRepository === undefined ? {} : { independentRepository: promptAnswers.independentRepository }),
        engineVersion: await packageVersion(root),
        ...(options.toolkitSpecifier === undefined ? {} : { toolkitSpecifier: options.toolkitSpecifier }),
        environment,
    });
    if (options.yes !== true) {
        const confirmed = await confirm(`Create the project at ${plan.target}?`, async () => undefined, true);
        if (!confirmed)
            throw new PromptCancelledError();
    }
    return applyCreate({
        plan,
        toolkitRoot: root,
        reporter: options.reporter ?? consoleReporter,
        ...(options.dependencies === undefined ? {} : { dependencies: options.dependencies }),
    });
}
//# sourceMappingURL=create.js.map