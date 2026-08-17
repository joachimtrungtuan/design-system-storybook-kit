#!/usr/bin/env node

import { existsSync, readFileSync, realpathSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseArgs } from "node:util";

import { ActionableError, handleCliError } from "./errors.ts";
import { EXIT_CODES, type ExitCode } from "./exit-codes.ts";
import { COMMANDS, ROOT_HELP, commandHelp, type Command } from "./help.ts";
import { assertSupportedNode } from "./env/node.ts";
import { runCreate } from "./commands/create.ts";
import { runGenerate } from "./commands/generate.ts";
import { runValidate } from "./commands/validate.ts";
import type { PackageManager } from "./env/package-manager.ts";

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
    const localPackageRoot = resolveInstalledPackageRoot(cwd, projectRequire);
    if (localPackageRoot === undefined) return false;
    return realpathSync(localPackageRoot) === realpathSync(executionPackageRoot);
  } catch {
    return false;
  }
}

function resolveInstalledPackageRoot(cwd: string, projectRequire: NodeRequire): string | undefined {
  for (const specifier of ["story-cli-kit/package.json", "story-cli-kit/preset", "story-cli-kit/preview"]) {
    let resolved: string;
    try {
      resolved = projectRequire.resolve(specifier);
    } catch {
      try {
        resolved = fileURLToPath(
          import.meta.resolve(specifier, pathToFileURL(resolve(cwd, "package.json")).href),
        );
      } catch {
        continue;
      }
    }

    let candidate = dirname(resolved);
    while (true) {
      const packageJson = resolve(candidate, "package.json");
      if (existsSync(packageJson)) {
        try {
          const manifest: unknown = JSON.parse(readFileSync(packageJson, "utf8"));
          if (
            typeof manifest === "object" &&
            manifest !== null &&
            "name" in manifest &&
            manifest.name === "story-cli-kit"
          ) {
            return candidate;
          }
        } catch {
          // Keep walking in case the resolved subpath belongs to a nested package.
        }
      }
      const parent = dirname(candidate);
      if (parent === candidate) break;
      candidate = parent;
    }
  }
  return undefined;
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

interface ParsedCommandArgs {
  help: boolean;
  json: boolean;
  noInstall: boolean;
  yes: boolean;
  independent: boolean;
  packageManager?: string;
  positionals: string[];
}

function parseCommandArgs(command: Command, args: string[]): ParsedCommandArgs {
  try {
    const parsed = parseArgs({
      args,
      options: {
        help: { type: "boolean", short: "h", default: false },
        ...(command === "validate" ? { json: { type: "boolean" as const, default: false } } : {}),
        ...(command === "create"
          ? {
              "no-install": { type: "boolean" as const, default: false },
              yes: { type: "boolean" as const, default: false },
              independent: { type: "boolean" as const, default: false },
              "package-manager": { type: "string" as const },
            }
          : {}),
      },
      allowPositionals: command === "create" || command === "generate",
      strict: true,
    });
    return {
      help: parsed.values.help ?? false,
      json: command === "validate" && parsed.values.json === true,
      noInstall: command === "create" && parsed.values["no-install"] === true,
      yes: command === "create" && parsed.values.yes === true,
      independent: command === "create" && parsed.values.independent === true,
      ...(command === "create" && typeof parsed.values["package-manager"] === "string"
        ? { packageManager: parsed.values["package-manager"] }
        : {}),
      positionals: parsed.positionals,
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
  if (requested === "create" && options.positionals.length > 1) {
    throw new ActionableError(
      "Create accepts at most one target path.",
      "Run 'ds create [target]'.",
      "Command help: ds create --help",
    );
  }
  if (requested === "generate" && options.positionals.length !== 2) {
    throw new ActionableError(
      "Generate requires a tier and a kebab-case component name.",
      "Run 'ds generate <tier> <name>'.",
      "Command help: ds generate --help",
    );
  }
  if (
    requested === "create" &&
    options.packageManager !== undefined &&
    !["npm", "pnpm", "yarn"].includes(options.packageManager)
  ) {
    throw new ActionableError(
      `Unsupported package manager '${options.packageManager}'.`,
      "Use npm, pnpm, or yarn.",
      "Command help: ds create --help",
    );
  }
  if (requested === "create") {
    const result = await runCreate({
      ...(options.positionals[0] === undefined ? {} : { target: options.positionals[0] }),
      noInstall: options.noInstall,
      yes: options.yes,
      ...(options.independent ? { independentRepository: true } : {}),
      ...(options.packageManager === undefined
        ? {}
        : { packageManager: options.packageManager as PackageManager }),
    });
    return result.exitCode;
  }
  if (requested === "generate") {
    await runGenerate({ tier: options.positionals[0] ?? "", name: options.positionals[1] ?? "" });
    return EXIT_CODES.success;
  }
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
