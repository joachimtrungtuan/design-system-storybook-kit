import type { Meta, StoryObj } from "@storybook/react-vite";
import { Breadcrumb } from "../../components/molecules";

const meta = { title: "Molecules/Breadcrumb", component: Breadcrumb, args: { items: ["Home", "Library", "Current"] } } satisfies Meta<typeof Breadcrumb>;
export default meta;
export const Default: StoryObj<typeof meta> = {};
