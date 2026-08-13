import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "../../components/atoms/button";

const meta = {
  title: "Atoms/Button",
  component: Button,
} satisfies Meta<typeof Button>;

export default meta;
export const Default: StoryObj<typeof meta> = {};
