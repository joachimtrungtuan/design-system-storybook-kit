import type { Meta, StoryObj } from "@storybook/react-vite";
import { ExamplePage } from "../../pages/ExamplePage";

const meta = { title: "Pages/ExamplePage", component: ExamplePage } satisfies Meta<typeof ExamplePage>;
export default meta;
export const Default: StoryObj<typeof meta> = {};
