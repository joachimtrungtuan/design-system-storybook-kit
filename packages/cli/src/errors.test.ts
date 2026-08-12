import assert from "node:assert/strict";
import test from "node:test";

import { ActionableError, formatActionableError, handleCliError } from "./errors.ts";
import { EXIT_CODES } from "./exit-codes.ts";

test("exit codes are stable and distinct", () => {
  assert.deepEqual(EXIT_CODES, {
    success: 0,
    validationFailure: 1,
    refusal: 2,
    internalError: 70,
  });
});

test("an actionable error renders all three required fields", () => {
  const error = new ActionableError("Wrong runtime.", "Install Node 24 LTS.", "https://nodejs.org");
  assert.equal(
    formatActionableError(error),
    "Problem: Wrong runtime.\nNext step: Install Node 24 LTS.\nMore information: https://nodejs.org",
  );
});

test("an actionable error preserves the bounded exit-code contract", () => {
  const error = new ActionableError(
    "Invalid project.",
    "Correct the project.",
    "https://example.com",
    EXIT_CODES.validationFailure,
  );
  assert.equal(handleCliError(error, () => {}), EXIT_CODES.validationFailure);
});

test("an unexpected error is reported without a stack trace", () => {
  const output: string[] = [];
  const code = handleCliError(new Error("secret implementation detail"), (message) => {
    output.push(message);
  });
  assert.equal(code, EXIT_CODES.internalError);
  assert.equal(output.length, 1);
  assert.doesNotMatch(output[0] ?? "", /secret implementation detail|at /u);
});
