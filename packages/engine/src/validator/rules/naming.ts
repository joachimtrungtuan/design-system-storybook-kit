import { basename, dirname } from "node:path/posix";

import type { ValidatorRule } from "../types.ts";
import { TIERS, exportSpecifiers, kebabCase, pascalCase, pascalFromKebab, violation } from "./helpers.ts";

export const validateNaming: ValidatorRule = (snapshot) => {
  const violations = [];
  for (const tier of TIERS) {
    const tierRoot = `src/components/${tier}`;
    const componentDirectories = [...snapshot.directories]
      .filter((path) => dirname(path) === tierRoot)
      .sort();

    for (const directory of componentDirectories) {
      const name = basename(directory);
      if (!kebabCase(name)) {
        violations.push(violation("V4", directory, `Component directory '${name}' is not kebab-case.`, "Rename it to kebab-case."));
      }
      const expectedComponent = pascalFromKebab(name);
      const componentFiles = [...snapshot.files.keys()].filter(
        (path) => dirname(path) === directory && path.endsWith(".tsx"),
      );
      const expectedFile = `${directory}/${expectedComponent}.tsx`;
      if (!snapshot.files.has(expectedFile)) {
        violations.push(violation(
          "V5",
          expectedFile,
          `Component directory '${name}' has no matching component source.`,
          `Create ${expectedComponent}.tsx or remove the empty component directory.`,
        ));
      }
      for (const file of componentFiles) {
        const stem = basename(file, ".tsx");
        if (!pascalCase(stem) || stem !== expectedComponent) {
          violations.push(violation(
            "V5",
            file,
            `Component file '${basename(file)}' does not match '${name}'.`,
            `Rename it to ${expectedComponent}.tsx.`,
          ));
        }
      }

      for (const file of snapshot.files.keys()) {
        if (dirname(file) !== directory || !file.endsWith(".ts") || basename(file) === "index.ts") continue;
        const stem = basename(file, ".ts");
        if (!kebabCase(stem)) {
          violations.push(violation("V6", file, `Non-component module '${basename(file)}' is not kebab-case.`, "Rename the module to kebab-case."));
        }
      }

      const barrel = `${directory}/index.ts`;
      const barrelSource = snapshot.sources.get(barrel);
      const componentExported = barrelSource !== undefined && exportSpecifiers(barrelSource)
        .some(({ value }) => value === `./${expectedComponent}` || value === `./${expectedComponent}.tsx`);
      if (!componentExported) {
        violations.push(violation("V7", barrel, `Component '${name}' has no public barrel export.`, `Export ./${expectedComponent} from index.ts.`));
      }
    }

    const tierBarrel = `${tierRoot}/index.ts`;
    const tierSource = snapshot.sources.get(tierBarrel);
    const tierExports = tierSource === undefined
      ? new Set<string>()
      : new Set(exportSpecifiers(tierSource).map(({ value }) => value.replace(/\/index(?:\.ts)?$/u, "").replace(/\.ts$/u, "")));
    for (const directory of componentDirectories) {
      const name = basename(directory);
      if (!tierExports.has(`./${name}`)) {
        violations.push(violation("V8", tierBarrel, `Tier barrel does not export '${name}'.`, `Export ./${name} from the ${tier} index.`));
      }
    }
  }
  return violations;
};
