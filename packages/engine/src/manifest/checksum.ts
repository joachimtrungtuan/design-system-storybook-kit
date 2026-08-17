import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

export const MANIFEST_SCHEMA_VERSION = 1;

/**
 * The manifest deliberately hashes text after normalising the two differences
 * that routinely vary between machines: line endings and the final newline.
 */
export function normalizeForChecksum(value: string): string {
  const normalized = value.replace(/\r\n?/gu, "\n");
  return normalized.length === 0 ? normalized : `${normalized.replace(/\n+$/u, "")}\n`;
}

export function checksumContent(value: string): string {
  return createHash("sha256").update(normalizeForChecksum(value), "utf8").digest("hex");
}

export async function checksumFile(path: string): Promise<string> {
  return checksumContent(await readFile(path, "utf8"));
}
