import ts from "typescript";

import type { ValidatorRule, Violation } from "../types.ts";
import {
  TIERS,
  defaultMetaObject,
  nodeLine,
  objectProperty,
  pascalFromKebab,
  resolveModule,
  storyTier,
  typeText,
  violation,
} from "./helpers.ts";

function identifierValue(property: ts.PropertyAssignment | undefined): string | undefined {
  return property !== undefined && ts.isIdentifier(property.initializer)
    ? property.initializer.text
    : undefined;
}

function referencedComponents(meta: ts.ObjectLiteralExpression): Set<string> {
  const referenced = new Set<string>();
  const component = identifierValue(objectProperty(meta, "component"));
  if (component !== undefined) referenced.add(component);
  const subcomponents = objectProperty(meta, "subcomponents")?.initializer;
  if (subcomponents !== undefined && ts.isObjectLiteralExpression(subcomponents)) {
    for (const property of subcomponents.properties) {
      if (ts.isShorthandPropertyAssignment(property)) referenced.add(property.name.text);
      if (ts.isPropertyAssignment(property) && ts.isIdentifier(property.initializer)) {
        referenced.add(property.initializer.text);
      }
    }
  }
  return referenced;
}

function stringValue(property: ts.PropertyAssignment | undefined): string | undefined {
  const initializer = property?.initializer;
  return initializer !== undefined && ts.isStringLiteralLike(initializer)
    ? initializer.text
    : undefined;
}

function storybookTypeNames(source: ts.SourceFile, exportedName: "Meta" | "StoryObj"): Set<string> {
  const names = new Set<string>();
  for (const statement of source.statements) {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier) || !/^@storybook\//u.test(statement.moduleSpecifier.text)) continue;
    const bindings = statement.importClause?.namedBindings;
    if (bindings === undefined || !ts.isNamedImports(bindings)) continue;
    for (const element of bindings.elements) {
      if ((element.propertyName?.text ?? element.name.text) === exportedName) names.add(element.name.text);
    }
  }
  return names;
}

function exactGenericType(text: string, names: ReadonlySet<string>): boolean {
  return [...names].some((name) => new RegExp(`^${name}(?:<|$)`, "u").test(text.trim()));
}

function hasMetaTyping(source: ts.SourceFile): boolean {
  const metaTypes = storybookTypeNames(source, "Meta");
  if (metaTypes.size === 0) return false;
  let exportedIdentifier: string | undefined;
  for (const statement of source.statements) {
    if (!ts.isExportAssignment(statement) || statement.isExportEquals) continue;
    if (ts.isSatisfiesExpression(statement.expression)) return exactGenericType(typeText(statement.expression.type), metaTypes);
    if (ts.isAsExpression(statement.expression)) return exactGenericType(typeText(statement.expression.type), metaTypes);
    if (ts.isIdentifier(statement.expression)) exportedIdentifier = statement.expression.text;
  }
  if (exportedIdentifier === undefined) return false;
  for (const statement of source.statements) {
    if (!ts.isVariableStatement(statement)) continue;
    for (const declaration of statement.declarationList.declarations) {
      if (!ts.isIdentifier(declaration.name) || declaration.name.text !== exportedIdentifier) continue;
      if (exactGenericType(typeText(declaration.type), metaTypes)) return true;
      const initializer = declaration.initializer;
      return initializer !== undefined && ts.isSatisfiesExpression(initializer) && exactGenericType(typeText(initializer.type), metaTypes);
    }
  }
  return false;
}

function hasNamedStory(source: ts.SourceFile): boolean {
  const storyTypes = storybookTypeNames(source, "StoryObj");
  if (storyTypes.size === 0) return false;
  for (const statement of source.statements) {
    if (!ts.isVariableStatement(statement) || statement.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword) !== true) continue;
    for (const declaration of statement.declarationList.declarations) {
      if (exactGenericType(typeText(declaration.type), storyTypes)) return true;
      const initializer = declaration.initializer;
      if (initializer !== undefined && ts.isSatisfiesExpression(initializer) && exactGenericType(typeText(initializer.type), storyTypes)) return true;
    }
  }
  return false;
}

function exportedComponentDirectory(
  snapshot: Parameters<ValidatorRule>[0],
  modulePath: string,
  exportedName: string,
  visited = new Set<string>(),
): string | undefined {
  const direct = componentDirectoryFromOrigin(modulePath);
  if (visited.has(modulePath)) return undefined;
  visited.add(modulePath);
  const source = snapshot.sources.get(modulePath);
  if (source === undefined) return undefined;
  if (direct !== undefined && snapshot.directories.has(direct)) {
    for (const statement of source.statements) {
      const modifiers = ts.canHaveModifiers(statement) ? ts.getModifiers(statement) : undefined;
      const exported = modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword) === true;
      if (!exported) continue;
      if ((ts.isFunctionDeclaration(statement) || ts.isClassDeclaration(statement) || ts.isInterfaceDeclaration(statement) || ts.isTypeAliasDeclaration(statement)) && statement.name?.text === exportedName) {
        return direct;
      }
      if (ts.isVariableStatement(statement) && statement.declarationList.declarations.some((declaration) => ts.isIdentifier(declaration.name) && declaration.name.text === exportedName)) {
        return direct;
      }
      if (exportedName === "default" && modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.DefaultKeyword) === true) {
        return direct;
      }
    }
  }
  for (const statement of source.statements) {
    if (!ts.isExportDeclaration(statement)) continue;
    const moduleSpecifier = statement.moduleSpecifier;
    if (moduleSpecifier === undefined || !ts.isStringLiteral(moduleSpecifier)) continue;
    const resolved = resolveModule(snapshot, modulePath, moduleSpecifier.text);
    if (resolved === undefined) continue;
    const clause = statement.exportClause;
    if (clause === undefined) {
      const found = exportedComponentDirectory(snapshot, resolved, exportedName, visited);
      if (found !== undefined) return found;
      continue;
    }
    if (!ts.isNamedExports(clause)) continue;
    const element = clause.elements.find((item) => !item.isTypeOnly && item.name.text === exportedName);
    if (element !== undefined) {
      const found = exportedComponentDirectory(snapshot, resolved, element.propertyName?.text ?? element.name.text, visited);
      if (found !== undefined) return found;
    }
  }
  return undefined;
}

function importedOrigins(snapshot: Parameters<ValidatorRule>[0], file: string, source: ts.SourceFile): Map<string, string> {
  const origins = new Map<string, string>();
  for (const statement of source.statements) {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) continue;
    const resolved = resolveModule(snapshot, file, statement.moduleSpecifier.text);
    if (resolved === undefined) continue;
    const bindings = statement.importClause?.namedBindings;
    if (bindings !== undefined && ts.isNamedImports(bindings)) {
      for (const element of bindings.elements) {
        const directory = exportedComponentDirectory(snapshot, resolved, element.propertyName?.text ?? element.name.text);
        if (directory !== undefined) origins.set(element.name.text, directory);
      }
    }
    const defaultName = statement.importClause?.name?.text;
    if (defaultName !== undefined) {
      const directory = exportedComponentDirectory(snapshot, resolved, "default");
      if (directory !== undefined) origins.set(defaultName, directory);
    }
  }
  return origins;
}

function componentDirectoryFromOrigin(origin: string): string | undefined {
  const match = /^(src\/components\/[^/]+\/[^/]+)(?:\/|$)/u.exec(origin);
  return match?.[1];
}

export const validateStories: ValidatorRule = (snapshot) => {
  const violations: Violation[] = [];
  const storiesByTier = new Map<string, Array<{ file: string; source: ts.SourceFile; meta?: ts.ObjectLiteralExpression; origins: Map<string, string> }>>();

  for (const [file, source] of snapshot.sources) {
    const tier = storyTier(file);
    if (tier === undefined || !/\.stories\.[cm]?[jt]sx?$/u.test(file)) continue;
    const meta = defaultMetaObject(source);
    const entries = storiesByTier.get(tier) ?? [];
    entries.push({ file, source, origins: importedOrigins(snapshot, file, source), ...(meta === undefined ? {} : { meta }) });
    storiesByTier.set(tier, entries);

    if (meta === undefined || objectProperty(meta, "title") === undefined || objectProperty(meta, "component") === undefined || !hasMetaTyping(source) || !hasNamedStory(source)) {
      violations.push(violation(
        "V11",
        file,
        "Story file must export typed Meta with title and component, plus a named StoryObj story.",
        "Add a typed default meta object and at least one exported StoryObj.",
      ));
      continue;
    }

    const titleProperty = objectProperty(meta, "title");
    const title = stringValue(titleProperty);
    const expectedPrefix = `${tier[0]?.toUpperCase() ?? ""}${tier.slice(1)}/`;
    if (title === undefined || !title.startsWith(expectedPrefix) || title.slice(expectedPrefix.length).length === 0) {
      violations.push(violation(
        "V10",
        file,
        `Story title must start with '${expectedPrefix}'.`,
        `Set title to ${expectedPrefix}<Name>.`,
        titleProperty === undefined ? undefined : nodeLine(snapshot, file, titleProperty),
      ));
    }
  }

  for (const tier of TIERS) {
    const storyCoverage = new Set<string>();
    for (const story of storiesByTier.get(tier) ?? []) {
      if (story.meta !== undefined) {
        for (const name of referencedComponents(story.meta)) {
          const origin = story.origins.get(name);
          if (origin !== undefined) storyCoverage.add(origin);
        }
      }
    }
    const prefix = `src/components/${tier}/`;
    for (const directory of snapshot.directories) {
      if (!directory.startsWith(prefix) || directory.slice(prefix.length).includes("/")) continue;
      const expected = pascalFromKebab(directory.slice(prefix.length));
      if (!storyCoverage.has(directory)) {
        violations.push(violation(
          "V9",
          directory,
          `Component '${expected}' has no declared story coverage in src/stories/${tier}.`,
          "Declare it as the story component or one of its subcomponents.",
        ));
      }
    }
  }
  return violations;
};
