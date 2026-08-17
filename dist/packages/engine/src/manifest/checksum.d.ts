export declare const MANIFEST_SCHEMA_VERSION = 1;
/**
 * The manifest deliberately hashes text after normalising the two differences
 * that routinely vary between machines: line endings and the final newline.
 */
export declare function normalizeForChecksum(value: string): string;
export declare function checksumContent(value: string): string;
export declare function checksumFile(path: string): Promise<string>;
