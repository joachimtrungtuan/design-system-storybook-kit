import { execFileSync } from "node:child_process";
import { rm } from "node:fs/promises";
import { relative, resolve } from "node:path";
import { createManifest } from "../../../engine/src/manifest/index.js";
import { regenerateAllTierBarrels } from "../../../engine/src/scaffold/index.js";
import { materialiseTemplate } from "../../../engine/src/template/materialise.js";
import { ActionableError } from "../errors.js";
import { EXIT_CODES } from "../exit-codes.js";
import { runValidate } from "../commands/validate.js";
import { RollbackLedger } from "./ledger.js";
function runGit(cwd, args) {
    execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
}
function runInstall(manager, cwd) {
    const command = manager === "npm" ? "npm" : manager;
    return new Promise((resolvePromise, reject) => {
        try {
            execFileSync(command, ["install"], { cwd, stdio: "inherit" });
            resolvePromise();
        }
        catch (error) {
            reject(error);
        }
    });
}
function validate(cwd, write) {
    return runValidate({ cwd, write });
}
function validationCommand(manager) {
    return manager === "yarn" ? "yarn ds validate" : `${manager} exec ds validate`;
}
export async function applyCreate(options) {
    const reporter = options.reporter ?? { info: console.log, warn: console.warn };
    const dependencies = options.dependencies ?? {};
    const git = dependencies.git ?? runGit;
    const install = dependencies.install ?? runInstall;
    const validator = dependencies.validate ?? validate;
    const ledger = new RollbackLedger(options.plan.target);
    const renderedFiles = new Set();
    let initialisedRepository = false;
    let committed = false;
    let stagedRepositoryRoot;
    let stagedPaths = [];
    try {
        await ledger.ensureDirectory(options.plan.target);
        await materialiseTemplate({
            destination: options.plan.target,
            projectName: options.plan.projectName,
            packageManager: options.plan.packageManager,
            toolkitSpecifier: options.plan.toolkitSpecifier,
            templateDirectory: resolve(options.toolkitRoot, "templates/storybook-vite"),
            preserveExistingFiles: options.plan.preservedFiles,
            onDirectoryCreate: (path) => ledger.recordDirectory(path),
            onFileWrite: async (path, content) => {
                const relativePath = relative(options.plan.target, path).split("\\").join("/");
                if (relativePath === "package.json")
                    renderedFiles.add(relativePath);
                await ledger.write(path, content);
            },
        });
        await regenerateAllTierBarrels(options.plan.target, (path, content) => ledger.write(path, content));
        const manifest = await createManifest({
            root: options.plan.target,
            engineVersion: options.plan.engineVersion,
            createdWith: options.plan.engineVersion,
            templateId: "storybook-vite",
            appliedMigrations: [],
            renderedFiles,
            files: ledger.relativePaths(),
        });
        await ledger.write(resolve(options.plan.target, ".designsystem/manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
        if (options.plan.repositoryMode !== "enclosing") {
            initialisedRepository = true;
            git(options.plan.target, ["init"]);
        }
        const repositoryRoot = options.plan.repositoryRoot;
        const paths = ledger
            .paths()
            .map((path) => relative(repositoryRoot, path).split("\\").join("/"));
        git(repositoryRoot, ["add", "--", ...paths]);
        stagedRepositoryRoot = repositoryRoot;
        stagedPaths = paths;
        git(repositoryRoot, ["commit", "-m", "chore: scaffold design system"]);
        committed = true;
        if (options.plan.repositoryMode === "enclosing" && options.plan.parentRepositoryRoot !== undefined) {
            reporter.info(`Detected enclosing repository: ${options.plan.parentRepositoryRoot}`);
        }
        if (options.plan.repositoryMode === "independent" && options.plan.parentRepositoryRoot !== undefined) {
            reporter.info(`Detected enclosing repository: ${options.plan.parentRepositoryRoot}`);
            reporter.info(`Parent instruction: add ${relative(options.plan.parentRepositoryRoot, options.plan.target).split("\\").join("/")} as a submodule, or add that path to the parent's .gitignore.`);
        }
        if (options.plan.workspace !== undefined) {
            reporter.info(`Parent workspace registration: add ${options.plan.workspace.registration} to ${options.plan.workspace.declarationFile}. The parent file was not edited.`);
        }
        if (options.plan.noInstall) {
            reporter.warn("Skipped dependency installation and tail validation (--no-install).");
            reporter.info(`Run: cd "${options.plan.target}" && ${options.plan.packageManager} install`);
            reporter.info(`Run: cd "${options.plan.target}" && ${validationCommand(options.plan.packageManager)}`);
            return { target: options.plan.target, installed: false, validated: false, exitCode: EXIT_CODES.success };
        }
        try {
            await install(options.plan.packageManager, options.plan.target);
        }
        catch {
            throw new ActionableError("The scaffold was committed, but dependency installation failed.", `Retry with 'cd "${options.plan.target}" && ${options.plan.packageManager} install'.`, options.plan.target, EXIT_CODES.internalError);
        }
        const validationExitCode = await validator(options.plan.target, reporter.info);
        if (validationExitCode !== EXIT_CODES.success) {
            throw new ActionableError("The generated project did not pass ds validate after installation.", `Run 'cd "${options.plan.target}" && ${validationCommand(options.plan.packageManager)}' to inspect and fix the violations.`, options.plan.target, validationExitCode);
        }
        reporter.info(`Created and validated ${options.plan.target}.`);
        return { target: options.plan.target, installed: true, validated: true, exitCode: EXIT_CODES.success };
    }
    catch (error) {
        if (!committed) {
            if (stagedRepositoryRoot !== undefined && stagedPaths.length > 0) {
                try {
                    git(stagedRepositoryRoot, ["reset", "--", ...stagedPaths]);
                }
                catch {
                    // Preserve the original failure; the clean-tree preflight makes this reset scoped to our paths.
                }
            }
            if (initialisedRepository)
                await rm(resolve(options.plan.target, ".git"), { recursive: true, force: true });
            await ledger.rollback();
        }
        throw error;
    }
}
//# sourceMappingURL=apply.js.map