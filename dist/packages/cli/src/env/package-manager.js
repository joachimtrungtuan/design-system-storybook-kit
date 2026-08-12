import { accessSync, constants } from "node:fs";
import { delimiter, join } from "node:path";
const PACKAGE_MANAGERS = ["npm", "pnpm", "yarn"];
function defaultExecutableProbe(name, pathValue) {
    return pathValue.split(delimiter).some((directory) => {
        if (directory.length === 0) {
            return false;
        }
        try {
            accessSync(join(directory, name), constants.X_OK);
            return true;
        }
        catch {
            return false;
        }
    });
}
function managerFromUserAgent(userAgent) {
    const name = userAgent?.split("/")[0];
    return PACKAGE_MANAGERS.find((manager) => manager === name);
}
export function detectPackageManager(environment = process.env, executableProbe = defaultExecutableProbe) {
    const pathValue = environment.PATH ?? "";
    const available = PACKAGE_MANAGERS.filter((manager) => executableProbe(manager, pathValue));
    const fromUserAgent = managerFromUserAgent(environment.npm_config_user_agent);
    if (fromUserAgent !== undefined) {
        return { detected: fromUserAgent, source: "user-agent", available };
    }
    const detected = available[0];
    return detected === undefined
        ? { source: "none", available }
        : { detected, source: "path", available };
}
//# sourceMappingURL=package-manager.js.map