export declare const COMMANDS: readonly ["create", "adopt", "generate", "validate", "update", "migrate", "guard"];
export type Command = (typeof COMMANDS)[number];
export declare const ROOT_HELP = "story-cli-kit\n\nUsage:\n  ds <command> [options]\n\nCommands:\n  create      Create a design-system project\n  adopt       Add the design system to an existing project\n  generate    Generate a component through the canonical scaffold\n  validate    Validate a project against the design-system contract\n  update      Update toolkit-owned project files\n  migrate     Apply a named structural migration\n  guard       Check whether paths may be written\n\nOptions:\n  -h, --help  Show help";
export declare function commandHelp(command: Command): string;
