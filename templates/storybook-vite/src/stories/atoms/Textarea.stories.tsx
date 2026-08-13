import type { Meta, StoryObj } from "@storybook/react-vite";
import { Textarea } from "../../components/atoms";

const meta = { title: "Atoms/Textarea", component: Textarea, args: { placeholder: "Write a message" } } satisfies Meta<typeof Textarea>;
export default meta;
export const Default: StoryObj<typeof meta> = {};
export const Focused: StoryObj<typeof meta> = { args: { autoFocus: true } };
export const Disabled: StoryObj<typeof meta> = { args: { disabled: true } };
