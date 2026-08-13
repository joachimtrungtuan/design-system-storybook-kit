#!/usr/bin/env node

import { existsSync, realpathSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

import { ActionableError, handleCliError } from "./errors.ts";
import { EXIT_CODES, type ExitCode } from "./exit-codes.ts";
import { COMMANDS, ROOT_HELP, commandHelp, type Command } from "./help.ts";
import { assertSupportedNode } from "./env/node.ts";
import { runValidate } from "./commands/validate.ts";

const MAINTENANCE_COMMANDS = new Set<Command>([
  "adopt",
  "generate",
  "validate",
  "update",
  "migrate",
  "guard",
]);
export function resolveExecutionPackageRoot(moduleUrl: string): string {
  return resolve(dirname(fileURLToPath(moduleUrl)), "../../../..");
}

const EXECUTION_PACKAGE_ROOT = resolveExecutionPackageRoot(import.meta.url);

function isCommand(value: string): value is Command {
  return COMMANDS.some((command) => command === value);
}

function closestCommand(value: string): Command | undefined {
  return COMMANDS.find(
    (command) => command.startsWith(value) || value.startsWith(command.slice(0, 3)),
  );
}

export function isProjectLocalInstallation(
  cwd: string,
  executionPackageRoot: string = EXECUTION_PACKAGE_ROOT,
): boolean {
  try {
    const projectRequire = createRequire(resolve(cwd, "package.json"));
    const localPackageRoot = dirname(
      projectRequire.resolve("story-cli-kit/package.json"),
    );
    return realpathSync(localPackageRoot) === realpathSync(executionPackageRoot);
  } catch {
    return false;
  }
}

export function guardTransientMaintenance(
  command: Command,
  cwd: string = process.cwd(),
  executionPackageRoot: string = EXECUTION_PACKAGE_ROOT,
): void {
  const manifest = resolve(cwd, ".designsystem", "manifest.json");
  if (
    MAINTENANCE_COMMANDS.has(command) &&
    existsSync(manifest) &&
    !isProjectLocalInstallation(cwd, executionPackageRoot)
  ) {
    throw new ActionableError(
      `Transient execution cannot run '${command}' against a versioned design-system project.`,
      `Run the project's local ds binary through its package manager (for example: npm exec -- ds ${command}, pnpm exec ds ${command}, or yarn ds ${command}).`,
      manifest,
    );
  }
}

function parseCommandArgs(command: Command, args: string[]): { help: boolean; json: boolean } {
  try {
    const parsed = parseArgs({
      args,
      options: {
        help: { type: "boolean", short: "h", default: false },
        ...(command === "validate" ? { json: { type: "boolean" as const, default: false } } : {}),
      },
      allowPositionals: false,
      strict: true,
    });
    return {
      help: parsed.values.help ?? false,
      json: command === "validate" && parsed.values.json === true,
    };
  } catch (error: unknown) {
    if (error instanceof TypeError && "code" in error) {
      throw new ActionableError(
        `Invalid options for '${command}'.`,
        `Run 'ds ${command} --help' to see the supported options.`,
        `Command help: ds ${command} --help`,
      );
    }
    throw error;
  }
}

export async function run(argv: string[] = process.argv.slice(2)): Promise<ExitCode> {
  assertSupportedNode();

  if (argv.length === 0 || argv[0] === "--help" || argv[0] === "-h") {
    console.log(ROOT_HELP);
    return EXIT_CODES.success;
  }

  const requested = argv[0];
  if (requested === undefined) {
    console.log(ROOT_HELP);
    return EXIT_CODES.success;
  }

  if (!isCommand(requested)) {
    const suggestion = closestCommand(requested);
    throw new ActionableError(
      `Unknown command '${requested}'.`,
      suggestion === undefined
        ? "Run 'ds --help' to list available commands."
        : `Did you mean 'ds ${suggestion}'?`,
      "https://github.com/joachimtrungtuan/story-cli-kit#readme",
    );
  }

  const options = parseCommandArgs(requested, argv.slice(1));
  if (options.help) {
    console.log(commandHelp(requested));
    return EXIT_CODES.success;
  }

  guardTransientMaintenance(requested);
  if (requested === "validate") return runValidate({ json: options.json });
  throw new ActionableError(
    `The '${requested}' command is not implemented yet.`,
    "Use a command implemented by the current development phase.",
    "https://github.com/joachimtrungtuan/story-cli-kit#readme",
  );
}

const entryPath = process.argv[1];
if (
  entryPath !== undefined &&
  realpathSync(resolve(entryPath)) === realpathSync(fileURLToPath(import.meta.url))
) {
  try {
    process.exitCode = await run();
  } catch (error: unknown) {
    process.exitCode = handleCliError(error);
  }
}
