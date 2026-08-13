import type { Meta, StoryObj } from "@storybook/react-vite";
import { Icon } from "../../components/atoms";

const meta = { title: "Atoms/Icon", component: Icon } satisfies Meta<typeof Icon>;
export default meta;
export const Medium: StoryObj<typeof meta> = {};
export const Large: StoryObj<typeof meta> = { args: { size: "lg" } };
