import type { Meta, StoryObj } from "@storybook/react-vite";
import { Header } from "../../components/organisms";

const meta = { title: "Organisms/Header", component: Header } satisfies Meta<typeof Header>;
export default meta;
export const Default: StoryObj<typeof meta> = {};
