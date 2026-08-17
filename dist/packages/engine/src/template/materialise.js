import { access, mkdir, mkdtemp, readdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, relative, resolve } from "node:path";
import { generateTokensCss, parseTokensJson } from "../tokens/index.js";
const PLACEHOLDER = /\{\{(projectName|packageManager|toolkitSpecifier)\}\}/u;
const PLACEHOLDER_GLOBAL = /\{\{(projectName|packageManager|toolkitSpecifier)\}\}/gu;
export async function toolkitRoot() {
    let candidate = import.meta.dirname;
    while (true) {
        try {
            await access(resolve(candidate, "package.json"));
            await access(resolve(candidate, "templates/storybook-vite"));
            return candidate;
        }
        catch {
            const parent = dirname(candidate);
            if (parent === candidate)
                throw new Error("Unable to locate the installed story-cli-kit template.");
            candidate = parent;
        }
    }
}
function replacements(options, root) {
    return {
        projectName: options.projectName ?? "neutral-storybook",
        packageManager: options.packageManager ?? "npm",
        toolkitSpecifier: options.toolkitSpecifier ?? `file:${root}`,
    };
}
async function copyAndRenderDirectory(sourceDirectory, destinationDirectory, values, options, preserveExistingFiles) {
    const entries = await readdir(sourceDirectory, { withFileTypes: true });
    for (const entry of entries) {
        const sourcePath = resolve(sourceDirectory, entry.name);
        const destinationPath = resolve(destinationDirectory, entry.name);
        const relativePath = relative(options.destination ?? destinationDirectory, destinationPath).split("\\").join("/");
        if (preserveExistingFiles.has(relativePath))
            continue;
        if (entry.isDirectory()) {
            let existed = true;
            try {
                await access(destinationPath);
            }
            catch {
                existed = false;
            }
            await mkdir(destinationPath, { recursive: true });
            if (!existed)
                await options.onDirectoryCreate?.(destinationPath);
            await copyAndRenderDirectory(sourcePath, destinationPath, values, options, preserveExistingFiles);
            continue;
        }
        if (!entry.isFile())
            continue;
        const content = await readFile(sourcePath, "utf8");
        const rendered = content.replace(PLACEHOLDER_GLOBAL, (_, key) => values[key] ?? "");
        if (options.onFileWrite !== undefined) {
            await options.onFileWrite(destinationPath, rendered);
        }
        else {
            await writeFile(destinationPath, rendered);
        }
    }
}
async function assertNoPlaceholders(directory, root, preservedFiles) {
    const entries = await readdir(directory, { withFileTypes: true });
    for (const entry of entries) {
        const path = resolve(directory, entry.name);
        if (entry.isDirectory()) {
            await assertNoPlaceholders(path, root, preservedFiles);
            continue;
        }
        const relativePath = relative(root, path).split("\\").join("/");
        if (entry.isFile() && !preservedFiles.has(relativePath) && PLACEHOLDER.test(await readFile(path, "utf8"))) {
            throw new Error(`Unrendered template placeholder in ${path}.`);
        }
    }
}
export async function materialiseTemplate(options = {}) {
    const directory = options.destination ?? await mkdtemp(resolve(tmpdir(), "story-cli-template-"));
    const root = await toolkitRoot();
    const templateDirectory = options.templateDirectory ?? resolve(root, "templates/storybook-vite");
    const preserveExistingFiles = new Set(options.preserveExistingFiles ?? []);
    await mkdir(directory, { recursive: true });
    await copyAndRenderDirectory(templateDirectory, directory, replacements(options, root), options, preserveExistingFiles);
    const tokensPath = resolve(directory, "tokens.json");
    const tokens = parseTokensJson(await readFile(tokensPath, "utf8"), tokensPath);
    const tokenPath = resolve(directory, "src/styles/tokens.css");
    const tokenContent = generateTokensCss(tokens).css;
    if (options.onFileWrite !== undefined) {
        await options.onFileWrite(tokenPath, tokenContent);
    }
    else {
        await writeFile(tokenPath, tokenContent);
    }
    await assertNoPlaceholders(directory, directory, preserveExistingFiles);
    return { directory };
}
export async function listTemplateFiles(templateDirectory) {
    const result = [];
    async function walk(directory) {
        const entries = await readdir(directory, { withFileTypes: true });
        for (const entry of entries) {
            const path = resolve(directory, entry.name);
            if (entry.isDirectory()) {
                await walk(path);
            }
            else if (entry.isFile()) {
                result.push(relative(templateDirectory, path).split("\\").join("/"));
            }
        }
    }
    await walk(templateDirectory);
    return result.sort();
}
export async function listTemplateDirectories(templateDirectory) {
    const result = [];
    async function walk(directory) {
        const entries = await readdir(directory, { withFileTypes: true });
        for (const entry of entries) {
            if (!entry.isDirectory())
                continue;
            const path = resolve(directory, entry.name);
            result.push(relative(templateDirectory, path).split("\\").join("/"));
            await walk(path);
        }
    }
    await walk(templateDirectory);
    return result.sort();
}
//# sourceMappingURL=materialise.js.map