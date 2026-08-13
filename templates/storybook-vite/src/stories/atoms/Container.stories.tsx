import type { Meta, StoryObj } from "@storybook/react-vite";
import { Container } from "../../components/atoms";

const meta = { title: "Atoms/Container", component: Container, args: { children: "Content stays within the shared measure." } } satisfies Meta<typeof Container>;
export default meta;
export const Default: StoryObj<typeof meta> = {};
