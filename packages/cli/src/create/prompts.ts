import { selectPrompt, textPrompt, type Rollback } from "../ui/prompts.ts";
import type { GitEnvironment } from "../env/git.ts";

export interface CreatePromptAnswers {
  target: string;
  independentRepository?: boolean;
}

export async function collectCreatePromptAnswers(options: {
  target?: string;
  independentRepository?: boolean;
  git: GitEnvironment;
  rollback: Rollback;
}): Promise<CreatePromptAnswers> {
  const target = options.target ?? await textPrompt(
    "Where should the design-system project be created?",
    options.rollback,
    "design-system",
  );

  let independentRepository = options.independentRepository;
  if (independentRepository === undefined && options.git.insideRepository) {
    independentRepository = await selectPrompt(
      "This target is inside an existing repository. Where should its history live?",
      [
        {
          value: false,
          label: "Use the enclosing repository",
          hint: "The scaffold is committed in the parent repository.",
        },
        {
          value: true,
          label: "Create an independent repository",
          hint: "The parent must add a submodule entry or ignore this directory.",
        },
      ],
      options.rollback,
    );
  }

  return {
    target,
    ...(independentRepository === undefined ? {} : { independentRepository }),
  };
}
