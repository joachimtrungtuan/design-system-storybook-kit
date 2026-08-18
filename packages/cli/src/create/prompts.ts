import { confirmPrompt, selectPrompt, textPrompt, type Rollback } from "../ui/prompts.ts";
import type { GitEnvironment } from "../env/git.ts";

export interface CreatePromptAnswers {
  target: string;
  independentRepository?: boolean;
}

export interface CreatePromptDependencies {
  text?: typeof textPrompt;
  select?: typeof selectPrompt;
  confirm?: typeof confirmPrompt;
}

export async function collectCreatePromptAnswers(options: {
  target?: string;
  independentRepository?: boolean;
  git: GitEnvironment;
  rollback: Rollback;
  dependencies?: CreatePromptDependencies;
}): Promise<CreatePromptAnswers> {
  const text = options.dependencies?.text ?? textPrompt;
  const select = options.dependencies?.select ?? selectPrompt;
  const target = options.target ?? await text(
    "Where should the design-system project be created?",
    options.rollback,
    "design-system",
  );

  let independentRepository = options.independentRepository;
  if (independentRepository === undefined && options.git.insideRepository) {
    independentRepository = await select(
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
