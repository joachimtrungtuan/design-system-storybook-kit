import { readdir, readFile } from "node:fs/promises";
import { relative, resolve } from "node:path";
import ts from "typescript";
import { parseTokens } from "../tokens/schema.js";
const IGNORED_DIRECTORIES = new Set([".git", "dist", "node_modules", "storybook-static"]);
function projectPath(root, absolutePath) {
    return relative(root, absolutePath).split("\\").join("/");
}
async function walk(root, directory, files, directories) {
    const entries = await readdir(directory, { withFileTypes: true });
    for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
        if (entry.isDirectory() && IGNORED_DIRECTORIES.has(entry.name))
            continue;
        const absolutePath = resolve(directory, entry.name);
        const path = projectPath(root, absolutePath);
        if (entry.isDirectory()) {
            directories.add(path);
            await walk(root, absolutePath, files, directories);
        }
        else if (entry.isFile()) {
            files.set(path, await readFile(absolutePath, "utf8"));
        }
    }
}
function scriptKind(path) {
    if (path.endsWith(".tsx"))
        return ts.ScriptKind.TSX;
    if (path.endsWith(".jsx"))
        return ts.ScriptKind.JSX;
    if (path.endsWith(".js") || path.endsWith(".mjs"))
        return ts.ScriptKind.JS;
    return ts.ScriptKind.TS;
}
function createProgram(root, files) {
    const compilerOptions = {
        allowJs: true,
        jsx: ts.JsxEmit.Preserve,
        noLib: true,
        noResolve: true,
        target: ts.ScriptTarget.Latest,
    };
    const sources = [...files]
        .filter(([path]) => /\.[cm]?[jt]sx?$/u.test(path))
        .map(([path, content]) => [resolve(root, path), content]);
    const sourceByAbsolutePath = new Map(sources);
    const host = ts.createCompilerHost(compilerOptions, true);
    host.fileExists = (path) => sourceByAbsolutePath.has(resolve(path));
    host.readFile = (path) => sourceByAbsolutePath.get(resolve(path));
    host.getSourceFile = (path, languageVersion) => {
        const content = sourceByAbsolutePath.get(resolve(path));
        return content === undefined
            ? undefined
            : ts.createSourceFile(path, content, languageVersion, true, scriptKind(path));
    };
    return ts.createProgram({
        rootNames: sources.map(([path]) => path),
        options: compilerOptions,
        host,
    });
}
export async function createProjectSnapshot(root) {
    const absoluteRoot = resolve(root);
    const files = new Map();
    const directories = new Set();
    await walk(absoluteRoot, absoluteRoot, files, directories);
    const program = createProgram(absoluteRoot, files);
    const sources = new Map();
    for (const source of program.getSourceFiles()) {
        const path = projectPath(absoluteRoot, source.fileName);
        if (files.has(path))
            sources.set(path, source);
    }
    const tokenSource = files.get("tokens.json");
    if (tokenSource === undefined)
        return { root: absoluteRoot, program, files, directories, sources };
    try {
        const rawTokens = JSON.parse(tokenSource);
        try {
            return {
                root: absoluteRoot,
                program,
                files,
                directories,
                sources,
                rawTokens,
                parsedTokens: parseTokens(rawTokens, "tokens.json"),
            };
        }
        catch (error) {
            return {
                root: absoluteRoot,
                program,
                files,
                directories,
                sources,
                rawTokens,
                tokenError: error instanceof Error ? error : new Error(String(error)),
            };
        }
    }
    catch (error) {
        return {
            root: absoluteRoot,
            program,
            files,
            directories,
            sources,
            tokenError: error instanceof Error ? error : new Error(String(error)),
        };
    }
}
export function lineOf(content, offset) {
    return content.slice(0, offset).split("\n").length;
}
//# sourceMappingURL=snapshot.js.map