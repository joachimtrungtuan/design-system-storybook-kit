import assert from "node:assert/strict";
import { cp, mkdir, mkdtemp, readFile, rm, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import test from "node:test";

import { generateTokensCss, parseTokensJson } from "../tokens/index.ts";
import { IMPLEMENTED_RULE_IDS, jsonReport, validateProject } from "./index.ts";

const FIXTURE = resolve(import.meta.dirname, "__fixtures__/compliant-project");

async function project(): Promise<string> {
  const root = await mkdtemp(resolve(tmpdir(), "story-cli-validator-"));
  await cp(FIXTURE, root, { recursive: true });
  return root;
}

async function put(root: string, path: string, content: string): Promise<void> {
  const absolute = resolve(root, path);
  await mkdir(dirname(absolute), { recursive: true });
  await writeFile(absolute, content);
}

async function changeTokens(root: string, change: (tokens: Record<string, any>) => void): Promise<void> {
  const path = resolve(root, "tokens.json");
  const tokens = JSON.parse(await readFile(path, "utf8")) as Record<string, any>;
  change(tokens);
  await writeFile(path, `${JSON.stringify(tokens, null, 2)}\n`);
}

async function seed(root: string, ruleId: string): Promise<void> {
  switch (ruleId) {
    case "V1": await mkdir(resolve(root, "src/components/utilities"), { recursive: true }); break;
    case "V2": await mkdir(resolve(root, "src/stories/examples"), { recursive: true }); break;
    case "V3":
      await put(root, "src/components/molecules/card/Card.tsx", "export function Card() { return null; }\n");
      await put(root, "src/components/molecules/card/index.ts", "export { Card } from './Card';\n");
      await put(root, "src/components/atoms/shared.ts", "export { Card } from '../molecules/card';\n");
      await put(root, "src/components/atoms/button/Button.tsx", "import { Card } from '../shared';\nexport function Button() { return <Card />; }\n");
      break;
    case "V4": await mkdir(resolve(root, "src/components/atoms/Bad_Name"), { recursive: true }); break;
    case "V5": await put(root, "src/components/atoms/button/Wrong.tsx", "export function Wrong() { return null; }\n"); break;
    case "V6": await put(root, "src/components/atoms/button/useThing.ts", "export const value = 1;\n"); break;
    case "V7": await put(root, "src/components/atoms/button/index.ts", "export {};\n"); break;
    case "V8": await put(root, "src/components/atoms/index.ts", "export {};\n"); break;
    case "V9": await put(root, "src/stories/atoms/actions.stories.tsx", "import type { Meta, StoryObj } from '@storybook/react-vite';\nimport { Button } from '../../components/atoms/button';\nconst meta = { title: 'Atoms/Button', component: Unknown } satisfies Meta<typeof Button>;\nexport default meta;\nexport const Default: StoryObj<typeof meta> = {};\n"); break;
    case "V10": {
      const path = resolve(root, "src/stories/atoms/actions.stories.tsx");
      await writeFile(path, (await readFile(path, "utf8")).replace("Atoms/Button", "Molecules/Button"));
      break;
    }
    case "V11": await put(root, "src/stories/atoms/actions.stories.tsx", "export default { title: 'Atoms/Button' };\nexport const Default = {};\n"); break;
    case "V12": await put(root, "src/components/atoms/button/raw.ts", "export const font = 'Inter, sans-serif';\n"); break;
    case "V13": await put(root, "src/components/atoms/button/raw.ts", "export const color = '#123456';\n"); break;
    case "V14": await put(root, "src/components/atoms/button/raw.ts", "export const classes = 'bg-[#123456]';\n"); break;
    case "V15": await put(root, "src/styles/tokens.css", "@theme {}\n"); break;
    case "V16": await changeTokens(root, (tokens) => { delete tokens.color.brand.accent.$mode; }); break;
    case "V17": await changeTokens(root, (tokens) => { tokens.color.brand.accent.$overrides = { 500: "#123456" }; }); break;
    case "V18": await changeTokens(root, (tokens) => {
      tokens.color.brand.accent = Object.fromEntries([50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950].map((step) => [step, "#123456"]));
    }); break;
    case "V19": await changeTokens(root, (tokens) => { tokens.color.semantic.action = "#123456"; }); break;
    case "V20": await unlink(resolve(root, "src/stories/foundations/Colors.mdx")); break;
    case "V21": await put(root, "src/stories/Introduction.mdx", "# Missing meta\n"); break;
    case "V22": await put(root, ".storybook/main.ts", "export default { stories: [] };\n"); break;
    case "V23": await put(root, ".storybook/preview.tsx", "export default {};\n"); break;
    case "V24": await changeTokens(root, (tokens) => { tokens["bad-group"] = { value: 1 }; }); break;
    default: throw new Error(`No seeded fixture for ${ruleId}.`);
  }
}

test("compliant fixture passes every implemented validator rule", async (context) => {
  const root = await project();
  context.after(() => rm(root, { recursive: true, force: true }));
  const result = await validateProject(root);
  assert.deepEqual(result.violations, []);
  assert.deepEqual(IMPLEMENTED_RULE_IDS, Array.from({ length: 24 }, (_, index) => `V${index + 1}`));
});

test("implemented IDs match V1-V24 while V25 and V26 remain reserved", async () => {
  const contract = await readFile(resolve(import.meta.dirname, "../../../../docs/design-system-contract.md"), "utf8");
  const contractIds = [...contract.matchAll(/\*\*\[V(\d+)\]/gu)]
    .map((match) => `V${match[1]}`)
    .filter((value, index, values) => values.indexOf(value) === index)
    .sort((left, right) => Number(left.slice(1)) - Number(right.slice(1)));
  assert.deepEqual(contractIds, Array.from({ length: 26 }, (_, index) => `V${index + 1}`));
  assert.deepEqual(IMPLEMENTED_RULE_IDS, contractIds.slice(0, 24));
  assert.deepEqual(contractIds.slice(24), ["V25", "V26"]);
});

test("JSON violations expose file, rule ID, message, and action as separate fields", async (context) => {
  const root = await project();
  context.after(() => rm(root, { recursive: true, force: true }));
  await seed(root, "V20");
  const report = jsonReport(await validateProject(root));
  const item = report.violations.find((violation) => violation.ruleId === "V20");
  assert.equal(typeof item?.file, "string");
  assert.equal(typeof item?.ruleId, "string");
  assert.equal(typeof item?.message, "string");
  assert.equal(typeof item?.action, "string");
});

for (const ruleId of IMPLEMENTED_RULE_IDS) {
  test(`${ruleId} has a seeded failing project`, async (context) => {
    const root = await project();
    context.after(() => rm(root, { recursive: true, force: true }));
    await seed(root, ruleId);
    const result = await validateProject(root);
    assert.equal(result.violations.some((item) => item.ruleId === ruleId), true, JSON.stringify(result.violations, null, 2));
  });
}

test("V3 ignores type-only imports and catches a runtime barrel re-export", async (context) => {
  const root = await project();
  context.after(() => rm(root, { recursive: true, force: true }));
  await put(root, "src/components/molecules/card/Card.tsx", "export interface CardProps { value: string }\nexport function Card() { return null; }\n");
  await put(root, "src/components/molecules/card/index.ts", "export { Card } from './Card';\nexport type { CardProps } from './Card';\n");
  await put(root, "src/components/atoms/button/Button.tsx", "import type { CardProps } from '../../molecules/card';\nexport function Button(_: CardProps) { return null; }\n");
  assert.equal((await validateProject(root)).violations.some((item) => item.ruleId === "V3"), false);
  await put(root, "src/components/atoms/shared.ts", "export { Card } from '../molecules/card';\n");
  await put(root, "src/components/atoms/button/Button.tsx", "import { Card } from '../shared';\nexport function Button() { return <Card />; }\n");
  assert.equal((await validateProject(root)).violations.some((item) => item.ruleId === "V3"), true);
});

test("V3 ignores higher-tier import text inside comments and strings", async (context) => {
  const root = await project();
  context.after(() => rm(root, { recursive: true, force: true }));
  await put(root, "src/components/atoms/button/Button.tsx", "// import { Card } from '../../molecules/card';\nconst example = \"export { Card } from '../../molecules/card'\";\nexport function Button() { return <button>{example}</button>; }\n");
  assert.equal((await validateProject(root)).violations.some((item) => item.ruleId === "V3"), false);
});

test("V3 ignores named type-only re-exports", async (context) => {
  const root = await project();
  context.after(() => rm(root, { recursive: true, force: true }));
  await put(root, "src/components/molecules/card/Card.tsx", "export interface CardProps { value: string }\nexport function Card() { return null; }\n");
  await put(root, "src/components/molecules/card/index.ts", "export { Card } from './Card';\nexport type { CardProps } from './Card';\n");
  await put(root, "src/components/atoms/types.ts", "export { type CardProps } from '../molecules/card';\n");
  assert.equal((await validateProject(root)).violations.some((item) => item.ruleId === "V3"), false);
});

test("V9 accepts differently named grouped stories through subcomponents", async (context) => {
  const root = await project();
  context.after(() => rm(root, { recursive: true, force: true }));
  await put(root, "src/components/atoms/button-label/ButtonLabel.tsx", "export function ButtonLabel() { return null; }\n");
  await put(root, "src/components/atoms/button-label/index.ts", "export { ButtonLabel } from './ButtonLabel';\n");
  await put(root, "src/components/atoms/index.ts", "export * from './button';\nexport * from './button-label';\n");
  await put(root, "src/stories/atoms/actions.stories.tsx", "import type { Meta, StoryObj } from '@storybook/react-vite';\nimport { Button } from '../../components/atoms/button';\nimport { ButtonLabel } from '../../components/atoms/button-label';\nconst meta = { title: 'Atoms/Actions', component: Button, subcomponents: { ButtonLabel } } satisfies Meta<typeof Button>;\nexport default meta;\nexport const Default: StoryObj<typeof meta> = {};\n");
  assert.equal((await validateProject(root)).violations.some((item) => item.ruleId === "V9"), false);
});

test("V9 resolves aliased imports and rejects unrelated local identifiers", async (context) => {
  const root = await project();
  context.after(() => rm(root, { recursive: true, force: true }));
  await put(root, "src/stories/atoms/actions.stories.tsx", "import type { Meta, StoryObj } from '@storybook/react-vite';\nimport { Button as PrimaryButton } from '../../components/atoms/button';\nconst meta = { title: 'Atoms/Button', component: PrimaryButton } satisfies Meta<typeof PrimaryButton>;\nexport default meta;\nexport const Default: StoryObj<typeof meta> = {};\n");
  assert.equal((await validateProject(root)).violations.some((item) => item.ruleId === "V9"), false);
  await put(root, "src/stories/atoms/actions.stories.tsx", "import type { Meta, StoryObj } from '@storybook/react-vite';\nconst Button = () => null;\nconst meta = { title: 'Atoms/Button', component: Button } satisfies Meta<typeof Button>;\nexport default meta;\nexport const Default: StoryObj<typeof meta> = {};\n");
  assert.equal((await validateProject(root)).violations.some((item) => item.ruleId === "V9"), true);
});

test("V9 resolves components imported through the tier public barrel", async (context) => {
  const root = await project();
  context.after(() => rm(root, { recursive: true, force: true }));
  await put(root, "src/stories/atoms/actions.stories.tsx", "import type { Meta, StoryObj } from '@storybook/react-vite';\nimport { Button } from '../../components/atoms';\nconst meta = { title: 'Atoms/Button', component: Button } satisfies Meta<typeof Button>;\nexport default meta;\nexport const Default: StoryObj<typeof meta> = {};\n");
  assert.equal((await validateProject(root)).violations.some((item) => item.ruleId === "V9"), false);
});

test("V9 resolves each symbol through a multi-component tier barrel", async (context) => {
  const root = await project();
  context.after(() => rm(root, { recursive: true, force: true }));
  await put(root, "src/components/atoms/button-label/ButtonLabel.tsx", "export function ButtonLabel() { return null; }\n");
  await put(root, "src/components/atoms/button-label/index.ts", "export { ButtonLabel } from './ButtonLabel';\n");
  await put(root, "src/components/atoms/index.ts", "export * from './button';\nexport * from './button-label';\n");
  await put(root, "src/stories/atoms/actions.stories.tsx", "import type { Meta, StoryObj } from '@storybook/react-vite';\nimport { Button, ButtonLabel } from '../../components/atoms';\nconst meta = { title: 'Atoms/Actions', component: Button, subcomponents: { ButtonLabel } } satisfies Meta<typeof Button>;\nexport default meta;\nexport const Default: StoryObj<typeof meta> = {};\n");
  assert.equal((await validateProject(root)).violations.some((item) => item.ruleId === "V9"), false);
});

test("V11 requires Meta typing on the exported default object", async (context) => {
  const root = await project();
  context.after(() => rm(root, { recursive: true, force: true }));
  await put(root, "src/stories/atoms/actions.stories.tsx", "import type { Meta, StoryObj } from '@storybook/react-vite';\nimport { Button } from '../../components/atoms/button';\nconst decoy = { title: 'Atoms/Decoy', component: Button } satisfies Meta<typeof Button>;\nconst meta = { title: 'Atoms/Button', component: Button };\nexport default meta;\nexport const Default: StoryObj<typeof meta> = {};\nvoid decoy;\n");
  assert.equal((await validateProject(root)).violations.some((item) => item.ruleId === "V11"), true);
});

test("V11 rejects local lookalike type names", async (context) => {
  const root = await project();
  context.after(() => rm(root, { recursive: true, force: true }));
  await put(root, "src/stories/atoms/actions.stories.tsx", "import { Button } from '../../components/atoms/button';\ntype Metadata<T> = T;\ntype StoryObject<T> = T;\nconst meta = { title: 'Atoms/Button', component: Button } satisfies Metadata<unknown>;\nexport default meta;\nexport const Default: StoryObject<unknown> = {};\n");
  assert.equal((await validateProject(root)).violations.some((item) => item.ruleId === "V11"), true);
});

test("V12 scopes the globals font exemption and V14 permits non-tokenised width", async (context) => {
  const root = await project();
  context.after(() => rm(root, { recursive: true, force: true }));
  await put(root, "src/components/atoms/button/Button.tsx", "export function Button() { return <button className='w-[37rem]'>Button</button>; }\n");
  let result = await validateProject(root);
  assert.equal(result.violations.some((item) => item.ruleId === "V12" || item.ruleId === "V14"), false);
  await put(root, "src/components/atoms/button/font.ts", "export const family = 'Inter, sans-serif';\n");
  result = await validateProject(root);
  assert.equal(result.violations.some((item) => item.ruleId === "V12"), true);
  await unlink(resolve(root, "src/components/atoms/button/font.ts"));
  await put(root, "src/styles/globals.css", "@import url('https://fonts.example.test/css?family=Inter');\n:root { --body-font: Inter, sans-serif; }\n");
  result = await validateProject(root);
  assert.equal(result.violations.some((item) => item.ruleId === "V12"), true);
});

test("V12 catches novel font families and type-scale values, including inside font-face", async (context) => {
  const root = await project();
  context.after(() => rm(root, { recursive: true, force: true }));
  await put(root, "src/components/atoms/button/raw.ts", "export const style = { fontFamily: 'Georgia, serif', fontSize: '13px' };\n");
  let result = await validateProject(root);
  assert.equal(result.violations.some((item) => item.ruleId === "V12"), true);
  await unlink(resolve(root, "src/components/atoms/button/raw.ts"));
  await put(root, "src/styles/globals.css", "@font-face { font-family: 'Inter'; font-size: 13px; src: url('/inter.woff2'); }\n");
  result = await validateProject(root);
  assert.equal(result.violations.some((item) => item.ruleId === "V12"), true);
});

test("V12 catches standalone raw typography and permits generated CSS variables", async (context) => {
  const root = await project();
  context.after(() => rm(root, { recursive: true, force: true }));
  await put(root, "src/components/atoms/button/raw.ts", "export const family = 'Georgia, serif';\nexport const size = '13px';\n");
  let result = await validateProject(root);
  assert.equal(result.violations.some((item) => item.ruleId === "V12"), true);
  await unlink(resolve(root, "src/components/atoms/button/raw.ts"));
  await put(root, "src/styles/globals.css", ".body { font-family: var(--font-sans); font-size: var(--text-body); }\n");
  result = await validateProject(root);
  assert.equal(result.violations.some((item) => item.ruleId === "V12"), false);
});

test("V5, V7, and V8 require real source and export declarations", async (context) => {
  const root = await project();
  context.after(() => rm(root, { recursive: true, force: true }));
  await unlink(resolve(root, "src/components/atoms/button/Button.tsx"));
  await put(root, "src/components/atoms/button/index.ts", "// export { Button } from './Button';\n");
  await put(root, "src/components/atoms/index.ts", "// export * from './button';\n");
  const result = await validateProject(root);
  assert.equal(result.violations.some((item) => item.ruleId === "V5"), true);
  assert.equal(result.violations.some((item) => item.ruleId === "V7"), true);
  assert.equal(result.violations.some((item) => item.ruleId === "V8"), true);
});

test("V7 and V8 reject import-only barrels", async (context) => {
  const root = await project();
  context.after(() => rm(root, { recursive: true, force: true }));
  await put(root, "src/components/atoms/button/index.ts", "import { Button } from './Button';\nvoid Button;\n");
  await put(root, "src/components/atoms/index.ts", "import { Button } from './button';\nvoid Button;\n");
  const result = await validateProject(root);
  assert.equal(result.violations.some((item) => item.ruleId === "V7"), true);
  assert.equal(result.violations.some((item) => item.ruleId === "V8"), true);
});

test("V24 rejects known non-canonical group aliases", async (context) => {
  const root = await project();
  context.after(() => rm(root, { recursive: true, force: true }));
  await changeTokens(root, (tokens) => { tokens.borderRadius = { md: "0.5rem" }; });
  assert.equal((await validateProject(root)).violations.some((item) => item.ruleId === "V24"), true);
});

test("V14 permits non-tokenised background images", async (context) => {
  const root = await project();
  context.after(() => rm(root, { recursive: true, force: true }));
  await put(root, "src/components/atoms/button/raw.ts", "export const classes = \"bg-[url('/texture.svg')] bg-[linear-gradient(to_right,black,white)]\";\n");
  assert.equal((await validateProject(root)).violations.some((item) => item.ruleId === "V14"), false);
});

test("dangling semantic references produce violations instead of throwing", async (context) => {
  const root = await project();
  context.after(() => rm(root, { recursive: true, force: true }));
  await changeTokens(root, (tokens) => { tokens.color.semantic.action = "{color.brand.missing.500}"; });
  const result = await validateProject(root);
  assert.equal(result.violations.some((item) => item.ruleId === "V19"), true);
});

test("unsupported camelCase token groups fail explicitly instead of disappearing", async (context) => {
  const root = await project();
  context.after(() => rm(root, { recursive: true, force: true }));
  await changeTokens(root, (tokens) => { tokens.customGroup = { example: "42px" }; });
  const result = await validateProject(root);
  assert.equal(result.violations.some((item) => item.ruleId === "V15"), true);
});

test("V15 passes immediately after regeneration", async (context) => {
  const root = await project();
  context.after(() => rm(root, { recursive: true, force: true }));
  await changeTokens(root, (tokens) => { tokens.spacing["8"] = "2rem"; });
  assert.equal((await validateProject(root)).violations.some((item) => item.ruleId === "V15"), true);
  const source = await readFile(resolve(root, "tokens.json"), "utf8");
  await put(root, "src/styles/tokens.css", generateTokensCss(parseTokensJson(source)).css);
  assert.equal((await validateProject(root)).violations.some((item) => item.ruleId === "V15"), false);
});
