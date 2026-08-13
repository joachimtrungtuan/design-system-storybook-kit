import type { Meta, StoryObj } from "@storybook/react-vite";
import { Image } from "../../components/atoms";

const meta = { title: "Atoms/Image", component: Image, args: { alt: "Neutral placeholder", src: "https://placehold.co/800x480" } } satisfies Meta<typeof Image>;
export default meta;
export const Default: StoryObj<typeof meta> = {};
