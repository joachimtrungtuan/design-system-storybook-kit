import { readFile } from "node:fs/promises";
export async function readManifest(path) {
    const parsed = JSON.parse(await readFile(path, "utf8"));
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
        throw new Error(`Manifest at ${path} must contain a JSON object.`);
    }
    return parsed;
}
//# sourceMappingURL=read.js.map