import { access, cp, mkdtemp, readdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { generateTokensCss, parseTokensJson } from "../tokens/index.js";
const PLACEHOLDER = /\{\{(projectName|packageManager|toolkitSpecifier)\}\}/gu;
async function toolkitRoot() {
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
async function renderDirectory(directory, values) {
    const entries = await readdir(directory, { withFileTypes: true });
    for (const entry of entries) {
        const path = resolve(directory, entry.name);
        if (entry.isDirectory()) {
            await renderDirectory(path, values);
            continue;
        }
        if (!entry.isFile())
            continue;
        const content = await readFile(path, "utf8");
        const rendered = content.replace(PLACEHOLDER, (_, key) => values[key] ?? "");
        if (rendered !== content)
            await writeFile(path, rendered);
    }
}
async function assertNoPlaceholders(directory) {
    const entries = await readdir(directory, { withFileTypes: true });
    for (const entry of entries) {
        const path = resolve(directory, entry.name);
        if (entry.isDirectory()) {
            await assertNoPlaceholders(path);
            continue;
        }
        if (entry.isFile() && PLACEHOLDER.test(await readFile(path, "utf8"))) {
            throw new Error(`Unrendered template placeholder in ${path}.`);
        }
    }
}
export async function materialiseTemplate(options = {}) {
    const directory = options.destination ?? await mkdtemp(resolve(tmpdir(), "story-cli-template-"));
    const root = await toolkitRoot();
    const templateDirectory = options.templateDirectory ?? resolve(root, "templates/storybook-vite");
    await cp(templateDirectory, directory, { recursive: true });
    await renderDirectory(directory, replacements(options, root));
    const tokensPath = resolve(directory, "tokens.json");
    const tokens = parseTokensJson(await readFile(tokensPath, "utf8"), tokensPath);
    await writeFile(resolve(directory, "src/styles/tokens.css"), generateTokensCss(tokens).css);
    await assertNoPlaceholders(directory);
    return { directory };
}
//# sourceMappingURL=materialise.js.map