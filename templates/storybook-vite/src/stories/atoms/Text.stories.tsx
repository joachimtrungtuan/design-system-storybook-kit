import type { Meta, StoryObj } from "@storybook/react-vite";
import { Text } from "../../components/atoms";

const meta = { title: "Atoms/Text", component: Text, args: { children: "Body copy uses token-derived typography." } } satisfies Meta<typeof Text>;
export default meta;
export const Default: StoryObj<typeof meta> = {};
export const Muted: StoryObj<typeof meta> = { args: { tone: "muted" } };
