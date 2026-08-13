import type { Meta, StoryObj } from "@storybook/react-vite";
import { Footer } from "../../components/organisms";

const meta = { title: "Organisms/Footer", component: Footer } satisfies Meta<typeof Footer>;
export default meta;
export const Default: StoryObj<typeof meta> = {};
