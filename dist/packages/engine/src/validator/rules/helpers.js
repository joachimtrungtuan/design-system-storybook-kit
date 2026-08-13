import { dirname, join, normalize } from "node:path/posix";
import ts from "typescript";
import { lineOf } from "../snapshot.js";
export const TIERS = ["atoms", "molecules", "organisms", "templates"];
export function isTier(value) {
    return TIERS.some((tier) => tier === value);
}
export function violation(ruleId, file, message, action, line) {
    return { ruleId, file, message, action, ...(line === undefined ? {} : { line }) };
}
export function nodeLine(snapshot, file, node) {
    const content = snapshot.files.get(file);
    return content === undefined ? undefined : lineOf(content, node.getStart());
}
export function kebabCase(value) {
    return /^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(value);
}
export function pascalCase(value) {
    return /^[A-Z][A-Za-z0-9]*$/u.test(value);
}
export function pascalFromKebab(value) {
    return value.split("-").map((part) => `${part[0]?.toUpperCase() ?? ""}${part.slice(1)}`).join("");
}
export function componentTier(path) {
    const match = /^src\/components\/([^/]+)\//u.exec(path);
    return match?.[1] !== undefined && isTier(match[1]) ? match[1] : undefined;
}
export function storyTier(path) {
    const match = /^src\/stories\/([^/]+)\//u.exec(path);
    return match?.[1] !== undefined && isTier(match[1]) ? match[1] : undefined;
}
export function moduleSpecifiers(source) {
    const specifiers = [];
    for (const statement of source.statements) {
        if (ts.isImportDeclaration(statement) && ts.isStringLiteral(statement.moduleSpecifier)) {
            const clause = statement.importClause;
            const bindings = clause?.namedBindings;
            const onlyTypeSpecifiers = bindings !== undefined && ts.isNamedImports(bindings) &&
                bindings.elements.length > 0 && bindings.elements.every((element) => element.isTypeOnly);
            if (clause?.isTypeOnly === true || onlyTypeSpecifiers)
                continue;
            specifiers.push({ value: statement.moduleSpecifier.text, node: statement.moduleSpecifier });
        }
        const exportSpecifier = ts.isExportDeclaration(statement) ? statement.moduleSpecifier : undefined;
        if (ts.isExportDeclaration(statement) && exportSpecifier !== undefined && ts.isStringLiteral(exportSpecifier)) {
            const clause = statement.exportClause;
            const onlyTypeSpecifiers = clause !== undefined && ts.isNamedExports(clause) &&
                clause.elements.length > 0 && clause.elements.every((element) => element.isTypeOnly);
            if (statement.isTypeOnly || onlyTypeSpecifiers)
                continue;
            specifiers.push({ value: exportSpecifier.text, node: exportSpecifier });
        }
    }
    return specifiers;
}
export function exportSpecifiers(source) {
    const specifiers = [];
    for (const statement of source.statements) {
        if (!ts.isExportDeclaration(statement))
            continue;
        const moduleSpecifier = statement.moduleSpecifier;
        if (moduleSpecifier === undefined || !ts.isStringLiteral(moduleSpecifier))
            continue;
        const clause = statement.exportClause;
        const onlyTypes = statement.isTypeOnly || (clause !== undefined && ts.isNamedExports(clause) &&
            clause.elements.length > 0 && clause.elements.every((element) => element.isTypeOnly));
        if (!onlyTypes)
            specifiers.push({ value: moduleSpecifier.text, node: statement });
    }
    return specifiers;
}
export function resolveModule(snapshot, sourcePath, specifier) {
    if (!specifier.startsWith(".")) {
        const alias = /(?:^|\/)src\/(components\/.*)$/u.exec(specifier)?.[1] ??
            /(?:^|\/)(components\/.*)$/u.exec(specifier)?.[1];
        if (alias === undefined)
            return undefined;
        return resolveCandidate(snapshot, `src/${alias}`);
    }
    return resolveCandidate(snapshot, normalize(join(dirname(sourcePath), specifier)));
}
function resolveCandidate(snapshot, candidate) {
    const candidates = [
        candidate,
        `${candidate}.ts`,
        `${candidate}.tsx`,
        `${candidate}.js`,
        `${candidate}.jsx`,
        `${candidate}/index.ts`,
        `${candidate}/index.tsx`,
    ];
    return candidates.find((path) => snapshot.files.has(path));
}
export function objectProperty(object, name) {
    return object.properties.find((property) => ts.isPropertyAssignment(property) && property.name.getText().replace(/["']/gu, "") === name);
}
function unwrapObject(expression) {
    if (ts.isObjectLiteralExpression(expression))
        return expression;
    if (ts.isSatisfiesExpression(expression) || ts.isAsExpression(expression)) {
        return unwrapObject(expression.expression);
    }
    return undefined;
}
export function defaultMetaObject(source) {
    const variables = new Map();
    for (const statement of source.statements) {
        if (!ts.isVariableStatement(statement))
            continue;
        for (const declaration of statement.declarationList.declarations) {
            if (ts.isIdentifier(declaration.name) && declaration.initializer !== undefined) {
                const object = unwrapObject(declaration.initializer);
                if (object !== undefined)
                    variables.set(declaration.name.text, object);
            }
        }
    }
    for (const statement of source.statements) {
        if (!ts.isExportAssignment(statement) || statement.isExportEquals)
            continue;
        const direct = unwrapObject(statement.expression);
        if (direct !== undefined)
            return direct;
        if (ts.isIdentifier(statement.expression))
            return variables.get(statement.expression.text);
    }
    return undefined;
}
export function typeText(node) {
    return node?.getText() ?? "";
}
//# sourceMappingURL=helpers.js.map