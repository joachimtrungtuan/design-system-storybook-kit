export interface Reporter {
    info(message: string): void;
    warn(message: string): void;
}
export declare const consoleReporter: Reporter;
