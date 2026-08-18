#!/usr/bin/env node
import { existsSync, readFileSync, realpathSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import { ActionableError, handleCliError } from "./errors.js";
import { EXIT_CODES } from "./exit-codes.js";
import { COMMANDS, ROOT_HELP, commandHelp } from "./help.js";
import { assertSupportedNode } from "./env/node.js";
import { runCreate } from "./commands/create.js";
import { runGenerate } from "./commands/generate.js";
import { runUpdate } from "./commands/update.js";
import { runValidate } from "./commands/validate.js";
const MAINTENANCE_COMMANDS = new Set([
    "adopt",
    "generate",
    "validate",
    "update",
    "migrate",
    "guard",
]);
export function resolveExecutionPackageRoot(moduleUrl) {
    return resolve(dirname(fileURLToPath(moduleUrl)), "../../../..");
}
const EXECUTION_PACKAGE_ROOT = resolveExecutionPackageRoot(import.meta.url);
function isCommand(value) {
    return COMMANDS.some((command) => command === value);
}
function closestCommand(value) {
    return COMMANDS.find((command) => command.startsWith(value) || value.startsWith(command.slice(0, 3)));
}
export function isProjectLocalInstallation(cwd, executionPackageRoot = EXECUTION_PACKAGE_ROOT) {
    try {
        const projectRequire = createRequire(resolve(cwd, "package.json"));
        const localPackageRoot = resolveInstalledPackageRoot(cwd, projectRequire);
        if (localPackageRoot === undefined)
            return false;
        return realpathSync(localPackageRoot) === realpathSync(executionPackageRoot);
    }
    catch {
        return false;
    }
}
function resolveInstalledPackageRoot(cwd, projectRequire) {
    for (const specifier of ["story-cli-kit/package.json", "story-cli-kit/preset", "story-cli-kit/preview"]) {
        let resolved;
        try {
            resolved = projectRequire.resolve(specifier);
        }
        catch {
            try {
                resolved = fileURLToPath(import.meta.resolve(specifier, pathToFileURL(resolve(cwd, "package.json")).href));
            }
            catch {
                continue;
            }
        }
        let candidate = dirname(resolved);
        while (true) {
            const packageJson = resolve(candidate, "package.json");
            if (existsSync(packageJson)) {
                try {
                    const manifest = JSON.parse(readFileSync(packageJson, "utf8"));
                    if (typeof manifest === "object" &&
                        manifest !== null &&
                        "name" in manifest &&
                        manifest.name === "story-cli-kit") {
                        return candidate;
                    }
                }
                catch {
                    // Keep walking in case the resolved subpath belongs to a nested package.
                }
            }
            const parent = dirname(candidate);
            if (parent === candidate)
                break;
            candidate = parent;
        }
    }
    return undefined;
}
export function guardTransientMaintenance(command, cwd = process.cwd(), executionPackageRoot = EXECUTION_PACKAGE_ROOT) {
    const manifest = resolve(cwd, ".designsystem", "manifest.json");
    if (MAINTENANCE_COMMANDS.has(command) &&
        existsSync(manifest) &&
        !isProjectLocalInstallation(cwd, executionPackageRoot)) {
        throw new ActionableError(`Transient execution cannot run '${command}' against a versioned design-system project.`, `Run the project's local ds binary through its package manager (for example: npm exec -- ds ${command}, pnpm exec ds ${command}, or yarn ds ${command}).`, manifest);
    }
}
function parseCommandArgs(command, args) {
    try {
        const parsed = parseArgs({
            args,
            options: {
                help: { type: "boolean", short: "h", default: false },
                ...(command === "validate" ? { json: { type: "boolean", default: false } } : {}),
                ...(command === "create"
                    ? {
                        "no-install": { type: "boolean", default: false },
                        yes: { type: "boolean", default: false },
                        independent: { type: "boolean", default: false },
                        "package-manager": { type: "string" },
                    }
                    : {}),
                ...(command === "update"
                    ? {
                        "dry-run": { type: "boolean", default: false },
                        "on-conflict": { type: "string" },
                        to: { type: "string" },
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
            dryRun: command === "update" && parsed.values["dry-run"] === true,
            ...(command === "update" && typeof parsed.values["on-conflict"] === "string"
                ? { onConflict: parsed.values["on-conflict"] }
                : {}),
            ...(command === "update" && typeof parsed.values.to === "string" ? { to: parsed.values.to } : {}),
            positionals: parsed.positionals,
        };
    }
    catch (error) {
        if (error instanceof TypeError && "code" in error) {
            throw new ActionableError(`Invalid options for '${command}'.`, `Run 'ds ${command} --help' to see the supported options.`, `Command help: ds ${command} --help`);
        }
        throw error;
    }
}
export async function run(argv = process.argv.slice(2)) {
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
        throw new ActionableError(`Unknown command '${requested}'.`, suggestion === undefined
            ? "Run 'ds --help' to list available commands."
            : `Did you mean 'ds ${suggestion}'?`, "https://github.com/joachimtrungtuan/story-cli-kit#readme");
    }
    const options = parseCommandArgs(requested, argv.slice(1));
    if (options.help) {
        console.log(commandHelp(requested));
        return EXIT_CODES.success;
    }
    guardTransientMaintenance(requested);
    if (requested === "create" && options.positionals.length > 1) {
        throw new ActionableError("Create accepts at most one target path.", "Run 'ds create [target]'.", "Command help: ds create --help");
    }
    if (requested === "generate" && options.positionals.length !== 2) {
        throw new ActionableError("Generate requires a tier and a kebab-case component name.", "Run 'ds generate <tier> <name>'.", "Command help: ds generate --help");
    }
    if (requested === "create" &&
        options.packageManager !== undefined &&
        !["npm", "pnpm", "yarn"].includes(options.packageManager)) {
        throw new ActionableError(`Unsupported package manager '${options.packageManager}'.`, "Use npm, pnpm, or yarn.", "Command help: ds create --help");
    }
    if (requested === "create") {
        const result = await runCreate({
            ...(options.positionals[0] === undefined ? {} : { target: options.positionals[0] }),
            noInstall: options.noInstall,
            yes: options.yes,
            ...(options.independent ? { independentRepository: true } : {}),
            ...(options.packageManager === undefined
                ? {}
                : { packageManager: options.packageManager }),
        });
        return result.exitCode;
    }
    if (requested === "generate") {
        await runGenerate({ tier: options.positionals[0] ?? "", name: options.positionals[1] ?? "" });
        return EXIT_CODES.success;
    }
    if (requested === "validate")
        return runValidate({ json: options.json });
    if (requested === "update") {
        const result = await runUpdate({
            dryRun: options.dryRun,
            ...(options.onConflict === undefined ? {} : { onConflict: options.onConflict }),
            ...(options.to === undefined ? {} : { to: options.to }),
        });
        return result.exitCode;
    }
    throw new ActionableError(`The '${requested}' command is not implemented yet.`, "Use a command implemented by the current development phase.", "https://github.com/joachimtrungtuan/story-cli-kit#readme");
}
const entryPath = process.argv[1];
if (entryPath !== undefined &&
    realpathSync(resolve(entryPath)) === realpathSync(fileURLToPath(import.meta.url))) {
    try {
        process.exitCode = await run();
    }
    catch (error) {
        process.exitCode = handleCliError(error);
    }
}
//# sourceMappingURL=bin.js.map