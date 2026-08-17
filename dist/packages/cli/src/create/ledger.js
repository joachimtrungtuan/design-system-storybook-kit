import { access, mkdir, readFile, rm, rmdir, writeFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
async function exists(path) {
    try {
        await access(path);
        return true;
    }
    catch {
        return false;
    }
}
export class RollbackLedger {
    entries = [];
    touched = new Set();
    directories = [];
    trackedDirectories = new Set();
    root;
    constructor(root) {
        this.root = root;
    }
    async ensureDirectory(path) {
        const missing = [];
        let candidate = resolve(path);
        while (!(await exists(candidate))) {
            missing.push(candidate);
            const parent = dirname(candidate);
            if (parent === candidate)
                break;
            candidate = parent;
        }
        for (const directory of missing.reverse()) {
            await mkdir(directory);
            this.recordDirectory(directory);
        }
    }
    recordDirectory(path) {
        const absolutePath = resolve(path);
        if (this.trackedDirectories.has(absolutePath))
            return;
        this.trackedDirectories.add(absolutePath);
        this.directories.push(absolutePath);
    }
    async write(path, content) {
        const absolutePath = resolve(path);
        await this.ensureDirectory(dirname(absolutePath));
        if (!this.touched.has(absolutePath)) {
            this.touched.add(absolutePath);
            if (await exists(absolutePath)) {
                this.entries.push({
                    path: absolutePath,
                    kind: "overwrote",
                    previous: await readFile(absolutePath, "utf8"),
                });
            }
            else {
                this.entries.push({ path: absolutePath, kind: "created" });
            }
        }
        await writeFile(absolutePath, content);
    }
    paths() {
        return this.entries.map((entry) => entry.path);
    }
    relativePaths() {
        return this.paths().map((path) => relative(this.root, path).split("\\").join("/"));
    }
    async rollback() {
        for (const entry of [...this.entries].reverse()) {
            if (entry.kind === "created") {
                await rm(entry.path, { force: true });
            }
            else if (entry.previous !== undefined) {
                await writeFile(entry.path, entry.previous);
            }
        }
        for (const directory of [...this.directories].reverse()) {
            try {
                await rmdir(directory);
            }
            catch {
                // A directory containing a pre-existing file is intentionally retained.
            }
        }
    }
}
//# sourceMappingURL=ledger.js.map