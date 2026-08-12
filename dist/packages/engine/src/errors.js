import { EXIT_CODES } from "./exit-codes.js";
export class ActionableError extends Error {
    action;
    resource;
    exitCode;
    constructor(problem, action, resource, exitCode = EXIT_CODES.refusal) {
        super(problem);
        this.name = "ActionableError";
        this.action = action;
        this.resource = resource;
        this.exitCode = exitCode;
    }
}
//# sourceMappingURL=errors.js.map