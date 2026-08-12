export type Rollback = () => void | Promise<void>;
export declare function resolvePromptResult<Value>(value: Value | symbol, rollback: Rollback, cancellationCheck?: (candidate: unknown) => boolean): Promise<Value>;
export declare function textPrompt(message: string, rollback: Rollback, initialValue?: string): Promise<string>;
export interface SelectPromptOption<Value> {
    value: Value;
    label: string;
    hint?: string;
}
export declare function selectPrompt<Value>(message: string, options: SelectPromptOption<Value>[], rollback: Rollback): Promise<Value>;
export declare function confirmPrompt(message: string, rollback: Rollback, initialValue?: boolean): Promise<boolean>;
