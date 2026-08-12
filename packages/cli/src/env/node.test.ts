import assert from "node:assert/strict";
import test from "node:test";

import { ActionableError } from "../errors.ts";
import { assertSupportedNode, isSupportedNodeVersion, parseNodeVersion } from "./node.ts";

test("Node version parsing accepts an optional v prefix", () => {
  assert.deepEqual(parseNodeVersion("v24.12.0"), { major: 24, minor: 12, patch: 0 });
});

test("Node 24.11 fails while 24.12 and 25 pass", () => {
  assert.equal(isSupportedNodeVersion({ major: 24, minor: 11, patch: 9 }), false);
  assert.equal(isSupportedNodeVersion({ major: 24, minor: 12, patch: 0 }), true);
  assert.equal(isSupportedNodeVersion({ major: 25, minor: 0, patch: 0 }), true);
});

test("an unsupported Node message names Node 24 LTS and its installer", () => {
  assert.throws(
    () => assertSupportedNode("24.11.9"),
    (error: unknown) =>
      error instanceof ActionableError &&
      error.action.includes("Node 24 LTS") &&
      error.resource === "https://nodejs.org/en/download",
  );
});
