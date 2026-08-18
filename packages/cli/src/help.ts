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
  const details = command === "create"
    ? "\n  ds create [target]\n\nOptions:\n  --no-install              Skip install and tail validation\n  --package-manager <name>  Use npm, pnpm, or yarn\n  --independent             Create a nested repository when applicable\n  --yes                     Skip target confirmation\n  -h, --help                Show help"
    : command === "generate"
      ? "\n  ds generate <tier> <name>\n\nOptions:\n  -h, --help  Show help"
      : command === "update"
        ? "\n  ds update\n\nOptions:\n  --dry-run                 Classify and report without writing files or creating a branch\n  --on-conflict <strategy>  Only 'skip' (the default) is implemented\n  --to <version>            Not implemented yet\n  -h, --help                Show help"
        : `\n  ds ${command} [options]\n\nOptions:\n  -h, --help  Show help`;
  return `Usage:${details}`;
}
