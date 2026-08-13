import type { Meta, StoryObj } from "@storybook/react-vite";
import { Card } from "../../components/molecules";

const meta = { title: "Molecules/Card", component: Card, args: { title: "A reusable card", description: "Complete examples become useful team patterns." } } satisfies Meta<typeof Card>;
export default meta;
export const Default: StoryObj<typeof meta> = {};
export const Accent: StoryObj<typeof meta> = { args: { tone: "accent" } };
