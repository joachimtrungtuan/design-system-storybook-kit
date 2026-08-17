import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { relative, resolve } from "node:path";

import { checksumContent, MANIFEST_SCHEMA_VERSION } from "./checksum.ts";
import type { DesignSystemManifest, ManifestFile, ManifestMark } from "./types.ts";

const IGNORED_DIRECTORIES = new Set([".git", "node_modules", "storybook-static"]);

async function collectFiles(root: string, directory: string, result: string[]): Promise<void> {
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    if (entry.isDirectory() && IGNORED_DIRECTORIES.has(entry.name)) continue;
    const absolutePath = resolve(directory, entry.name);
    if (entry.isDirectory()) {
      await collectFiles(root, absolutePath, result);
    } else if (entry.isFile()) {
      result.push(relative(root, absolutePath).split("\\").join("/"));
    }
  }
}

export interface WriteManifestOptions {
  root: string;
  engineVersion: string;
  createdWith: string;
  templateId: string;
  appliedMigrations?: string[];
  renderedFiles?: Iterable<string>;
  mergedFiles?: Iterable<string>;
  files?: Iterable<string>;
}

export async function createManifest(options: WriteManifestOptions): Promise<DesignSystemManifest> {
  const files: string[] = options.files === undefined ? [] : [...options.files];
  if (options.files === undefined) await collectFiles(options.root, options.root, files);
  const rendered = new Set(options.renderedFiles ?? []);
  const merged = new Set(options.mergedFiles ?? []);
  const entries: Record<string, ManifestFile> = {};

  for (const path of files.sort()) {
    if (path === ".designsystem/manifest.json") continue;
    if (merged.has(path)) {
      entries[path] = { mark: "merged" };
      continue;
    }
    const content = await readFile(resolve(options.root, path), "utf8");
    entries[path] = {
      sha256: checksumContent(content),
      ...(rendered.has(path) ? { mark: "rendered" as const } : {}),
    };
  }

  return {
    schemaVersion: MANIFEST_SCHEMA_VERSION,
    engineVersion: options.engineVersion,
    templateId: options.templateId,
    createdWith: options.createdWith,
    appliedMigrations: [...(options.appliedMigrations ?? [])],
    files: entries,
  };
}

export async function writeManifest(options: WriteManifestOptions): Promise<string> {
  const manifest = await createManifest(options);
  const path = resolve(options.root, ".designsystem/manifest.json");
  await mkdir(resolve(options.root, ".designsystem"), { recursive: true });
  await writeFile(path, `${JSON.stringify(manifest, null, 2)}\n`);
  return path;
}
