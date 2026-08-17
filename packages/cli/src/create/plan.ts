import { existsSync } from "node:fs";
import { basename, resolve } from "node:path";

import { ActionableError } from "../errors.ts";
import { assertSupportedNode } from "../env/node.ts";
import type { GitEnvironment } from "../env/git.ts";
import type { PackageManager, PackageManagerDetection } from "../env/package-manager.ts";
import type { WorkspaceDeclaration } from "../env/workspace.ts";

export type RepositoryMode = "new" | "enclosing" | "independent";

export interface CreateEnvironment {
  nodeVersion: string;
  git: GitEnvironment;
  packageManager: PackageManagerDetection;
  templateFiles: string[];
  workspace?: WorkspaceDeclaration;
}

export interface CreatePlanInput {
  target: string;
  projectName?: string;
  packageManager?: PackageManager;
  noInstall?: boolean;
  independentRepository?: boolean;
  yes?: boolean;
  toolkitSpecifier?: string;
  engineVersion: string;
  environment: CreateEnvironment;
}

export interface CreatePlan {
  target: string;
  projectName: string;
  packageManager: PackageManager;
  noInstall: boolean;
  repositoryMode: RepositoryMode;
  repositoryRoot: string;
  parentRepositoryRoot?: string;
  workspace?: WorkspaceDeclaration;
  templateFiles: string[];
  collisions: string[];
  preservedFiles: string[];
  toolkitSpecifier: string;
  engineVersion: string;
}

function packageNameForTarget(target: string): string {
  const name = basename(target) || "design-system";
  return /^[a-z0-9][a-z0-9._-]*$/u.test(name) ? name : "design-system";
}

function refuse(problem: string, action: string, resource: string): never {
  throw new ActionableError(problem, action, resource);
}

export function buildCreatePlan(input: CreatePlanInput): CreatePlan {
  assertSupportedNode(input.environment.nodeVersion);
  if (!input.environment.git.present) {
    refuse(
      "Git is required to create a recoverable design-system project.",
      "Install Git, configure it on PATH, then run create again.",
      "https://git-scm.com/downloads",
    );
  }
  if (!input.environment.git.userNameConfigured || !input.environment.git.userEmailConfigured) {
    refuse(
      "Git identity is not configured, so the scaffold cannot be committed safely.",
      "Run 'git config --global user.name \"Your Name\"' and 'git config --global user.email \"you@example.com\"', then retry.",
      "https://git-scm.com/book/en/v2/Getting-Started-First-Time-Git-Setup",
    );
  }

  const selectedPackageManager = input.packageManager ?? input.environment.packageManager.detected;
  if (selectedPackageManager === undefined) {
    refuse(
      "No supported package manager was found.",
      "Install npm, pnpm, or yarn and ensure it is available on PATH; create never installs one for you.",
      "https://docs.npmjs.com/downloading-and-installing-node-js-and-npm",
    );
  }
  if (
    input.packageManager !== undefined &&
    !input.environment.packageManager.available.includes(input.packageManager)
  ) {
    refuse(
      `The requested package manager '${input.packageManager}' is not available on PATH.`,
      `Install ${input.packageManager}, or omit the package-manager option to use the detected manager.`,
      "https://nodejs.org/en/download",
    );
  }

  const target = resolve(input.target);
  const templateFiles = [...new Set([
    ...input.environment.templateFiles,
    "src/styles/tokens.css",
    ".designsystem/manifest.json",
  ])].sort();
  const preservedFiles = ["README.md", "LICENSE"].filter((path) => existsSync(resolve(target, path)));
  const collisions = templateFiles.filter(
    (path) => existsSync(resolve(target, path)) && !preservedFiles.includes(path),
  );
  if (collisions.length > 0) {
    refuse(
      `The target already contains template paths: ${collisions.join(", ")}.`,
      "Choose another target or use 'ds adopt' for an existing React application.",
      target,
    );
  }

  let repositoryMode: RepositoryMode = "new";
  let repositoryRoot = target;
  let parentRepositoryRoot: string | undefined;
  if (input.environment.git.insideRepository && input.environment.git.repositoryRoot !== undefined) {
    parentRepositoryRoot = input.environment.git.repositoryRoot;
    const independent = input.independentRepository === true;
    repositoryMode = independent ? "independent" : "enclosing";
    repositoryRoot = independent ? target : input.environment.git.repositoryRoot;
    if (!independent && !input.environment.git.clean) {
      refuse(
        `The enclosing repository at ${input.environment.git.repositoryRoot} has uncommitted changes.`,
        "Commit or stash unrelated work, then run create again so the scaffold commit stages only its own paths.",
        input.environment.git.repositoryRoot,
      );
    }
  }

  return {
    target,
    projectName: input.projectName ?? packageNameForTarget(target),
    packageManager: selectedPackageManager,
    noInstall: input.noInstall === true,
    repositoryMode,
    repositoryRoot,
    ...(repositoryMode === "independent" && parentRepositoryRoot !== undefined ? { parentRepositoryRoot } : {}),
    ...(input.environment.workspace === undefined ? {} : { workspace: input.environment.workspace }),
    templateFiles,
    collisions,
    preservedFiles,
    toolkitSpecifier: input.toolkitSpecifier ?? "github:joachimtrungtuan/story-cli-kit#semver:^1.0.0",
    engineVersion: input.engineVersion,
  };
}
