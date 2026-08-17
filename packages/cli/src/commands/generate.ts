import { access } from "node:fs/promises";
import { resolve } from "node:path";

import { regenerateTierBarrel, createComponentScaffold, isComponentName } from "../../../engine/src/scaffold/index.ts";
import { isTier, type Tier } from "../../../engine/src/validator/rules/helpers.ts";
import { ActionableError } from "../errors.ts";
import { consoleReporter, type Reporter } from "../ui/report.ts";
import { RollbackLedger } from "../create/ledger.ts";

export interface GenerateCommandOptions {
  cwd?: string;
  tier: string;
  name: string;
  reporter?: Reporter;
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

export async function runGenerate(options: GenerateCommandOptions): Promise<void> {
  if (!isTier(options.tier)) {
    throw new ActionableError(
      `Unknown component tier '${options.tier}' (V1).`,
      "Use atoms, molecules, organisms, or templates.",
      "docs/design-system-contract.md",
    );
  }
  if (!isComponentName(options.name)) {
    throw new ActionableError(
      `Component name '${options.name}' is not kebab-case (V4).`,
      "Use lowercase words separated by single hyphens, for example 'date-picker'.",
      "docs/design-system-contract.md",
    );
  }

  const root = resolve(options.cwd ?? process.cwd());
  const scaffold = createComponentScaffold(options.tier as Tier, options.name);
  const paths = [scaffold.componentPath, scaffold.indexPath, scaffold.storyPath];
  const collisions = (await Promise.all(paths.map(async (path) => (await exists(resolve(root, path))) ? path : undefined)))
    .filter((path): path is string => path !== undefined);
  if (collisions.length > 0 || await exists(resolve(root, `src/components/${options.tier}/${options.name}`))) {
    const pathsWithDirectory = [
      ...collisions,
      ...(await exists(resolve(root, `src/components/${options.tier}/${options.name}`))
        ? [`src/components/${options.tier}/${options.name}`]
        : []),
    ];
    throw new ActionableError(
      `Generate would overwrite existing paths: ${pathsWithDirectory.join(", ")}.`,
      "Choose a new component name or remove the incomplete scaffold after checking its contents.",
      root,
    );
  }

  const ledger = new RollbackLedger(root);
  try {
    for (const [path, content] of [
      [scaffold.componentPath, scaffold.componentSource],
      [scaffold.indexPath, scaffold.indexSource],
      [scaffold.storyPath, scaffold.storySource],
    ] as const) {
      await ledger.write(resolve(root, path), content);
    }
    await regenerateTierBarrel(root, options.tier as Tier, (path, content) => ledger.write(path, content));
    (options.reporter ?? consoleReporter).info(
      `Generated ${options.tier}/${options.name}; run your local ds validate command to verify the project.`,
    );
  } catch (error: unknown) {
    await ledger.rollback();
    throw error;
  }
}
