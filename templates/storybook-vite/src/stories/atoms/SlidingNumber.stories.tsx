import type { Meta, StoryObj } from "@storybook/react-vite";
import { SlidingNumber } from "../../components/atoms";

const meta = { title: "Atoms/SlidingNumber", component: SlidingNumber, args: { value: 42 } } satisfies Meta<typeof SlidingNumber>;
export default meta;
export const Default: StoryObj<typeof meta> = {};
