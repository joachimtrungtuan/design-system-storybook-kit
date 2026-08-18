import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { toolkitRoot } from "../../../engine/src/template/materialise.ts";
import { runUpdatePipeline, type UpdatePipelineResult } from "../../../engine/src/update/pipeline.ts";
import { formatUpdateReport, writeUpdateReport } from "../../../engine/src/update/report.ts";
import { ActionableError } from "../errors.ts";
import { EXIT_CODES, type ExitCode } from "../exit-codes.ts";
import { inspectGit } from "../env/git.ts";
import { consoleReporter, type Reporter } from "../ui/report.ts";

type GitRunner = (cwd: string, args: readonly string[]) => void;

function runGit(cwd: string, args: readonly string[]): void {
  execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
}

async function packageVersion(root: string): Promise<string> {
  const parsed: unknown = JSON.parse(await readFile(resolve(root, "package.json"), "utf8"));
  if (typeof parsed !== "object" || parsed === null || !("version" in parsed) || typeof parsed.version !== "string") {
    throw new Error("Unable to determine the story-cli-kit version.");
  }
  return parsed.version;
}

export interface UpdateCommandOptions {
  cwd?: string;
  dryRun?: boolean;
  onConflict?: string;
  to?: string;
  reporter?: Reporter;
  git?: GitRunner;
  pipeline?: typeof runUpdatePipeline;
}

export interface UpdateCommandResult {
  exitCode: ExitCode;
  branch?: string;
}

export async function runUpdate(options: UpdateCommandOptions = {}): Promise<UpdateCommandResult> {
  const root = resolve(options.cwd ?? process.cwd());
  const reporter = options.reporter ?? consoleReporter;
  const git = options.git ?? runGit;
  const pipeline = options.pipeline ?? runUpdatePipeline;
  const dryRun = options.dryRun ?? false;

  if (options.to !== undefined) {
    throw new ActionableError(
      "The --to flag is not implemented yet.",
      "Omit --to to update to the toolkit version currently installed in this project.",
      "docs/update-and-migration.md",
    );
  }
  const onConflict = options.onConflict ?? "skip";
  if (onConflict !== "skip") {
    throw new ActionableError(
      `--on-conflict=${onConflict} is not implemented yet.`,
      "Use --on-conflict=skip (the default), which leaves conflicted files untouched for you to merge by hand.",
      "docs/update-and-migration.md",
    );
  }

  const kitRoot = await toolkitRoot();
  const engineVersion = await packageVersion(kitRoot);

  if (!dryRun) {
    const gitEnvironment = inspectGit(root);
    if (!gitEnvironment.insideRepository) {
      throw new ActionableError(
        "ds update requires a git repository, since a branch is how an update run can be discarded.",
        "Run 'git init' (or run this command inside the project's existing repository) and try again.",
        root,
      );
    }
    if (!gitEnvironment.clean) {
      throw new ActionableError(
        "ds update requires a clean working tree.",
        "Commit or stash pending changes, then run 'ds update' again.",
        root,
      );
    }
  }

  let branch: string | undefined;
  if (!dryRun) {
    branch = `ds-update/${engineVersion}`;
    try {
      git(root, ["checkout", "-b", branch]);
    } catch {
      throw new ActionableError(
        `Could not create branch '${branch}'.`,
        `Delete or check out any pre-existing branch named '${branch}', then run 'ds update' again.`,
        root,
      );
    }
  }

  let result: UpdatePipelineResult;
  try {
    result = await pipeline({ root, engineVersion, dryRun });
  } catch (error: unknown) {
    if (branch === undefined) throw error;
    throw new ActionableError(
      `ds update failed on branch '${branch}': ${error instanceof Error ? error.message : String(error)}`,
      `Inspect the branch, then discard it with 'git checkout - && git branch -D ${branch}' if you don't want to keep it.`,
      root,
    );
  }

  const reportContent = formatUpdateReport({
    previousEngineVersion: result.previousEngineVersion,
    engineVersion: result.engineVersion,
    classified: result.classified,
    validation: result.validation,
  });

  if (dryRun) {
    reporter.info(reportContent);
    reporter.info("Dry run: no files were written and no branch was created.");
    return { exitCode: EXIT_CODES.success };
  }

  const reportPath = await writeUpdateReport(root, reportContent, engineVersion);
  git(root, ["add", "--", "."]);
  git(root, ["commit", "-m", `chore: update design-system engine to ${engineVersion}`]);

  reporter.info(`Updated engine ${result.previousEngineVersion} -> ${result.engineVersion} on branch ${branch}.`);
  reporter.info(`Report written to ${reportPath}.`);

  const conflicted = result.classified.filter((file) => file.category === "conflicted");
  if (conflicted.length > 0) {
    reporter.warn(`${conflicted.length} file(s) left as-is due to conflicts: ${conflicted.map((file) => file.path).join(", ")}`);
  }
  if (result.validation !== undefined && result.validation.violations.length > 0) {
    reporter.warn(`ds validate found ${result.validation.violations.length} violation(s) after the update; see the report.`);
  }

  return { exitCode: EXIT_CODES.success, ...(branch === undefined ? {} : { branch }) };
}
