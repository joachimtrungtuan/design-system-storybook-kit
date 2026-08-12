export const COMMANDS = [
  "create",
  "adopt",
  "generate",
  "validate",
  "update",
  "migrate",
  "guard",
] as const;

export type Command = (typeof COMMANDS)[number];

export const ROOT_HELP = `story-cli-kit

Usage:
  ds <command> [options]

Commands:
  create      Create a design-system project
  adopt       Add the design system to an existing project
  generate    Generate a component through the canonical scaffold
  validate    Validate a project against the design-system contract
  update      Update toolkit-owned project files
  migrate     Apply a named structural migration
  guard       Check whether paths may be written

Options:
  -h, --help  Show help`;

export function commandHelp(command: Command): string {
  return `Usage:\n  ds ${command} [options]\n\nOptions:\n  -h, --help  Show help`;
}
