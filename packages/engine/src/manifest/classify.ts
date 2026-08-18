import type { DesignSystemManifest } from "./types.ts";

export type ClassificationCategory =
  | "new"
  | "unmodified"
  | "conflicted"
  | "user-created"
  | "generated"
  | "adopt-merged";

export interface ClassifiedFile {
  path: string;
  category: ClassificationCategory;
}

export interface ClassifyProjectOptions {
  manifest: DesignSystemManifest;
  currentChecksums: ReadonlyMap<string, string>;
  incomingPaths: ReadonlySet<string>;
  generatedPaths: ReadonlySet<string>;
}

export function classifyProject(options: ClassifyProjectOptions): ClassifiedFile[] {
  const { manifest, currentChecksums, incomingPaths, generatedPaths } = options;
  const allPaths = new Set<string>([
    ...Object.keys(manifest.files),
    ...currentChecksums.keys(),
    ...incomingPaths,
    ...generatedPaths,
  ]);

  const results: ClassifiedFile[] = [];
  for (const path of [...allPaths].sort()) {
    const manifestEntry = manifest.files[path];
    const existsLocally = currentChecksums.has(path);
    const shippedByTemplate = incomingPaths.has(path);

    if (manifestEntry?.mark === "merged") {
      results.push({ path, category: "adopt-merged" });
      continue;
    }
    if (generatedPaths.has(path)) {
      results.push({ path, category: "generated" });
      continue;
    }
    if (!shippedByTemplate) {
      if (existsLocally && manifestEntry === undefined) {
        results.push({ path, category: "user-created" });
      }
      continue;
    }
    if (!existsLocally) {
      results.push({ path, category: "new" });
      continue;
    }
    if (manifestEntry === undefined) {
      results.push({ path, category: "conflicted" });
      continue;
    }
    const currentChecksum = currentChecksums.get(path);
    results.push({
      path,
      category: currentChecksum === manifestEntry.sha256 ? "unmodified" : "conflicted",
    });
  }
  return results;
}
