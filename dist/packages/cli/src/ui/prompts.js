import { confirm as clackConfirm, isCancel, select as clackSelect, text as clackText, } from "@clack/prompts";
import { PromptCancelledError } from "../errors.js";
export async function resolvePromptResult(value, rollback, cancellationCheck = isCancel) {
    if (cancellationCheck(value)) {
        await rollback();
        throw new PromptCancelledError();
    }
    return value;
}
export async function textPrompt(message, rollback, initialValue) {
    const result = await clackText({
        message,
        ...(initialValue === undefined ? {} : { initialValue }),
    });
    return resolvePromptResult(result, rollback);
}
export async function selectPrompt(message, options, rollback) {
    const clackOptions = options.map((option) => ({
        value: option.value,
        label: option.label,
        ...(option.hint === undefined ? {} : { hint: option.hint }),
    }));
    const result = await clackSelect({
        message,
        options: clackOptions,
    });
    return resolvePromptResult(result, rollback);
}
export async function confirmPrompt(message, rollback, initialValue = true) {
    const result = await clackConfirm({ message, initialValue });
    return resolvePromptResult(result, rollback);
}
//# sourceMappingURL=prompts.js.map