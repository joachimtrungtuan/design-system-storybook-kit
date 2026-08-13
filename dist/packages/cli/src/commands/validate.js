import { validateProject } from "../../../engine/src/validator/index.js";
import { formatHumanReport, formatJsonReport } from "../../../engine/src/validator/report.js";
import { EXIT_CODES } from "../exit-codes.js";
export async function runValidate(options = {}) {
    const result = await validateProject(options.cwd ?? process.cwd());
    const output = options.json === true ? formatJsonReport(result) : formatHumanReport(result);
    (options.write ?? console.log)(output);
    return result.violations.length === 0 ? EXIT_CODES.success : EXIT_CODES.validationFailure;
}
//# sourceMappingURL=validate.js.map