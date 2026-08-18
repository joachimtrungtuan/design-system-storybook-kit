import { confirmPrompt, selectPrompt, textPrompt } from "../ui/prompts.js";
export async function collectCreatePromptAnswers(options) {
    const text = options.dependencies?.text ?? textPrompt;
    const select = options.dependencies?.select ?? selectPrompt;
    const target = options.target ?? await text("Where should the design-system project be created?", options.rollback, "design-system");
    let independentRepository = options.independentRepository;
    if (independentRepository === undefined && options.git.insideRepository) {
        independentRepository = await select("This target is inside an existing repository. Where should its history live?", [
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
        ], options.rollback);
    }
    return {
        target,
        ...(independentRepository === undefined ? {} : { independentRepository }),
    };
}
//# sourceMappingURL=prompts.js.map