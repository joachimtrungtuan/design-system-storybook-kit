import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { relative, resolve } from "node:path";
import { checksumContent, MANIFEST_SCHEMA_VERSION } from "./checksum.js";
const IGNORED_DIRECTORIES = new Set([".git", "node_modules", "storybook-static"]);
async function collectFiles(root, directory, result) {
    const entries = await readdir(directory, { withFileTypes: true });
    for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
        if (entry.isDirectory() && IGNORED_DIRECTORIES.has(entry.name))
            continue;
        const absolutePath = resolve(directory, entry.name);
        if (entry.isDirectory()) {
            await collectFiles(root, absolutePath, result);
        }
        else if (entry.isFile()) {
            result.push(relative(root, absolutePath).split("\\").join("/"));
        }
    }
}
export async function listProjectFiles(root) {
    const result = [];
    await collectFiles(root, root, result);
    return result;
}
export async function createManifest(options) {
    const files = options.files === undefined ? [] : [...options.files];
    if (options.files === undefined)
        await collectFiles(options.root, options.root, files);
    const rendered = new Set(options.renderedFiles ?? []);
    const merged = new Set(options.mergedFiles ?? []);
    const entries = {};
    for (const path of files.sort()) {
        if (path === ".designsystem/manifest.json")
            continue;
        if (merged.has(path)) {
            entries[path] = { mark: "merged" };
            continue;
        }
        const content = await readFile(resolve(options.root, path), "utf8");
        entries[path] = {
            sha256: checksumContent(content),
            ...(rendered.has(path) ? { mark: "rendered" } : {}),
        };
    }
    return {
        schemaVersion: MANIFEST_SCHEMA_VERSION,
        engineVersion: options.engineVersion,
        templateId: options.templateId,
        createdWith: options.createdWith,
        appliedMigrations: [...(options.appliedMigrations ?? [])],
        files: entries,
    };
}
export async function writeManifest(options) {
    const manifest = await createManifest(options);
    return writeManifestObject(options.root, manifest);
}
export async function writeManifestObject(root, manifest) {
    const path = resolve(root, ".designsystem/manifest.json");
    await mkdir(resolve(root, ".designsystem"), { recursive: true });
    await writeFile(path, `${JSON.stringify(manifest, null, 2)}\n`);
    return path;
}
/**
 * Post-update rewrite: bumps engineVersion and refreshes the checksum of every
 * overwritten or newly-written path. Conflicted, user-created and adopt-merged
 * entries are absent from `updatedFiles` and so pass through untouched.
 */
export function rewriteManifestAfterUpdate(options) {
    const files = { ...options.manifest.files };
    for (const [path, content] of Object.entries(options.updatedFiles)) {
        const existing = files[path];
        files[path] = {
            sha256: checksumContent(content),
            ...(existing?.mark === undefined ? {} : { mark: existing.mark }),
        };
    }
    return { ...options.manifest, engineVersion: options.engineVersion, files };
}
//# sourceMappingURL=write.js.map