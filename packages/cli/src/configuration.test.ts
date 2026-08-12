import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import test from "node:test";

test("verbatimModuleSyntax rejects a type imported as a value", () => {
  assert.throws(
    () =>
      execFileSync(
        resolve("node_modules", ".bin", "tsc"),
        [
          "--ignoreConfig",
          "--noEmit",
          "--strict",
          "--target",
          "ES2024",
          "--module",
          "NodeNext",
          "--moduleResolution",
          "NodeNext",
          "--verbatimModuleSyntax",
          "true",
          "--allowImportingTsExtensions",
          "true",
          "packages/cli/src/fixtures/type-import-as-value.ts",
        ],
        { encoding: "utf8", stdio: "pipe" },
      ),
    (error: unknown) => {
      if (!(error instanceof Error) || !("stdout" in error)) {
        return false;
      }
      const output = `${String(error.stdout)}\n${"stderr" in error ? String(error.stderr) : ""}`;
      return output.includes("TS1484");
    },
  );
});
