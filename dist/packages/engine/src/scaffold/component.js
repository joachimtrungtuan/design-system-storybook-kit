import { mkdir, readdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { isTier } from "../validator/rules/helpers.js";
function pascalFromKebab(value) {
    return value
        .split("-")
        .map((part) => `${part[0]?.toUpperCase() ?? ""}${part.slice(1)}`)
        .join("");
}
export function isComponentName(value) {
    return /^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(value);
}
export function createComponentScaffold(tier, name) {
    const componentName = pascalFromKebab(name);
    const componentDirectory = `src/components/${tier}/${name}`;
    return {
        componentPath: `${componentDirectory}/${componentName}.tsx`,
        indexPath: `${componentDirectory}/index.ts`,
        storyPath: `src/stories/${tier}/${componentName}.stories.tsx`,
        componentSource: `import type { HTMLAttributes } from "react";

export interface ${componentName}Props extends HTMLAttributes<HTMLDivElement> {}

export function ${componentName}({ className = "", children, ...props }: ${componentName}Props) {
  return <div className={className} {...props}>{children}</div>;
}
`,
        indexSource: `export { ${componentName}, type ${componentName}Props } from "./${componentName}";
`,
        storySource: `import type { Meta, StoryObj } from "@storybook/react-vite";
import { ${componentName} } from "../../components/${tier}";

const meta = { title: "${tier[0]?.toUpperCase() ?? ""}${tier.slice(1)}/${componentName}", component: ${componentName}, args: { children: "Example" } } satisfies Meta<typeof ${componentName}>;
export default meta;
export const Default: StoryObj<typeof meta> = {};
`,
    };
}
export function componentTierBarrelSource(names) {
    return [...names].sort().map((name) => `export * from "./${name}";`).join("\n") + "\n";
}
export async function regenerateTierBarrel(root, tier, write = async (path, content) => writeFile(path, content)) {
    const tierDirectory = resolve(root, "src/components", tier);
    const entries = await readdir(tierDirectory, { withFileTypes: true });
    const names = entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
    const path = resolve(tierDirectory, "index.ts");
    await write(path, componentTierBarrelSource(names));
    return path;
}
export async function regenerateAllTierBarrels(root, write) {
    const paths = [];
    for (const tier of ["atoms", "molecules", "organisms", "templates"]) {
        if (!isTier(tier))
            continue;
        paths.push(await regenerateTierBarrel(root, tier, write));
    }
    return paths;
}
export async function writeComponentScaffold(root, scaffold, write) {
    for (const [path, content] of [
        [scaffold.componentPath, scaffold.componentSource],
        [scaffold.indexPath, scaffold.indexSource],
        [scaffold.storyPath, scaffold.storySource],
    ]) {
        const absolutePath = resolve(root, path);
        await mkdir(resolve(absolutePath, ".."), { recursive: true });
        await write(absolutePath, content);
    }
}
//# sourceMappingURL=component.js.map