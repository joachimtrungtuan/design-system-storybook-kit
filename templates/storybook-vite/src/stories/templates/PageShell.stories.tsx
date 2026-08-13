import type { Meta, StoryObj } from "@storybook/react-vite";
import { PageShell } from "../../components/templates";

const meta = { title: "Templates/PageShell", component: PageShell, args: { children: "Page content" } } satisfies Meta<typeof PageShell>;
export default meta;
export const Default: StoryObj<typeof meta> = {};
