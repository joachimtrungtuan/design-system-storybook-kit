import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "../../components/atoms";

const meta = { title: "Atoms/Button", component: Button, args: { children: "Continue" } } satisfies Meta<typeof Button>;
export default meta;
export const Primary: StoryObj<typeof meta> = {};
export const Secondary: StoryObj<typeof meta> = { args: { tone: "secondary" } };
export const Medium: StoryObj<typeof meta> = { args: { size: "md" } };
export const Small: StoryObj<typeof meta> = { args: { size: "sm" } };
export const Large: StoryObj<typeof meta> = { args: { size: "lg" } };
export const Hover: StoryObj<typeof meta> = { parameters: { docs: { description: { story: "Hover uses the next darker token step." } } } };
export const Active: StoryObj<typeof meta> = { parameters: { docs: { description: { story: "Active uses the pressed token step." } } } };
export const Focus: StoryObj<typeof meta> = { parameters: { docs: { description: { story: "Keyboard focus uses the semantic action outline." } } } };
export const Disabled: StoryObj<typeof meta> = { args: { disabled: true } };
