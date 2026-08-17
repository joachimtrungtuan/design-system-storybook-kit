import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { confirmPrompt, textPrompt } from "../ui/prompts.ts";
import { consoleReporter, type Reporter } from "../ui/report.ts";
import { inspectGit } from "../env/git.ts";
import { detectPackageManager, type PackageManager } from "../env/package-manager.ts";
import { findParentWorkspace } from "../env/workspace.ts";
import { PromptCancelledError } from "../errors.ts";
import { listTemplateDirectories, listTemplateFiles, toolkitRoot } from "../../../engine/src/template/materialise.ts";
import { applyCreate, type CreateApplyDependencies, type CreateApplyResult } from "../create/apply.ts";
import { collectCreatePromptAnswers } from "../create/prompts.ts";
import { buildCreatePlan } from "../create/plan.ts";

export interface CreateCommandOptions {
  cwd?: string;
  target?: string;
  projectName?: string;
  packageManager?: PackageManager;
  noInstall?: boolean;
  independentRepository?: boolean;
  yes?: boolean;
  toolkitSpecifier?: string;
  reporter?: Reporter;
  dependencies?: CreateApplyDependencies;
}

async function packageVersion(root: string): Promise<string> {
  const parsed: unknown = JSON.parse(await readFile(resolve(root, "package.json"), "utf8"));
  if (typeof parsed !== "object" || parsed === null || !("version" in parsed) || typeof parsed.version !== "string") {
    throw new Error("Unable to determine the story-cli-kit version.");
  }
  return parsed.version;
}

export async function runCreate(options: CreateCommandOptions = {}): Promise<CreateApplyResult> {
  const cwd = resolve(options.cwd ?? process.cwd());
  const root = await toolkitRoot();
  const targetInput = options.target ?? await textPrompt(
    "Where should the design-system project be created?",
    async () => undefined,
    "design-system",
  );
  const initialGit = inspectGit(resolve(cwd, targetInput));
  const promptAnswers = await collectCreatePromptAnswers({
    target: targetInput,
    ...(options.independentRepository === undefined ? {} : { independentRepository: options.independentRepository }),
    git: initialGit,
    rollback: async () => undefined,
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
    const confirmed = await confirmPrompt(
      `Create the project at ${plan.target}?`,
      async () => undefined,
      true,
    );
    if (!confirmed) throw new PromptCancelledError();
  }

  return applyCreate({
    plan,
    toolkitRoot: root,
    reporter: options.reporter ?? consoleReporter,
    ...(options.dependencies === undefined ? {} : { dependencies: options.dependencies }),
  });
}
