import {
  confirm as clackConfirm,
  isCancel,
  select as clackSelect,
  text as clackText,
} from "@clack/prompts";
import type { Option } from "@clack/prompts";

import { PromptCancelledError } from "../errors.ts";

export type Rollback = () => void | Promise<void>;

export async function resolvePromptResult<Value>(
  value: Value | symbol,
  rollback: Rollback,
  cancellationCheck: (candidate: unknown) => boolean = isCancel,
): Promise<Value> {
  if (cancellationCheck(value)) {
    await rollback();
    throw new PromptCancelledError();
  }
  return value as Value;
}

export async function textPrompt(
  message: string,
  rollback: Rollback,
  initialValue?: string,
): Promise<string> {
  const result = await clackText({
    message,
    ...(initialValue === undefined ? {} : { initialValue }),
  });
  return resolvePromptResult(result, rollback);
}

export interface SelectPromptOption<Value> {
  value: Value;
  label: string;
  hint?: string;
}

export async function selectPrompt<Value>(
  message: string,
  options: SelectPromptOption<Value>[],
  rollback: Rollback,
): Promise<Value> {
  const clackOptions = options.map((option) => ({
    value: option.value,
    label: option.label,
    ...(option.hint === undefined ? {} : { hint: option.hint }),
  })) as Option<Value>[];
  const result = await clackSelect({
    message,
    options: clackOptions,
  });
  return resolvePromptResult(result, rollback);
}

export async function confirmPrompt(
  message: string,
  rollback: Rollback,
  initialValue = true,
): Promise<boolean> {
  const result = await clackConfirm({ message, initialValue });
  return resolvePromptResult(result, rollback);
}
