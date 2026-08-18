import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, relative, resolve } from "node:path";
import { checksumFile, classifyProject, listProjectFiles, readManifest, rewriteManifestAfterUpdate, writeManifestObject, } from "../manifest/index.js";
import { regenerateAllTierBarrels } from "../scaffold/component.js";
import { listTemplateFiles, materialiseTemplate, toolkitRoot } from "../template/materialise.js";
import { generateTokensCss, parseTokensJson } from "../tokens/index.js";
import { validateProject } from "../validator/index.js";
const MANIFEST_PATH = ".designsystem/manifest.json";
const GENERATED_TIERS = ["atoms", "molecules", "organisms", "templates"];
function generatedPaths() {
    const paths = new Set(["src/styles/tokens.css"]);
    for (const tier of GENERATED_TIERS)
        paths.add(`src/components/${tier}/index.ts`);
    return paths;
}
async function readTemplateValues(root) {
    const pkg = JSON.parse(await readFile(resolve(root, "package.json"), "utf8"));
    return {
        projectName: pkg.name ?? "neutral-storybook",
        packageManager: pkg.packageManager ?? "npm",
        toolkitSpecifier: pkg.dependencies?.["story-cli-kit"] ?? "latest",
    };
}
async function readCurrentChecksums(root) {
    const paths = await listProjectFiles(root);
    const checksums = new Map();
    for (const path of paths) {
        if (path === MANIFEST_PATH)
            continue;
        checksums.set(path, await checksumFile(resolve(root, path)));
    }
    return checksums;
}
async function renderIncomingTemplate(templateDirectory, values) {
    const scratch = await mkdtemp(resolve(tmpdir(), "story-cli-update-"));
    const rendered = new Map();
    try {
        await materialiseTemplate({
            destination: scratch,
            templateDirectory,
            projectName: values.projectName,
            packageManager: values.packageManager,
            toolkitSpecifier: values.toolkitSpecifier,
            onFileWrite: async (path, content) => {
                rendered.set(relative(scratch, path).split("\\").join("/"), content);
                await writeFile(path, content);
            },
        });
    }
    finally {
        await rm(scratch, { recursive: true, force: true });
    }
    return rendered;
}
async function regenerateGeneratedContent(root) {
    const content = new Map();
    const tokensPath = resolve(root, "tokens.json");
    const tokens = parseTokensJson(await readFile(tokensPath, "utf8"), tokensPath);
    content.set("src/styles/tokens.css", generateTokensCss(tokens).css);
    await regenerateAllTierBarrels(root, async (path, barrelContent) => {
        content.set(relative(root, path).split("\\").join("/"), barrelContent);
    });
    return content;
}
export async function runUpdatePipeline(options) {
    const { root, engineVersion, dryRun } = options;
    const manifest = await readManifest(resolve(root, MANIFEST_PATH));
    const previousEngineVersion = manifest.engineVersion;
    const values = await readTemplateValues(root);
    const kitRoot = await toolkitRoot();
    const templateDirectory = resolve(kitRoot, "templates/storybook-vite");
    const currentChecksums = await readCurrentChecksums(root);
    const incomingPaths = new Set(await listTemplateFiles(templateDirectory));
    const generated = generatedPaths();
    const classified = classifyProject({ manifest, currentChecksums, incomingPaths, generatedPaths: generated });
    const rendered = await renderIncomingTemplate(templateDirectory, values);
    const regenerated = await regenerateGeneratedContent(root);
    const updatedFiles = {};
    for (const file of classified) {
        if (file.category === "generated") {
            const content = regenerated.get(file.path);
            if (content !== undefined)
                updatedFiles[file.path] = content;
        }
        else if (file.category === "new" || file.category === "unmodified") {
            const content = rendered.get(file.path);
            if (content !== undefined)
                updatedFiles[file.path] = content;
        }
    }
    const rewrittenManifest = rewriteManifestAfterUpdate({ manifest, engineVersion, updatedFiles });
    let validation;
    if (!dryRun) {
        for (const [path, content] of Object.entries(updatedFiles)) {
            const absolutePath = resolve(root, path);
            await mkdir(dirname(absolutePath), { recursive: true });
            await writeFile(absolutePath, content);
        }
        await writeManifestObject(root, rewrittenManifest);
        validation = await validateProject(root);
    }
    return {
        previousEngineVersion,
        engineVersion,
        classified,
        manifest: rewrittenManifest,
        validation,
    };
}
//# sourceMappingURL=pipeline.js.map