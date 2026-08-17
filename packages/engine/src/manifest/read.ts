import { readFile } from "node:fs/promises";

import type { DesignSystemManifest } from "./types.ts";

export async function readManifest(path: string): Promise<DesignSystemManifest> {
  const parsed: unknown = JSON.parse(await readFile(path, "utf8"));
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error(`Manifest at ${path} must contain a JSON object.`);
  }
  return parsed as DesignSystemManifest;
}
