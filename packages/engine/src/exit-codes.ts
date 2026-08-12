export const EXIT_CODES = {
  success: 0,
  validationFailure: 1,
  refusal: 2,
  internalError: 70,
} as const;

export type ExitCode = (typeof EXIT_CODES)[keyof typeof EXIT_CODES];
