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
export declare function collectCreatePromptAnswers(options: {
    target?: string;
    independentRepository?: boolean;
    git: GitEnvironment;
    rollback: Rollback;
    dependencies?: CreatePromptDependencies;
}): Promise<CreatePromptAnswers>;
