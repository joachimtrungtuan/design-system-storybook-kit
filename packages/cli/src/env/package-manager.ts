import { accessSync, constants } from "node:fs";
import { delimiter, join } from "node:path";

export type PackageManager = "npm" | "pnpm" | "yarn";
export type DetectionSource = "user-agent" | "path" | "none";

export interface PackageManagerDetection {
  detected?: PackageManager;
  source: DetectionSource;
  available: PackageManager[];
}

type ExecutableProbe = (name: PackageManager, pathValue: string) => boolean;

const PACKAGE_MANAGERS: readonly PackageManager[] = ["npm", "pnpm", "yarn"];

function defaultExecutableProbe(name: PackageManager, pathValue: string): boolean {
  return pathValue.split(delimiter).some((directory) => {
    if (directory.length === 0) {
      return false;
    }
    try {
      accessSync(join(directory, name), constants.X_OK);
      return true;
    } catch {
      return false;
    }
  });
}

function managerFromUserAgent(userAgent: string | undefined): PackageManager | undefined {
  const name = userAgent?.split("/")[0];
  return PACKAGE_MANAGERS.find((manager) => manager === name);
}

export function detectPackageManager(
  environment: NodeJS.ProcessEnv = process.env,
  executableProbe: ExecutableProbe = defaultExecutableProbe,
): PackageManagerDetection {
  const pathValue = environment.PATH ?? "";
  const available = PACKAGE_MANAGERS.filter((manager) =>
    executableProbe(manager, pathValue),
  );
  const fromUserAgent = managerFromUserAgent(environment.npm_config_user_agent);

  if (fromUserAgent !== undefined) {
    return { detected: fromUserAgent, source: "user-agent", available };
  }
  const detected = available[0];
  return detected === undefined
    ? { source: "none", available }
    : { detected, source: "path", available };
}
