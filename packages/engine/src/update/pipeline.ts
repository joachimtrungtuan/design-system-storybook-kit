import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, relative, resolve } from "node:path";

import {
  checksumFile,
  classifyProject,
  listProjectFiles,
  readManifest,
  rewriteManifestAfterUpdate,
  writeManifestObject,
  type ClassifiedFile,
  type DesignSystemManifest,
} from "../manifest/index.ts";
import { regenerateAllTierBarrels } from "../scaffold/component.ts";
import { listTemplateFiles, materialiseTemplate, toolkitRoot } from "../template/materialise.ts";
import { generateTokensCss, parseTokensJson } from "../tokens/index.ts";
import { validateProject, type ValidationResult } from "../validator/index.ts";

const MANIFEST_PATH = ".designsystem/manifest.json";
const GENERATED_TIERS = ["atoms", "molecules", "organisms", "templates"] as const;

export interface UpdatePipelineOptions {
  root: string;
  engineVersion: string;
  dryRun: boolean;
}

export interface UpdatePipelineResult {
  previousEngineVersion: string;
  engineVersion: string;
  classified: ClassifiedFile[];
  manifest: DesignSystemManifest;
  validation: ValidationResult | undefined;
}

function generatedPaths(): Set<string> {
  const paths = new Set<string>(["src/styles/tokens.css"]);
  for (const tier of GENERATED_TIERS) paths.add(`src/components/${tier}/index.ts`);
  return paths;
}

interface TemplateValues {
  projectName: string;
  packageManager: string;
  toolkitSpecifier: string;
}

async function readTemplateValues(root: string): Promise<TemplateValues> {
  const pkg: { name?: string; packageManager?: string; dependencies?: Record<string, string> } = JSON.parse(
    await readFile(resolve(root, "package.json"), "utf8"),
  );
  return {
    projectName: pkg.name ?? "neutral-storybook",
    packageManager: pkg.packageManager ?? "npm",
    toolkitSpecifier: pkg.dependencies?.["story-cli-kit"] ?? "latest",
  };
}

async function readCurrentChecksums(root: string): Promise<Map<string, string>> {
  const paths = await listProjectFiles(root);
  const checksums = new Map<string, string>();
  for (const path of paths) {
    if (path === MANIFEST_PATH) continue;
    checksums.set(path, await checksumFile(resolve(root, path)));
  }
  return checksums;
}

async function renderIncomingTemplate(templateDirectory: string, values: TemplateValues): Promise<Map<string, string>> {
  const scratch = await mkdtemp(resolve(tmpdir(), "story-cli-update-"));
  const rendered = new Map<string, string>();
  try {
    await materialiseTemplate({
      destination: scratch,
      templateDirectory,
      projectName: values.projectName,
      packageManager: values.packageManager,
      toolkitSpecifier: values.toolkitSpecifier,
      onFileWrite: async (path, content) => {
        rendered.set(relative(scratch, path).split("\\").join("/"), content);
        await writeFile(path, content);
      },
    });
  } finally {
    await rm(scratch, { recursive: true, force: true });
  }
  return rendered;
}

async function regenerateGeneratedContent(root: string): Promise<Map<string, string>> {
  const content = new Map<string, string>();

  const tokensPath = resolve(root, "tokens.json");
  const tokens = parseTokensJson(await readFile(tokensPath, "utf8"), tokensPath);
  content.set("src/styles/tokens.css", generateTokensCss(tokens).css);

  await regenerateAllTierBarrels(root, async (path, barrelContent) => {
    content.set(relative(root, path).split("\\").join("/"), barrelContent);
  });

  return content;
}

export async function runUpdatePipeline(options: UpdatePipelineOptions): Promise<UpdatePipelineResult> {
  const { root, engineVersion, dryRun } = options;

  const manifest = await readManifest(resolve(root, MANIFEST_PATH));
  const previousEngineVersion = manifest.engineVersion;
  const values = await readTemplateValues(root);
  const kitRoot = await toolkitRoot();
  const templateDirectory = resolve(kitRoot, "templates/storybook-vite");

  const currentChecksums = await readCurrentChecksums(root);
  const incomingPaths = new Set(await listTemplateFiles(templateDirectory));
  const generated = generatedPaths();

  const classified = classifyProject({ manifest, currentChecksums, incomingPaths, generatedPaths: generated });

  const rendered = await renderIncomingTemplate(templateDirectory, values);
  const regenerated = await regenerateGeneratedContent(root);

  const updatedFiles: Record<string, string> = {};
  for (const file of classified) {
    if (file.category === "generated") {
      const content = regenerated.get(file.path);
      if (content !== undefined) updatedFiles[file.path] = content;
    } else if (file.category === "new" || file.category === "unmodified") {
      const content = rendered.get(file.path);
      if (content !== undefined) updatedFiles[file.path] = content;
    }
  }

  const rewrittenManifest = rewriteManifestAfterUpdate({ manifest, engineVersion, updatedFiles });

  let validation: ValidationResult | undefined;
  if (!dryRun) {
    for (const [path, content] of Object.entries(updatedFiles)) {
      const absolutePath = resolve(root, path);
      await mkdir(dirname(absolutePath), { recursive: true });
      await writeFile(absolutePath, content);
    }
    await writeManifestObject(root, rewrittenManifest);
    validation = await validateProject(root);
  }

  return {
    previousEngineVersion,
    engineVersion,
    classified,
    manifest: rewrittenManifest,
    validation,
  };
}
