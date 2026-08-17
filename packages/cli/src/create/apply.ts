import { execFileSync } from "node:child_process";
import { rm } from "node:fs/promises";
import { relative, resolve } from "node:path";

import { createManifest } from "../../../engine/src/manifest/index.ts";
import { regenerateAllTierBarrels } from "../../../engine/src/scaffold/index.ts";
import { materialiseTemplate } from "../../../engine/src/template/materialise.ts";
import { ActionableError } from "../errors.ts";
import { EXIT_CODES, type ExitCode } from "../exit-codes.ts";
import { runValidate } from "../commands/validate.ts";
import type { Reporter } from "../ui/report.ts";
import type { CreatePlan } from "./plan.ts";
import { RollbackLedger } from "./ledger.ts";

type GitRunner = (cwd: string, args: readonly string[]) => void;
type Installer = (manager: CreatePlan["packageManager"], cwd: string) => Promise<void>;
type Validator = (cwd: string, write: (message: string) => void) => Promise<ExitCode>;

function runGit(cwd: string, args: readonly string[]): void {
  execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
}

function runInstall(manager: CreatePlan["packageManager"], cwd: string): Promise<void> {
  const command = manager === "npm" ? "npm" : manager;
  return new Promise((resolvePromise, reject) => {
    try {
      execFileSync(command, ["install"], { cwd, stdio: "inherit" });
      resolvePromise();
    } catch (error: unknown) {
      reject(error);
    }
  });
}

function validate(cwd: string, write: (message: string) => void): Promise<ExitCode> {
  return runValidate({ cwd, write });
}

function validationCommand(manager: CreatePlan["packageManager"]): string {
  return manager === "yarn" ? "yarn ds validate" : `${manager} exec ds validate`;
}

export interface CreateApplyDependencies {
  git?: GitRunner;
  install?: Installer;
  validate?: Validator;
}

export interface CreateApplyOptions {
  plan: CreatePlan;
  toolkitRoot: string;
  reporter?: Reporter;
  dependencies?: CreateApplyDependencies;
}

export interface CreateApplyResult {
  target: string;
  installed: boolean;
  validated: boolean;
  exitCode: ExitCode;
}

export async function applyCreate(options: CreateApplyOptions): Promise<CreateApplyResult> {
  const reporter = options.reporter ?? { info: console.log, warn: console.warn };
  const dependencies = options.dependencies ?? {};
  const git = dependencies.git ?? runGit;
  const install = dependencies.install ?? runInstall;
  const validator = dependencies.validate ?? validate;
  const ledger = new RollbackLedger(options.plan.target);
  const renderedFiles = new Set<string>();
  let initialisedRepository = false;
  let committed = false;
  let stagedRepositoryRoot: string | undefined;
  let stagedPaths: string[] = [];

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
        if (relativePath === "package.json") renderedFiles.add(relativePath);
        await ledger.write(path, content);
      },
    });
    await regenerateAllTierBarrels(
      options.plan.target,
      (path, content) => ledger.write(path, content),
    );

    const manifest = await createManifest({
      root: options.plan.target,
      engineVersion: options.plan.engineVersion,
      createdWith: options.plan.engineVersion,
      templateId: "storybook-vite",
      appliedMigrations: [],
      renderedFiles,
      files: ledger.relativePaths(),
    });
    await ledger.write(
      resolve(options.plan.target, ".designsystem/manifest.json"),
      `${JSON.stringify(manifest, null, 2)}\n`,
    );

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
      reporter.info(
        `Parent instruction: add ${relative(options.plan.parentRepositoryRoot, options.plan.target).split("\\").join("/")} as a submodule, or add that path to the parent's .gitignore.`,
      );
    }
    if (options.plan.workspace !== undefined) {
      reporter.info(
        `Parent workspace registration: add ${options.plan.workspace.registration} to ${options.plan.workspace.declarationFile}. The parent file was not edited.`,
      );
    }

    if (options.plan.noInstall) {
      reporter.warn("Skipped dependency installation and tail validation (--no-install).");
      reporter.info(`Run: cd "${options.plan.target}" && ${options.plan.packageManager} install`);
      reporter.info(`Run: cd "${options.plan.target}" && ${validationCommand(options.plan.packageManager)}`);
      return { target: options.plan.target, installed: false, validated: false, exitCode: EXIT_CODES.success };
    }

    try {
      await install(options.plan.packageManager, options.plan.target);
    } catch {
      throw new ActionableError(
        "The scaffold was committed, but dependency installation failed.",
        `Retry with 'cd "${options.plan.target}" && ${options.plan.packageManager} install'.`,
        options.plan.target,
        EXIT_CODES.internalError,
      );
    }

    const validationExitCode = await validator(options.plan.target, reporter.info);
    if (validationExitCode !== EXIT_CODES.success) {
      throw new ActionableError(
        "The generated project did not pass ds validate after installation.",
        `Run 'cd "${options.plan.target}" && ${validationCommand(options.plan.packageManager)}' to inspect and fix the violations.`,
        options.plan.target,
        validationExitCode,
      );
    }
    reporter.info(`Created and validated ${options.plan.target}.`);
    return { target: options.plan.target, installed: true, validated: true, exitCode: EXIT_CODES.success };
  } catch (error: unknown) {
    if (!committed) {
      if (stagedRepositoryRoot !== undefined && stagedPaths.length > 0) {
        try {
          git(stagedRepositoryRoot, ["reset", "--", ...stagedPaths]);
        } catch {
          // Preserve the original failure; the clean-tree preflight makes this reset scoped to our paths.
        }
      }
      if (initialisedRepository) await rm(resolve(options.plan.target, ".git"), { recursive: true, force: true });
      await ledger.rollback();
    }
    throw error;
  }
}
