import { dirname, join, normalize } from "node:path/posix";

import ts from "typescript";

import { lineOf } from "../snapshot.ts";
import type { ProjectSnapshot, RuleId, Violation } from "../types.ts";

export const TIERS = ["atoms", "molecules", "organisms", "templates"] as const;
export type Tier = (typeof TIERS)[number];

export function isTier(value: string): value is Tier {
  return TIERS.some((tier) => tier === value);
}

export function violation(
  ruleId: RuleId,
  file: string,
  message: string,
  action: string,
  line?: number,
): Violation {
  return { ruleId, file, message, action, ...(line === undefined ? {} : { line }) };
}

export function nodeLine(snapshot: ProjectSnapshot, file: string, node: ts.Node): number | undefined {
  const content = snapshot.files.get(file);
  return content === undefined ? undefined : lineOf(content, node.getStart());
}

export function kebabCase(value: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(value);
}

export function pascalCase(value: string): boolean {
  return /^[A-Z][A-Za-z0-9]*$/u.test(value);
}

export function pascalFromKebab(value: string): string {
  return value.split("-").map((part) => `${part[0]?.toUpperCase() ?? ""}${part.slice(1)}`).join("");
}

export function componentTier(path: string): Tier | undefined {
  const match = /^src\/components\/([^/]+)\//u.exec(path);
  return match?.[1] !== undefined && isTier(match[1]) ? match[1] : undefined;
}

export function storyTier(path: string): Tier | undefined {
  const match = /^src\/stories\/([^/]+)\//u.exec(path);
  return match?.[1] !== undefined && isTier(match[1]) ? match[1] : undefined;
}

export function moduleSpecifiers(source: ts.SourceFile): Array<{ value: string; node: ts.Node }> {
  const specifiers: Array<{ value: string; node: ts.Node }> = [];
  for (const statement of source.statements) {
    if (ts.isImportDeclaration(statement) && ts.isStringLiteral(statement.moduleSpecifier)) {
      const clause = statement.importClause;
      const bindings = clause?.namedBindings;
      const onlyTypeSpecifiers = bindings !== undefined && ts.isNamedImports(bindings) &&
        bindings.elements.length > 0 && bindings.elements.every((element) => element.isTypeOnly);
      if (clause?.isTypeOnly === true || onlyTypeSpecifiers) continue;
      specifiers.push({ value: statement.moduleSpecifier.text, node: statement.moduleSpecifier });
    }
    const exportSpecifier = ts.isExportDeclaration(statement) ? statement.moduleSpecifier : undefined;
    if (ts.isExportDeclaration(statement) && exportSpecifier !== undefined && ts.isStringLiteral(exportSpecifier)) {
      const clause = statement.exportClause;
      const onlyTypeSpecifiers = clause !== undefined && ts.isNamedExports(clause) &&
        clause.elements.length > 0 && clause.elements.every((element) => element.isTypeOnly);
      if (statement.isTypeOnly || onlyTypeSpecifiers) continue;
      specifiers.push({ value: exportSpecifier.text, node: exportSpecifier });
    }
  }
  return specifiers;
}

export function exportSpecifiers(source: ts.SourceFile): Array<{ value: string; node: ts.ExportDeclaration }> {
  const specifiers: Array<{ value: string; node: ts.ExportDeclaration }> = [];
  for (const statement of source.statements) {
    if (!ts.isExportDeclaration(statement)) continue;
    const moduleSpecifier = statement.moduleSpecifier;
    if (moduleSpecifier === undefined || !ts.isStringLiteral(moduleSpecifier)) continue;
    const clause = statement.exportClause;
    const onlyTypes = statement.isTypeOnly || (clause !== undefined && ts.isNamedExports(clause) &&
      clause.elements.length > 0 && clause.elements.every((element) => element.isTypeOnly));
    if (!onlyTypes) specifiers.push({ value: moduleSpecifier.text, node: statement });
  }
  return specifiers;
}

export function resolveModule(snapshot: ProjectSnapshot, sourcePath: string, specifier: string): string | undefined {
  if (!specifier.startsWith(".")) {
    const alias = /(?:^|\/)src\/(components\/.*)$/u.exec(specifier)?.[1] ??
      /(?:^|\/)(components\/.*)$/u.exec(specifier)?.[1];
    if (alias === undefined) return undefined;
    return resolveCandidate(snapshot, `src/${alias}`);
  }
  return resolveCandidate(snapshot, normalize(join(dirname(sourcePath), specifier)));
}

function resolveCandidate(snapshot: ProjectSnapshot, candidate: string): string | undefined {
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

export function objectProperty(
  object: ts.ObjectLiteralExpression,
  name: string,
): ts.PropertyAssignment | undefined {
  return object.properties.find(
    (property): property is ts.PropertyAssignment =>
      ts.isPropertyAssignment(property) && property.name.getText().replace(/["']/gu, "") === name,
  );
}

function unwrapObject(expression: ts.Expression): ts.ObjectLiteralExpression | undefined {
  if (ts.isObjectLiteralExpression(expression)) return expression;
  if (ts.isSatisfiesExpression(expression) || ts.isAsExpression(expression)) {
    return unwrapObject(expression.expression);
  }
  return undefined;
}

export function defaultMetaObject(source: ts.SourceFile): ts.ObjectLiteralExpression | undefined {
  const variables = new Map<string, ts.ObjectLiteralExpression>();
  for (const statement of source.statements) {
    if (!ts.isVariableStatement(statement)) continue;
    for (const declaration of statement.declarationList.declarations) {
      if (ts.isIdentifier(declaration.name) && declaration.initializer !== undefined) {
        const object = unwrapObject(declaration.initializer);
        if (object !== undefined) variables.set(declaration.name.text, object);
      }
    }
  }
  for (const statement of source.statements) {
    if (!ts.isExportAssignment(statement) || statement.isExportEquals) continue;
    const direct = unwrapObject(statement.expression);
    if (direct !== undefined) return direct;
    if (ts.isIdentifier(statement.expression)) return variables.get(statement.expression.text);
  }
  return undefined;
}

export function typeText(node: ts.Node | undefined): string {
  return node?.getText() ?? "";
}
