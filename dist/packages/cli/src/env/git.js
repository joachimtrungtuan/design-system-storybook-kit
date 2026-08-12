import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
function runGit(args) {
    return execFileSync("git", args, {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
    }).trim();
}
function tryRun(runner, args) {
    try {
        return runner(args);
    }
    catch {
        return undefined;
    }
}
export function nearestExistingAncestor(target) {
    let candidate = resolve(target);
    while (!existsSync(candidate)) {
        const parent = dirname(candidate);
        if (parent === candidate) {
            return candidate;
        }
        candidate = parent;
    }
    return candidate;
}
export function inspectGit(target, runner = runGit, resolveContext = nearestExistingAncestor) {
    const present = tryRun(runner, ["--version"]) !== undefined;
    if (!present) {
        return {
            present: false,
            userNameConfigured: false,
            userEmailConfigured: false,
            insideRepository: false,
            clean: false,
        };
    }
    const prefix = ["-C", resolveContext(target)];
    const repositoryRoot = tryRun(runner, [...prefix, "rev-parse", "--show-toplevel"]);
    const userName = tryRun(runner, [...prefix, "config", "--get", "user.name"]);
    const userEmail = tryRun(runner, [...prefix, "config", "--get", "user.email"]);
    const status = repositoryRoot === undefined
        ? undefined
        : tryRun(runner, [...prefix, "status", "--porcelain"]);
    return {
        present: true,
        userNameConfigured: userName !== undefined && userName.length > 0,
        userEmailConfigured: userEmail !== undefined && userEmail.length > 0,
        insideRepository: repositoryRoot !== undefined,
        ...(repositoryRoot === undefined ? {} : { repositoryRoot }),
        clean: status !== undefined && status.length === 0,
    };
}
//# sourceMappingURL=git.js.map