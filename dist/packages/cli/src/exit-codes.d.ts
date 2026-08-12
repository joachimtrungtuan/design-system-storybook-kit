export declare const EXIT_CODES: {
    readonly success: 0;
    readonly validationFailure: 1;
    readonly refusal: 2;
    readonly internalError: 70;
};
export type ExitCode = (typeof EXIT_CODES)[keyof typeof EXIT_CODES];
