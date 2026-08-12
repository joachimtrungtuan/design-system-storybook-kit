export interface Reporter {
  info(message: string): void;
  warn(message: string): void;
}

export const consoleReporter: Reporter = {
  info: console.log,
  warn: console.warn,
};
