import type { Meta, StoryObj } from "@storybook/react-vite";
import { Pagination } from "../../components/molecules";

const meta = { title: "Molecules/Pagination", component: Pagination, args: { current: 2, total: 4 } } satisfies Meta<typeof Pagination>;
export default meta;
export const Default: StoryObj<typeof meta> = {};
