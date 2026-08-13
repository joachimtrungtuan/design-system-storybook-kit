import type { Meta, StoryObj } from "@storybook/react-vite";
import { Heading } from "../../components/atoms";

const meta = { title: "Atoms/Heading", component: Heading, args: { children: "A clear heading" } } satisfies Meta<typeof Heading>;
export default meta;
export const LevelOne: StoryObj<typeof meta> = { args: { level: 1 } };
export const LevelThree: StoryObj<typeof meta> = { args: { level: 3 } };
