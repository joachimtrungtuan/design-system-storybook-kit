import type { Meta, StoryObj } from "@storybook/react-vite";
import { Badge } from "../../components/atoms";

const meta = { title: "Atoms/Badge", component: Badge, args: { children: "New" } } satisfies Meta<typeof Badge>;
export default meta;
export const Neutral: StoryObj<typeof meta> = {};
export const Accent: StoryObj<typeof meta> = { args: { tone: "accent" } };
