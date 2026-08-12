import { TypeOnlyValue } from "./type-only-source.ts";

export function readValue(input: TypeOnlyValue): string {
  return input.value;
}
