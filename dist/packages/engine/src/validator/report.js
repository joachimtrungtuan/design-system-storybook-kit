function location(violation) {
    return violation.line === undefined
        ? violation.file
        : `${violation.file}:${violation.line}`;
}
export function formatHumanReport(result) {
    if (result.violations.length === 0) {
        return "Design-system contract valid: 0 violations.";
    }
    const details = result.violations.flatMap((violation) => [
        `${violation.ruleId} ${location(violation)} — ${violation.message}`,
        `  Fix: ${violation.action}`,
    ]);
    return [
        `Design-system contract invalid: ${result.violations.length} violation(s).`,
        ...details,
    ].join("\n");
}
export function jsonReport(result) {
    return {
        valid: result.violations.length === 0,
        root: result.root,
        violations: result.violations.map((violation) => ({ ...violation })),
    };
}
export function formatJsonReport(result) {
    return JSON.stringify(jsonReport(result), null, 2);
}
//# sourceMappingURL=report.js.map