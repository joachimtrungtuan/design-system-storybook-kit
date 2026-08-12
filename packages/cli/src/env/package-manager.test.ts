import assert from "node:assert/strict";
import test from "node:test";

import { detectPackageManager } from "./package-manager.ts";

test("user-agent detection wins over PATH order", () => {
  const result = detectPackageManager(
    { npm_config_user_agent: "pnpm/10.0.0", PATH: "/bin" },
    () => true,
  );
  assert.equal(result.detected, "pnpm");
  assert.equal(result.source, "user-agent");
});

test("a machine with only npm returns npm and performs detection only", () => {
  const probes: string[] = [];
  const result = detectPackageManager({ PATH: "/bin" }, (name) => {
    probes.push(name);
    return name === "npm";
  });
  assert.deepEqual(probes, ["npm", "pnpm", "yarn"]);
  assert.deepEqual(result, {
    detected: "npm",
    source: "path",
    available: ["npm"],
  });
});
