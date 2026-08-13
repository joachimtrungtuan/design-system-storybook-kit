import ts from "typescript";

import type { ValidatorRule, Violation } from "../types.ts";
import { nodeLine, violation } from "./helpers.ts";

function importedLocal(source: ts.SourceFile, moduleName: string, exportName: string): string | undefined {
  for (const statement of source.statements) {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier) || statement.moduleSpecifier.text !== moduleName) continue;
    const bindings = statement.importClause?.namedBindings;
    if (bindings === undefined || !ts.isNamedImports(bindings)) continue;
    const match = bindings.elements.find((element) => (element.propertyName?.text ?? element.name.text) === exportName);
    return match?.name.text;
  }
  return undefined;
}

function defaultHasFactorySpread(source: ts.SourceFile, factory: string): boolean {
  for (const statement of source.statements) {
    if (!ts.isExportAssignment(statement)) continue;
    const expression = ts.isSatisfiesExpression(statement.expression) || ts.isAsExpression(statement.expression)
      ? statement.expression.expression
      : statement.expression;
    if (!ts.isObjectLiteralExpression(expression)) continue;
    return expression.properties.some((property) =>
      ts.isSpreadAssignment(property) && ts.isCallExpression(property.expression) &&
      ts.isIdentifier(property.expression.expression) && property.expression.expression.text === factory,
    );
  }
  return false;
}

export const validateConfig: ValidatorRule = (snapshot) => {
  const violations: Violation[] = [];
  const mainPath = ".storybook/main.ts";
  const mainSource = snapshot.sources.get(mainPath);
  const mainFactory = mainSource === undefined ? undefined : importedLocal(mainSource, "story-cli-kit/preset", "main");
  if (mainSource === undefined || mainFactory === undefined || !defaultHasFactorySpread(mainSource, mainFactory)) {
    violations.push(violation("V22", mainPath, "Storybook main must import and spread the engine preset.", "Import main from story-cli-kit/preset and export { ...main() }."));
  } else {
    for (const statement of mainSource.statements) {
      if (!ts.isExportAssignment(statement)) continue;
      const text = statement.getText(mainSource);
      if (/\b(?:stories|addons|framework)\s*:/u.test(text)) {
        violations.push(violation("V22", mainPath, "Preset-owned Storybook fields are declared inline.", "Pass additions to main() instead of replacing preset fields.", nodeLine(snapshot, mainPath, statement)));
      }
    }
  }

  const previewPath = ".storybook/preview.tsx";
  const previewSource = snapshot.sources.get(previewPath);
  const previewFactory = previewSource === undefined ? undefined : importedLocal(previewSource, "story-cli-kit/preview", "preview");
  if (previewSource === undefined || previewFactory === undefined || !defaultHasFactorySpread(previewSource, previewFactory)) {
    violations.push(violation("V23", previewPath, "Storybook preview must import and spread the engine preview.", "Import preview from story-cli-kit/preview and export { ...preview(tokens) }."));
  }
  return violations;
};
