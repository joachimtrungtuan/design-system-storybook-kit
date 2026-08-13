import type { Meta, StoryObj } from "@storybook/react-vite";
import { Input } from "../../components/atoms";

const meta = { title: "Atoms/Input", component: Input, args: { placeholder: "Enter a value" } } satisfies Meta<typeof Input>;
export default meta;
export const Default: StoryObj<typeof meta> = {};
export const Focused: StoryObj<typeof meta> = { args: { autoFocus: true } };
export const Disabled: StoryObj<typeof meta> = { args: { disabled: true } };
