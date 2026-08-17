import { type Rollback } from "../ui/prompts.ts";
import type { GitEnvironment } from "../env/git.ts";
export interface CreatePromptAnswers {
    target: string;
    independentRepository?: boolean;
}
export declare function collectCreatePromptAnswers(options: {
    target?: string;
    independentRepository?: boolean;
    git: GitEnvironment;
    rollback: Rollback;
}): Promise<CreatePromptAnswers>;
